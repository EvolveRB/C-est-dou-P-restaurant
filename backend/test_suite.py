import sys
import asyncio
from bson import ObjectId

# Configurar stdout en utf-8 para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from database import get_db, init_sqlite_db, SqliteSessionLocal
from models import Usuario, PerfilLog
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
    obtener_filtros_catalogo,
    crear_producto,
    update_producto_completo,
    delete_producto,
    select_pedidos_info_mesas,
    select_detalles_platos,
    crear_pedido,
    update_estado_mesa,
    pagar_y_liberar_mesa,
    obtener_pedidos_y_transacciones,
    agregar_categoria_catalogo,
    renombrar_categoria_catalogo,
    eliminar_categoria_catalogo,
    agregar_etiqueta_catalogo,
    renombrar_etiqueta_catalogo,
    eliminar_etiqueta_catalogo,
    toggle_disponibilidad_producto,
    crear_mesa,
    delete_mesa_condicionada,
    PedidoCreate,
    ItemPedido,
    MesaUpdateEstado,
    ProductoDisponibilidad,
    ProductoCreate,
    ProductoUpdate,
    PagoMesaInput,
    CategoriaInput,
    CategoriaRenameInput,
    EtiquetaInput,
    EtiquetaRenameInput,
    MesaCreate,
)


