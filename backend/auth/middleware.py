import base64
import json
import time

from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database.supabase_client import get_supabase

security = HTTPBearer()


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without network call (no signature verification)."""
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    payload_b64 = parts[1]
    # Fix base64 padding
    payload_b64 += '=' * (4 - len(payload_b64) % 4)
    decoded = base64.urlsafe_b64decode(payload_b64)
    return json.loads(decoded.decode('utf-8'))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Decode Supabase JWT locally and return user info (no network call)."""
    token = credentials.credentials
    try:
        payload = _decode_jwt_payload(token)

        # Check expiry
        if payload.get('exp', 0) < time.time():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

        user_id = payload.get('sub')
        email = payload.get('email')

        if not user_id or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

        user_metadata = payload.get('user_metadata', {}) or {}
        role = user_metadata.get("role", "user")
        org_id = user_metadata.get("org_id")
        org_name = user_metadata.get("org_name")

        if not org_id:
            try:
                sb = get_supabase()
                result = sb.table("members").select("org_id").eq("email", email).limit(1).execute()
                if result.data:
                    org_id = result.data[0].get("org_id") or org_id
            except Exception:
                pass

        if org_id and not org_name:
            try:
                sb = get_supabase()
                org_res = sb.table("organizations").select("name").eq("id", org_id).limit(1).execute()
                if org_res.data:
                    org_name = org_res.data[0].get("name")
            except Exception:
                pass

        return {
            "id": user_id,
            "email": email,
            "role": role,
            "org_id": org_id,
            "org_name": org_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


async def require_admin(user: dict = Security(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
