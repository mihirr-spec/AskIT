"""Documents router — upload, process, and list documents."""
import io
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from auth.middleware import get_current_user, require_admin
from database.supabase_client import (
    create_document, update_document_status, list_documents, get_all_documents
)
from ingestion.extractor import extract_pdf, extract_url
from ingestion.chunker import chunk_text
from ingestion.embedder import embed_texts
from ingestion import vector_store

router = APIRouter(prefix="/documents", tags=["documents"])


class URLIngestRequest(BaseModel):
    url: str
    name: Optional[str] = None


# ── Upload PDF ────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auto_process: bool = Form(True),
    name: Optional[str] = Form(None),
    user: dict = Depends(require_admin),
):
    """Upload a PDF document. Optionally trigger processing immediately."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if not user.get("org_id"):
        raise HTTPException(status_code=400, detail="Missing org_id for admin")

    doc_name = name.strip() if name and name.strip() else file.filename
    doc = create_document(
        name=doc_name,
        doc_type="pdf",
        org_id=user["org_id"],
    )

    if auto_process:
        background_tasks.add_task(_process_pdf, doc["id"], file.filename, file_bytes, user["org_id"])

    return {"document": doc, "message": "Document uploaded successfully"}


# ── Ingest URL ────────────────────────────────────────────────────────────────

@router.post("/ingest-url")
async def ingest_url(
    body: URLIngestRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Add a Confluence/HTML URL for ingestion."""
    name = body.name or body.url.split("/")[-1] or "Web Page"
    if not user.get("org_id"):
        raise HTTPException(status_code=400, detail="Missing org_id for admin")
        
    doc = create_document(
        name=name,
        doc_type="url",
        org_id=user["org_id"],
        source_url=body.url,
    )
    background_tasks.add_task(_process_url_doc, doc["id"], name, body.url, user["org_id"])
    return {"document": doc, "message": "URL queued for processing"}


# ── Process Documents ─────────────────────────────────────────────────────────

@router.post("/process")
async def process_documents(
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_admin),
):
    """Trigger processing of all pending documents for this org."""
    if not user.get("org_id"):
        return {"message": "No org_id found", "count": 0}
        
    docs = list_documents(user["org_id"])
    pending = [d for d in docs if d["status"] == "pending"]
    
    if not pending:
        return {"message": "No pending documents to process", "count": 0}

    for doc in pending:
        if doc["type"] == "url" and doc.get("source_url"):
            background_tasks.add_task(_process_url_doc, doc["id"], doc["name"], doc["source_url"])
        # PDF re-processing not supported here (bytes not stored); mark for manual upload

    return {
        "message": f"Processing {len(pending)} document(s)",
        "count": len(pending),
        "document_ids": [d["id"] for d in pending],
    }


# ── Process with uploaded file bytes (called from upload endpoint) ────────────

@router.post("/process-file/{doc_id}")
async def process_uploaded_file(
    doc_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    """Process an already-uploaded PDF by re-uploading the file."""
    file_bytes = await file.read()
    background_tasks.add_task(_process_pdf, doc_id, file.filename, file_bytes, user["org_id"])
    return {"message": "Processing started", "doc_id": doc_id}


# ── List Documents ────────────────────────────────────────────────────────────

@router.get("")
async def get_documents(user: dict = Depends(get_current_user)):
    """List documents. Admins see their org's docs; users see all completed docs."""
    if user["role"] == "admin" and user.get("org_id"):
        docs = list_documents(user["org_id"])
    else:
        # If user is general/employee but belongs to an org, only show their org's completed docs
        if user.get("org_id"):
            docs = [d for d in list_documents(user["org_id"]) if d["status"] == "completed"]
        else:
            docs = [d for d in get_all_documents() if d["status"] == "completed"]
    return {"documents": docs, "count": len(docs)}


# ── Background Processing Tasks ───────────────────────────────────────────────

async def _process_pdf(doc_id: str, filename: str, file_bytes: bytes, org_id: str):
    try:
        update_document_status(doc_id, "processing")
        text = extract_pdf(file_bytes)
        chunks = chunk_text(text, doc_id=doc_id, source_name=filename, doc_type="pdf", org_id=org_id)
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        vector_store.add_chunks(chunks, embeddings)
        update_document_status(doc_id, "completed")
    except Exception as e:
        update_document_status(doc_id, "failed")
        print(f"[ERROR] PDF processing failed for {doc_id}: {e}")


async def _process_url_doc(doc_id: str, name: str, url: str, org_id: str):
    try:
        update_document_status(doc_id, "processing")
        text = extract_url(url)
        chunks = chunk_text(text, doc_id=doc_id, source_name=name, doc_type="url", org_id=org_id, source_url=url)
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        vector_store.add_chunks(chunks, embeddings)
        update_document_status(doc_id, "completed")
    except Exception as e:
        update_document_status(doc_id, "failed")
        print(f"[ERROR] URL processing failed for {doc_id}: {e}")
