import os
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from bson import ObjectId
from database import get_db

app = FastAPI(
    title="API Restaurante - C'est doux P",
    description="13 operaciones CRUD + Auth + Visitas — Motor (MongoDB Atlas)"
)

# ==============================================================================
# CORS — permite peticiones locales, túneles y dominios en la nube (Railway)
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "https://imprecise-hammock-rigid.ngrok-free.dev", # Túnel ngrok activo
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# ARCHIVOS ESTÁTICOS — Servir imágenes de los productos desde /Imagenes
# ==============================================================================
imagenes_dir = os.path.join(os.path.dirname(__file__), "Imagenes")
if not os.path.exists(imagenes_dir):
    os.makedirs(imagenes_dir, exist_ok=True)
app.mount("/Imagenes", StaticFiles(directory=imagenes_dir), name="imagenes")

# Mapeo por defecto de imágenes según el nombre del platillo
MAPA_IMAGENES_DEFAULT = {
    "plato principal alpha": "plato_alpha.jpg",
    "entrada especial beta": "entrada_beta.jpg",
    "sopa tradicional gamma": "sopa_gamma.jpg",
    "corte de carne delta": "corte_delta.jpg",
    "pasta artesanal epsilon": "pasta_epsilon.jpg",
    "postre tentación zeta": "postreUV.jpeg",
    "carpaccio de res trufado": "carpaccio_trufado.jpg",
    "bisque de mariscos del puerto": "bisque_mariscos.jpg",
    "ravioles de ricotta y nueces": "ravioles_ricotta.jpg",
    "limonada menta jengibre": "limonada_menta.jpg",
    "copa de vino reserva syrah": "vino_reserva.jpg"
}

# ==============================================================================
# HELPERS — serialización y búsqueda flexible
# ==============================================================================
def serializar_doc(doc: dict) -> dict:
    """Convierte cualquier ObjectId (como _id o id_pedido) a string y normaliza campos."""
    if not doc or not isinstance(doc, dict):
        return doc
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, dict):
            doc[k] = serializar_doc(v)
        elif isinstance(v, list):
            doc[k] = [serializar_doc(i) if isinstance(i, dict) else str(i) if isinstance(i, ObjectId) else i for i in v]
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
    """Construye un filtro para pedidos de una mesa, incluyendo int y str y los que vienen por id_visita."""
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
# MODELOS PYDANTIC — Alineados con esquema final MongoDB Atlas
# ==============================================================================

class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"
    piso: int = 1
    qr_token: Optional[str] = None
    visita_activa_id: Optional[str] = None

class MesaUpdateEstado(BaseModel):
    estado: str

class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Platos de Fondo"
    precio: float
    etiquetas: List[str] = []
    disponibilidad: str = "En stock"
    imagen: Optional[str] = None
    tiempo_preparacion: int = 15
    descripcion: Optional[str] = None

class ProductoUpdatePrecio(BaseModel):
    precio: float

class ProductoDisponibilidad(BaseModel):
    disponible: bool

class ItemPedido(BaseModel):
    producto_id: Optional[str] = "1"
    nombre: Optional[str] = "Plato"
    precio_unitario: Optional[float] = 0.0
    cantidad: Optional[int] = 1
    observaciones: Optional[str] = None

class PedidoCreate(BaseModel):
    num_mesa: Union[int, str]
    visita_id: Optional[str] = None
    empleado_id: Optional[str] = None
    estado_pedido: Optional[str] = "Pendiente"
    hora_pedido: Optional[str] = None
    items: Optional[List[ItemPedido]] = []
    notas: Optional[str] = None

class SolicitudGarzon(BaseModel):
    activa: bool = False
    hora_solicitud: Optional[str] = None
    motivo: Optional[str] = None

class PagoVisita(BaseModel):
    metodo: str = "Efectivo"
    monto: float = 0.0
    hora: Optional[str] = None

