from fastapi import FastAPI, Depends
from database import SessionLocal, engine
from models import Base, Producto, Mesa
from sqlalchemy.orm import Session

# Opcional: Esto crea las tablas en la BD si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Restaurante")

# Dependencia para obtener la sesión de base de datos en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Ruta para ver todas las mesas
@app.get("/mesas")
def obtener_mesas(db: Session = Depends(get_db)):
    mesas = db.query(Mesa).all()
    return mesas

# Ruta para ver todos los productos
@app.get("/productos")
def obtener_productos(db: Session = Depends(get_db)):
    productos = db.query(Producto).all()
    return productos