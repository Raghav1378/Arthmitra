# 🧠 Module 2: The Brain

A local, privacy-preserving financial knowledge base and document analyzer.

## 📂 Structure
```
backend/app/brain/
├── rag/                # RAG Pipeline
│   ├── document_loader # Loads TXT/PDF from /data
│   ├── embedding_store # FAISS vector store
│   └── rag_answer      # Gemma3 answer generator
├── summarizer/         # Document Summarizer
│   └── financial_summarizer.py
├── data/               # Place verified documents here
└── brain_api.py        # Main entry point
```

## 🚀 Usage

### 1. Initialize (Index Documents)
Run this once or when adding new documents to `backend/app/brain/data/`.
```python
from app.brain.brain_api import initialize_brain
initialize_brain(force_rebuild=True)
```

### 2. Ask Financial Questions (RAG)
```python
from app.brain.brain_api import ask_financial_question

response = ask_financial_question("What are the KYC norms for high risk customers?")
print(response["answer"])
# Source: rbi_kyc_2023.txt
```

### 3. Summarize Documents
```python
from app.brain.brain_api import summarize_financial_document

text = "Loan Agreement: Interest 12%, Penalty 2%..."
summary = summarize_financial_document(text)
print(summary["risk_flags"])
```

## 🧪 Verification

Run the included test script:
```bash
python test_brain.py
```

## ⚠️ Requirements
Ensure Ollama is running (`ollama serve`) and models are pulled:
- `gemma3:latest` (Generation)
- `nomic-embed-text:latest` (Embeddings)