class VisitaCreate(BaseModel):
    num_mesa: int
    hora_inicio: Optional[str] = None
    estado_visita: str = "Activa"
    solicitud_garzon: Optional[SolicitudGarzon] = None
    pagos: List[PagoVisita] = []

class LlamarGarzonInput(BaseModel):
    motivo: str = "Necesito atención"

class LoginInput(BaseModel):
    username: str
    password: str


# ==============================================================================
# AUTH — Login de empleados
# ==============================================================================
@app.post("/empleados/login", tags=["Auth"])
async def login_empleado(creds: LoginInput, db=Depends(get_db)):
    """Autentica a un empleado consultando MongoDB y validando la contraseña."""
    try:
        username_clean = (creds.username or "").strip()
        password_clean = (creds.password or "").strip()

        if not username_clean or not password_clean:
            raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

        filtro = {
            "$or": [
                {"correo": username_clean},
                {"username": username_clean},
                {"nombre": {"$regex": f"^{username_clean}$", "$options": "i"}}
            ]
        }

        try:
            empleado = await db.empleados.find_one(filtro)
        except Exception as db_err:
            print(f"[AUTH ERROR] Error consultando MongoDB: {db_err}")
            raise HTTPException(status_code=503, detail="ERROR_BASE_DE_DATOS") from db_err

        u_lower = username_clean.lower()
        if not empleado and u_lower in ["admin", "administrador", "gerente", "admin@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Administrador"})
            except Exception:
                pass
        elif not empleado and u_lower in ["cocinero", "cocina", "chef", "chef@restaurant.cl", "cocina@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Cocinero"})
            except Exception:
                pass
        elif not empleado and u_lower in ["garzon", "garzón", "mesero", "mesero@restaurant.cl"]:
            try:
                empleado = await db.empleados.find_one({"rol": "Garzón"})
            except Exception:
                pass

        if not empleado:
            raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

        stored_password = empleado.get("password")
        if stored_password is None:
            raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

        stored_password_str = str(stored_password)
        provided_password_str = str(password_clean)

        password_matches = stored_password_str == provided_password_str
        if not password_matches:
            raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

        empleado.pop("password", None)
        empleado["cargo"] = empleado.get("rol", empleado.get("cargo", "Mesero"))
        return serializar_doc(empleado)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH ERROR] Error inesperado en login: {e}")
        raise HTTPException(status_code=500, detail="ERROR_BACKEND")


# ==============================================================================
# EMPLEADOS — Gestión CRUD para Panel de Administrador
# ==============================================================================
@app.get("/empleados", tags=["Empleados"])
async def listar_empleados(db=Depends(get_db)):
    try:
        cursor = db.empleados.find({}, {"password": 0})
        empleados = await cursor.to_list(length=100)
        return [serializar_doc(emp) for emp in empleados]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/empleados", tags=["Empleados"])
async def crear_empleado(emp: dict = Body(...), db=Depends(get_db)):
    try:
        emp_dict = dict(emp)
        # Limpiar IDs temporales de frontend para que Mongo asigne su _id real
        emp_dict.pop("_id", None)
        emp_dict.pop("id", None)

        if not emp_dict.get("rol"):
            emp_dict["rol"] = emp_dict.get("cargo", "Garzón")
        if not emp_dict.get("cargo"):
            emp_dict["cargo"] = emp_dict.get("rol", "Garzón")

        resultado = await db.empleados.insert_one(emp_dict)
        emp_dict["_id"] = str(resultado.inserted_id)
        return {"mensaje": "Empleado creado", "empleado": emp_dict, "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.patch("/empleados/{id_empleado}/rol", tags=["Empleados"])
async def actualizar_rol_empleado(id_empleado: str, data: dict = Body(...), db=Depends(get_db)):
    try:
        new_role = data.get("rol") or data.get("cargo") or "Garzón"
        filtro = {}
        try:
            filtro = {"_id": ObjectId(id_empleado)}
        except Exception:
            filtro = {"$or": [{"_id": id_empleado}, {"id": id_empleado}, {"id_empleado": id_empleado}]}

        resultado = await db.empleados.update_one(
            filtro,
            {"$set": {"rol": new_role, "cargo": new_role}}
        )
        return {"mensaje": "Rol actualizado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/empleados/{id_empleado}", tags=["Empleados"])
async def eliminar_empleado(id_empleado: str, db=Depends(get_db)):
    try:
        filtro = {}
        try:
            filtro = {"_id": ObjectId(id_empleado)}
        except Exception:
            filtro = {"$or": [{"_id": id_empleado}, {"id": id_empleado}, {"id_empleado": id_empleado}]}

        resultado = await db.empleados.delete_one(filtro)
        return {"mensaje": "Empleado eliminado", "eliminados": resultado.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))



