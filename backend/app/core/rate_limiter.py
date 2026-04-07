"""
Rate limiting utilities with configurable policies.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

# Initialize limiter with custom key function
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}s"],
)

# Rate limit policies
RATE_LIMIT_POLICIES = {
    "auth": "5/minute",           # Strict limit for auth endpoints
    "upload": "10/hour",          # Document upload limit
    "search": "30/minute",        # Search queries
    "default": "100/hour",        # Default rate limit
}


def get_rate_limit(policy: str = "default") -> str:
    """Get rate limit for specific policy."""
    return RATE_LIMIT_POLICIES.get(policy, RATE_LIMIT_POLICIES["default"])

