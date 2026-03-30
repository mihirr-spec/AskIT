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
        email = body.email.lower().strip()

        existing = (
            sb.table("members")
            .select("id")
            .eq("email", email)
            .eq("org_id", user["org_id"])
            .execute()
        )

        if existing.data:
            raise HTTPException(status_code=400, detail="Member already exists in this organization")

        sb.table("members").insert({
            "name": body.name,
            "email": email,
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
async def analytics(time_range: str = Query("7d", alias="range"), user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()
        now = datetime.now(timezone.utc)

        # Fetch all chats with response payload for this org
        chats = _apply_org_scope(
            sb.table("chat_history").select("created_at, user_id, query, response"),
            user,
        ).execute().data or []

        # ── Queries over time (range-aware) ──
        if time_range == "30d":
            window_start = now - timedelta(days=30)
            period_labels = [(now - timedelta(days=29 - i)).strftime("%b %d") for i in range(30)]
            def period_key(ts): return ts.strftime("%b %d")
        elif time_range == "90d":
            window_start = now - timedelta(weeks=13)
            period_labels = [f"W{i+1}" for i in range(13)]
            def period_key(ts):
                weeks_ago = int((now - ts).days / 7)
                idx = 12 - min(weeks_ago, 12)
                return f"W{idx+1}"
        else:  # 7d default
            window_start = now - timedelta(days=7)
            period_labels = [(now - timedelta(days=6 - i)).strftime("%b %d") for i in range(7)]
            def period_key(ts): return ts.strftime("%b %d")

        period_counts: dict[str, int] = {lbl: 0 for lbl in period_labels}
        for c in chats:
            ts = _parse_ts(c.get("created_at"))
            if ts >= window_start:
                key = period_key(ts)
                if key in period_counts:
                    period_counts[key] += 1
        queries_over_time = [{"label": k, "value": v} for k, v in period_counts.items()]

        # ── Last-7-days count (always) ──
        last_7 = now - timedelta(days=7)
        queries_last_7_days = sum(1 for c in chats if _parse_ts(c.get("created_at")) >= last_7)

        # ── Avg confidence & latency from response JSONB ──
        confidences, latencies = [], []
        for c in chats:
            resp = c.get("response") or {}
            if isinstance(resp, dict):
                conf = resp.get("confidence")
                lat  = resp.get("total_time_ms")
                if conf is not None:
                    try: confidences.append(float(conf))
                    except: pass
                if lat is not None:
                    try: latencies.append(float(lat))
                    except: pass
        avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else None
        avg_latency_ms = round(sum(latencies)    / len(latencies))     if latencies    else None

        # ── Members + per-member query counts ──
        total_members, members_list = 0, []
        try:
            mres = _apply_org_scope(
                sb.table("members").select("id, name, auth_user_id").limit(200), user
            ).execute()
            members_list  = mres.data or []
            total_members = len(members_list)
        except Exception:
            pass

        member_query_counts = []
        for m in members_list:
            auth_id = m.get("auth_user_id")
            count   = sum(1 for c in chats if c.get("user_id") == auth_id) if auth_id else 0
            member_query_counts.append({"name": m.get("name", "?"), "count": count})
        member_query_counts.sort(key=lambda x: x["count"], reverse=True)

        # ── Documents: total, chunks by type, indexing by week ──
        total_documents   = 0
        chunks_by_type    = {"pdf": 0, "url": 0, "arxiv": 0}
        chunk_indexing_by_week = []
        try:
            dres = _apply_org_scope(
                sb.table("documents").select("id, type, created_at").order("created_at"), user
            ).execute()
            docs_data      = dres.data or []
            total_documents = len(docs_data)

            for d in docs_data:
                dtype = (d.get("type") or "pdf").lower()
                if dtype in chunks_by_type:
                    chunks_by_type[dtype] += 1

            eight_weeks_ago = now - timedelta(weeks=8)
            week_counts     = {f"W{i+1}": 0 for i in range(8)}
            for d in docs_data:
                ts = _parse_ts(d.get("created_at"))
                if ts >= eight_weeks_ago:
                    wk = min(int((now - ts).days / 7), 7)
                    week_counts[f"W{8 - wk}"] += 1
            chunk_indexing_by_week = [{"label": k, "value": v} for k, v in week_counts.items()]
        except Exception:
            pass

        # ── Recent queries (last 10 with meta) ──
        sorted_chats   = sorted(chats, key=lambda x: _parse_ts(x.get("created_at")), reverse=True)
        recent_queries = []
        for c in sorted_chats[:10]:
            resp = c.get("response") or {}
            recent_queries.append({
                "query":        c.get("query", ""),
                "created_at":   c.get("created_at"),
                "confidence":   resp.get("confidence")    if isinstance(resp, dict) else None,
                "total_time_ms":resp.get("total_time_ms") if isinstance(resp, dict) else None,
            })

        return {
            "queries_last_7_days":    queries_last_7_days,
            "total_queries":          len(chats),
            "total_members":          total_members,
            "total_documents":        total_documents,
            "total_chunks":           get_org_chunk_count(user.get("org_id")),
            "queries_over_time":      queries_over_time,
            "avg_confidence":         avg_confidence,
            "avg_latency_ms":         avg_latency_ms,
            "member_query_counts":    member_query_counts,
            "chunks_by_type":         chunks_by_type,
            "chunk_indexing_by_week": chunk_indexing_by_week,
            "recent_queries":         recent_queries,
        }

    except Exception as e:
        return {
            "queries_last_7_days":    0,
            "total_queries":          0,
            "total_members":          0,
            "total_documents":        0,
            "total_chunks":           0,
            "queries_over_time":      [],
            "avg_confidence":         None,
            "avg_latency_ms":         None,
            "member_query_counts":    [],
            "chunks_by_type":         {"pdf": 0, "url": 0, "arxiv": 0},
            "chunk_indexing_by_week": [],
            "recent_queries":         [],
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