"""
Document encryption/decryption using AES-256.
"""
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os
import base64
from app.config import settings


class DocumentEncryption:
    """AES-256 CBC encryption for documents."""

    def __init__(self):
        """Initialize with encryption key from settings."""
        key_b64 = settings.ENCRYPTION_KEY
        if not key_b64:
            raise ValueError("ENCRYPTION_KEY is not set in environment")
        self.key = base64.b64decode(key_b64)
        if len(self.key) != 32:
            raise ValueError("ENCRYPTION_KEY must be 32 bytes (256 bits)")

    def encrypt(self, data: bytes) -> tuple:
        """
        Encrypt data using AES-256 CBC.
        Returns (encrypted_bytes, iv)
        """
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # PKCS7 Padding
        pad_length = 16 - (len(data) % 16)
        padded = data + bytes([pad_length] * pad_length)
        
        encrypted = encryptor.update(padded) + encryptor.finalize()
        return encrypted, iv

    def decrypt(self, encrypted_data: bytes, iv: bytes) -> bytes:
        """
        Decrypt data using AES-256 CBC.
        """
        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # Remove PKCS7 Padding
        pad_length = padded[-1]
        return padded[:-pad_length]
