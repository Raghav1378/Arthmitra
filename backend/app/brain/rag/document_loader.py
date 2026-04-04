"""
Document Loader Module
----------------------
Loads financial documents (PDF/TXT) from the data directory.
Dependency: pypdf (for PDFs)

Strictly NO LangChain.
"""

import os
import logging
from typing import List, Dict, Any
from pypdf import PdfReader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_documents(data_dir: str) -> List[Dict[str, Any]]:
    """
    Load all supported documents from the given directory.
    
    Args:
        data_dir (str): Path to the directory containing documents.
        
    Returns:
        List[Dict]: A list of documents, where each doc is:
            {
                "text": "Full text content...",
                "metadata": {
                    "source": "filename.pdf",
                    "file_path": "/full/path/to/filename.pdf"
                }
            }
    """
    documents = []
    
    if not os.path.exists(data_dir):
        logger.warning(f"Data directory not found: {data_dir}")
        return documents
        
    for filename in os.listdir(data_dir):
        file_path = os.path.join(data_dir, filename)
        
        if not os.path.isfile(file_path):
            continue
            
        try:
            doc_content = None
            if filename.lower().endswith(".pdf"):
                doc_content = _load_pdf(file_path)
            elif filename.lower().endswith(".txt") or filename.lower().endswith(".md"):
                doc_content = _load_text(file_path)
            
            if doc_content:
                documents.append({
                    "text": doc_content,
                    "metadata": {
                        "source": filename,
                        "file_path": file_path
                    }
                })
                logger.info(f"Loaded: {filename}")
                
        except Exception as e:
            logger.error(f"Failed to load {filename}: {str(e)}")
            
    return documents

def _load_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        logger.error(f"output error reading PDF {file_path}: {e}")
        raise e
    return text

def _load_text(file_path: str) -> str:
    """Read content from a text file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error reading text file {file_path}: {e}")
        raise e
