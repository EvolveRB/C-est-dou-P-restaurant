import os
import re
import secrets
import unicodedata
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

DEFAULT_CLOUDFRONT_URL = "https://d29jcylbmgo4bc.cloudfront.net"
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def slugify_dish_name(raw_name: Optional[str]) -> str:
    """Convierte el nombre de un plato en un slug seguro para rutas S3/CloudFront."""
    normalized = unicodedata.normalize("NFD", (raw_name or "").strip())
    ascii_text = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or f"plato-{secrets.token_hex(4)}"


def get_cdn_base_url() -> str:
    base = (
        os.getenv("CLOUDFRONT_BASE_URL")
        or os.getenv("AZURE_BLOB_BASE_URL")
        or DEFAULT_CLOUDFRONT_URL
    )
    return base.strip().rstrip("/")


def upload_image_to_s3(
    file_bytes: bytes,
    original_filename: Optional[str],
    content_type: Optional[str],
    dish_name: Optional[str] = None,
) -> dict:
    """
    Sube una imagen al bucket Amazon S3 configurado y retorna su URL pública en CloudFront.
    """
    if not file_bytes:
        raise ValueError("El archivo de imagen está vacío.")
    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("La imagen supera el tamaño máximo permitido (5 MB).")

    ct = (content_type or "").split(";", 1)[0].strip().lower()
    ext = MIME_TO_EXT.get(ct)
    if not ext and original_filename:
        lower_fn = original_filename.lower().strip()
        for candidate in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
            if lower_fn.endswith(candidate):
                ext = ".jpg" if candidate == ".jpeg" else candidate
                ct = ct or f"image/{'jpeg' if ext == '.jpg' else ext.lstrip('.')}"
                break
    if not ext:
        raise ValueError("Formato no soportado. Sube una imagen JPG, PNG, WEBP o GIF.")

    bucket = (os.getenv("AWS_S3_BUCKET") or "carta-img").strip()
    region = (os.getenv("AWS_REGION") or "us-east-2").strip()
    access_key = (os.getenv("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = (os.getenv("AWS_SECRET_ACCESS_KEY") or "").strip()

    if not access_key or not secret_key:
        raise PermissionError(
            "Faltan credenciales AWS (AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY) en las variables de entorno del servidor para subir imágenes a S3."
        )

    base_slug = slugify_dish_name(dish_name or os.path.splitext(original_filename or "")[0])
    key = f"{base_slug}-{secrets.token_hex(2)}{ext}"

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )
    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=ct,
            CacheControl="public, max-age=31536000, immutable",
        )
    except NoCredentialsError as exc:
        raise PermissionError("No hay credenciales válidas configuradas para Amazon S3.") from exc
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(f"Error al subir imagen a Amazon S3: {exc}") from exc

    cdn_base = get_cdn_base_url()
    return {
        "bucket": bucket,
        "key": key,
        "url": f"{cdn_base}/{key}",
    }
