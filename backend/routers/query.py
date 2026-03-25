"""Query router — run the agentic RAG pipeline (FIXED)"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from auth.middleware import get_current_user
from agents.orchestrator import run_query_pipeline
from database.supabase_client import save_chat_message, get_chat_history

router = APIRouter(prefix="/query", tags=["query"])


# -------------------------
# REQUEST MODEL
# -------------------------
class QueryRequest(BaseModel):
    query: str
    include_history: Optional[bool] = True


# -------------------------
# MAIN QUERY ENDPOINT
# -------------------------
@router.post("")
@router.post("/ask")
async def run_query(body: QueryRequest, user: dict = Depends(get_current_user)):
    try:
        if not body.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        if not user.get("org_id"):
            raise HTTPException(status_code=400, detail="User not linked to any organization")

        # -------------------------
        # LOAD CHAT HISTORY
        # -------------------------
        history = []
        if body.include_history:
            history = get_chat_history(user["id"], limit=10) or []

        # -------------------------
        # RUN PIPELINE (IMPORTANT FIX)
        # -------------------------
        result = run_query_pipeline(
            query=body.query,
            chat_history=history,
            org_id=user["org_id"]  # 🔥 CRITICAL FIX
        )

        if not result:
            result = {
                "answer": "No relevant information found.",
                "citations": []
            }

        # -------------------------
        # SAVE TO DB
        # -------------------------
        record = save_chat_message(
            user_id=user["id"],
            org_id=user["org_id"],
            query=body.query,
            response=result,
        )

        # -------------------------
        # RESPONSE
        # -------------------------
        return {
            "id": record.get("id") if record else None,
            "query": body.query,
            "answer": result.get("answer"),
            "citations": result.get("citations", []),
            "confidence": result.get("confidence"),
            "reasoning_trace": result.get("reasoning_trace"),
            "total_time_ms": result.get("total_time_ms"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))