"""ChromaDB vector store interface (ORG-AWARE FIXED)"""

import uuid
from functools import lru_cache
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import get_settings

COLLECTION_NAME = "knowledge_base"


# -------------------------
# CLIENT
# -------------------------
@lru_cache(maxsize=1)
def _get_client() -> chromadb.PersistentClient:
    settings = get_settings()
    return chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _get_collection() -> chromadb.Collection:
    client = _get_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# -------------------------
# ADD CHUNKS (FIXED)
# -------------------------
def add_chunks(chunks: list[dict], embeddings: list[list[float]]) -> int:
    """
    Store chunks WITH metadata including org_id
    """

    if not chunks:
        return 0

    collection = _get_collection()

    ids = [str(uuid.uuid4()) for _ in chunks]

    documents = [c["text"] for c in chunks]

    # 🔥 ENSURE org_id EXISTS
    metadatas = []
    for c in chunks:
        meta = c.get("metadata", {})

        if "org_id" not in meta:
            raise ValueError("❌ Missing org_id in chunk metadata")

        metadatas.append(meta)

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return len(chunks)


# -------------------------
# SEARCH (CRITICAL FIX)
# -------------------------
def search(
    query_embedding: list[float],
    top_k: int = 5,
    filter: dict | None = None,   # 🔥 NEW
) -> list[dict]:
    """
    ORG-AWARE similarity search
    """

    collection = _get_collection()

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter,   # 🔥 APPLY FILTER
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    if not results or not results.get("documents"):
        return []

    hits = []

    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        score = round(1 - dist, 4)

        hits.append({
            "text": doc,
            "metadata": meta,
            "score": score
        })

    hits.sort(key=lambda x: x["score"], reverse=True)

    return hits


# -------------------------
# DELETE
# -------------------------
def delete_document_chunks(doc_id: str) -> None:
    collection = _get_collection()

    results = collection.get(where={"doc_id": doc_id})

    if results and results.get("ids"):
        collection.delete(ids=results["ids"])


# -------------------------
# COUNT
# -------------------------
def get_collection_count() -> int:
    return _get_collection().count()


def get_org_chunk_count(org_id: str) -> int:
    """Count chunks belonging to a specific org."""
    if not org_id:
        return 0
    try:
        collection = _get_collection()
        result = collection.get(where={"org_id": org_id}, include=[])
        return len(result.get("ids", []))
    except Exception:
        return 0