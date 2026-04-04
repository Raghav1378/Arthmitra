import os
from pathlib import Path
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from typing import Dict, Any

# Get the backend directory path
BACKEND_DIR = Path(__file__).parent.parent.parent

# Initialize Embeddings
embeddings = OllamaEmbeddings(model="nomic-embed-text")
persist_directory = BACKEND_DIR / 'data' / 'chroma_db'
knowledge_dir = BACKEND_DIR / 'knowledge'

@tool
def query_knowledge_base(query: str) -> Dict[str, Any]:
    """Queries the RBI policy and financial guidelines knowledge base."""
    if not persist_directory.exists():
        return {
            "error": "Knowledge base not yet initialized. Please ingest data first.",
            "query": query
        }

    try:
        vectordb = Chroma(
            persist_directory=str(persist_directory),
            embedding_function=embeddings
        )
        docs = vectordb.similarity_search(query, k=2)

        return {
            "answer_context": [doc.page_content for doc in docs],
            "source": "RBI Guidelines / Financial Policy",
            "documents_found": len(docs),
            "query": query
        }
    except Exception as e:
        return {
            "error": f"Error querying knowledge base: {str(e)}",
            "query": query
        }

def ingest_knowledge() -> Dict[str, Any]:
    """Ingests files from knowledge/ directory into the vector store."""
    if not knowledge_dir.exists():
        # Create knowledge directory if it doesn't exist
        knowledge_dir.mkdir(parents=True, exist_ok=True)

    all_docs = []
    for filename in knowledge_dir.iterdir():
        if filename.is_file() and filename.suffix == '.txt':
            try:
                loader = TextLoader(str(filename))
                all_docs.extend(loader.load())
            except Exception as e:
                print(f"Warning: Could not load file {filename}: {e}")

    if not all_docs:
        # Create a sample file if none exists
        sample_path = knowledge_dir / "rbi_sample.txt"
        sample_content = """RBI Guidelines:
- UPI transaction limit is set by individual banks, typically Rs.1,00,000 per day
- Users should never share OTP, PIN, or password with anyone
- Banks never ask for sensitive information via phone, SMS, or email
- Report unauthorized transactions immediately to your bank
- Use strong unique passwords for all financial accounts
- Enable two-factor authentication wherever available
"""
        try:
            with open(sample_path, "w", encoding='utf-8') as f:
                f.write(sample_content)
            loader = TextLoader(str(sample_path))
            all_docs.extend(loader.load())
            print(f"Created sample knowledge file at: {sample_path}")
        except Exception as e:
            return {
                "success": False,
                "error": f"Could not create sample file: {str(e)}"
            }

    try:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(all_docs)

        Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            persist_directory=str(persist_directory)
        )
        return {
            "success": True,
            "documents_ingested": len(all_docs),
            "chunks_created": len(splits),
            "persist_directory": str(persist_directory)
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create vector store: {str(e)}"
        }

if __name__ == "__main__":
    result = ingest_knowledge()
    if result.get("success"):
        print(f"Knowledge base ingested successfully.")
        print(f"Documents: {result['documents_ingested']}, Chunks: {result['chunks_created']}")
    else:
        print(f"Failed to ingest knowledge base: {result.get('error', 'Unknown error')}")