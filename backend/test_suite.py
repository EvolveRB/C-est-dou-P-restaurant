import os
import sys
import asyncio
from dotenv import load_dotenv

# Configurar stdout en utf-8 para Windows
sys.stdout.reconfigure(encoding='utf-8')

# Importar app y modelos
from main import (
    select_productos_por_precio,
    select_pedidos_info_mesas,
    select_detalles_platos,
    login_empleado,
    crear_pedido,
    update_estado_mesa,
    toggle_disponibilidad_producto,
    crear_mesa,
    delete_mesa_condicionada,
    LoginInput,
    PedidoCreate,
    ItemPedido,
    MesaUpdateEstado,
    ProductoDisponibilidad,
    MesaCreate
)
from database import get_db

async def run_tests():
    print("==================================================")
    print("INICIANDO SUITE DE PRUEBAS DE ENDPOINTS (FASTAPI + ATLAS)")
    print("==================================================")
    
    db = await get_db()
    passed = 0
    total = 0

    # Test 1: GET /productos/filtrados
    total += 1
    try:
        productos = await select_productos_por_precio(precio_maximo=9999999, db=db)
        assert isinstance(productos, list), "El resultado debe ser una lista"
        assert len(productos) > 0, "Debe retornar productos de la base de datos"
        print(f"✅ Test 1 PASÓ: GET /productos/filtrados retornó {len(productos)} productos.")
        sample_prod = productos[0]
        print(f"   Muestra de producto: ID={sample_prod.get('_id')}, Nombre='{sample_prod.get('nombre')}', Precio={sample_prod.get('precio')}")
        passed += 1
    except Exception as e:
        print(f"❌ Test 1 FALLÓ: {e}")

    # Test 2: GET /pedidos/info-mesas
    total += 1
    try:
        pedidos_mesas = await select_pedidos_info_mesas(db=db)
        assert isinstance(pedidos_mesas, list), "El resultado debe ser una lista"
        assert len(pedidos_mesas) > 0, "Debe retornar pedidos con info de mesa"
        print(f"✅ Test 2 PASÓ: GET /pedidos/info-mesas retornó {len(pedidos_mesas)} comandas.")
        print(f"   Muestra: {pedidos_mesas[0]}")
        passed += 1
    except Exception as e:
        print(f"❌ Test 2 FALLÓ: {e}")

    # Test 3: GET /pedidos/detalles-platos
    total += 1
    try:
        detalles = await select_detalles_platos(db=db)
        assert isinstance(detalles, list), "El resultado debe ser una lista"
        print(f"✅ Test 3 PASÓ: GET /pedidos/detalles-platos retornó {len(detalles)} registros de items.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 3 FALLÓ: {e}")

    # Test 4: POST /empleados/login
    total += 1
    try:
        creds = LoginInput(username="admin@restaurant.cl", password="any")
        emp = await login_empleado(creds=creds, db=db)
        assert emp is not None, "Debe retornar el empleado autenticado"
        assert emp.get("rol") == "Administrador" or emp.get("cargo") == "Administrador"
        print(f"✅ Test 4 PASÓ: POST /empleados/login exitoso para '{emp.get('nombre')}' con rol '{emp.get('cargo')}'.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 4 FALLÓ: {e}")

    # Test 5: POST /pedidos (Creación de comanda con items embebidos)
    total += 1
    nuevo_pedido_id = None
    try:
        nuevo_pedido = PedidoCreate(
            num_mesa=5,
            empleado_id="test_emp",
            estado_pedido="Pendiente",
            hora_pedido="20:30",
            notas="Sin cebolla, urgente",
            items=[
                ItemPedido(
                    producto_id="prod_test_1",
                    nombre="Bruschettas Mixtas",
                    precio_unitario=4500.0,
                    cantidad=2,
                    observaciones="Extra queso"
                )
            ]
        )
        res_pedido = await crear_pedido(pedido=nuevo_pedido, db=db)
        assert "id" in res_pedido, "La respuesta debe contener el ID insertado"
        nuevo_pedido_id = res_pedido["id"]
        print(f"✅ Test 5 PASÓ: POST /pedidos creó la comanda con _id={nuevo_pedido_id}.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 5 FALLÓ: {e}")

    # Test 6: PUT /mesas/{num_mesa}/estado
    total += 1
    try:
        estado_update = MesaUpdateEstado(estado="Esperando")
        res_mesa = await update_estado_mesa(num_mesa=5, update_data=estado_update, db=db)
        assert "actualizada" in res_mesa.get("mensaje", "")
        print(f"✅ Test 6 PASÓ: PUT /mesas/5/estado actualizó mesa a 'Esperando'.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 6 FALLÓ: {e}")

    # Test 7: PATCH /productos/{id}/disponible
    total += 1
    try:
        # Usamos el primer producto obtenido en el test 1
        prod_id = sample_prod["_id"]
        toggle_data = ProductoDisponibilidad(disponible=False)
        res_disp = await toggle_disponibilidad_producto(id_producto=prod_id, data=toggle_data, db=db)
        assert res_disp.get("disponible") is False
        # Lo restauramos a True
        await toggle_disponibilidad_producto(id_producto=prod_id, data=ProductoDisponibilidad(disponible=True), db=db)
        print(f"✅ Test 7 PASÓ: PATCH /productos/{prod_id}/disponible alternó y restauró la disponibilidad correctamente.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 7 FALLÓ: {e}")

    # Test 8: POST /mesas y DELETE /mesas/{num_mesa}
    total += 1
    try:
        mesa_test_num = 99
        await crear_mesa(mesa=MesaCreate(num_mesa=mesa_test_num, estado="Libre"), db=db)
        del_res = await delete_mesa_condicionada(num_mesa=mesa_test_num, db=db)
        assert "eliminada" in del_res.get("mensaje", "")
        print(f"✅ Test 8 PASÓ: Creación y eliminación condicional de mesa {mesa_test_num} correcta.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 8 FALLÓ: {e}")

    # Limpieza del pedido de prueba creado en test 5
    if nuevo_pedido_id:
        from bson import ObjectId
        await db.pedidos.delete_one({"_id": ObjectId(nuevo_pedido_id)})
        print(f"   (Limpieza: comanda temporal {nuevo_pedido_id} eliminada)")

    print("==================================================")
    print(f"RESULTADO FINAL: {passed}/{total} PRUEBAS EXITOSAS")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())

