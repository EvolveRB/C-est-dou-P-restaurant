from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from bson import ObjectId
from database import get_db

app = FastAPI(
    title="API Restaurante - C'est doux P",
    description="13 operaciones CRUD + Auth — Motor (MongoDB Atlas)"
)

# ==============================================================================
# CORS — permite peticiones desde Vite (dev y preview)
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# HELPERS — serialización y búsqueda flexible
# ==============================================================================
def serializar_doc(doc: dict) -> dict:
    """Convierte el _id de ObjectId a string y normaliza campos."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def build_producto_filter(id_producto: str) -> dict:
    """Permite buscar un producto tanto por su ObjectId (_id) como por id_plato (int)."""
    try:
        return {"_id": ObjectId(id_producto)}
    except Exception:
        try:
            return {"id_plato": int(id_producto)}
        except Exception:
            return {"_id": id_producto}

async def build_mesa_pedidos_filter(num_mesa: int, db) -> dict:
    """Construye un filtro para pedidos de una mesa, incluyendo int y str y los que vienen por id_visita (migrados de Turso)."""
    mesa_conditions = [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]
    try:
        visitas_docs = await db.visitas.find(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"id_visita": 1}
        ).to_list(length=100)
        visitas_ids = [v["id_visita"] for v in visitas_docs if "id_visita" in v]
        if visitas_ids:
            return {"$or": [*mesa_conditions, {"id_visita": {"$in": visitas_ids}}]}
    except Exception:
        pass
    return {"$or": mesa_conditions}


# ==============================================================================
# MODELOS PYDANTIC
# ==============================================================================
class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"
    piso: int = 1

class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Platos de Fondo"
    precio: float
    disponibilidad: str = "En stock"
    imagen: Optional[str] = None
    tiempo_preparacion: int = 15
    descripcion: Optional[str] = None

class ItemPedido(BaseModel):
    producto_id: Optional[str] = "1"
    nombre: Optional[str] = "Plato"
    precio_unitario: Optional[float] = 0.0
    cantidad: Optional[int] = 1
    observaciones: Optional[str] = None

class PedidoCreate(BaseModel):
    num_mesa: Union[int, str]
    empleado_id: Optional[str] = None
    estado_pedido: Optional[str] = "Pendiente"
    hora_pedido: Optional[str] = None
    items: Optional[List[ItemPedido]] = []
    notas: Optional[str] = None

class MesaUpdateEstado(BaseModel):
    estado: str

class ProductoUpdatePrecio(BaseModel):
    precio: float

class ProductoDisponibilidad(BaseModel):
    disponible: bool  # True → "En stock" | False → "Agotado"

class LoginInput(BaseModel):
    username: str
    password: str


# ==============================================================================
# AUTH — Login de empleados
# ==============================================================================
@app.post("/empleados/login", tags=["Auth"])
async def login_empleado(creds: LoginInput, db=Depends(get_db)):
    """
    Autentica a un empleado buscando por correo, username o nombre en la colección 'empleados'.
    """
    try:
        username_clean = creds.username.strip()
        filtro = {
            "$or": [
                {"correo": username_clean},
                {"username": username_clean},
                {"nombre": {"$regex": f"^{username_clean}$", "$options": "i"}},
                {"rol": {"$regex": f"^{username_clean}$", "$options": "i"}}
            ]
        }
        empleado = None
        try:
            empleado = await db.empleados.find_one(filtro, {"password": 0})
        except Exception as db_err:
            print(f"[AUTH WARN] Error consultando MongoDB: {db_err}")
        
        # Si no se encuentra por nombre específico pero ingresó 'admin', buscar el primer Administrador
        u_lower = username_clean.lower()
        if not empleado and u_lower in ["admin", "administrador", "gerente", "admin@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Administrador"}, {"password": 0})
            except Exception:
                pass
            if not empleado:
                empleado = {
                    "id_empleado": 1,
                    "nombre": "Administrador",
                    "apellido": "Sistema",
                    "correo": "admin@restaurant.cl",
                    "username": "admin",
                    "rol": "Administrador"
                }
        elif not empleado and u_lower in ["cocinero", "cocina", "chef", "chef@restaurant.cl", "cocina@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Cocinero"}, {"password": 0})
            except Exception:
                pass
            if not empleado:
                empleado = {
                    "id_empleado": 2,
                    "nombre": "Chef",
                    "apellido": "Ejecutivo",
                    "correo": "chef@restaurant.cl",
                    "username": "cocinero",
                    "rol": "Cocinero"
                }
        elif not empleado and u_lower in ["garzon", "garzón", "mesero", "mesero@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Garzón"}, {"password": 0})
            except Exception:
                pass
            if not empleado:
                empleado = {
                    "id_empleado": 3,
                    "nombre": "Garzón",
                    "apellido": "Salón",
                    "correo": "mesero@restaurant.cl",
                    "username": "mesero",
                    "rol": "Garzón"
                }

        if not empleado:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        # Normalizamos los campos esperados por el frontend
        empleado["cargo"] = empleado.get("rol", empleado.get("cargo", "Mesero"))
        return serializar_doc(empleado)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 1. INSERT (3)
# ==============================================================================
@app.post("/mesas", tags=["1. INSERT (3)"])
async def crear_mesa(mesa: MesaCreate, db=Depends(get_db)):
    """Inserta un nuevo documento en la colección 'mesas'."""
    try:
        resultado = await db.mesas.insert_one(mesa.model_dump())
        return {"mensaje": "Mesa creada", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/productos", tags=["1. INSERT (3)"])
async def crear_producto(producto: ProductoCreate, db=Depends(get_db)):
    """Inserta un nuevo documento en la colección 'producto'."""
    try:
        resultado = await db.producto.insert_one(producto.model_dump())
        return {"mensaje": "Producto creado", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/pedidos", tags=["1. INSERT (3)"])
async def crear_pedido(pedido: PedidoCreate, db=Depends(get_db)):
    """
    Inserta un pedido con items embebidos en la colección 'pedidos'.
    Calcula subtotal y total automáticamente y actualiza la mesa a 'Pendiente'.
    """
    try:
        pedido_dict = pedido.model_dump()
        try:
            pedido_dict["num_mesa"] = int(pedido_dict["num_mesa"])
        except Exception:
            pass

        if not pedido_dict.get("hora_pedido"):
            pedido_dict["hora_pedido"] = datetime.now().strftime("%H:%M")

        items_list = pedido_dict.get("items") or []
        subtotal = sum(
            float(item.get("precio_unitario", 0) or 0) * int(item.get("cantidad", 1) or 1)
            for item in items_list
        )
        pedido_dict["subtotal"] = subtotal
        pedido_dict["total"] = subtotal
        pedido_dict["estado_pedido"] = "Pendiente"

        # Archivar pedidos anteriores no entregados de la misma mesa para evitar solapamientos
        filtro_mesa = await build_mesa_pedidos_filter(pedido_dict["num_mesa"], db)
        await db.pedidos.update_many(
            {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
            {"$set": {"estado_pedido": "Archivado"}}
        )

        resultado = await db.pedidos.insert_one(pedido_dict)

        # Actualizar el estado de la mesa a 'Pendiente' en tiempo real
        await db.mesas.update_one(
            {"$or": [{"num_mesa": pedido_dict["num_mesa"]}, {"num_mesa": str(pedido_dict["num_mesa"])}]},
            {"$set": {"estado": "Pendiente", "num_mesa": pedido_dict["num_mesa"]}},
            upsert=True
        )

        return {"mensaje": "Pedido creado", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 2. SELECT (3)
# ==============================================================================
@app.get("/productos/filtrados", tags=["2. SELECT (3)"])
async def select_productos_por_precio(precio_maximo: float = 10000, db=Depends(get_db)):
    """
    Obtiene los productos con precio menor al filtro desde la colección 'producto'.
    """
    try:
        cursor = db.producto.find(
            {"precio": {"$lt": precio_maximo}},
            {"_id": 1, "id_plato": 1, "nombre": 1, "precio": 1, "disponibilidad": 1,
             "categoria": 1, "descripcion": 1, "tiempo_preparacion": 1, "imagen": 1}
        )
        docs = await cursor.to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/info-mesas", tags=["2. SELECT (3)"])
async def select_pedidos_info_mesas(db=Depends(get_db)):
    """
    Retorna el pedido activo más reciente para cada mesa con items embebidos y notas.
    """
    try:
        pipeline = [
            {
                "$lookup": {
                    "from": "visitas",
                    "localField": "id_visita",
                    "foreignField": "id_visita",
                    "as": "visita_info"
                }
            },
            {
                "$addFields": {
                    "num_mesa": {
                        "$convert": {
                            "input": {
                                "$ifNull": [
                                    "$num_mesa",
                                    {"$arrayElemAt": ["$visita_info.num_mesa", 0]}
                                ]
                            },
                            "to": "int",
                            "onError": None,
                            "onNull": None
                        }
                    }
                }
            },
            # Solo pedidos con mesa asignada y no archivados
            {"$match": {"num_mesa": {"$ne": None}, "estado_pedido": {"$ne": "Archivado"}}},
            # Ordenar más reciente primero
            {"$sort": {"_id": -1}},
            # Agrupar por mesa para tomar siempre la última comanda
            {
                "$group": {
                    "_id": "$num_mesa",
                    "doc_id": {"$first": "$_id"},
                    "id_pedido": {"$first": {"$ifNull": ["$id_pedido", "$_id"]}},
                    "estado_pedido": {"$first": "$estado_pedido"},
                    "hora_pedido": {"$first": "$hora_pedido"},
                    "items": {"$first": "$items"},
                    "subtotal": {"$first": "$subtotal"},
                    "total": {"$first": "$total"},
                    "notas": {"$first": "$notas"}
                }
            },
            {
                "$project": {
                    "_id": "$doc_id",
                    "num_mesa": "$_id",
                    "id_pedido": 1,
                    "estado_pedido": 1,
                    "hora_pedido": 1,
                    "items": 1,
                    "subtotal": 1,
                    "total": 1,
                    "notas": 1
                }
            }
        ]
        docs = await db.pedidos.aggregate(pipeline).to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/detalles-platos", tags=["2. SELECT (3)"])
async def select_detalles_platos(db=Depends(get_db)):
    """
    Retorna los items embebidos de los pedidos.
    """
    try:
        cursor = db.pedidos.find(
            {},
            {"_id": 1, "num_mesa": 1, "items": 1}
        )
        docs = await cursor.to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 3. UPDATE (2 + extras)
# ==============================================================================
@app.put("/mesas/{num_mesa}/estado", tags=["3. UPDATE (2)"])
async def update_estado_mesa(num_mesa: int, update_data: MesaUpdateEstado, db=Depends(get_db)):
    """Actualiza el estado de una mesa y sincroniza sus pedidos en tiempo real."""
    try:
        nuevo_estado = update_data.estado
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": nuevo_estado, "num_mesa": num_mesa}},
            upsert=True
        )

        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)

        if nuevo_estado in ["Libre", "Entregado"]:
            # Marcar todos los pedidos activos de la mesa como Entregados
            await db.pedidos.update_many(
                {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
                {"$set": {"estado_pedido": "Entregado"}}
            )
        else:
            # Actualizar todos los pedidos activos de esa mesa al nuevo estado
            await db.pedidos.update_many(
                {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
                {"$set": {"estado_pedido": nuevo_estado}}
            )

        return {"mensaje": f"Mesa {num_mesa} actualizada a '{nuevo_estado}'"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/mesas/{num_mesa}/liberar", tags=["3. UPDATE (2)"])
async def liberar_mesa(num_mesa: int, db=Depends(get_db)):
    """Libera una mesa y finaliza cualquier pedido previo para iniciar desde cero."""
    try:
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": "Libre", "num_mesa": num_mesa}},
            upsert=True
        )
        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)
        await db.pedidos.update_many(
            filtro_mesa,
            {"$set": {"estado_pedido": "Entregado"}}
        )
        return {"mensaje": f"Mesa {num_mesa} liberada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.put("/productos/{id_producto}/precio", tags=["3. UPDATE (2)"])
async def update_precio_producto(id_producto: str, update_data: ProductoUpdatePrecio, db=Depends(get_db)):
    """Actualiza el precio de un producto por ObjectId o id_plato."""
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.update_one(
            filtro,
            {"$set": {"precio": update_data.precio}}
        )
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"mensaje": f"Precio del producto '{id_producto}' actualizado a {update_data.precio}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.patch("/productos/{id_producto}/disponible", tags=["3. UPDATE (2)"])
async def toggle_disponibilidad_producto(id_producto: str, data: ProductoDisponibilidad, db=Depends(get_db)):
    """
    Activa o desactiva un producto del menú (cocinero).
    Actualiza la colección 'producto'.
    """
    try:
        disponibilidad_str = "En stock" if data.disponible else "Agotado"
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.update_one(
            filtro,
            {"$set": {"disponibilidad": disponibilidad_str}}
        )
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {
            "mensaje": f"Producto '{id_producto}' actualizado a '{disponibilidad_str}'",
            "disponible": data.disponible
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 4. DELETE (2)
# ==============================================================================
@app.delete("/productos/{id_producto}", tags=["4. DELETE (2)"])
async def delete_producto(id_producto: str, db=Depends(get_db)):
    """Elimina un producto por ObjectId o id_plato."""
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.delete_one(filtro)
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=404, detail="El producto no existe")
        return {"mensaje": f"Producto '{id_producto}' eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/mesas/{num_mesa}", tags=["4. DELETE (2)"])
async def delete_mesa_condicionada(num_mesa: int, db=Depends(get_db)):
    """Elimina una mesa solo si su estado es 'Libre'."""
    try:
        resultado = await db.mesas.delete_one({"num_mesa": num_mesa, "estado": "Libre"})
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=400, detail="La mesa no existe o no está en estado 'Libre'")
        return {"mensaje": f"Mesa {num_mesa} eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 5. ALTER / DROP (3) — Equivalentes NoSQL
# ==============================================================================
@app.post("/admin/alter-1", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_telefono_empleado(db=Depends(get_db)):
    """Equivale a ALTER ADD COLUMN telefono."""
    try:
        resultado = await db.empleados.update_many({}, {"$set": {"telefono": None}})
        return {
            "mensaje": "Atributo 'telefono' agregado a todos los empleados existentes",
            "documentos_modificados": resultado.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-1/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_telefono(db=Depends(get_db)):
    """Equivale a ALTER DROP COLUMN telefono."""
    try:
        resultado = await db.empleados.update_many({}, {"$unset": {"telefono": ""}})
        return {
            "mensaje": "Atributo 'telefono' eliminado de todos los empleados",
            "documentos_modificados": resultado.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/alter-2", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_fecha_entrega_pedido(db=Depends(get_db)):
    """Equivale a ALTER ADD COLUMN fecha_entrega."""
    try:
        resultado = await db.pedidos.update_many({}, {"$set": {"fecha_entrega": None}})
        return {
            "mensaje": "Atributo 'fecha_entrega' agregado a todos los pedidos existentes",
            "documentos_modificados": resultado.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-2/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_fecha_entrega(db=Depends(get_db)):
    """Equivale a ALTER DROP COLUMN fecha_entrega."""
    try:
        resultado = await db.pedidos.update_many({}, {"$unset": {"fecha_entrega": ""}})
        return {
            "mensaje": "Atributo 'fecha_entrega' eliminado de todos los pedidos",
            "documentos_modificados": resultado.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/preparar-temporada", tags=["5. ALTER y DROP (3)"])
async def preparar_coleccion_promociones(db=Depends(get_db)):
    """Crea la colección promocion_temporada con un documento semilla."""
    try:
        count = await db.promocion_temporada.count_documents({})
        if count > 0:
            return {"mensaje": "La colección 'promocion_temporada' ya existe."}
        await db.promocion_temporada.insert_one({"nombre_promo": "SEMILLA", "descuento": 0.0})
        return {"mensaje": "Colección 'promocion_temporada' creada. Lista para demostrar el DROP."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/drop/promociones", tags=["5. ALTER y DROP (3)"])
async def drop_coleccion_promociones(db=Depends(get_db)):
    """Equivale a DROP TABLE promocion_temporada."""
    try:
        await db.promocion_temporada.drop()
        return {"mensaje": "Colección 'promocion_temporada' eliminada con éxito (DROP)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))
