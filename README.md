# AskIT — Smart Knowledge Navigator

A full-stack RAG (Retrieval-Augmented Generation) platform that lets organizations upload documents and URLs into a knowledge base, then ask questions about them via an AI-powered chat interface.

---

## What it does

- Admins upload PDFs or URLs → they get chunked, embedded, and stored in a vector database
- Users ask questions in a chat interface → a multi-agent pipeline retrieves relevant context and synthesizes accurate answers with citations
- Role-based access: admins manage the knowledge base, members query it

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, Python 3.11+ |
| Auth & Database | Supabase (Postgres + Auth) |
| Vector Store | ChromaDB (persistent) |
| Embeddings | sentence-transformers (local, no API cost) |
| LLM | Groq API (LLaMA 3) |
| PDF Parsing | pypdf |
| Web Crawling | BeautifulSoup4 |

---

## Architecture

```
User asks question
       │
       ▼
  Planning Agent        ← breaks query into sub-questions
       │
       ▼
  Retrieval Agent       ← semantic search over ChromaDB (org-scoped)
       │
       ▼
  Synthesis Agent       ← generates answer with citations via Groq LLM
       │
       ▼
  Response + Trace      ← returned to frontend with reasoning steps
```

---

## Project Structure

```
AskIT/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── UserDashboard.jsx   # chat interface
│   │   │   └── AdminDashboard.jsx  # knowledge base management
│   │   ├── components/
│   │   ├── contexts/AuthContext.jsx
│   │   └── lib/api.js
│   └── .env.example
│
├── backend/                   # FastAPI app
│   ├── main.py
│   ├── config.py
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── planning_agent.py
│   │   ├── retrieval_agent.py
│   │   └── synthesis_agent.py
│   ├── ingestion/
│   │   ├── extractor.py       # PDF + URL extraction
│   │   ├── chunker.py
│   │   ├── embedder.py
│   │   └── vector_store.py    # ChromaDB interface
│   ├── routers/
│   │   ├── documents.py       # upload + ingest endpoints
│   │   ├── query.py
│   │   ├── chat.py
│   │   ├── admin.py
│   │   └── auth.py
│   ├── database/supabase_client.py
│   ├── auth/middleware.py
│   └── requirements.txt
│
├── supabase_schema.sql        # DB schema to run in Supabase
└── start.bat                  # Windows dev startup script
```

---

## Getting Started (Local)

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

---

### 1. Clone the repo

```bash
git clone git@github.com:mihirr-spec/AskIT.git
cd AskIT
```

### 2. Set up the database

Run `supabase_schema.sql` in your Supabase project's SQL editor to create all required tables.

### 3. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
CHROMA_PERSIST_DIR=./chroma_db
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000` — docs at `http://localhost:8000/docs`

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment

| Service | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com) — set root dir to `frontend` |
| Backend | [Render](https://render.com) — set root dir to `backend`, add a persistent disk at `/data` and set `CHROMA_PERSIST_DIR=/data/chroma_db` |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/upload` | Upload a PDF (admin only) |
| POST | `/documents/ingest-url` | Ingest a URL (admin only) |
| GET | `/documents` | List documents |
| POST | `/query` | Ask a question (RAG pipeline) |
| GET | `/admin/dashboard/summary` | Admin stats |
| GET | `/health` | Health check |

---

## Environment Variables Reference

### Backend

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin operations) |
| `GROQ_API_KEY` | Groq API key for LLM inference |
| `CHROMA_PERSIST_DIR` | Path for ChromaDB storage (use `/data/chroma_db` on Render) |
| `FRONTEND_URL` | Frontend origin for CORS |

### Frontend

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend API base URL |
