import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Carga de .env robusta tanto desde el directorio local como del directorio padre
_base_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_base_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path)
load_dotenv()

# ==============================================================================
# 1. MONGODB ATLAS — Catálogo, Mesas, Pedidos, Visitas, Transacciones
# ==============================================================================
MONGO_URI = (os.getenv("MONGO_URI") or "").strip()

cliente_mongo = (
    AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    if MONGO_URI
    else None
)
restaurante_db = cliente_mongo["restaurante_db"] if cliente_mongo is not None else None


async def get_db():
    """Inyecta la base de datos NoSQL (MongoDB Atlas) para operación del restaurante."""
    if restaurante_db is None:
        raise RuntimeError(
            "MONGO_URI no está configurada. Define MONGO_URI en backend/.env o en las variables de entorno."
        )
    return restaurante_db


# ==============================================================================
# 2. SQLITE — Registro de Usuarios, Contraseñas Hasheadas y Logs por Perfil
# ==============================================================================
_default_sqlite_path = os.path.join(_base_dir, "restaurant.db").replace("\\", "/")
SQLITE_URL = os.getenv("SQLITE_URL") or f"sqlite:///{_default_sqlite_path}"

sqlite_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False} if SQLITE_URL.startswith("sqlite") else {},
    future=True,
)
SqliteSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sqlite_engine,
    future=True,
)


def init_sqlite_db():
    """Crea las tablas relacionales de usuarios, logs y configuración y normaliza nombres."""
    from models import Usuario
    from security import capitalize_person_name

    Base.metadata.create_all(bind=sqlite_engine)
    db = SqliteSessionLocal()
    try:
        updated = False
        for u in db.query(Usuario).all():
            cap_nombre = capitalize_person_name(u.nombre)
            cap_apellido = capitalize_person_name(u.apellido)
            if cap_nombre and cap_nombre != u.nombre:
                u.nombre = cap_nombre
                updated = True
            if (u.apellido or "") != cap_apellido:
                u.apellido = cap_apellido
                updated = True
        if updated:
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def get_sqlite_db():
    """Inyecta una sesión SQLAlchemy hacia SQLite para usuarios y autenticación."""
    db = SqliteSessionLocal()
    try:
        yield db
    finally:
        db.close()