# ==============================================================================
# 1. INSERT (3)
# ==============================================================================
@app.post("/mesas", tags=["1. INSERT (3)"])
async def crear_mesa(mesa: MesaCreate, db=Depends(get_db)):
    try:
        resultado = await db.mesas.insert_one(mesa.model_dump())
        return {"mensaje": "Mesa creada", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/productos", tags=["1. INSERT (3)"])
async def crear_producto(producto: ProductoCreate, db=Depends(get_db)):
    try:
        resultado = await db.producto.insert_one(producto.model_dump())
        return {"mensaje": "Producto creado", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/pedidos", tags=["1. INSERT (3)"])
async def crear_pedido(pedido: PedidoCreate, db=Depends(get_db)):
    try:
        pedido_dict = pedido.model_dump()
        try:
            pedido_dict["num_mesa"] = int(pedido_dict["num_mesa"])
        except Exception:
            pass

        if not pedido_dict.get("hora_pedido"):
            try:
                from datetime import timezone, timedelta
                chile_tz = timezone(timedelta(hours=-3))
                pedido_dict["hora_pedido"] = datetime.now(chile_tz).strftime("%H:%M")
            except Exception:
                pedido_dict["hora_pedido"] = datetime.now().strftime("%H:%M")

        items_list = pedido_dict.get("items") or []
        subtotal = sum(
            float(item.get("precio_unitario", 0) or 0) * int(item.get("cantidad", 1) or 1)
            for item in items_list
        )
        pedido_dict["subtotal"] = subtotal
        pedido_dict["total"] = subtotal
        pedido_dict["estado_pedido"] = "Pendiente"

        filtro_mesa = await build_mesa_pedidos_filter(pedido_dict["num_mesa"], db)
        await db.pedidos.update_many(
            {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
            {"$set": {"estado_pedido": "Archivado"}}
        )

        resultado = await db.pedidos.insert_one(pedido_dict)

        await db.mesas.update_one(
            {"$or": [{"num_mesa": pedido_dict["num_mesa"]}, {"num_mesa": str(pedido_dict["num_mesa"])}]},
            {"$set": {"estado": "Pendiente", "num_mesa": pedido_dict["num_mesa"]}},
            upsert=True
        )

        return {"mensaje": "Pedido creado", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/visitas", tags=["Visita"])
async def crear_visita(visita: VisitaCreate, db=Depends(get_db)):
    try:
        visita_dict = visita.model_dump()
        if not visita_dict.get("hora_inicio"):
            visita_dict["hora_inicio"] = datetime.now().isoformat()
        if visita_dict.get("solicitud_garzon") is None:
            visita_dict["solicitud_garzon"] = {"activa": False, "hora_solicitud": None, "motivo": None}

        resultado = await db.visitas.insert_one(visita_dict)
        visita_id_str = str(resultado.inserted_id)

        await db.mesas.update_one(
            {"$or": [{"num_mesa": visita.num_mesa}, {"num_mesa": str(visita.num_mesa)}]},
            {"$set": {"visita_activa_id": visita_id_str}}
        )

        return {"mensaje": "Visita creada", "id": visita_id_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 2. SELECT (3)
# ==============================================================================
@app.get("/productos/filtrados", tags=["2. SELECT (3)"])
async def select_productos_por_precio(precio_maximo: float = 10000, db=Depends(get_db)):
    try:
        cursor = db.producto.find(
            {"precio": {"$lt": precio_maximo}},
            {"_id": 1, "id_plato": 1, "nombre": 1, "precio": 1, "disponibilidad": 1,
             "categoria": 1, "descripcion": 1, "tiempo_preparacion": 1, "imagen": 1,
             "etiquetas": 1}
        )
        docs = await cursor.to_list(length=200)

        for d in docs:
            if not d.get("imagen") and d.get("nombre"):
                nom_norm = d["nombre"].strip().lower()
                if nom_norm in MAPA_IMAGENES_DEFAULT:
                    d["imagen"] = MAPA_IMAGENES_DEFAULT[nom_norm]
                    try:
                        await db.producto.update_one(
                            {"_id": d["_id"]},
                            {"$set": {"imagen": MAPA_IMAGENES_DEFAULT[nom_norm]}}
                        )
                    except Exception:
                        pass

        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/info-mesas", tags=["2. SELECT (3)"])
async def select_pedidos_info_mesas(db=Depends(get_db)):
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
            {"$match": {"num_mesa": {"$ne": None}, "estado_pedido": {"$ne": "Archivado"}}},
            {"$sort": {"_id": -1}},
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
    try:
        cursor = db.pedidos.find({}, {"_id": 1, "num_mesa": 1, "items": 1})
        docs = await cursor.to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 3. UPDATE (2 + extras)
# ==============================================================================
@app.put("/mesas/{num_mesa}/estado", tags=["3. UPDATE (2)"])
async def update_estado_mesa(num_mesa: int, update_data: MesaUpdateEstado, db=Depends(get_db)):
    try:
        nuevo_estado = update_data.estado
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": nuevo_estado, "num_mesa": num_mesa}},
            upsert=True
        )

        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)

        if nuevo_estado in ["Libre", "Entregado"]:
            await db.pedidos.update_many(
                {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
                {"$set": {"estado_pedido": "Entregado"}}
            )
        else:
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
    try:
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": "Libre", "num_mesa": num_mesa, "visita_activa_id": None}},
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
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.update_one(
            filtro,
            {"$set": {"precio": update_data.precio}}
        )
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"mensaje": f"Precio actualizado a {update_data.precio}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.patch("/productos/{id_producto}/disponible", tags=["3. UPDATE (2)"])
async def toggle_disponibilidad_producto(id_producto: str, data: ProductoDisponibilidad, db=Depends(get_db)):
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
            "mensaje": f"Producto actualizado a '{disponibilidad_str}'",
            "disponible": data.disponible
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# VISITAS — Llamar garzón y validar QR (RF-08 y Validación de mesa)
# ==============================================================================
@app.patch("/visitas/{visita_id}/llamar-garzon", tags=["Visita"])
async def llamar_garzon(visita_id: str, datos: LlamarGarzonInput, db=Depends(get_db)):
    try:
        solicitud_payload = {
            "activa": True,
            "hora_solicitud": datetime.utcnow().isoformat(),
            "motivo": datos.motivo
        }

        filtro_id = None
        try:
            filtro_id = {"_id": ObjectId(visita_id)}
        except Exception:
            filtro_id = {"_id": visita_id}

        resultado = await db.visitas.update_one(
            filtro_id,
            {"$set": {"solicitud_garzon": solicitud_payload}}
        )

        if resultado.matched_count == 0:
            try:
                num_m = int(visita_id)
                res_mesa = await db.visitas.update_one(
                    {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}], "estado_visita": "Activa"},
                    {"$set": {"solicitud_garzon": solicitud_payload}}
                )
                if res_mesa.matched_count > 0:
                    return {"mensaje": "Garzón llamado exitosamente", "visita_id": visita_id}
                
                nueva_visita = {
                    "num_mesa": num_m,
                    "hora_inicio": datetime.utcnow().isoformat(),
                    "estado_visita": "Activa",
                    "solicitud_garzon": solicitud_payload,
                    "pagos": []
                }
                nueva_res = await db.visitas.insert_one(nueva_visita)
                await db.mesas.update_one(
                    {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}]},
                    {"$set": {"visita_activa_id": str(nueva_res.inserted_id)}},
                    upsert=True
                )
                return {"mensaje": "Garzón llamado exitosamente", "visita_id": str(nueva_res.inserted_id)}
            except Exception:
                pass

            raise HTTPException(status_code=404, detail="Visita no encontrada")

        return {"mensaje": "Garzón llamado exitosamente", "visita_id": visita_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/mesas/{num_mesa}/validar-qr", tags=["Mesa"])
async def validar_qr(num_mesa: int, token: str, db=Depends(get_db)):
    try:
        mesa = await db.mesas.find_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]}
        )
        if not mesa:
            raise HTTPException(status_code=403, detail="QR inválido: mesa no encontrada")
        
        token_db = mesa.get("qr_token")
        if token_db is not None and token_db != token:
            raise HTTPException(status_code=403, detail="QR inválido: token no coincide")

        return {
            "mensaje": "QR válido",
            "num_mesa": num_mesa,
            "visita_activa_id": mesa.get("visita_activa_id")
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
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.delete_one(filtro)
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=404, detail="El producto no existe")
        return {"mensaje": f"Producto eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/mesas/{num_mesa}", tags=["4. DELETE (2)"])
