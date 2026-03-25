"""Chat history router."""
from fastapi import APIRouter, Depends, Query
from auth.middleware import get_current_user
from database.supabase_client import get_chat_history

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history")
async def chat_history(
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user)
):
    """Get the authenticated user's chat history."""
    history = get_chat_history(user["id"], limit=limit)
    return {"history": history, "count": len(history)}
