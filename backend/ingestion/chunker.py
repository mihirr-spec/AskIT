"""Text chunking utilities (ORG-AWARE FIXED)"""

from langchain.text_splitter import RecursiveCharacterTextSplitter


def chunk_text(
    text: str,
    doc_id: str,
    source_name: str,
    doc_type: str,
    org_id: str,   # 🔥 IMPORTANT ADD
    source_url: str | None = None,
    chunk_size: int = 400,
    chunk_overlap: int = 50
) -> list[dict]:
    """
    Split text into chunks WITH org_id metadata
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    chunks = splitter.split_text(text)

    result = []

    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) < 20:
            continue

        result.append({
            "text": chunk.strip(),
            "metadata": {
                "doc_id": doc_id,
                "org_id": org_id,   # 🔥 CRITICAL FIX
                "source_name": source_name,
                "doc_type": doc_type,
                "source_url": source_url or "",
                "chunk_index": i,
            },
        })

    return result