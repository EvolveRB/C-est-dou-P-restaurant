import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

async def test_connection():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    
    if not uri:
        print("❌ Error: No se encontró MONGO_URI en el archivo .env")
        return

    print("Conectando a MongoDB Atlas...")
    client = AsyncIOMotorClient(uri)
    
    try:
        # El comando ping fuerza una llamada real al servidor
        await client.admin.command('ping')
        print("✅ ¡Conexión exitosa! Tu configuración de Atlas está perfecta.")
    except Exception as e:
        print(f"❌ Falló la conexión: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())