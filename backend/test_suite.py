import sys
import asyncio

# Configurar stdout en utf-8 para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from database import get_db, init_sqlite_db, SqliteSessionLocal
from models import Usuario
from security import (
    hash_password,
    verify_password,
    generate_temp_password,
    normalize_rut,
    is_valid_rut_format,
    create_session_token,
    verify_session_token,
)
from main import (
    select_productos_por_precio,
    select_pedidos_info_mesas,
    select_detalles_platos,
    crear_pedido,
    update_estado_mesa,
    toggle_disponibilidad_producto,
    crear_mesa,
    delete_mesa_condicionada,
    PedidoCreate,
    ItemPedido,
    MesaUpdateEstado,
    ProductoDisponibilidad,
    MesaCreate,
)


async def run_tests():
    print("==================================================")
    print("SUITE DE PRUEBAS (SQLITE AUTH + MONGODB ATLAS)")
    print("==================================================")

    init_sqlite_db()
    db = await get_db()
    sqlite_db = SqliteSessionLocal()
    dummy_staff = Usuario(id=0, rut="11111111-1", nombre="Test", apellido="Runner", rol="Administrador", password_hash="x")

    passed = 0
    total = 0

    # Test 1: Seguridad (RUT, hashing PBKDF2 y tokens HMAC)
    total += 1
    try:
        assert normalize_rut("12.345.678-k") == "12345678-K"
        assert is_valid_rut_format("12.345.678-9") is True
        temp = generate_temp_password()
        hashed = hash_password(temp)
        assert hashed != temp and verify_password(temp, hashed) is True
        assert verify_password("clave-mala", hashed) is False
        token = create_session_token({"sub": "1", "rol": "Administrador"}, "test-secret-key-123456")
        decoded = verify_session_token(token, "test-secret-key-123456")
        assert decoded is not None and decoded["rol"] == "Administrador"
        print("✅ Test 1 PASÓ: Hashing PBKDF2, validación de RUT y tokens firmados.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 1 FALLÓ: {e}")

    # Test 2: GET /productos/filtrados
    total += 1
    sample_prod = None
    try:
        productos = await select_productos_por_precio(precio_maximo=9999999, db=db)
        assert isinstance(productos, list) and len(productos) > 0
        sample_prod = productos[0]
        print(f"✅ Test 2 PASÓ: GET /productos/filtrados retornó {len(productos)} productos.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 2 FALLÓ: {e}")

    # Test 3: GET /pedidos/info-mesas
    total += 1
    try:
        pedidos_mesas = await select_pedidos_info_mesas(_staff=dummy_staff, db=db)
        assert isinstance(pedidos_mesas, list)
        print(f"✅ Test 3 PASÓ: GET /pedidos/info-mesas retornó {len(pedidos_mesas)} comandas.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 3 FALLÓ: {e}")

    # Test 4: GET /pedidos/detalles-platos
    total += 1
    try:
        detalles = await select_detalles_platos(_staff=dummy_staff, db=db)
        assert isinstance(detalles, list)
        print(f"✅ Test 4 PASÓ: GET /pedidos/detalles-platos retornó {len(detalles)} registros.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 4 FALLÓ: {e}")

    # Test 5: POST /pedidos
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
                    observaciones="Extra queso",
                )
            ],
        )
        res_pedido = await crear_pedido(pedido=nuevo_pedido, db=db)
        assert "id" in res_pedido
        nuevo_pedido_id = res_pedido["id"]
        print(f"✅ Test 5 PASÓ: POST /pedidos creó comanda _id={nuevo_pedido_id}.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 5 FALLÓ: {e}")

    # Test 6: PUT /mesas/5/estado
    total += 1
    try:
        res_mesa = await update_estado_mesa(
            num_mesa=5,
            update_data=MesaUpdateEstado(estado="Esperando"),
            staff=dummy_staff,
            db=db,
            sqlite_db=sqlite_db,
        )
        assert "actualizada" in res_mesa.get("mensaje", "")
        print("✅ Test 6 PASÓ: PUT /mesas/5/estado actualizó mesa a 'Esperando'.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 6 FALLÓ: {e}")

    # Test 7: PATCH /productos/{id}/disponible
    total += 1
    try:
        assert sample_prod is not None
        prod_id = sample_prod["_id"]
        res_disp = await toggle_disponibilidad_producto(
            id_producto=prod_id,
            data=ProductoDisponibilidad(disponible=False),
            staff=dummy_staff,
            db=db,
            sqlite_db=sqlite_db,
        )
        assert res_disp.get("disponible") is False
        await toggle_disponibilidad_producto(
            id_producto=prod_id,
            data=ProductoDisponibilidad(disponible=True),
            staff=dummy_staff,
            db=db,
            sqlite_db=sqlite_db,
        )
        print("✅ Test 7 PASÓ: PATCH /productos/{id}/disponible alternó disponibilidad.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 7 FALLÓ: {e}")

    # Test 8: POST /mesas y DELETE /mesas/{num_mesa}
    total += 1
    try:
        mesa_test_num = 99
        await crear_mesa(mesa=MesaCreate(num_mesa=mesa_test_num, estado="Libre"), _admin=dummy_staff, db=db)
        del_res = await delete_mesa_condicionada(num_mesa=mesa_test_num, _admin=dummy_staff, db=db)
        assert "eliminada" in del_res.get("mensaje", "")
        print(f"✅ Test 8 PASÓ: Creación y eliminación de mesa {mesa_test_num} correcta.")
        passed += 1
    except Exception as e:
        print(f"❌ Test 8 FALLÓ: {e}")

    if nuevo_pedido_id:
        from bson import ObjectId
        await db.pedidos.delete_one({"_id": ObjectId(nuevo_pedido_id)})

    sqlite_db.close()
    print("==================================================")
    print(f"RESULTADO FINAL: {passed}/{total} PRUEBAS EXITOSAS")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
