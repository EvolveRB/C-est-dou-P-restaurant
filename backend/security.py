import os
import re
import json
import hmac
import time
import base64
import hashlib
import secrets
from typing import Optional
from sqlalchemy.orm import Session
from models import AppConfig

HASH_ALGORITHM = "pbkdf2_sha256"
HASH_ITERATIONS = 600_000
SESSION_COOKIE_NAME = "cest_doux_session"
SESSION_TTL_SECONDS = 12 * 60 * 60  # 12 horas


def normalize_rut(raw_rut: str) -> str:
    """Normaliza un RUT chileno al formato sin puntos y con guión: 12345678-K."""
    if not raw_rut:
        return ""
    cleaned = re.sub(r"[^0-9kK]", "", str(raw_rut).strip()).upper()
    if len(cleaned) < 2:
        return cleaned
    return f"{cleaned[:-1]}-{cleaned[-1]}"


def is_valid_rut_format(raw_rut: str) -> bool:
    """Valida formato básico de RUT chileno (7-8 dígitos + guión + dígito o K)."""
    norm = normalize_rut(raw_rut)
    return bool(re.match(r"^\d{7,8}-[0-9K]$", norm))


def hash_password(plain_password: str) -> str:
    """Genera un hash PBKDF2-HMAC-SHA256 con salt aleatorio único."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        HASH_ITERATIONS,
    )
    return f"{HASH_ALGORITHM}${HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifica una contraseña en texto plano contra su hash en tiempo constante."""
    if not plain_password or not stored_hash:
        return False
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != HASH_ALGORITHM:
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_digest = bytes.fromhex(parts[3])
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(computed, expected_digest)
    except Exception:
        return False


def generate_temp_password(length: int = 10) -> str:
    """Genera una contraseña temporal aleatoria sin caracteres ambiguos."""
    upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    lower = "abcdefghijkmnopqrstuvwxyz"
    digits = "23456789"
    all_chars = upper + lower + digits
    chars = [
        secrets.choice(upper),
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(digits),
    ]
    while len(chars) < length:
        chars.append(secrets.choice(all_chars))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)


def get_signing_secret(sqlite_db: Session) -> str:
    """Obtiene el secreto HMAC de sesión desde env o lo persiste en SQLite app_config."""
    env_secret = os.getenv("AUTH_SECRET_KEY")
    if env_secret and len(env_secret.strip()) >= 16:
        return env_secret.strip()

    row = sqlite_db.query(AppConfig).filter(AppConfig.key == "auth_signing_secret").first()
    if row and row.value:
        return row.value

    new_secret = secrets.token_hex(32)
    sqlite_db.add(AppConfig(key="auth_signing_secret", value=new_secret))
    sqlite_db.commit()
    return new_secret


def create_session_token(payload: dict, secret: str, ttl_seconds: int = SESSION_TTL_SECONDS) -> str:
    """Crea un token firmado HMAC-SHA256 con expiración."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    body = {
        **payload,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{body_b64}".encode("ascii")
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{body_b64}.{_b64url_encode(sig)}"


def verify_session_token(token: str, secret: str) -> Optional[dict]:
    """Valida firma HMAC y expiración del token de sesión."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{body_b64}".encode("ascii")
        expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, provided_sig):
            return None
        payload = json.loads(_b64url_decode(body_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

