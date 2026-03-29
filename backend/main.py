"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import documents, query, chat, admin, auth
from auth.middleware import get_current_user
from database.supabase_client import get_supabase

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AskIT starting up...")
    from ingestion.embedder import embed_query
    embed_query("warm up")
    print("✅ Embedding model loaded")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="AskIT API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(auth.router)


# -------------------------
# ROOT
# -------------------------
@app.get("/")
async def root():
    return {
        "message": "AskIT API",
        "status": "running"
    }


# -------------------------
# HEALTH CHECK
# -------------------------
@app.get("/health")
async def health():
    try:
        from ingestion.vector_store import get_collection_count
        return {
            "status": "ok",
            "vector_store_chunks": get_collection_count(),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# -------------------------
# USER STATS (FIXED)
# -------------------------
@app.get("/stats/user")
async def stats_user(user: dict = Depends(get_current_user)):
    """
    User analytics summary (ORG AWARE)
    """
    try:
        sb = get_supabase()

        rows = (
            sb.table("chat_history")
            .select("id, created_at, response")
            .eq("user_id", user["id"])
            .eq("org_id", user.get("org_id"))  # ✅ IMPORTANT FIX
            .execute()
            .data or []
        )

        total_questions = len(rows)

        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        queries_this_week = 0
        documents_referenced = 0

        for row in rows:
            created_at = row.get("created_at")

            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(
                    created_at.replace("Z", "+00:00")
                )

            if isinstance(created_at, datetime) and created_at >= week_ago:
                queries_this_week += 1

            response = row.get("response") or {}
            citations = response.get("citations") or []
            documents_referenced += len(citations)

        return {
            "total_questions": total_questions,
            "documents_referenced": documents_referenced,
            "queries_this_week": queries_this_week,
        }

    except Exception as e:
        return {"total_questions": 0, "documents_referenced": 0, "queries_this_week": 0}