"""
Documents API Router — manages user document uploads for the Dual-Mode RAG system.
Endpoints:
  POST /documents/upload
  POST /documents/paste
  GET  /documents/list
  DELETE /documents/clear
  DELETE /documents/remove/{filename}
"""
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_chroma import Chroma

from rag.embedder import get_embedder
from rag.ingest import ingest_pdf, ingest_image, ingest_csv_excel, ingest_text

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parent.parent / "data" / "chroma_store"
RBI_COLLECTION = "rbi_circulars"  # NEVER DELETE THIS
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

documents_router = APIRouter()

# ── Validators ────────────────────────────────────────────────────────────────
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

def _validate_session(session_id: str) -> None:
    if not session_id:
        raise HTTPException(status_code=400, detail="Invalid session_id.")

def _user_collection_name(session_id: str) -> str:
    return f"user_docs_{session_id}"


# ── POST /upload ──────────────────────────────────────────────────────────────

@documents_router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(...),
) -> dict[str, Any]:
    _validate_session(session_id)

    filename = file.filename or "uploaded_file"
    ext = Path(filename).suffix.lower()
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: 10MB.")

    logger.info(f"[Upload] {filename} ({len(file_bytes)} bytes) for session {session_id}")

    try:
        if ext == ".pdf":
            chunks = await ingest_pdf(file_bytes, filename, session_id)
        elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tiff"]:
            chunks = await ingest_image(file_bytes, filename, session_id)
        elif ext in [".csv", ".xlsx", ".xls"]:
            chunks = await ingest_csv_excel(file_bytes, filename, session_id)
        elif ext == ".txt":
            chunks = await ingest_text(file_bytes.decode("utf-8", errors="replace"), filename, session_id)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{ext}'. Supported: .pdf, .png, .jpg, .csv, .xlsx, .txt",
            )
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "success": True,
        "chunks_ingested": chunks,
        "filename": filename,
        "message": f"✅ Ingested {chunks} chunks from {filename}",
    }


# ── POST /paste ───────────────────────────────────────────────────────────────

class PasteRequest(BaseModel):
    text: str
    label: str
    session_id: str

@documents_router.post("/paste")
async def paste_text(body: PasteRequest) -> dict[str, Any]:
    _validate_session(body.session_id)

    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Pasted text cannot be empty.")

    filename = f"{body.label or 'pasted_text'}.txt"
    chunks = await ingest_text(body.text, filename, body.session_id)

    return {
        "success": True,
        "chunks_ingested": chunks,
        "filename": filename,
        "message": f"✅ Ingested {chunks} chunks from pasted text.",
    }


# ── GET /list ─────────────────────────────────────────────────────────────────

@documents_router.get("/list")
async def list_documents(session_id: str) -> dict[str, Any]:
    _validate_session(session_id)
    collection_name = _user_collection_name(session_id)

    try:
        db = Chroma(
            collection_name=collection_name,
            persist_directory=str(CHROMA_DIR),
            embedding_function=get_embedder(),
        )
        # Get all metadata from all docs in the collection
        data = db.get(include=["metadatas"])
        metadatas = data.get("metadatas") or []

        # Aggregate by source filename
        seen: dict[str, dict[str, Any]] = {}
        for meta in metadatas:
            src = meta.get("source", "unknown")
            if src not in seen:
                seen[src] = {
                    "filename": src,
                    "type": meta.get("type", "unknown"),
                    "chunks": 0,
                    "ingested_at": meta.get("ingested_at", "—"),
                }
            seen[src]["chunks"] += 1

        return {"session_id": session_id, "documents": list(seen.values())}

    except Exception as e:
        logger.error(f"[List] Failed: {e}")
        return {"session_id": session_id, "documents": []}


# ── DELETE /clear ─────────────────────────────────────────────────────────────

@documents_router.delete("/clear")
async def clear_documents(session_id: str) -> dict[str, Any]:
    _validate_session(session_id)
    collection_name = _user_collection_name(session_id)

    # Safety: never touch rbi_circulars
    if collection_name == RBI_COLLECTION:
        raise HTTPException(status_code=403, detail="Cannot delete the system RBI collection.")

    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        existing = [c.name for c in client.list_collections()]
        if collection_name in existing:
            client.delete_collection(collection_name)
            logger.info(f"[Clear] Deleted collection: {collection_name}")
            return {"success": True, "message": f"Cleared all documents for session {session_id}."}
        return {"success": True, "message": "No documents found for this session."}
    except Exception as e:
        logger.error(f"[Clear] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear documents: {e}")


# ── DELETE /remove/{filename} ─────────────────────────────────────────────────

@documents_router.delete("/remove/{filename}")
async def remove_document(filename: str, session_id: str) -> dict[str, Any]:
    _validate_session(session_id)
    collection_name = _user_collection_name(session_id)

    try:
        db = Chroma(
            collection_name=collection_name,
            persist_directory=str(CHROMA_DIR),
            embedding_function=get_embedder(),
        )
        # Find all IDs where source == filename
        data = db.get(where={"source": filename}, include=["metadatas"])
        ids = data.get("ids") or []

        if not ids:
            return {"success": True, "chunks_removed": 0, "message": f"No chunks found for '{filename}'."}

        db.delete(ids=ids)
        logger.info(f"[Remove] Removed {len(ids)} chunks for '{filename}' from {collection_name}")
        return {"success": True, "chunks_removed": len(ids), "message": f"Removed '{filename}' ({len(ids)} chunks)."}

    except Exception as e:
        logger.error(f"[Remove] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove document: {e}")
