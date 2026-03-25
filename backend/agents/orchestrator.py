"""
Agent Orchestrator — FIXED (ORG-AWARE)
"""

import time
from agents.planning_agent import run_planning_agent
from agents.retrieval_agent import run_retrieval_agent
from agents.synthesis_agent import run_synthesis_agent


def run_query_pipeline(
    query: str,
    chat_history: list[dict] | None = None,
    org_id: str | None = None,   # 🔥 IMPORTANT
) -> dict:

    start_time = time.time()
    trace = {}

    # -------------------------
    # STEP 1: PLANNING
    # -------------------------
    planning_start = time.time()

    planning_result = run_planning_agent(query, chat_history)

    planning_ms = int((time.time() - planning_start) * 1000)

    trace["planning"] = {
        "agent": "Planning Agent",
        "action": f"Decomposed query into {len(planning_result.get('sub_queries', [query]))} sub-queries",
        "intent": planning_result.get("intent", query),
        "sub_queries": planning_result.get("sub_queries", [query]),
        "duration_ms": planning_ms,
    }

    # -------------------------
    # STEP 2: RETRIEVAL (FIXED)
    # -------------------------
    retrieval_start = time.time()

    retrieval_result = run_retrieval_agent(
        sub_queries=planning_result.get("sub_queries", [query]),
        org_id=org_id,   # 🔥 CRITICAL FIX
    )

    retrieval_ms = int((time.time() - retrieval_start) * 1000)

    retrieved_chunks = retrieval_result.get("chunks", [])

    trace["retrieval"] = {
        "agent": "Retrieval Agent",
        "action": f"Retrieved {len(retrieved_chunks)} chunks from vector store",
        "chunks_found": len(retrieved_chunks),
        "sources_used": retrieval_result.get("sources_used", []),
        "top_scores": retrieval_result.get("top_scores", []),
        "duration_ms": retrieval_ms,
    }

    # -------------------------
    # STEP 3: SYNTHESIS
    # -------------------------
    synthesis_start = time.time()

    synthesis_result = run_synthesis_agent(
        query,
        retrieved_chunks,
        planning_result
    )

    synthesis_ms = int((time.time() - synthesis_start) * 1000)

    trace["synthesis"] = {
        "agent": "Synthesis Agent",
        "action": "Synthesized answer from retrieved context",
        "confidence": synthesis_result.get("confidence", 0.0),
        "citations_count": len(synthesis_result.get("citations", [])),
        "duration_ms": synthesis_ms,
    }

    total_ms = int((time.time() - start_time) * 1000)

    # -------------------------
    # SAFE FALLBACK (IMPORTANT)
    # -------------------------
    if not synthesis_result.get("answer"):
        return {
            "answer": "No relevant information found in your organization documents.",
            "confidence": 0.0,
            "has_information": False,
            "citations": [],
            "reasoning_trace": trace,
            "total_time_ms": total_ms,
        }

    return {
        "answer": synthesis_result.get("answer"),
        "confidence": synthesis_result.get("confidence", 0.0),
        "has_information": synthesis_result.get("has_information", True),
        "citations": synthesis_result.get("citations", []),
        "reasoning_trace": trace,
        "total_time_ms": total_ms,
    }