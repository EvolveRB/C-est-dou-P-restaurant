from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Usuario(Base):
    """Registro de usuarios/empleados almacenado exclusivamente en SQLite."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    rut = Column(String(20), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), default="", nullable=False)
    correo = Column(String(150), unique=True, nullable=True, index=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    rol = Column(String(30), nullable=False, default="Garzón", index=True)
    telefono = Column(String(40), nullable=True)
    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
    updated_at = Column(DateTime, default=utcnow_naive, onupdate=utcnow_naive, nullable=False)


class PerfilLog(Base):
    """Bitácora de eventos filtrada por rol de usuario (SQLite)."""
    __tablename__ = "logs_perfil"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    rol = Column(String(30), nullable=False, index=True)
    accion = Column(String(100), nullable=False)
    detalle = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)


class AppConfig(Base):
    """Configuración interna persistente en SQLite (ej. clave HMAC de sesión)."""
    __tablename__ = "app_config"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utcnow_naive, onupdate=utcnow_naive, nullable=False)
