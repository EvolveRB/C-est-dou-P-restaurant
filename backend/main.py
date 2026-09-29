from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import libsql_client
from database import get_db

app = FastAPI(title="API Restaurante - C'est doux P", description="Demostración de las 13 Consultas SQL")

# ==========================================
# MODELOS PYDANTIC
# ==========================================
class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Platos de Fondo"
    precio: float
    disponibilidad: str = "En stock"
    imagen: Optional[str] = None
    tiempo_preparacion: int
    descripcion: Optional[str] = None

class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"

class PedidoCreate(BaseModel):
    id_visita: int
    id_empleado: int
    estado_pedido: str = "Pendiente"
    hora_pedido: str

class MesaUpdateEstado(BaseModel):
    estado: str

class ProductoUpdatePrecio(BaseModel):
    precio: float

# ==========================================
# 1. CONSULTAS INSERT (3)
# ==========================================
@app.post("/mesas", tags=["1. INSERT (3)"])
async def crear_mesa(mesa: MesaCreate, db: libsql_client.Client = Depends(get_db)):
    try:
        await db.execute(
            "INSERT INTO mesa (num_mesa, estado) VALUES (?, ?)",
            [mesa.num_mesa, mesa.estado]
        )
        return {"mensaje": "Mesa creada", "datos": mesa.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@app.post("/productos", tags=["1. INSERT (3)"])
async def crear_producto(producto: ProductoCreate, db: libsql_client.Client = Depends(get_db)):
    try:
        await db.execute(
            """
            INSERT INTO producto (nombre, categoria, precio, disponibilidad, imagen, tiempo_preparacion, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [producto.nombre, producto.categoria, producto.precio, producto.disponibilidad, 
             producto.imagen, producto.tiempo_preparacion, producto.descripcion]
        )
        return {"mensaje": "Producto creado", "datos": producto.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@app.post("/pedidos", tags=["1. INSERT (3)"])
async def crear_pedido(pedido: PedidoCreate, db: libsql_client.Client = Depends(get_db)):
    try:
        await db.execute(
            "INSERT INTO pedido (id_visita, id_empleado, estado_pedido, hora_pedido) VALUES (?, ?, ?, ?)",
            [pedido.id_visita, pedido.id_empleado, pedido.estado_pedido, pedido.hora_pedido]
        )
        return {"mensaje": "Pedido creado", "datos": pedido.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

# ==========================================
# 2. CONSULTAS SELECT (3)
# ==========================================
@app.get("/productos/filtrados", tags=["2. SELECT (3)"])
async def select_simple_productos_baratos(precio_maximo: float = 10000, db: libsql_client.Client = Depends(get_db)):
    """SELECT Simple con WHERE"""
    try:
        resultado = await db.execute("SELECT id_plato, nombre, precio FROM producto WHERE precio < ?", [precio_maximo])
        return [dict(zip(resultado.columns, row)) for row in resultado.rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@app.get("/pedidos/info-mesas", tags=["2. SELECT (3)"])
async def select_join_pedidos_mesas(db: libsql_client.Client = Depends(get_db)):
    """SELECT con JOIN (3 tablas: pedido, visita_mesa, mesa)"""
    try:
        consulta = """
            SELECT p.id_pedido, m.num_mesa, p.estado_pedido, p.hora_pedido 
            FROM pedido p 
            INNER JOIN visita_mesa v ON p.id_visita = v.id_visita 
            INNER JOIN mesa m ON v.num_mesa = m.num_mesa;
        """
        resultado = await db.execute(consulta)
        return [dict(zip(resultado.columns, row)) for row in resultado.rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@app.get("/pedidos/detalles-platos", tags=["2. SELECT (3)"])
async def select_join_detalles_platos(db: libsql_client.Client = Depends(get_db)):
    """SELECT con JOIN (2 tablas: detalle_pedido, producto)"""
    try:
        consulta = """
            SELECT dp.id_detalle, pr.nombre AS nombre_plato, dp.cantidad, dp.observaciones 
            FROM detalle_pedido dp 
            INNER JOIN producto pr ON dp.id_plato = pr.id_plato;
        """
        resultado = await db.execute(consulta)
        return [dict(zip(resultado.columns, row)) for row in resultado.rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

# ==========================================
# 3. CONSULTAS UPDATE (2)
# ==========================================
@app.put("/mesas/{num_mesa}/estado", tags=["3. UPDATE (2)"])
async def update_estado_mesa(num_mesa: int, update_data: MesaUpdateEstado, db: libsql_client.Client = Depends(get_db)):
    try:
        resultado = await db.execute("UPDATE mesa SET estado = ? WHERE num_mesa = ?", [update_data.estado, num_mesa])
        if resultado.rows_affected == 0:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        return {"mensaje": f"Mesa {num_mesa} actualizada a {update_data.estado}"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=repr(e))

@app.put("/productos/{id_plato}/precio", tags=["3. UPDATE (2)"])
async def update_precio_producto(id_plato: int, update_data: ProductoUpdatePrecio, db: libsql_client.Client = Depends(get_db)):
    try:
        resultado = await db.execute("UPDATE producto SET precio = ? WHERE id_plato = ?", [update_data.precio, id_plato])
        if resultado.rows_affected == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"mensaje": f"Precio del producto {id_plato} actualizado a {update_data.precio}"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=repr(e))

# ==========================================
# 4. CONSULTAS DELETE (2)
# ==========================================
@app.delete("/productos/{id_plato}", tags=["4. DELETE (2)"])
async def delete_producto_por_id(id_plato: int, db: libsql_client.Client = Depends(get_db)):
    """Elimina un producto específico utilizando su id_plato"""
    try:
        resultado = await db.execute("DELETE FROM producto WHERE id_plato = ?", [id_plato])
        if resultado.rows_affected == 0:
            raise HTTPException(status_code=404, detail="El producto no existe")
        return {"mensaje": f"Producto con ID {id_plato} eliminado correctamente"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=repr(e))

@app.delete("/mesas/{num_mesa}", tags=["4. DELETE (2)"])
async def delete_mesa_condicionada(num_mesa: int, db: libsql_client.Client = Depends(get_db)):
    """Elimina usando múltiples condiciones (ej: solo si está Libre)"""
    try:
        resultado = await db.execute("DELETE FROM mesa WHERE num_mesa = ? AND estado = 'Libre'", [num_mesa])
        if resultado.rows_affected == 0:
            raise HTTPException(status_code=400, detail="La mesa no existe o no está Libre")
        return {"mensaje": f"Mesa {num_mesa} eliminada correctamente"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=repr(e))


# ==========================================
# 5. CONSULTAS ALTER Y DROP (3)
# ==========================================
@app.post("/admin/alter-1", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_telefono_empleado(db: libsql_client.Client = Depends(get_db)):
    """ALTER 1: Agrega columna telefono a empleados"""
    try:
        await db.execute("ALTER TABLE empleado ADD COLUMN telefono TEXT DEFAULT NULL;")
        return {"mensaje": "Consulta ALTER ejecutada: Columna 'telefono' agregada a tabla empleado"}
    except Exception as e:
        return {"mensaje": "La columna ya existe o hubo un error", "detalle": repr(e)}

@app.delete("/admin/alter-1/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_telefono(db: libsql_client.Client = Depends(get_db)):
    """Revertir ALTER 1: Elimina la columna telefono"""
    try:
        await db.execute("ALTER TABLE empleado DROP COLUMN telefono;")
        return {"mensaje": "Consulta ALTER ejecutada: Columna 'telefono' eliminada"}
    except Exception as e:
        return {"mensaje": "La columna ya fue eliminada o no existe", "detalle": repr(e)}

@app.post("/admin/alter-2", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_observaciones_pedido(db: libsql_client.Client = Depends(get_db)):
    """ALTER 2: Agrega columna fecha_entrega a pedidos"""
    try:
        await db.execute("ALTER TABLE pedido ADD COLUMN fecha_entrega TEXT DEFAULT NULL;")
        return {"mensaje": "Consulta ALTER ejecutada: Columna 'fecha_entrega' agregada a tabla pedido"}
    except Exception as e:
        return {"mensaje": "La columna ya existe o hubo un error", "detalle": repr(e)}

@app.delete("/admin/alter-2/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_pedido(db: libsql_client.Client = Depends(get_db)):
    """Revertir ALTER 2: Elimina la columna fecha_entrega"""
    try:
        await db.execute("ALTER TABLE pedido DROP COLUMN fecha_entrega;")
        return {"mensaje": "Consulta ALTER ejecutada: Columna eliminada"}
    except Exception as e:
        return {"mensaje": "La columna ya fue eliminada o no existe", "detalle": repr(e)}

@app.post("/admin/preparar-temporada", tags=["5. ALTER y DROP (3)"])
async def preparar_tabla_promociones(db: libsql_client.Client = Depends(get_db)):
    """Paso 1 (CREATE): Crea la tabla temporal para la demostración"""
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS promocion_temporada (
                id_promo INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_promo TEXT,
                descuento REAL
            );
        """)
        return {"mensaje": "Tabla 'promocion_temporada' creada. Lista para demostrar el DROP."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@app.delete("/admin/drop/promociones", tags=["5. ALTER y DROP (3)"])
async def drop_promociones_temporada(db: libsql_client.Client = Depends(get_db)):
    """Paso 2 (DROP): Elimina la tabla de promociones de temporada finalizada"""
    try:
        await db.execute("DROP TABLE promocion_temporada;")
        return {"mensaje": "Consulta DROP ejecutada: Tabla 'promocion_temporada' eliminada con éxito"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))