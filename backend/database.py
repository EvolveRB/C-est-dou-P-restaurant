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
# 1. MONGODB ATLAS — Catálogo, Mesas, Pedidos, Visitas y Promociones
# ==============================================================================
DEFAULT_MONGO_URI = "mongodb+srv://natanielriquelme_db_user:yzj5TJll6ktTDutK@restaurant.j8veekx.mongodb.net/restaurante_db?retryWrites=true&w=majority"
MONGO_URI = os.getenv("MONGO_URI") or DEFAULT_MONGO_URI

cliente_mongo = AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)
restaurante_db = cliente_mongo["restaurante_db"]


async def get_db():
    """Inyecta la base de datos NoSQL (MongoDB Atlas) para operación del restaurante."""
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
    """Crea las tablas relacionales de usuarios, logs y configuración si no existen."""
    Base.metadata.create_all(bind=sqlite_engine)


def get_sqlite_db():
    """Inyecta una sesión SQLAlchemy hacia SQLite para usuarios y autenticación."""
    db = SqliteSessionLocal()
    try:
        yield db
    finally:
        db.close()