async def delete_mesa_condicionada(num_mesa: int, db=Depends(get_db)):
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
# 5. ALTER / DROP (3)
# ==============================================================================
@app.post("/admin/alter-1", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_telefono_empleado(db=Depends(get_db)):
    try:
        resultado = await db.empleados.update_many({}, {"$set": {"telefono": None}})
        return {"mensaje": "Atributo 'telefono' agregado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-1/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_telefono(db=Depends(get_db)):
    try:
        resultado = await db.empleados.update_many({}, {"$unset": {"telefono": ""}})
        return {"mensaje": "Atributo 'telefono' eliminado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/alter-2", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_fecha_entrega_pedido(db=Depends(get_db)):
    try:
        resultado = await db.pedidos.update_many({}, {"$set": {"fecha_entrega": None}})
        return {"mensaje": "Atributo 'fecha_entrega' agregado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-2/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_fecha_entrega(db=Depends(get_db)):
    try:
        resultado = await db.pedidos.update_many({}, {"$unset": {"fecha_entrega": ""}})
        return {"mensaje": "Atributo 'fecha_entrega' eliminado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/preparar-temporada", tags=["5. ALTER y DROP (3)"])
async def preparar_coleccion_promociones(db=Depends(get_db)):
    try:
        count = await db.promocion_temporada.count_documents({})
        if count > 0:
            return {"mensaje": "La colección ya existe."}
        await db.promocion_temporada.insert_one({"nombre_promo": "SEMILLA", "descuento": 0.0})
        return {"mensaje": "Colección 'promocion_temporada' creada."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/drop/promociones", tags=["5. ALTER y DROP (3)"])
async def drop_coleccion_promociones(db=Depends(get_db)):
    try:
        await db.promocion_temporada.drop()
        return {"mensaje": "Coleccion 'promocion_temporada' eliminada con exito (DROP)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# ARCHIVOS ESTÁTICOS / FRONTEND SPA (Producción en Railway / Docker)
# ==============================================================================
frontend_dist = os.environ.get("STATIC_FRONTEND_PATH", os.path.join(os.path.dirname(__file__), "frontend-dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Archivo frontend no encontrado")
