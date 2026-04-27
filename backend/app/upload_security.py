"""Router-safe re-export for upload validation."""

from app.core.upload_security import validate_upload

__all__ = ["validate_upload"]
