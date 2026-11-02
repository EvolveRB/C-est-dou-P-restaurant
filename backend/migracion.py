import os
import asyncio
from dotenv import load_dotenv
import libsql_client
from motor.motor_asyncio import AsyncIOMotorClient

async def migrar_datos():
    load_dotenv()
    
    mongo_uri = os.getenv("MONGO_URI")
    turso_url = os.getenv("TURSO_DATABASE_URL")
    turso_token = os.getenv("TURSO_AUTH_TOKEN")
    
    if not mongo_uri or not turso_url:
        print("❌ Error: Faltan credenciales en tu archivo .env (MONGO_URI o TURSO_DATABASE_URL)")
        return

    print("Conectando a Turso y MongoDB Atlas...")
    mongo_client = AsyncIOMotorClient(mongo_uri)
    db = mongo_client.restaurante_db 

    # Conectar a Turso
    turso_client = libsql_client.create_client(url=turso_url, auth_token=turso_token)

    try:
        # (Opcional) Limpiar BD en Mongo si quieres empezar de cero
        await db.empleados.drop()
        await db.producto.drop()
        await db.mesas.drop()
        await db.visitas.drop()
        await db.pedidos.drop()

        print("🔄 1. Migrando Empleados...")
        rs = await turso_client.execute("SELECT * FROM empleado")
        empleados = [dict(zip(rs.columns, row)) for row in rs.rows]
        if empleados: await db.empleados.insert_many(empleados)

        print("🔄 2. Migrando Productos...")
        rs = await turso_client.execute("SELECT * FROM producto")
        productos = [dict(zip(rs.columns, row)) for row in rs.rows]
        if productos: await db.producto.insert_many(productos)

        print("🔄 3. Migrando Mesas...")
        rs = await turso_client.execute("SELECT * FROM mesa")
        mesas = [dict(zip(rs.columns, row)) for row in rs.rows]
        if mesas: await db.mesas.insert_many(mesas)

        print("🔄 4. Migrando Visitas (Embebiendo Pagos)...")
        rs_visitas = await turso_client.execute("SELECT * FROM visita_mesa")
        visitas_rows = [dict(zip(rs_visitas.columns, row)) for row in rs_visitas.rows]
        
        visitas_mongo = []
        for visita in visitas_rows:
            rs_pagos = await turso_client.execute("SELECT * FROM pago WHERE id_visita = ?", [visita['id_visita']])
            visita['pagos'] = [dict(zip(rs_pagos.columns, row)) for row in rs_pagos.rows]
            visitas_mongo.append(visita)
        if visitas_mongo: await db.visitas.insert_many(visitas_mongo)

        print("🔄 5. Migrando Pedidos (Embebiendo Detalles)...")
        rs_pedidos = await turso_client.execute("SELECT * FROM pedido")
        pedidos_rows = [dict(zip(rs_pedidos.columns, row)) for row in rs_pedidos.rows]
        
        pedidos_mongo = []
        for pedido in pedidos_rows:
            consulta_detalles = """
                SELECT dp.id_plato AS producto_id, pr.nombre, pr.precio AS precio_unitario, dp.cantidad, dp.observaciones
                FROM detalle_pedido dp
                INNER JOIN producto pr ON dp.id_plato = pr.id_plato
                WHERE dp.id_pedido = ?
            """
            rs_det = await turso_client.execute(consulta_detalles, [pedido['id_pedido']])
            detalles = [dict(zip(rs_det.columns, row)) for row in rs_det.rows]
            
            pedido['items'] = detalles
            pedido['subtotal'] = sum(item['cantidad'] * item['precio_unitario'] for item in detalles)
            pedidos_mongo.append(pedido)
            
        if pedidos_mongo: await db.pedidos.insert_many(pedidos_mongo)

        print("✅ ¡Migración completada exitosamente! Los datos pasaron de Turso a MongoDB.")

    except Exception as e:
        print(f"❌ Ocurrió un error: {e}")
    finally:
        await turso_client.close()
        mongo_client.close()

if __name__ == "__main__":
    asyncio.run(migrar_datos())