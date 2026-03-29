# Smart Navigator — Test Accounts

> Password for ALL accounts: `Smart@123`

---

## Org 1 — RagLab  *(upload PDFs here)*

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@raglab.dev       | Smart@123  |
| User  | user@raglab.dev        | Smart@123  |

---

## Org 2 — PyDocs  *(upload Python docs URL here)*

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@pydocs.dev       | Smart@123  |
| User  | user@pydocs.dev        | Smart@123  |

> URL to ingest: https://docs.python.org/3/tutorial/index.html

---

## Setup Steps

1. Run the SQL below in Supabase SQL Editor
2. Register each admin via the UI (Register → Admin tab)
   - RagLab admin creates org named exactly: `RagLab`
   - PyDocs admin creates org named exactly: `PyDocs`
3. Register each user via the UI (Register → User tab)
   - Select the matching org from the dropdown
4. Confirm all 4 emails in Supabase Auth (or disable email confirmation in Auth settings)

---

## Pre-seed SQL (run AFTER step 2 if you want users auto-whitelisted)

```sql
-- After admins register their orgs, whitelist the users so they can sign up

-- RagLab user
INSERT INTO members (name, email, role, member_type, org_id, is_registered)
SELECT 'RagLab User', 'user@raglab.dev', 'user', 'general', id, false
FROM organizations WHERE name = 'RagLab';

-- PyDocs user
INSERT INTO members (name, email, role, member_type, org_id, is_registered)
SELECT 'PyDocs User', 'user@pydocs.dev', 'user', 'general', id, false
FROM organizations WHERE name = 'PyDocs';
```
