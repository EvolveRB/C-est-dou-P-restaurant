import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Carga de .env robusta tanto desde el directorio local como del directorio padre
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path)
load_dotenv()

# URI de MongoDB Atlas (con fallback a la credencial del clúster configurado)
DEFAULT_MONGO_URI = "mongodb+srv://natanielriquelme_db_user:yzj5TJll6ktTDutK@restaurant.j8veekx.mongodb.net/restaurante_db?retryWrites=true&w=majority"
MONGO_URI = os.getenv("MONGO_URI") or DEFAULT_MONGO_URI

# El cliente se crea una sola vez al arrancar la aplicación (patrón singleton).
# Motor es thread-safe y gestiona el connection pool internamente.
# serverSelectionTimeoutMS=5000 evita que FastAPI quede congelado 30 segundos si la IP está bloqueada.
cliente_mongo = AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

# Base de datos del restaurante dentro del cluster
restaurante_db = cliente_mongo["restaurante_db"]


# ──────────────────────────────────────────────────────────────────────────────
# Dependencia de FastAPI — inyecta la base de datos en cada endpoint.
# Se usa con: db = Depends(get_db)
# ──────────────────────────────────────────────────────────────────────────────
async def get_db():
    return restaurante_db
