import os
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

# Initialize Embeddings
embeddings = OllamaEmbeddings(model="nomic-embed-text")
persist_directory = 'backend/data/chroma_db'

@tool
def query_knowledge_base(query: str):
    """Queries the RBI policy and financial guidelines knowledge base."""
    if not os.path.exists(persist_directory):
        return "Knowledge base not yet initialized. Please ingest data first."
    
    vectordb = Chroma(persist_directory=persist_directory, embedding_function=embeddings)
    docs = vectordb.similarity_search(query, k=2)
    
    return {
        "answer_context": [doc.page_content for doc in docs],
        "source": "RBI Guidelines / Financial Policy"
    }

def ingest_knowledge():
    """Ingests files from backend/knowledge/ into the vector store."""
    knowledge_dir = 'backend/knowledge'
    if not os.path.exists(knowledge_dir):
        return
    
    all_docs = []
    for filename in os.listdir(knowledge_dir):
        if filename.endswith(".txt"):
            loader = TextLoader(os.path.join(knowledge_dir, filename))
            all_docs.extend(loader.load())
            
    if not all_docs:
        # Create a sample file if none exists
        sample_path = os.path.join(knowledge_dir, "rbi_sample.txt")
        with open(sample_path, "w") as f:
            f.write("RBI Guidelines: UPI transaction limit is set by banks. Users should never share OTP or PIN.")
        loader = TextLoader(sample_path)
        all_docs.extend(loader.load())

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = text_splitter.split_documents(all_docs)
    
    Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=persist_directory)
    print("Knowledge base ingested successfully.")

if __name__ == "__main__":
    ingest_knowledge()
