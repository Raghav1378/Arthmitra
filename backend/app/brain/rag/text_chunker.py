"""
Text Chunker Module
-------------------
Splits large text documents into smaller chunks for embedding.
Deterministic and rule-based. No external libraries.
"""

from typing import List, Dict, Any

def chunk_documents(documents: List[Dict[str, Any]], chunk_size: int = 1000, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
    """
    Split documents into smaller text chunks.
    
    Args:
        documents (List[Dict]): List of document dictionaries (from document_loader).
        chunk_size (int): Target size in characters (approx 200-300 tokens). Default 1000.
        chunk_overlap (int): Overlap in characters. Default 150.
        
    Returns:
        List[Dict]: List of chunk dictionaries with metadata preserved.
    """
    chunked_docs = []
    
    for doc in documents:
        text = doc.get("text", "")
        metadata = doc.get("metadata", {})
        
        chunks = _create_chunks(text, chunk_size, chunk_overlap)
        
        for i, chunk_text in enumerate(chunks):
            chunked_docs.append({
                "text": chunk_text,
                "metadata": {
                    **metadata,
                    "chunk_id": i,
                    "total_chunks": len(chunks)
                }
            })
            
    return chunked_docs

def _create_chunks(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """
    Split text into overlapping chunks respecting sentence/paragraph boundaries where possible.
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        
        # If we are at the end, just take the rest
        if end >= text_len:
            chunks.append(text[start:])
            break
            
        # Try to find a good break point (newline or period)
        # Look backwards from 'end' to find a break
        break_found = False
        
        # Priority 1: Paragraph break (\n\n)
        for i in range(end, max(start, end - 100), -1):
            if text[i:i+2] == '\n\n':
                end = i + 2 # Include the newlines
                break_found = True
                break
        
        # Priority 2: Sentence break (. )
        if not break_found:
            for i in range(end, max(start, end - 100), -1):
                if text[i:i+2] == '. ':
                    end = i + 1 # Include the period
                    break_found = True
                    break
        
        # If no good break found, just hard slice
        chunks.append(text[start:end])
        
        # Move start forward, respecting overlap
        start = end - chunk_overlap
        
        # Protect against infinite loops if overlap is too big or logic fails
        if start >= end:
            start = end
            
    return chunks
