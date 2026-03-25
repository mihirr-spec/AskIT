"""Retrieval Agent — ORG-AWARE FIXED VERSION"""

from ingestion.embedder import embed_query
from ingestion import vector_store


def run_retrieval_agent(
    sub_queries: list[str],
    org_id: str | None = None,   # 🔥 IMPORTANT
    top_k: int = 5
) -> dict:
    """
    ORG-AWARE retrieval from ChromaDB
    """

    seen_texts: set[str] = set()
    all_chunks: list[dict] = []

    for sub_query in sub_queries:
        embedding = embed_query(sub_query)

        # 🔥 CRITICAL FIX: filter by org_id
        results = vector_store.search(
            embedding,
            top_k=top_k,
            filter={"org_id": org_id} if org_id else None
        )

        for chunk in results:
            text_key = chunk["text"][:100]

            if text_key not in seen_texts:
                seen_texts.add(text_key)
                all_chunks.append(chunk)

    # -------------------------
    # SORT BY SCORE
    # -------------------------
    all_chunks.sort(key=lambda x: x.get("score", 0), reverse=True)

    # -------------------------
    # LIMIT RESULTS
    # -------------------------
    final_chunks = all_chunks[: top_k * 2]

    # -------------------------
    # SOURCES
    # -------------------------
    sources = list({
        c.get("metadata", {}).get("source_name", "Unknown")
        for c in final_chunks
    })

    return {
        "chunks": final_chunks,
        "sources_used": sources,
        "total_retrieved": len(final_chunks),
    }