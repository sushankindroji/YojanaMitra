"""Router-safe re-export for profile sanitization."""

from app.core.sanitizers import sanitize_profile

__all__ = ["sanitize_profile"]
