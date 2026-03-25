"""Synthesis Agent — generates structured answers from retrieved chunks."""
import json
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from config import get_settings

SYSTEM_PROMPT = """You are a Synthesis Agent for a knowledge assistant system.
You receive a user's question and a set of relevant document chunks.
Your job is to compose a clear, accurate, and well-structured answer.

STRICT RULES:
1. ONLY use information from the provided context chunks — never hallucinate
2. If context is insufficient, respond with "No relevant information found in the knowledge base."
3. Always cite your sources using the provided metadata
4. Be concise but thorough

Return your response as valid JSON with this exact structure:
{
  "answer": "Your detailed answer here. Use markdown formatting (bold, lists, etc.)",
  "confidence": 0.85,
  "has_information": true,
  "citations": [
    {
      "source_name": "document name",
      "source_url": "url or empty string",
      "doc_type": "pdf or url",
      "relevant_excerpt": "brief excerpt from the chunk"
    }
  ],
  "synthesis_notes": "brief note on how you synthesized the answer"
}

The confidence score (0.0–1.0) reflects how well the context answers the question.
"""


def run_synthesis_agent(
    query: str,
    chunks: list[dict],
    planning_result: dict,
) -> dict:
    """
    Generate a structured answer from retrieved chunks.
    Returns dict: {answer, confidence, has_information, citations, synthesis_notes}
    """
    settings = get_settings()

    if not chunks:
        return {
            "answer": "No relevant information found in the knowledge base.",
            "confidence": 0.0,
            "has_information": False,
            "citations": [],
            "synthesis_notes": "No chunks were retrieved from the vector store.",
        }

    llm = ChatGroq(
        groq_api_key=settings.groq_api_key,
        model_name=settings.groq_model,
        temperature=0.2,
    )

    # Build context block from chunks
    context_parts = []
    for i, chunk in enumerate(chunks[:8], 1):  # Limit to 8 chunks
        meta = chunk["metadata"]
        context_parts.append(
            f"[Chunk {i}] Source: {meta.get('source_name', 'Unknown')} "
            f"| Type: {meta.get('doc_type', 'unknown')} "
            f"| Score: {chunk.get('score', 0):.2f}\n"
            f"{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    user_prompt = (
        f"User Question: {query}\n\n"
        f"Query Intent: {planning_result.get('intent', query)}\n\n"
        f"Retrieved Context:\n{context}"
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    try:
        response = llm.invoke(messages)
        content = response.content.strip()
        # Extract JSON even if wrapped in markdown
        if "```" in content:
            parts = content.split("```")
            content = parts[1] if len(parts) > 1 else content
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content)
    except Exception as e:
        # Fallback: plain answer from LLM text
        parsed = {
            "answer": response.content if 'response' in locals() else f"Error: {str(e)}",
            "confidence": 0.5,
            "has_information": bool(chunks),
            "citations": _build_citations(chunks[:3]),
            "synthesis_notes": f"Exception: {str(e)}",
        }

    # Ensure citations are always built from real metadata
    if not parsed.get("citations"):
        parsed["citations"] = _build_citations(chunks[:3])

    return parsed


def _build_citations(chunks: list[dict]) -> list[dict]:
    """Build citation objects from chunk metadata."""
    citations = []
    seen = set()
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        source = meta.get("source_name", "Unknown")
        if source not in seen:
            seen.add(source)
            citations.append({
                "source_name": source,
                "source_url": meta.get("source_url", ""),
                "doc_type": meta.get("doc_type", "unknown"),
                "relevant_excerpt": chunk["text"][:200] + "...",
            })
    return citations
