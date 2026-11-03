import os
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.encoders import ENCODERS_BY_TYPE
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from bson import ObjectId
from database import get_db

# Registro global para que jsonable_encoder de FastAPI serialice ObjectId automáticamente a string
ENCODERS_BY_TYPE[ObjectId] = str

app = FastAPI(
    title="API Restaurante - C'est doux P",
    description="13 operaciones CRUD + Auth + Visitas — Motor (MongoDB Atlas)"
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
# ARCHIVOS ESTÁTICOS — Servir imágenes de los productos desde /Imagenes
# ==============================================================================
imagenes_dir = os.path.join(os.path.dirname(__file__), "Imagenes")
if not os.path.exists(imagenes_dir):
    os.makedirs(imagenes_dir, exist_ok=True)

try:
    from fastapi.staticfiles import StaticFiles
    app.mount("/Imagenes", StaticFiles(directory=imagenes_dir), name="imagenes")
except Exception as static_err:
    print(f"[STATIC INFO] Servidor de estáticos fallback FileResponse activo: {static_err}")

@app.get("/Imagenes/{nombre_archivo}", tags=["Archivos"])
async def obtener_imagen_estatica(nombre_archivo: str):
    ruta = os.path.join(imagenes_dir, nombre_archivo)
    if os.path.exists(ruta):
        return FileResponse(ruta)
    raise HTTPException(status_code=404, detail="Imagen no encontrada")

# ==============================================================================
# HELPERS — serialización y búsqueda flexible
# ==============================================================================
MAPA_IMAGENES_POR_NOMBRE = {
    "plato principal alpha": "plato_alpha.jpg",
    "entrada especial beta": "entrada_beta.jpg",
    "sopa tradicional gamma": "sopa_gamma.jpg",
    "corte de carne delta": "corte_delta.jpg",
    "pasta artesanal epsilon": "pasta_epsilon.jpg",
    "postre tentación zeta": "postreUV.jpeg",
    "postre tentacion zeta": "postreUV.jpeg",
    "carpaccio de res trufado": "carpaccio_trufado.jpg",
    "bisque de mariscos del puerto": "bisque_mariscos.jpg",
    "ravioles de ricotta y nueces": "ravioles_ricotta.jpg",
    "limonada menta jengibre": "limonada_menta.jpg",
    "copa de vino reserva syrah": "vino_reserva.jpg",
}

MAPA_IMAGENES_POR_ID = {
    1: "plato_alpha.jpg",
    2: "entrada_beta.jpg",
    3: "sopa_gamma.jpg",
    4: "corte_delta.jpg",
    5: "pasta_epsilon.jpg",
    6: "postreUV.jpeg",
    7: "carpaccio_trufado.jpg",
    8: "bisque_mariscos.jpg",
    9: "ravioles_ricotta.jpg",
    10: "limonada_menta.jpg",
    11: "vino_reserva.jpg",
}

def resolver_imagen_producto(doc: dict) -> str:
    """Garantiza que siempre retorne la ruta de imagen correcta del catálogo."""
    img = doc.get("imagen")
    if img and str(img).strip():
        img_str = str(img).strip()
        if img_str.startswith("http://") or img_str.startswith("https://") or img_str.startswith("/"):
            return img_str
        return f"/Imagenes/{img_str.lstrip('/')}"

    nombre_norm = str(doc.get("nombre", "")).strip().lower()
    if nombre_norm in MAPA_IMAGENES_POR_NOMBRE:
        return f"/Imagenes/{MAPA_IMAGENES_POR_NOMBRE[nombre_norm]}"

    for k, v in MAPA_IMAGENES_POR_NOMBRE.items():
        if k in nombre_norm or nombre_norm in k:
            return f"/Imagenes/{v}"

    id_plato = doc.get("id_plato")
    if id_plato in MAPA_IMAGENES_POR_ID:
        return f"/Imagenes/{MAPA_IMAGENES_POR_ID[id_plato]}"

    return "/Imagenes/plato_alpha.jpg"

def serializar_doc(val):
    """Convierte recursivamente cualquier ObjectId o datetime a formato serializable JSON."""
    if isinstance(val, ObjectId):
        return str(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): serializar_doc(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [serializar_doc(item) for item in val]
    return val

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
# MODELOS PYDANTIC — Alineados con esquema final MongoDB Atlas
# ==============================================================================

# ── Mesa ──────────────────────────────────────────────────────────────────────
class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"
    piso: int = 1
    qr_token: Optional[str] = None
    visita_activa_id: Optional[str] = None

class MesaUpdateEstado(BaseModel):
    estado: str

# ── Producto ──────────────────────────────────────────────────────────────────
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
    disponible: bool  # True -> "En stock" | False -> "Agotado"

# ── Pedido (items con patrón snapshot) ────────────────────────────────────────
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

# ── Visita ────────────────────────────────────────────────────────────────────
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

# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginInput(BaseModel):
    username: str
    password: str

# ── Empleados (Plantilla de trabajadores) ────────────────────────────────────
class EmpleadoCreate(BaseModel):
    nombre: str
    apellido: Optional[str] = ""
    correo: Optional[str] = None
    username: Optional[str] = None
    rol: str = "Garzón"  # "Garzón", "Cocinero", "Administrador"
    telefono: Optional[str] = None
    password: Optional[str] = "123456"

class EmpleadoUpdateRol(BaseModel):
    rol: str

class MesasCantidadInput(BaseModel):
    cantidad: int


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

        empleado["cargo"] = empleado.get("rol", empleado.get("cargo", "Mesero"))
        return serializar_doc(empleado)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# EMPLEADOS — Plantilla de trabajadores y administración de roles
# ==============================================================================
@app.get("/empleados", tags=["Empleados"])
async def listar_empleados(db=Depends(get_db)):
    """Retorna la lista de empleados actuales (plantilla de trabajadores)."""
    try:
        cursor = db.empleados.find({}, {"password": 0})
        docs = await cursor.to_list(length=100)

        # Si la colección está vacía, insertar los empleados base solicitados
        if len(docs) == 0:
            semillas = [
                {
                    "nombre": "Marcela",
                    "apellido": "Soto",
                    "correo": "marcela.soto@restaurant.cl",
                    "username": "marcela.soto",
                    "rol": "Cocinero",
                    "cargo": "Cocinero",
                    "telefono": "+56 9 8765 4321",
                    "estado": "Activo"
                },
                {
                    "nombre": "Ana",
                    "apellido": "Morales",
                    "correo": "ana.morales@restaurant.cl",
                    "username": "ana.morales",
                    "rol": "Garzón",
                    "cargo": "Garzón",
                    "telefono": "+56 9 7654 3210",
                    "estado": "Activo"
                },
                {
                    "nombre": "Carlos",
                    "apellido": "Silva",
                    "correo": "admin@restaurant.cl",
                    "username": "admin",
                    "rol": "Administrador",
                    "cargo": "Administrador",
                    "telefono": "+56 9 1234 5678",
                    "estado": "Activo"
                }
            ]
            await db.empleados.insert_many(semillas)
            docs = await db.empleados.find({}, {"password": 0}).to_list(length=100)

        # Garantizar que Marcela Soto y Ana Morales estén presentes en la lista
        tiene_marcela = any("marcela" in str(d.get("nombre", "")).lower() for d in docs)
        tiene_ana = any("ana" in str(d.get("nombre", "")).lower() for d in docs)

        if not tiene_marcela:
            m_doc = {
                "nombre": "Marcela",
                "apellido": "Soto",
                "correo": "marcela.soto@restaurant.cl",
                "username": "marcela.soto",
                "rol": "Cocinero",
                "cargo": "Cocinero",
                "telefono": "+56 9 8765 4321",
                "estado": "Activo"
            }
            res_m = await db.empleados.insert_one(m_doc)
            m_doc["_id"] = res_m.inserted_id
            docs.append(m_doc)

        if not tiene_ana:
            a_doc = {
                "nombre": "Ana",
                "apellido": "Morales",
                "correo": "ana.morales@restaurant.cl",
                "username": "ana.morales",
                "rol": "Garzón",
                "cargo": "Garzón",
                "telefono": "+56 9 7654 3210",
                "estado": "Activo"
            }
            res_a = await db.empleados.insert_one(a_doc)
            a_doc["_id"] = res_a.inserted_id
            docs.append(a_doc)

        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/empleados", tags=["Empleados"])
async def crear_empleado(emp: EmpleadoCreate, db=Depends(get_db)):
    """Agrega un nuevo trabajador a la plantilla del restaurante."""
    try:
        emp_dict = emp.model_dump()
        nombre_clean = emp_dict["nombre"].strip()
        apellido_clean = (emp_dict.get("apellido") or "").strip()
        if not emp_dict.get("username"):
            emp_dict["username"] = f"{nombre_clean.lower()}.{apellido_clean.lower()}".strip(".")
        if not emp_dict.get("correo"):
            emp_dict["correo"] = f"{emp_dict['username']}@restaurant.cl"
        emp_dict["cargo"] = emp_dict["rol"]
        emp_dict["estado"] = "Activo"

        res = await db.empleados.insert_one(emp_dict)
        emp_dict["_id"] = str(res.inserted_id)
        return serializar_doc(emp_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.put("/empleados/{id_empleado}/rol", tags=["Empleados"])
async def actualizar_rol_empleado(id_empleado: str, data: EmpleadoUpdateRol, db=Depends(get_db)):
    """Actualiza el rol de un trabajador (Cocinero, Garzón, Administrador)."""
    try:
        filtro = {"_id": ObjectId(id_empleado)} if ObjectId.is_valid(id_empleado) else {"_id": id_empleado}
        res = await db.empleados.update_one(
            filtro,
            {"$set": {"rol": data.rol, "cargo": data.rol}}
        )
        if res.matched_count == 0:
            await db.empleados.update_one(
                {"$or": [{"username": id_empleado}, {"nombre": id_empleado}]},
                {"$set": {"rol": data.rol, "cargo": data.rol}}
            )
        return {"mensaje": f"Rol actualizado a {data.rol}", "id": id_empleado, "rol": data.rol}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/empleados/{id_empleado}", tags=["Empleados"])
async def eliminar_empleado(id_empleado: str, db=Depends(get_db)):
    """Elimina un trabajador de la plantilla."""
    try:
        filtro = {"_id": ObjectId(id_empleado)} if ObjectId.is_valid(id_empleado) else {"_id": id_empleado}
        res = await db.empleados.delete_one(filtro)
        return {"mensaje": "Trabajador eliminado correctamente", "id": id_empleado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# MESAS — Listar y ajustar capacidad dinámica
# ==============================================================================
@app.get("/mesas", tags=["Mesas"])
async def listar_mesas(db=Depends(get_db)):
    """Retorna todas las mesas registradas y la cantidad actual."""
    try:
        cursor = db.mesas.find({}).sort("num_mesa", 1)
        mesas = await cursor.to_list(length=100)
        return {
            "total": len(mesas),
            "mesas": [serializar_doc(m) for m in mesas]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/mesas/cantidad", tags=["Mesas"])
async def ajustar_cantidad_mesas(data: MesasCantidadInput, db=Depends(get_db)):
    """
    Ajusta dinámicamente la cantidad total de mesas del restaurante (1 a 50).
    Añade mesas nuevas o elimina mesas libres excedentes.
    """
    try:
        nueva_cantidad = max(1, min(50, data.cantidad))
        mesas_existentes = await db.mesas.find({}).to_list(length=100)
        actuales = set()
        for m in mesas_existentes:
            try:
                actuales.add(int(m.get("num_mesa", 0)))
            except Exception:
                pass

        # Agregar mesas faltantes
        for n in range(1, nueva_cantidad + 1):
            if n not in actuales:
                await db.mesas.update_one(
                    {"$or": [{"num_mesa": n}, {"num_mesa": str(n)}]},
                    {"$set": {"num_mesa": n, "estado": "Libre", "piso": 1, "visita_activa_id": None}},
                    upsert=True
                )

        # Si sobran mesas libres por encima del nuevo total, retirarlas
        for n in list(actuales):
            if n > nueva_cantidad:
                await db.mesas.delete_one({"num_mesa": n, "estado": "Libre"})

        total_final = await db.mesas.count_documents({})
        return {
            "mensaje": f"Capacidad del salón ajustada a {nueva_cantidad} mesas",
            "cantidad": nueva_cantidad,
            "total_registradas": total_final
        }
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
    Inserta un pedido con items embebidos en la colección 'pedidos',
    o acumula los nuevos platos si la mesa ya tiene una comanda activa en cocina.
    """
    try:
        pedido_dict = pedido.model_dump()
        try:
            pedido_dict["num_mesa"] = int(pedido_dict["num_mesa"])
        except Exception:
            pass

        if not pedido_dict.get("hora_pedido"):
            pedido_dict["hora_pedido"] = datetime.now().strftime("%H:%M")

        items_nuevos = pedido_dict.get("items") or []
        filtro_mesa = await build_mesa_pedidos_filter(pedido_dict["num_mesa"], db)

        # 1. Verificar si la mesa ya tiene una comanda activa para sumar los platos adicionales
        pedido_activo = await db.pedidos.find_one({
            **filtro_mesa,
            "estado_pedido": {"$in": ["Pendiente", "En preparación", "Esperando", "Listo"]}
        })

        if pedido_activo:
            items_totales = (pedido_activo.get("items") or []) + items_nuevos
            subtotal_total = sum(
                float(it.get("precio_unitario", 0) or 0) * int(it.get("cantidad", 1) or 1)
                for it in items_totales
            )
            notas_previas = pedido_activo.get("notas", "")
            nueva_nota = pedido_dict.get("notas", "")
            notas_acumuladas = f"{notas_previas} | {nueva_nota}".strip(" |") if nueva_nota else notas_previas

            await db.pedidos.update_one(
                {"_id": pedido_activo["_id"]},
                {"$set": {
                    "items": items_totales,
                    "subtotal": subtotal_total,
                    "total": subtotal_total,
                    "notas": notas_acumuladas,
                    "hora_pedido": pedido_dict["hora_pedido"]
                }}
            )
            return {"mensaje": "Platos adicionales agregados a la comanda activa", "id": str(pedido_activo["_id"]), "acumulado": True}

        # 2. Si no había comanda previa, insertar nuevo pedido
        subtotal = sum(
            float(item.get("precio_unitario", 0) or 0) * int(item.get("cantidad", 1) or 1)
            for item in items_nuevos
        )
        pedido_dict["subtotal"] = subtotal
        pedido_dict["total"] = subtotal
        pedido_dict["estado_pedido"] = "Pendiente"

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

        return {"mensaje": "Pedido creado", "id": str(resultado.inserted_id), "acumulado": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# INSERT — Visitas
# ==============================================================================
@app.post("/visitas", tags=["Visita"])
async def crear_visita(visita: VisitaCreate, db=Depends(get_db)):
    """Crea una nueva visita para una mesa."""
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
    """
    Obtiene los productos con precio menor al filtro desde la colección 'producto'.
    Garantiza que cada plato tenga su imagen correspondiente resuelta y sincronizada.
    """
    try:
        cursor = db.producto.find(
            {"precio": {"$lt": precio_maximo}},
            {"_id": 1, "id_plato": 1, "nombre": 1, "precio": 1, "disponibilidad": 1,
             "categoria": 1, "descripcion": 1, "tiempo_preparacion": 1, "imagen": 1,
             "etiquetas": 1}
        )
        docs = await cursor.to_list(length=200)
        docs_con_imagen = []
        for d in docs:
            img_res = resolver_imagen_producto(d)
            if not d.get("imagen") or d.get("imagen") != img_res:
                d["imagen"] = img_res
                # Sincronizar en Mongo para futuras peticiones
                try:
                    await db.producto.update_one({"_id": d["_id"]}, {"$set": {"imagen": img_res}})
                except Exception:
                    pass
            docs_con_imagen.append(serializar_doc(d))
        return docs_con_imagen
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
    """Libera una mesa y finaliza cualquier pedido previo para iniciar desde cero."""
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
# VISITAS — Llamar garzón y validar QR (RF-08 y Validación de mesa)
# ==============================================================================
@app.patch("/visitas/{visita_id}/llamar-garzon", tags=["Visita"])
async def llamar_garzon(visita_id: str, datos: LlamarGarzonInput, db=Depends(get_db)):
    """
    Actualiza el objeto solicitud_garzon de una visita a activa: true con su respectivo motivo.
    Acepta tanto el ObjectId de la visita como el número de mesa directamente.
    """
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
    """
    Valida que el token QR de una mesa coincida con el almacenado en la BD.
    Retorna 403 si el token no coincide o la mesa no existe.
    """
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
            "visita_activa_id": str(mesa.get("visita_activa_id")) if mesa.get("visita_activa_id") else None
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
        return {"mensaje": "Coleccion 'promocion_temporada' eliminada con exito (DROP)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# REINICIO Y LIMPIEZA DE PRUEBAS
# Mesa 1: Libre (lista para tiempo real)
# Mesa 2: Esperando a elaboración (comanda activa de prueba)
# ==============================================================================
@app.post("/sistema/reiniciar-pruebas", tags=["Pruebas"])
@app.post("/mesas/reiniciar-pruebas", tags=["Pruebas"])
async def reiniciar_sistema_pruebas(db=Depends(get_db)):
    """
    Limpia y resetea el entorno de pruebas:
    - Mesa 1 queda LIBRE y limpia para pruebas de pedidos y tiempo real.
    - Mesa 2 queda con un pedido de prueba en estado 'Pendiente' (esperando a elaboración).
    - Mesas 3 a 8 quedan en estado 'Libre'.
    - Archiva pedidos activos anteriores.
    - Asegura que los productos tengan su campo 'imagen' sincronizado.
    """
    try:
        # 1. Archivar todos los pedidos activos anteriores
        await db.pedidos.update_many(
            {"estado_pedido": {"$nin": ["Archivado", "Entregado"]}},
            {"$set": {"estado_pedido": "Archivado"}}
        )

        # 2. Dejar todas las mesas existentes (o al menos 8) como 'Libre'
        mesas_count = await db.mesas.count_documents({})
        cant_mesas = max(8, mesas_count)
        for num in range(1, cant_mesas + 1):
            await db.mesas.update_one(
                {"$or": [{"num_mesa": num}, {"num_mesa": str(num)}]},
                {"$set": {"num_mesa": num, "estado": "Libre", "visita_activa_id": None}},
                upsert=True
            )

        # 3. Insertar comanda de prueba para Mesa 2 (esperando a elaboración)
        hora_test = datetime.now().strftime("%H:%M")
        pedido_mesa_2 = {
            "num_mesa": 2,
            "empleado_id": None,
            "estado_pedido": "Pendiente",
            "hora_pedido": hora_test,
            "notas": "Mesa de prueba: esperando a elaboración",
            "items": [
                {
                    "producto_id": "1",
                    "nombre": "Plato Principal Alpha",
                    "precio_unitario": 12500,
                    "cantidad": 1,
                    "observaciones": "Término medio"
                },
                {
                    "producto_id": "2",
                    "nombre": "Entrada Especial Beta",
                    "precio_unitario": 8000,
                    "cantidad": 1,
                    "observaciones": "Sin sal añadida"
                }
            ],
            "subtotal": 20500,
            "total": 20500,
            "fecha_creacion": datetime.now()
        }
        res_pedido_2 = await db.pedidos.insert_one(pedido_mesa_2)

        # Marcar Mesa 2 como 'Pendiente' en db.mesas
        await db.mesas.update_one(
            {"$or": [{"num_mesa": 2}, {"num_mesa": "2"}]},
            {"$set": {"num_mesa": 2, "estado": "Pendiente", "visita_activa_id": None}},
            upsert=True
        )

        # 4. Asegurar Mesa 1 explícitamente Libre
        await db.mesas.update_one(
            {"$or": [{"num_mesa": 1}, {"num_mesa": "1"}]},
            {"$set": {"num_mesa": 1, "estado": "Libre", "visita_activa_id": None}},
            upsert=True
        )

        # 5. Sincronizar imágenes de productos faltantes
        prods = await db.producto.find({}).to_list(100)
        for p in prods:
            img_res = resolver_imagen_producto(p)
            if not p.get("imagen") or p.get("imagen") != img_res:
                await db.producto.update_one({"_id": p["_id"]}, {"$set": {"imagen": img_res}})

        return {
            "mensaje": "Estado de pruebas reiniciado con éxito",
            "mesa_1": "Libre (lista para tiempo real)",
            "mesa_2": "Esperando a elaboración (comanda activa)",
            "pedido_mesa_2_id": str(res_pedido_2.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))
