"""Compatibility redirect to app.auth."""
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user_id,
)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    "get_current_user_id",
]

