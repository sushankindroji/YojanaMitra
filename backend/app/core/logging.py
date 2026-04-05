"""
Comprehensive logging configuration.
"""
import logging
import logging.handlers
from pathlib import Path
from app.config import settings
from datetime import datetime

# Create logs directory if it doesn't exist
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
console_handler.setFormatter(console_formatter)

# File handler for all logs
file_handler = logging.handlers.RotatingFileHandler(
    logs_dir / "yojanamitra.log",
    maxBytes=10485760,  # 10MB
    backupCount=10
)
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
file_handler.setFormatter(file_formatter)

# Error file handler
error_handler = logging.handlers.RotatingFileHandler(
    logs_dir / "errors.log",
    maxBytes=10485760,  # 10MB
    backupCount=10
)
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(file_formatter)

# Add handlers to root logger
root_logger.addHandler(console_handler)
root_logger.addHandler(file_handler)
root_logger.addHandler(error_handler)

# Create module-specific loggers
def get_logger(name: str) -> logging.Logger:
    """Get logger for specific module."""
    return logging.getLogger(name)


# Performance logging
performance_logger = get_logger("performance")
audit_logger = get_logger("audit")
api_logger = get_logger("api")
db_logger = get_logger("database")
cache_logger = get_logger("cache")
email_logger = get_logger("email")
