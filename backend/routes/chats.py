import json
import logging
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Storage setup
DATA_DIR = Path(__file__).parent.parent / "data" / "chats"
DATA_DIR.mkdir(parents=True, exist_ok=True)

chats_router = APIRouter()

class Message(BaseModel):
    role: str
    content: str
    id: str
    modelName: Optional[str] = None
    isDeepResearchResult: Optional[bool] = None
    sources: Optional[List[Dict[str, str]]] = None

class ChatSession(BaseModel):
    id: str
    title: str
    timestamp: float
    messages: List[Message]
    user_id: str = "default_user"

import json
import logging
import re
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Session ids are our own format (sid_xxx or uuid); anything with path
# separators or traversal sequences is rejected before it reaches the FS.
_SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")

def get_chat_path(session_id: str) -> Path:
    if not _SESSION_ID_RE.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session id.")
    return DATA_DIR / f"{session_id}.json"

@chats_router.post("/save")
async def save_chat(session: ChatSession):
    try:
        path = get_chat_path(session.id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(session.dict(), f, indent=2)
        return {"success": True, "message": "Chat saved successfully."}
    except Exception as e:
        logger.error(f"Failed to save chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@chats_router.get("/list")
async def list_chats(user_id: str = "default_user"):
    try:
        chats = []
        for file in DATA_DIR.glob("*.json"):
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("user_id") == user_id:
                    chats.append({
                        "id": data["id"],
                        "title": data["title"],
                        "timestamp": data["timestamp"]
                    })
        # Sort by timestamp descending
        chats.sort(key=lambda x: x["timestamp"], reverse=True)
        return chats
    except Exception as e:
        logger.error(f"Failed to list chats: {e}")
        return []

@chats_router.get("/{session_id}")
async def get_chat(session_id: str):
    path = get_chat_path(session_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Chat session not found.")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@chats_router.delete("/{session_id}")
async def delete_chat(session_id: str):
    path = get_chat_path(session_id)
    if path.exists():
        path.unlink()
        return {"success": True, "message": "Chat deleted."}
    return {"success": False, "message": "Chat not found."}
