"""Router-safe re-exports for rate-limiting helpers."""

from app.core.rate_limiter import get_rate_limit, limiter

__all__ = ["limiter", "get_rate_limit"]
