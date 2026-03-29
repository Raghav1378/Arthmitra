import os
import argparse
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

# Configuration
BACKEND_DIR = Path(__file__).parent
DATA_DIR = BACKEND_DIR / "data"
PDF_DIR = DATA_DIR / "rbi_pdfs"
CHROMA_DIR = DATA_DIR / "chroma_store"
MODEL_NAME = "nomic-embed-text-v2-moe:latest"

def ingest():
    print(f"🚀 Starting RAG Ingestion for RBI PDFs...")
    
    # 1. Initialize Directories
    if not PDF_DIR.exists():
        PDF_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Created PDF directory: {PDF_DIR}")
        
    if not CHROMA_DIR.exists():
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Created Chroma store directory: {CHROMA_DIR}")

    # 2. Load Documents
    print(f"📁 Scanning for PDFs in: {PDF_DIR}")
    loader = DirectoryLoader(
        str(PDF_DIR),
        glob="*.pdf",
        loader_cls=PyPDFLoader
    )
    
    documents = loader.load()
    if not documents:
        print("❌ No PDFs found in the directory. Please add RBI PDFs and try again.")
        return

    print(f"📄 Loaded {len(documents)} document pages.")

    # 3. Split Text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        add_start_index=True
    )
    chunks = text_splitter.split_documents(documents)
    print(f"✂️ Split into {len(chunks)} text chunks.")

    # 4. Initialize Embeddings
    print(f"✨ Initializing Ollama embeddings: {MODEL_NAME}")
    embeddings = OllamaEmbeddings(model=MODEL_NAME)

    # 5. Create Vector Store
    print(f"💾 Persisting to ChromaDB at: {CHROMA_DIR}")
    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(CHROMA_DIR)
    )
    
    print("✅ Ingestion complete!")
    return len(chunks)

def verify(query="KYC norms"):
    print(f"\n🔍 Verifying RAG Knowledge Base...")
    embeddings = OllamaEmbeddings(model=MODEL_NAME)
    
    if not CHROMA_DIR.exists():
        print("❌ Chroma store not found. Please run ingestion first.")
        return

    vectordb = Chroma(
        persist_directory=str(CHROMA_DIR),
        embedding_function=embeddings
    )
    
    # Get total count (Chroma doesn't have a direct 'len', but we can check the collection)
    collection_count = vectordb._collection.count()
    print(f"📊 Total Chunks in DB: {collection_count}")
    
    print(f"🔎 Querying: '{query}'")
    results = vectordb.similarity_search(query, k=3)
    
    print("\n--- Top 3 Results ---")
    for i, doc in enumerate(results):
        source = Path(doc.metadata.get('source', 'unknown')).name
        page = doc.metadata.get('page', '?')
        print(f"\nResult {i+1} (Source: {source}, Page: {page}):")
        print("-" * 40)
        print(doc.page_content[:300] + "...")
    print("-" * 40)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RBI RAG Ingestion Script")
    parser.add_argument("--verify", action="store_true", help="Verify the vector store with a test query")
    args = parser.parse_args()

    if args.verify:
        verify()
    else:
        ingest()
