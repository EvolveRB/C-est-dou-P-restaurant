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
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    
    try:
        # El comando ping fuerza una llamada real al servidor
        await client.admin.command('ping')
        print("✅ ¡Conexión exitosa! Tu configuración de Atlas está perfecta.\n")

        db = client.restaurante_db
        collections = await db.list_collection_names()
        print(f"📂 Colecciones detectadas: {collections}")

        # Revisar empleados para el login
        if "empleados" in collections:
            empleados = await db.empleados.find({}, {"password": 0}).to_list(20)
            print(f"\n👤 Empleados registrados en la BD ({len(empleados)}):")
            for emp in empleados:
                nombre = emp.get("nombre", "")
                apellido = emp.get("apellido", "")
                correo = emp.get("correo", emp.get("email", "Sin correo"))
                rol = emp.get("rol", emp.get("cargo", "Sin rol"))
                username = emp.get("username", "Sin username")
                print(f"   • {nombre} {apellido} | Rol: {rol} | Credencial: '{correo}' o '{username}'")
        else:
            print("\n⚠️ Aún no existe la colección 'empleados'. (El backend usará los usuarios de respaldo).")

        # Revisar productos
        if "producto" in collections:
            total_prods = await db.producto.count_documents({})
            print(f"🍽️  Total de productos en carta: {total_prods}")

        # Revisar mesas
        if "mesas" in collections:
            total_mesas = await db.mesas.count_documents({})
            print(f"🪑 Total de mesas registradas: {total_mesas}")

        print("\n🚀 Todo listo. Ya puedes iniciar el backend con:")
        print("   uvicorn main:app --reload --port 8000")

    except Exception as e:
        print(f"❌ Falló la conexión: {e}")
        print("\n💡 Diagnóstico:")
        print("   Si persiste el timeout, espera 1 minuto a que Atlas termine de aplicar el cambio a 0.0.0.0/0.")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())