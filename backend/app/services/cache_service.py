"""
Redis caching service for improved performance.
"""
import json
import logging
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not installed. Caching will be disabled.")


class CacheService:
    """Cache service with Redis backend."""
    
    def __init__(self):
        self.enabled = settings.REDIS_ENABLED and REDIS_AVAILABLE
        self.client = None
        if self.enabled:
            try:
                self.client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                self.client.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {str(e)}")
                self.enabled = False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.enabled or not self.client:
            return None
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error for {key}: {str(e)}")
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        if not self.enabled or not self.client:
            return False
        try:
            ttl = ttl or settings.CACHE_TTL
            self.client.setex(key, ttl, json.dumps(value))
            return True
        except Exception as e:
            logger.error(f"Cache set error for {key}: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if not self.enabled or not self.client:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {str(e)}")
            return False
    
    async def clear_pattern(self, pattern: str) -> bool:
        """Clear all keys matching pattern."""
        if not self.enabled or not self.client:
            return False
        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {str(e)}")
            return False


cache_service = CacheService()
