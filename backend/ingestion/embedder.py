"""Embedding generation using sentence-transformers (STABLE VERSION)"""

from functools import lru_cache
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"


# -------------------------
# LOAD MODEL (CACHED)
# -------------------------
@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    try:
        model = SentenceTransformer(MODEL_NAME)
        return model
    except Exception as e:
        raise RuntimeError(f"❌ Failed to load embedding model: {e}")


# -------------------------
# EMBED MULTIPLE TEXTS
# -------------------------
def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    try:
        model = _load_model()

        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
        )

        return embeddings.tolist()

    except Exception as e:
        print(f"[ERROR] Embedding failed: {e}")
        return []


# -------------------------
# EMBED SINGLE QUERY
# -------------------------
def embed_query(query: str) -> list[float]:
    if not query.strip():
        return []

    result = embed_texts([query])

    return result[0] if result else []