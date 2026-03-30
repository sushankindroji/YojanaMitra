"""
Local file storage service with AES-256 encryption.
"""
import os
import uuid
import aiofiles
from pathlib import Path
from app.core.encryption import DocumentEncryption
from app.config import settings


class StorageService:
    """Handle file storage with encryption."""

    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(exist_ok=True)
        self.encryption = DocumentEncryption()

    async def save_file(self, file_bytes: bytes, filename: str, user_id: str) -> str:
        """
        Encrypt and save file.
        Returns: relative storage path
        """
        user_dir = self.upload_dir / user_id
        user_dir.mkdir(exist_ok=True)

        # Encrypt file
        encrypted_bytes, iv = self.encryption.encrypt(file_bytes)
        
        # Generate unique filename
        unique_name = f"{uuid.uuid4()}_{filename}.enc"
        file_path = user_dir / unique_name

        # Write IV + encrypted data
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(iv + encrypted_bytes)

        return str(file_path)

    async def read_file(self, storage_path: str) -> bytes:
        """Read and decrypt file."""
        async with aiofiles.open(storage_path, "rb") as f:
            data = await f.read()
        
        iv = data[:16]
        encrypted_bytes = data[16:]
        return self.encryption.decrypt(encrypted_bytes, iv)

    async def delete_file(self, storage_path: str):
        """Delete file from disk."""
        path = Path(storage_path)
        if path.exists():
            path.unlink()

    def list_user_files(self, user_id: str) -> list:
        """List all files for a user."""
        user_dir = self.upload_dir / user_id
        if not user_dir.exists():
            return []
        return [f.name for f in user_dir.iterdir() if f.is_file()]

    def get_file_size(self, storage_path: str) -> int:
        """Get file size in bytes."""
        path = Path(storage_path)
        if path.exists():
            return path.stat().st_size
        return 0


# Singleton instance
storage_service = StorageService()
