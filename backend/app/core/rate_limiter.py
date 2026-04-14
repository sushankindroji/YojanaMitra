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
    "register": "5/minute",
    "login": "10/minute",
    "auth": "10/minute",
    "upload": "20/minute",
    "eligibility_run": "5/minute",
    "search": "30/minute",
    "default": "100/hour",
}


def get_rate_limit(policy: str = "default") -> str:
    """Get rate limit for specific policy."""
    return RATE_LIMIT_POLICIES.get(policy, RATE_LIMIT_POLICIES["default"])

