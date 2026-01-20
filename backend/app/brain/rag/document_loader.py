"""
Document Loader

Unified loader for text and PDF documents from the data directory.
"""

import os
import glob
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import TextLoader, PyPDFLoader

def load_documents(data_dir: str) -> List[Document]:
    """
    Load all supported documents from the data directory.
    
    Args:
        data_dir: Path to directory containing documents
        
    Returns:
        List of LangChain Document objects
    """
    documents = []
    
    if not os.path.exists(data_dir):
        print(f"Warning: Data directory {data_dir} does not exist.")
        return []
        
    # Load .txt files
    txt_files = glob.glob(os.path.join(data_dir, "**/*.txt"), recursive=True)
    for file_path in txt_files:
        try:
            loader = TextLoader(file_path, encoding='utf-8')
            documents.extend(loader.load())
            print(f"Loaded: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"Error loading {file_path}: {e}")

    # Load .pdf files
    pdf_files = glob.glob(os.path.join(data_dir, "**/*.pdf"), recursive=True)
    for file_path in pdf_files:
        try:
            loader = PyPDFLoader(file_path)
            documents.extend(loader.load())
            print(f"Loaded: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"Error loading {file_path}: {e} (PyPDFLoader might be missing)")
            
    return documents