async def run_tests():
    print("==================================================")
    print("SUITE DE PRUEBAS (SQLITE AUTH + MONGODB ATLAS)")
    print("==================================================")

    init_sqlite_db()
    db = await get_db()
    sqlite_db = SqliteSessionLocal()
    dummy_staff = Usuario(
        id=0,
        rut="11111111-1",
        nombre="Test",
        apellido="Runner",
        rol="Administrador",
        password_hash="x",
    )

    passed = 0
    total = 0
    mesa_prueba = 98
    created_pedido_id = None
    created_tx_id = None
    created_prod_id = None

    try:
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

        # Test 2: GET /productos/filtrados (sin límite artificial de 10000 ni mutación de BD)
        total += 1
        sample_prod = None
        try:
            productos = await select_productos_por_precio(precio_maximo=None, db=db)
            assert isinstance(productos, list) and len(productos) > 0
            sample_prod = productos[0]
            print(f"✅ Test 2 PASÓ: GET /productos/filtrados retornó {len(productos)} productos.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 2 FALLÓ: {e}")

        # Test 3: GET /catalogo/filtros (categorías y etiquetas dinámicas)
        total += 1
        try:
            filtros = await obtener_filtros_catalogo(db=db)
            assert isinstance(filtros.get("categorias"), list) and len(filtros["categorias"]) > 0
            assert isinstance(filtros.get("etiquetas"), list)
            print(f"✅ Test 3 PASÓ: GET /catalogo/filtros retornó {len(filtros['categorias'])} categorías.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 3 FALLÓ: {e}")

        # Test 4: GET /pedidos/info-mesas y GET /pedidos/detalles-platos
        total += 1
        try:
            pedidos_mesas = await select_pedidos_info_mesas(_staff=dummy_staff, db=db)
            detalles = await select_detalles_platos(_staff=dummy_staff, db=db)
            assert isinstance(pedidos_mesas, list) and isinstance(detalles, list)
            print(f"✅ Test 4 PASÓ: Pedidos ({len(pedidos_mesas)}) y detalles ({len(detalles)}) listados.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 4 FALLÓ: {e}")

        # Test 5: Flujo mesa aislada (98) -> crear pedido -> actualizar estado -> pagar con correo -> liberar -> historial admin
        total += 1
        try:
            await crear_mesa(mesa=MesaCreate(num_mesa=mesa_prueba, estado="Libre"), _admin=dummy_staff, db=db)
            nuevo_pedido = PedidoCreate(
                num_mesa=mesa_prueba,
                empleado_id="test_emp",
                estado_pedido="Pendiente",
                hora_pedido="20:30",
                notas="Prueba flujo completo",
                sucursal="Local 2 - Sucursal Centro",
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
            created_pedido_id = res_pedido.get("id")
            assert created_pedido_id

            res_mesa = await update_estado_mesa(
                num_mesa=mesa_prueba,
                update_data=MesaUpdateEstado(estado="En preparación"),
                staff=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )
            assert "actualizada" in res_mesa.get("mensaje", "")

            res_pago = await pagar_y_liberar_mesa(
                num_mesa=mesa_prueba,
                pago=PagoMesaInput(
                    correo_cliente="cliente.prueba@example.com",
                    metodo_pago="tarjeta",
                    propina_porcentaje=10,
                ),
                db=db,
            )
            created_tx_id = res_pago.get("transaccion_id")
            assert created_tx_id and res_pago.get("total_pagado") == 9900

            admin_panel = await obtener_pedidos_y_transacciones(
                sucursal="Local 2 - Sucursal Centro",
                _admin=dummy_staff,
                db=db,
            )
            tx_ids = [t.get("_id") for t in admin_panel.get("transacciones", [])]
            assert created_tx_id in tx_ids

            del_res = await delete_mesa_condicionada(num_mesa=mesa_prueba, _admin=dummy_staff, db=db)
            assert "eliminada" in del_res.get("mensaje", "")
            print("✅ Test 5 PASÓ: Pedido, pago 100% correo, historial admin y liberación de mesa.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 5 FALLÓ: {e}")

        # Test 6: CRUD completo de Productos (POST/PUT/PATCH/DELETE)
        total += 1
        try:
            res_new_prod = await crear_producto(
                producto=ProductoCreate(
                    nombre="__Plato_Test_Suite__",
                    categoria="Entradas",
                    precio=6500,
                    etiquetas=["TestTagSuite"],
                    disponibilidad=True,
                    tiempo_preparacion=12,
                    descripcion="Plato temporal de verificación",
                ),
                staff=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )
            created_prod_id = res_new_prod.get("id")
            assert created_prod_id

            await update_producto_completo(
                id_producto=created_prod_id,
                data=ProductoUpdate(precio=7200, etiquetas=["TestTagSuite", "Especial"]),
                staff=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )
            updated_doc = await db.producto.find_one({"_id": ObjectId(created_prod_id)})
            assert updated_doc and updated_doc.get("precio") == 7200

            if sample_prod:
                orig_raw = sample_prod.get("disponibilidad", True)
                orig_disp = orig_raw if isinstance(orig_raw, bool) else str(orig_raw).strip().lower() != "agotado"
                res_disp = await toggle_disponibilidad_producto(
                    id_producto=sample_prod["_id"],
                    data=ProductoDisponibilidad(disponible=not orig_disp),
                    staff=dummy_staff,
                    db=db,
                    sqlite_db=sqlite_db,
                )
                assert res_disp.get("disponible") is (not orig_disp)
                await toggle_disponibilidad_producto(
                    id_producto=sample_prod["_id"],
                    data=ProductoDisponibilidad(disponible=orig_disp),
                    staff=dummy_staff,
                    db=db,
                    sqlite_db=sqlite_db,
                )

            await delete_producto(id_producto=created_prod_id, _staff=dummy_staff, db=db)
            created_prod_id = None
            print("✅ Test 6 PASÓ: CRUD de productos y disponibilidad funcionando correctamente.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 6 FALLÓ: {e}")

        # Test 7: Administración de Categorías y Etiquetas (POST / PUT / DELETE)
        total += 1
        try:
            await agregar_categoria_catalogo(CategoriaInput(nombre="__CatTemp__"), admin=dummy_staff, db=db, sqlite_db=sqlite_db)
            await renombrar_categoria_catalogo(
                CategoriaRenameInput(nombre_actual="__CatTemp__", nombre_nuevo="__CatTemp2__"),
                admin=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )
            await eliminar_categoria_catalogo(
                nombre="__CatTemp2__",
                reassign_to="Platos de Fondo",
                admin=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )

            await agregar_etiqueta_catalogo(EtiquetaInput(nombre="__TagTemp__"), admin=dummy_staff, db=db, sqlite_db=sqlite_db)
            await renombrar_etiqueta_catalogo(
                EtiquetaRenameInput(nombre_actual="__TagTemp__", nombre_nuevo="__TagTemp2__"),
                admin=dummy_staff,
                db=db,
                sqlite_db=sqlite_db,
            )
            await eliminar_etiqueta_catalogo(nombre="__TagTemp2__", admin=dummy_staff, db=db, sqlite_db=sqlite_db)
            print("✅ Test 7 PASÓ: Administración CRUD de categorías y etiquetas en cascada.")
            passed += 1
        except Exception as e:
            print(f"❌ Test 7 FALLÓ: {e}")

    finally:
        # Limpieza estricta de datos de prueba en MongoDB y SQLite
        if created_pedido_id:
            await db.pedidos.delete_one({"_id": ObjectId(created_pedido_id)})
        if created_tx_id:
            await db.transacciones.delete_one({"_id": ObjectId(created_tx_id)})
        if created_prod_id:
            await db.producto.delete_one({"_id": ObjectId(created_prod_id)})
        await db.mesas.delete_one({"num_mesa": mesa_prueba})
        await db.carta_config.update_one(
            {"_id": "filtros"},
            {"$pull": {"etiquetas": {"$in": ["TestTagSuite", "Especial", "__TagTemp__", "__TagTemp2__"]}}},
        )
        sqlite_db.query(PerfilLog).filter(
            (PerfilLog.usuario_id == dummy_staff.id) | (PerfilLog.detalle.like("%TestTagSuite%")) | (PerfilLog.detalle.like("%__CatTemp%")) | (PerfilLog.detalle.like("%__TagTemp%")) | (PerfilLog.detalle.like("%__Plato_Test_Suite__%")) | (PerfilLog.detalle.like("Mesa 98%"))
        ).delete(synchronize_session=False)
        sqlite_db.commit()
        sqlite_db.close()

    print("==================================================")
    print(f"RESULTADO FINAL: {passed}/{total} PRUEBAS EXITOSAS")
    print("==================================================")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_tests())
