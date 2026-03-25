"""Admin router (CLEAN + WORKING VERSION)"""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth.middleware import get_current_user
from database.supabase_client import get_supabase
from ingestion.vector_store import get_collection_count, get_org_chunk_count

router = APIRouter(prefix="/admin", tags=["admin"])


# -------------------------
# HELPERS
# -------------------------
def _parse_ts(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except:
            pass
    return datetime.min.replace(tzinfo=timezone.utc)


def _apply_org_scope(query, user: dict):
    if user.get("org_id"):
        return query.eq("org_id", user["org_id"])
    return query


# -------------------------
# DASHBOARD
# -------------------------
@router.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        total_documents = int(
            _apply_org_scope(
                sb.table("documents").select("id", count="exact").limit(1),
                user
            ).execute().count or 0
        )

        total_members = int(
            _apply_org_scope(
                sb.table("members").select("id", count="exact").limit(1),
                user
            ).execute().count or 0
        )

        total_queries = int(
            _apply_org_scope(
                sb.table("chat_history").select("id", count="exact").limit(1),
                user
            ).execute().count or 0
        )

        return {
            "total_documents": total_documents,
            "total_members": total_members,
            "total_queries": total_queries,
            "chunks_indexed": get_org_chunk_count(user.get("org_id")),
        }

    except Exception as e:
        # Return zeros instead of crashing the dashboard
        return {
            "total_documents": 0,
            "total_members": 0,
            "total_queries": 0,
            "chunks_indexed": 0,
        }


# -------------------------
# ACTIVITY
# -------------------------
@router.get("/activity")
async def activity(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        chats = _apply_org_scope(
            sb.table("chat_history")
            .select("query, created_at")
            .order("created_at", desc=True)
            .limit(20),
            user,
        ).execute().data or []

        docs = _apply_org_scope(
            sb.table("documents")
            .select("name, created_at")
            .order("created_at", desc=True)
            .limit(20),
            user,
        ).execute().data or []

        events = []

        for c in chats:
            events.append({
                "type": "query",
                "title": c.get("query"),
                "timestamp": c.get("created_at"),
            })

        for d in docs:
            events.append({
                "type": "document",
                "title": d.get("name"),
                "timestamp": d.get("created_at"),
            })

        events.sort(key=lambda x: _parse_ts(x["timestamp"]), reverse=True)

        return {"events": events[:10]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# MEMBERS
# -------------------------
@router.get("/members")
async def get_members(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        result = _apply_org_scope(
            sb.table("members").select("*").order("created_at", desc=True),
            user
        ).execute()

        return {"items": result.data or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateMemberRequest(BaseModel):
    name: str
    email: str
    member_type: str = "general"


@router.post("/members")
async def add_member(body: CreateMemberRequest, user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        existing = (
            sb.table("members")
            .select("id")
            .eq("email", body.email)
            .eq("org_id", user["org_id"])
            .execute()
        )

        if existing.data:
            raise HTTPException(status_code=400, detail="Member already exists in this organization")

        sb.table("members").insert({
            "name": body.name,
            "email": body.email,
            "role": "user",
            "member_type": body.member_type,
            "org_id": user["org_id"],
            "is_registered": False,
        }).execute()

        return {"message": "Member added successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# DOCUMENTS
# -------------------------
@router.get("/documents")
async def get_documents(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        result = _apply_org_scope(
            sb.table("documents").select("*").order("created_at", desc=True),
            user
        ).execute()

        return {"items": result.data or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# ANALYTICS
# -------------------------
@router.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        chats = _apply_org_scope(
            sb.table("chat_history").select("created_at"),
            user
        ).execute().data or []

        now = datetime.now(timezone.utc)
        last_7_days = now - timedelta(days=7)

        queries_last_7_days = sum(
            1 for c in chats
            if _parse_ts(c.get("created_at")) >= last_7_days
        )

        # Build queries per day for last 7 days
        day_counts: dict[str, int] = {}
        for i in range(7):
            day = (now - timedelta(days=6 - i)).strftime("%b %d")
            day_counts[day] = 0
        for c in chats:
            ts = _parse_ts(c.get("created_at"))
            if ts >= last_7_days:
                label = ts.strftime("%b %d")
                if label in day_counts:
                    day_counts[label] += 1
        queries_over_time = [{"label": k, "value": v} for k, v in day_counts.items()]

        # Total members
        total_members = 0
        try:
            members_res = _apply_org_scope(
                sb.table("members").select("id", count="exact").limit(1), user
            ).execute()
            total_members = int(members_res.count or 0)
        except Exception:
            pass

        # Total documents
        total_documents = 0
        try:
            docs_res = _apply_org_scope(
                sb.table("documents").select("id", count="exact").limit(1), user
            ).execute()
            total_documents = int(docs_res.count or 0)
        except Exception:
            pass

        return {
            "queries_last_7_days": queries_last_7_days,
            "total_queries": len(chats),
            "total_members": total_members,
            "total_documents": total_documents,
            "total_chunks": get_org_chunk_count(user.get("org_id")),
            "queries_over_time": queries_over_time,
        }

    except Exception as e:
        return {
            "queries_last_7_days": 0,
            "total_queries": 0,
            "total_members": 0,
            "total_documents": 0,
            "total_chunks": 0,
            "queries_over_time": [],
        }


# -------------------------
# ORGANIZATION
# -------------------------
@router.get("/organization")
async def get_org(user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()

        result = (
            sb.table("organizations")
            .select("id, name, type")
            .eq("id", user["org_id"])
            .limit(1)
            .execute()
        )

        if result.data:
            org = result.data[0]
            return {
                "org_id": org["id"],
                "name": org["name"],
                "type": org["type"]
            }

        return {}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))