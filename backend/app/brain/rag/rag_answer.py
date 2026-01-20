"""
RAG Answer Generator

Generates grounded answers using Gemma3 and retrieved context.
Enforces Strict Source Discipline, Query-Domain Alignment,
and Conservative Confidence Scoring.
"""

import os
from typing import List, Dict, Any
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.documents import Document


def select_dominant_document(
    context_docs: List[Document],
    query: str
) -> List[Document]:
    """
    Enforce Single-Authority Rule with Query–Document Alignment.

    Final Score = chunk_count × regulatory_multiplier × query_alignment_bonus
    """
    if not context_docs:
        return []

    docs_by_source = {}
    for doc in context_docs:
        source = os.path.basename(doc.metadata.get("source", "Unknown"))
        docs_by_source.setdefault(source, []).append(doc)

    def get_multiplier(source_name: str) -> float:
        name = source_name.lower()
        if "rbi" in name or "tax" in name or "act" in name:
            return 3.0
        if "policy" in name or "agreement" in name:
            return 2.0
        return 1.0

    query_lower = query.lower()
    source_scores = {}

    for source, docs in docs_by_source.items():
        base_score = len(docs)
        multiplier = get_multiplier(source)

        # 🔒 Query–Domain Alignment
        alignment_bonus = 1.0
        src = source.lower()

        if "kyc" in query_lower and "kyc" in src:
            alignment_bonus = 2.0
        elif "credit card" in query_lower and "credit" in src:
            alignment_bonus = 2.0
        elif "loan" in query_lower and "loan" in src:
            alignment_bonus = 2.0
        elif "tax" in query_lower and ("tax" in src or "income" in src):
            alignment_bonus = 2.0
        elif "insurance" in query_lower and "policy" in src:
            alignment_bonus = 2.0

        source_scores[source] = base_score * multiplier * alignment_bonus

    dominant_source = max(source_scores, key=source_scores.get)
    return docs_by_source[dominant_source]


def generate_rag_answer(query: str, context_docs: List[Document]) -> Dict[str, Any]:
    """
    Generate a grounded answer using Gemma3 with strict domain isolation.
    """

    llm = ChatOllama(
        model="gemma3:latest",
        temperature=0.1,
        format="json"
    )

    # 1️⃣ Select correct authority document
    filtered_docs = select_dominant_document(context_docs, query)

    if not filtered_docs:
        return {
            "answer": "I don't have verified information for this.",
            "sources": [],
            "confidence": "LOW"
        }

    dominant_source = os.path.basename(filtered_docs[0].metadata.get("source", "Unknown"))
    context_text = "\n\n".join(doc.page_content for doc in filtered_docs)

    prompt = PromptTemplate(
        template="""
You are a financial regulatory assistant.

STRICT RULES:
1. Use ONLY the provided context.
2. Do NOT mix legal or regulatory domains.
3. Do NOT invent penalties, timelines, or numbers.
4. If the answer is not explicitly supported, say:
   "I don't have verified information for this."
5. Prefer conservative, conditional language.

CONTEXT:
{context}

QUESTION:
{question}

OUTPUT JSON FORMAT:
{{
  "answer": "Clear, grounded answer",
  "sources": ["{source_name}"],
  "confidence": "HIGH | MEDIUM | LOW"
}}
""",
        input_variables=["context", "question", "source_name"]
    )

    chain = prompt | llm | JsonOutputParser()

    try:
        response = chain.invoke({
            "context": context_text,
            "question": query,
            "source_name": dominant_source
        })

        answer_text = response.get("answer", "").lower()

        # 2️⃣ Lexical grounding check
        answer_tokens = set(answer_text.split())
        doc_text = " ".join(doc.page_content.lower() for doc in filtered_docs)
        doc_tokens = set(doc_text.split())

        stopwords = {
            "the", "and", "is", "of", "to", "in", "a", "it", "that", "this",
            "for", "with", "on", "are", "if", "may", "can"
        }

        meaningful_overlap = (answer_tokens & doc_tokens) - stopwords

        if len(meaningful_overlap) < 3:
            return {
                "answer": "I don't have verified information for this.",
                "sources": [],
                "confidence": "LOW"
            }

        # 3️⃣ Confidence grading (NO blind HIGH)
        if "according to" in answer_text or "guidelines" in answer_text:
            confidence = "HIGH"
        elif "may" in answer_text or "can" in answer_text:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "answer": response["answer"],
            "sources": [dominant_source],
            "confidence": confidence
        }

    except Exception as e:
        return {
            "answer": f"Generation failed: {str(e)}",
            "sources": [],
            "confidence": "LOW"
        }
