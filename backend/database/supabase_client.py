from supabase import create_client, Client
from config import get_settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        settings = get_settings()
        # Service key must be a JWT (starts with eyJ). Fall back to anon key if not.
        key = settings.supabase_service_key
        if not key or not key.startswith('eyJ'):
            key = settings.supabase_anon_key
        _client = create_client(settings.supabase_url, key)
    return _client


# ── Documents ────────────────────────────────────────────────────────────────

def create_document(name: str, doc_type: str, org_id: str,
                    source_url: str | None = None,
                    file_path: str | None = None) -> dict:
    sb = get_supabase()
    data = {
        "name": name,
        "type": doc_type,
        "org_id": org_id,
        "source_url": source_url,
        "file_path": file_path,
        "status": "pending",
    }
    result = sb.table("documents").insert(data).execute()
    return result.data[0] if result.data else {}


def update_document_status(doc_id: str, status: str) -> None:
    sb = get_supabase()
    sb.table("documents").update({"status": status}).eq("id", doc_id).execute()


def list_documents(org_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("documents").select("*").eq("org_id", org_id).order("created_at", desc=True).execute()
    return result.data or []


def get_all_documents() -> list[dict]:
    """Retrieve all documents (for User dashboard context)."""
    sb = get_supabase()
    result = sb.table("documents").select("*").order("created_at", desc=True).execute()
    return result.data or []


# ── Chat History ─────────────────────────────────────────────────────────────

def save_chat_message(user_id: str, org_id: str, query: str, response: dict) -> dict:
    sb = get_supabase()
    data = {"user_id": user_id, "org_id": org_id, "query": query, "response": response}
    result = sb.table("chat_history").insert(data).execute()
    return result.data[0] if result.data else {}


def get_chat_history(user_id: str, limit: int = 50) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("chat_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(result.data or []))
