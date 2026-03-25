"""Auth router for validating users before signup."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database.supabase_client import get_supabase
from auth.middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# -------------------------
# REQUEST MODEL
# -------------------------
class ValidateUserRequest(BaseModel):
    email: str
    org_id: str


# -------------------------
# VALIDATE USER (STRICT)
# -------------------------
@router.post("/validate-user")
async def validate_user(body: ValidateUserRequest):
    """
    Check if user exists in members table BEFORE signup
    """
    sb = get_supabase()

    email = body.email.lower().strip()

    result = (
        sb.table("members")
        .select("id")
        .eq("email", email)
        .eq("org_id", body.org_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Admin has not added you to this organization"
        )

    return {
        "valid": True,
        "message": "User is allowed to sign up"
    }


# -------------------------
# GET ORGANIZATIONS
# -------------------------
@router.get("/organizations")
async def get_organizations():
    sb = get_supabase()

    result = (
        sb.table("organizations")
        .select("id, name, type")
        .order("name")
        .execute()
    )

    return {
        "organizations": result.data or []
    }


# -------------------------
# CURRENT USER INFO (FIXED)
# -------------------------
@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """
    DO NOT re-query members blindly
    Use middleware as source of truth
    """

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user.get("role"),
        "org_id": user.get("org_id"),
        "org_name": user.get("org_name"),
    }