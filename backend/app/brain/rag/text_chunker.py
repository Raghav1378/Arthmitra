"""
Text Chunker

Splits documents into manageably sized chunks for embedding.
"""

from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_documents(documents: List[Document], chunk_size: int = 400, chunk_overlap: int = 80) -> List[Document]:
    """
    Split documents into smaller chunks.
    
    Args:
        documents: List of Document objects
        chunk_size: Target size of chunks (characters/tokens approx)
        chunk_overlap: Overlap between chunks to preserve context
        
    Returns:
        List of distinct chunked Document objects
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
        length_function=len,
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"Split {len(documents)} documents into {len(chunks)} chunks.")
    return chunks
