import os
import sys
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from database import init_sqlite_db, SqliteSessionLocal, MONGO_URI
from models import Usuario
from security import hash_password, generate_temp_password, normalize_rut, is_valid_rut_format

# Configurar salida UTF-8 en Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


async def migrar_usuarios_mongo_a_sqlite():
    """
    Separa la arquitectura híbrida:
    - Migra usuarios/empleados desde MongoDB Atlas -> SQLite (tabla 'usuarios') con contraseñas hasheadas.
    - Elimina campos sensibles de contraseñas/hashes en MongoDB Atlas.
    - Mantiene catálogo, mesas, visitas y pedidos en MongoDB Atlas.
    """
    load_dotenv()
    init_sqlite_db()

    mongo_uri = os.getenv("MONGO_URI") or MONGO_URI
    if not mongo_uri:
        print("❌ Error: No se encontró MONGO_URI.")
        return

    print("Conectando a MongoDB Atlas y SQLite...")
    mongo_client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db_mongo = mongo_client["restaurante_db"]
    db_sqlite = SqliteSessionLocal()

    try:
        empleados_mongo = await db_mongo.empleados.find({}).to_list(length=500)
        print(f"🔎 Empleados encontrados en MongoDB: {len(empleados_mongo)}")

        migrados = 0
        omitidos = 0

        for idx, emp in enumerate(empleados_mongo, start=1):
            nombre = str(emp.get("nombre") or "Personal").strip()
            apellido = str(emp.get("apellido") or "").strip()
            correo = (emp.get("correo") or emp.get("email") or "").strip().lower() or None
            username = (emp.get("username") or "").strip().lower() or None
            rol = emp.get("rol") or emp.get("cargo") or "Garzón"
            if rol.lower() in ("cocina", "chef", "cocinero"):
                rol = "Cocinero"
            elif rol.lower() in ("admin", "administrador", "gerente"):
                rol = "Administrador"
            else:
                rol = "Garzón"

            raw_rut = emp.get("rut") or ""
            rut_norm = normalize_rut(raw_rut) if is_valid_rut_format(raw_rut) else f"99000{idx:03d}-{idx % 10}"

            existe = (
                db_sqlite.query(Usuario)
                .filter((Usuario.rut == rut_norm) | (Usuario.correo == correo) | (Usuario.username == username))
                .first()
            )
            if existe:
                omitidos += 1
                continue

            raw_pwd = emp.get("password")
            if raw_pwd and str(raw_pwd).strip():
                pwd_hash = hash_password(str(raw_pwd).strip())
                must_change = False
            else:
                temp_pwd = generate_temp_password()
                pwd_hash = hash_password(temp_pwd)
                must_change = True
                print(f"   🔑 {nombre} {apellido} (RUT {rut_norm}) -> clave temporal: {temp_pwd}")

            nuevo = Usuario(
                rut=rut_norm,
                nombre=nombre,
                apellido=apellido,
                correo=correo,
                username=username or f"{nombre.lower()}.{idx}",
                rol=rol,
                telefono=emp.get("telefono"),
                password_hash=pwd_hash,
                must_change_password=must_change,
                activo=str(emp.get("estado", "Activo")).lower() != "inactivo",
            )
            db_sqlite.add(nuevo)
            db_sqlite.commit()
            migrados += 1

        # Limpiar campos de contraseñas/hashes que pudieran haber quedado en MongoDB
        res_clean = await db_mongo.empleados.update_many(
            {},
            {"$unset": {"password": "", "password_hash": "", "hash": "", "contrasena": "", "clave": ""}}
        )

        print(f"✅ Migración a SQLite completada: {migrados} migrados, {omitidos} ya existían.")
        print(f"🧹 Campos sensibles eliminados de MongoDB: {res_clean.modified_count} documentos actualizados.")

        # Opcional: migrar datos operacionales desde Turso si aún se solicita con --from-turso
        if "--from-turso" in sys.argv:
            await migrar_operacional_desde_turso(db_mongo)

    except Exception as e:
        db_sqlite.rollback()
        print(f"❌ Ocurrió un error en migración: {e}")
    finally:
        db_sqlite.close()
        mongo_client.close()


async def migrar_operacional_desde_turso(db_mongo):
    """Migra catálogo, mesas, visitas y pedidos desde Turso a MongoDB Atlas."""
    turso_url = os.getenv("TURSO_DATABASE_URL")
    turso_token = os.getenv("TURSO_AUTH_TOKEN")
    if not turso_url or not turso_token:
        print("⚠️ Omitiendo Turso: faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN.")
        return

    import libsql_client
    turso_client = libsql_client.create_client(url=turso_url, auth_token=turso_token)
    try:
        print("🔄 Migrando Productos -> MongoDB...")
        rs = await turso_client.execute("SELECT * FROM producto")
        productos = [dict(zip(rs.columns, row)) for row in rs.rows]
        if productos:
            await db_mongo.producto.drop()
            await db_mongo.producto.insert_many(productos)

        print("🔄 Migrando Mesas -> MongoDB...")
        rs = await turso_client.execute("SELECT * FROM mesa")
        mesas = [dict(zip(rs.columns, row)) for row in rs.rows]
        if mesas:
            await db_mongo.mesas.drop()
            await db_mongo.mesas.insert_many(mesas)

        print("✅ Datos operacionales migrados a MongoDB Atlas.")
    finally:
        await turso_client.close()


if __name__ == "__main__":
    asyncio.run(migrar_usuarios_mongo_a_sqlite())
