from fastapi import FastAPI, Depends
import libsql_client
from database import get_db

app = FastAPI(title="API Restaurante - C'est doux P")

@app.get("/test-db")
async def test_db(db: libsql_client.Client = Depends(get_db)):
    # Contamos sobre la tabla en singular 'mesa'
    result = await db.execute("SELECT COUNT(*) FROM mesa")
    return {
        "conexion": "exitosa con Turso",
        "total_mesas": result.rows[0][0]
    }

@app.get("/mesas")
async def obtener_mesas(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM mesa")
    
    # Mapeo dinámico usando los nombres de las columnas que vienen de Turso
    columnas = result.columns
    mesas = [dict(zip(columnas, row)) for row in result.rows]
    return mesas

@app.get("/productos")
async def obtener_productos(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM producto")
    columnas = result.columns
    return [dict(zip(columnas, row)) for row in result.rows]