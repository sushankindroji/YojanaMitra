"""Secure upload validation helpers."""

import logging
import os

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

try:
    import magic  # type: ignore
except Exception:
    magic = None


ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
MIN_FILE_SIZE_BYTES = 5 * 1024


def _detect_mime_from_signature(contents: bytes) -> str:
    if contents.startswith(b"%PDF-"):
        return "application/pdf"
    if contents.startswith(b"\xFF\xD8\xFF"):
        return "image/jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contents.startswith(b"RIFF") and len(contents) > 12 and contents[8:12] == b"WEBP":
        return "image/webp"
    return ""


def _detect_mime(contents: bytes) -> str:
    if magic is not None:
        try:
            detected = str(magic.from_buffer(contents, mime=True) or "").strip().lower()
            if detected:
                return detected
        except Exception as exc:
            logger.warning("python-magic detection failed: %s", exc)

    return _detect_mime_from_signature(contents)


async def validate_upload(file: UploadFile, max_size_mb: int = 10) -> tuple[bytes, str]:
    """Validate uploaded file content and return bytes + sanitized filename."""
    contents = await file.read()

    max_size_bytes = max(1, int(max_size_mb)) * 1024 * 1024
    if len(contents) > max_size_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum {int(max_size_mb)}MB.")
    if len(contents) < MIN_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too small. Upload a clear photo.")

    detected_mime = _detect_mime(contents)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail="File type not allowed. Upload JPG, PNG, WEBP, or PDF only.",
        )

    safe_filename = os.path.basename(file.filename or "upload")
    safe_filename = "".join(ch for ch in safe_filename if ch.isalnum() or ch in "._-")
    if not safe_filename:
        safe_filename = "upload"

    return contents, safe_filename
