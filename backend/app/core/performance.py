"""
Performance optimization utilities.
"""
import time
import functools
from typing import Callable, Any
from app.core.logging import performance_logger, cache_logger
from app.services.cache_service import cache_service
import hashlib
import json


def log_performance(func: Callable) -> Callable:
    """Decorator to log function execution time."""
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            elapsed = time.time() - start_time
            if elapsed > 0.5:  # Log if takes more than 500ms
                performance_logger.warning(
                    f"{func.__name__} took {elapsed:.3f}s"
                )
            else:
                performance_logger.debug(
                    f"{func.__name__} took {elapsed:.3f}s"
                )
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            performance_logger.error(
                f"{func.__name__} failed after {elapsed:.3f}s: {str(e)}"
            )
            raise
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            if elapsed > 0.5:
                performance_logger.warning(
                    f"{func.__name__} took {elapsed:.3f}s"
                )
            else:
                performance_logger.debug(
                    f"{func.__name__} took {elapsed:.3f}s"
                )
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            performance_logger.error(
                f"{func.__name__} failed after {elapsed:.3f}s: {str(e)}"
            )
            raise
    
    # Return async or sync wrapper based on function type
    if hasattr(func, '__await__'):
        return async_wrapper
    return sync_wrapper


def cache_result(ttl: int = 3600) -> Callable:
    """Decorator to cache function results."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # Generate cache key from function name and arguments
            cache_key = f"{func.__module__}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached = await cache_service.get(cache_key)
            if cached is not None:
                cache_logger.debug(f"Cache hit for {cache_key}")
                return cached
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_key, result, ttl)
            cache_logger.debug(f"Cached result for {cache_key}")
            return result
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            cache_key = f"{func.__module__}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            cached = cache_service.client.get(cache_key) if cache_service.client else None
            if cached is not None:
                cache_logger.debug(f"Cache hit for {cache_key}")
                return json.loads(cached)
            
            result = func(*args, **kwargs)
            if cache_service.client:
                cache_service.client.setex(cache_key, ttl, json.dumps(result))
                cache_logger.debug(f"Cached result for {cache_key}")
            return result
        
        return async_wrapper if hasattr(func, '__await__') else sync_wrapper
    
    return decorator


class QueryOptimizer:
    """Database query optimization utilities."""
    
    @staticmethod
    def apply_eager_loading(query, *relationships):
        """Apply eager loading to SQLAlchemy query."""
        from sqlalchemy.orm import joinedload
        for relationship in relationships:
            query = query.options(joinedload(relationship))
        return query
    
    @staticmethod
    def paginate(query, page: int = 1, page_size: int = 20):
        """Paginate query results."""
        offset = (page - 1) * page_size
        return query.offset(offset).limit(page_size)
