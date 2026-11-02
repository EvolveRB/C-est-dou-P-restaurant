import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# ──────────────────────────────────────────────────────────────────────────────
# Conexión única al cluster de MongoDB Atlas.
# La URI completa se lee desde la variable de entorno MONGO_URI.
# Ejemplo: mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true
# ──────────────────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError(
        "La variable de entorno MONGO_URI no está definida. "
        "Agrégala en el archivo .env del backend."
    )

# El cliente se crea una sola vez al arrancar la aplicación (patrón singleton).
# Motor es thread-safe y gestiona el connection pool internamente.
cliente_mongo = AsyncIOMotorClient(MONGO_URI)

# Base de datos del restaurante dentro del cluster
restaurante_db = cliente_mongo["restaurante_db"]


# ──────────────────────────────────────────────────────────────────────────────
# Dependencia de FastAPI — inyecta la base de datos en cada endpoint.
# Se usa con: db = Depends(get_db)
# ──────────────────────────────────────────────────────────────────────────────
async def get_db():
    return restaurante_db
