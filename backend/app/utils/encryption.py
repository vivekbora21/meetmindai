import base64
import hashlib
import logging
from cryptography.fernet import Fernet
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Derive a 32-byte key from settings.JWT_SECRET
_key_hash = hashlib.sha256(settings.JWT_SECRET.encode()).digest()
_fernet_key = base64.urlsafe_b64encode(_key_hash)
_fernet = Fernet(_fernet_key)


def encrypt_value(value: str | None) -> str | None:
    """
    Encrypts a string value using Fernet symmetric encryption.
    """
    if value is None:
        return None
    try:
        return _fernet.encrypt(value.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to encrypt value: {e}")
        raise ValueError("Encryption failed")


def decrypt_value(value: str | None) -> str | None:
    """
    Decrypts a Fernet encrypted string. If decryption fails, returns the value as-is (fallback).
    """
    if value is None:
        return None
    try:
        return _fernet.decrypt(value.encode()).decode()
    except Exception:
        # If decryption fails (e.g., already unencrypted or different key), fallback gracefully
        return value
