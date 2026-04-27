"""Router-safe re-export for audit logging."""

from app.core.audit import log_audit

__all__ = ["log_audit"]
