-- Supabase SQL Schema for Smart Knowledge Navigator
-- Run this entire file in the Supabase SQL Editor of your NEW project

-- 1. Organizations Table
CREATE TABLE organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('college', 'company', 'community')),
  created_at timestamptz default now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON organizations FOR ALL USING (true) WITH CHECK (true);


-- 2. Members Table
-- Pre-registered by admin. Users can only sign up if they exist here.
CREATE TABLE members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  member_type text check (member_type in ('student', 'employee', 'general')),
  org_id uuid references organizations(id) on delete cascade not null,
  auth_user_id uuid,              -- filled after Supabase Auth signup
  is_registered boolean default false,  -- true after user creates account
  created_at timestamptz default now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON members FOR ALL USING (true) WITH CHECK (true);


-- 3. Documents Table
CREATE TABLE documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  type text check (type in ('pdf', 'url', 'arxiv')),
  source_url text,
  file_path text,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  uploaded_by uuid references members(id),
  created_at timestamptz default now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON documents FOR ALL USING (true) WITH CHECK (true);


-- 4. Chat History Table
CREATE TABLE chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  org_id uuid references organizations(id),
  query text not null,
  response jsonb,   -- { answer, citations, reasoning_trace, confidence }
  created_at timestamptz default now()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON chat_history FOR ALL USING (true) WITH CHECK (true);


-- 5. Storage Bucket
-- Go to Supabase > Storage > New Bucket > name it "documents" > make it public

-- 6. Vector DB is ChromaDB running locally — NOT Supabase pgvector.
