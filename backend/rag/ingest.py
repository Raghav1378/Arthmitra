"""
Multi-format document ingestion for the Dual-Mode RAG system.
Supports: PDF, Image (OCR), CSV/Excel, Plain Text
"""
import io
import re
import logging
from pathlib import Path
from typing import TYPE_CHECKING

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_chroma import Chroma

from rag.embedder import get_embedder

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parent.parent / "data" / "chroma_store"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _sanitize_filename(name: str) -> str:
    """Strip special characters from filename for safe metadata storage."""
    return re.sub(r"[^\w.\-]", "_", name)

def _get_collection(session_id: str) -> Chroma:
    """Returns the user-specific ChromaDB collection."""
    collection_name = f"user_docs_{session_id}"
    return Chroma(
        collection_name=collection_name,
        persist_directory=str(CHROMA_DIR),
        embedding_function=get_embedder(),
    )

def _get_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

def _add_chunks(texts: list[str], metadatas: list[dict], collection: Chroma) -> int:
    """Add text chunks to ChromaDB. Returns count of chunks added."""
    if not texts:
        return 0
    collection.add_texts(texts=texts, metadatas=metadatas)
    return len(texts)


# ── PDF Ingestion ─────────────────────────────────────────────────────────────

async def ingest_pdf(
    file_bytes: bytes, filename: str, session_id: str
) -> int:
    """
    Ingests a PDF file page-by-page into the user RAG collection.
    Returns number of chunks ingested.
    """
    from pypdf import PdfReader

    safe_name = _sanitize_filename(filename)
    splitter = _get_splitter()
    collection = _get_collection(session_id)

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        all_texts, all_meta = [], []

        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                continue
            chunks = splitter.split_text(page_text)
            for chunk in chunks:
                all_texts.append(chunk)
                all_meta.append({
                    "source": safe_name,
                    "page": page_num,
                    "session_id": session_id,
                    "type": "pdf",
                })

        count = _add_chunks(all_texts, all_meta, collection)
        logger.info(f"[Ingest PDF] {safe_name}: {count} chunks")
        return count

    except Exception as e:
        logger.error(f"[Ingest PDF] Failed for {filename}: {e}")
        raise RuntimeError(f"PDF ingestion failed: {e}") from e


# ── Image Ingestion (OCR) ─────────────────────────────────────────────────────

async def ingest_image(
    file_bytes: bytes, filename: str, session_id: str
) -> int:
    """
    Ingests an image using Tesseract OCR into the user RAG collection.
    Returns number of chunks ingested.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        raise RuntimeError(
            "pytesseract / pillow not installed. Run: uv pip install pytesseract pillow"
        )

    safe_name = _sanitize_filename(filename)
    splitter = _get_splitter()
    collection = _get_collection(session_id)

    try:
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)

        if not text.strip():
            raise RuntimeError("OCR extracted no text. Try a clearer image.")

        chunks = splitter.split_text(text)
        metadatas = [
            {"source": safe_name, "page": 1, "session_id": session_id, "type": "image"}
            for _ in chunks
        ]

        count = _add_chunks(chunks, metadatas, collection)
        logger.info(f"[Ingest Image] {safe_name}: {count} chunks")
        return count

    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"[Ingest Image] Failed for {filename}: {e}")
        raise RuntimeError(f"Image ingestion failed: {e}") from e


# ── CSV / Excel Ingestion ────────────────────────────────────────────────────

async def ingest_csv_excel(
    file_bytes: bytes, filename: str, session_id: str
) -> int:
    """
    Ingests CSV or Excel files row-by-row into the user RAG collection.
    Returns number of chunks ingested.
    """
    try:
        import pandas as pd
    except ImportError:
        raise RuntimeError("pandas not installed. Run: uv pip install pandas openpyxl")

    safe_name = _sanitize_filename(filename)
    collection = _get_collection(session_id)

    try:
        ext = Path(filename).suffix.lower()
        if ext in [".xlsx", ".xls"]:
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            df = pd.read_csv(io.BytesIO(file_bytes))

        # Convert every row to a human-readable string
        row_strings = []
        for i, row in df.iterrows():
            parts = [f"{col}={val}" for col, val in row.items() if str(val).strip()]
            row_strings.append(f"Row {i + 1}: " + ", ".join(parts))

        # Group every 20 rows into a chunk
        chunk_size = 20
        all_texts, all_meta = [], []
        for start in range(0, len(row_strings), chunk_size):
            end = min(start + chunk_size, len(row_strings))
            chunk_text = "\n".join(row_strings[start:end])
            all_texts.append(chunk_text)
            all_meta.append({
                "source": safe_name,
                "rows": f"{start + 1}-{end}",
                "session_id": session_id,
                "type": "tabular",
            })

        count = _add_chunks(all_texts, all_meta, collection)
        logger.info(f"[Ingest CSV/Excel] {safe_name}: {count} chunks ({len(df)} rows)")
        return count

    except Exception as e:
        logger.error(f"[Ingest CSV/Excel] Failed for {filename}: {e}")
        raise RuntimeError(f"CSV/Excel ingestion failed: {e}") from e


# ── Plain Text Ingestion ──────────────────────────────────────────────────────

async def ingest_text(
    text_content: str, filename: str, session_id: str
) -> int:
    """
    Ingests raw text (pasted by user) into the user RAG collection.
    Returns number of chunks ingested.
    """
    safe_name = _sanitize_filename(filename)
    splitter = _get_splitter()
    collection = _get_collection(session_id)

    try:
        chunks = splitter.split_text(text_content)
        metadatas = [
            {"source": safe_name, "session_id": session_id, "type": "text"}
            for _ in chunks
        ]

        count = _add_chunks(chunks, metadatas, collection)
        logger.info(f"[Ingest Text] {safe_name}: {count} chunks")
        return count

    except Exception as e:
        logger.error(f"[Ingest Text] Failed for {filename}: {e}")
        raise RuntimeError(f"Text ingestion failed: {e}") from e
