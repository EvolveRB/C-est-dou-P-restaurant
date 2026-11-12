from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import get_db # Tu conexión a Motor
from bson.objectid import ObjectId

router = APIRouter()

# ==========================================
# FUNCIÓN AYUDANTE PARA FORMATEAR MONGO
# ==========================================
def parse_mongo(doc):
    """Convierte el ObjectId a string para evitar errores de FastAPI"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ==========================================
# MODELOS PYDANTIC
# ==========================================
class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"
    piso: int = 1

class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Platos de Fondo"
    precio: float
    disponibilidad: str = "En stock"
    tiempo_preparacion: int

class ItemPedido(BaseModel):
    producto_id: str
    nombre: str
    precio_unitario: float
    cantidad: int
    observaciones: Optional[str] = None

class PedidoCreate(BaseModel):
    visita_id: str
    num_mesa: int
    empleado_id: str
    estado_pedido: str = "Pendiente"
    items: List[ItemPedido]

# ==========================================
# 1. CONSULTAS INSERT (3)
# ==========================================
@router.post("/mesas", tags=["1. INSERT (3)"])
async def crear_mesa(mesa: MesaCreate, db = Depends(get_db)):
    nueva_mesa = await db.mesas.insert_one(mesa.model_dump())
    return {"mensaje": "Mesa creada", "id": str(nueva_mesa.inserted_id)}

@router.post("/productos", tags=["1. INSERT (3)"])
async def crear_producto(producto: ProductoCreate, db = Depends(get_db)):
    nuevo_producto = await db.producto.insert_one(producto.model_dump())
    return {"mensaje": "Producto creado", "id": str(nuevo_producto.inserted_id)}

@router.post("/pedidos", tags=["1. INSERT (3)"])
async def crear_pedido(pedido: PedidoCreate, db = Depends(get_db)):
    subtotal = sum(item.precio_unitario * item.cantidad for item in pedido.items)
    pedido_dict = pedido.model_dump()
    pedido_dict["subtotal"] = subtotal
    nuevo_pedido = await db.pedidos.insert_one(pedido_dict)
    return {"mensaje": "Pedido creado", "id": str(nuevo_pedido.inserted_id)}

# ==========================================
# 2. CONSULTAS SELECT (3)
# ==========================================
@router.get("/productos/filtrados", tags=["2. SELECT (3)"])
async def select_simple_productos_baratos(precio_maximo: float = 10000, db = Depends(get_db)):
    """Reemplaza al SELECT Simple con WHERE"""
    cursor = db.producto.find({"precio": {"$lt": precio_maximo}}, {"_id": 0, "nombre": 1, "precio": 1})
    return await cursor.to_list(length=100)

@router.get("/pedidos/info-mesas", tags=["2. SELECT (3)"])
async def select_pedidos_mesas(db = Depends(get_db)):
    """Reemplaza al JOIN de 3 tablas. En Mongo, la mesa ya está en el pedido"""
    cursor = db.pedidos.find({}, {"_id": 1, "num_mesa": 1, "estado_pedido": 1, "hora_pedido": 1})
    pedidos = await cursor.to_list(length=100)
    return [parse_mongo(p) for p in pedidos]

@router.get("/pedidos/detalles-platos", tags=["2. SELECT (3)"])
async def select_detalles_platos(db = Depends(get_db)):
    """Reemplaza al JOIN de 2 tablas. Los detalles ya vienen embebidos en 'items'"""
    cursor = db.pedidos.find({}, {"_id": 1, "items": 1})
    pedidos = await cursor.to_list(length=100)
    return [parse_mongo(p) for p in pedidos]

# ==========================================
# 3. CONSULTAS UPDATE (2)
# ==========================================
@router.put("/mesas/{num_mesa}/estado", tags=["3. UPDATE (2)"])
async def update_estado_mesa(num_mesa: int, estado: str, db = Depends(get_db)):
    resultado = await db.mesas.update_one({"num_mesa": num_mesa}, {"$set": {"estado": estado}})
    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    return {"mensaje": f"Mesa {num_mesa} actualizada a {estado}"}

@router.put("/productos/{id_producto}/precio", tags=["3. UPDATE (2)"])
async def update_precio_producto(id_producto: str, precio: float, db = Depends(get_db)):
    resultado = await db.producto.update_one({"_id": ObjectId(id_producto)}, {"$set": {"precio": precio}})
    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"mensaje": f"Precio del producto actualizado a {precio}"}

# ==========================================
# 4. CONSULTAS DELETE (2)
# ==========================================
@router.delete("/productos/{id_producto}", tags=["4. DELETE (2)"])
async def delete_producto(id_producto: str, db = Depends(get_db)):
    resultado = await db.producto.delete_one({"_id": ObjectId(id_producto)})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="El producto no existe")
    return {"mensaje": "Producto eliminado correctamente"}

@router.delete("/mesas/{num_mesa}", tags=["4. DELETE (2)"])
async def delete_mesa_condicionada(num_mesa: int, db = Depends(get_db)):
    """Elimina usando múltiples condiciones (ej: solo si está Libre)"""
    resultado = await db.mesas.delete_one({"num_mesa": num_mesa, "estado": "Libre"})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=400, detail="La mesa no existe o no está Libre")
    return {"mensaje": f"Mesa {num_mesa} eliminada correctamente"}

# ==========================================
# 5. CONSULTAS ALTER Y DROP (3) -> EQUIVALENTES NOSQL
# ==========================================
@router.post("/admin/alter-1", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_telefono_empleado(db = Depends(get_db)):
    """Simula ALTER ADD COLUMN: Actualiza todos los documentos agregando 'telefono'"""
    await db.empleados.update_many({}, {"$set": {"telefono": None}})
    return {"mensaje": "Atributo 'telefono' agregado a todos los empleados existentes"}

@router.delete("/admin/alter-1/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_telefono(db = Depends(get_db)):
    """Simula ALTER DROP COLUMN: Elimina el campo 'telefono' de todos los documentos"""
    await db.empleados.update_many({}, {"$unset": {"telefono": ""}})
    return {"mensaje": "Atributo 'telefono' eliminado de los empleados"}

@router.delete("/admin/drop/promociones", tags=["5. ALTER y DROP (3)"])
async def drop_promociones_temporada(db = Depends(get_db)):
    """DROP equivalente en Mongo: Eliminar la colección completa"""
    await db.promocion_temporada.drop()
    return {"mensaje": "Colección 'promocion_temporada' eliminada con éxito (DROP)"}