# pyrefly: ignore [missing-import]
from fastapi import FastAPI

# Inicializamos la aplicación con información para la documentación automática
app = FastAPI(
    title="API Restaurante ",
    description="API REST para sistema de autogestión de pedidos",
    version="1.0.0"
)

@app.get("/")
def ruta_raiz():
    return {"mensaje": "Servicio Levantado"}

@app.get("/health")
def health_check():
    return {"status": "ok", "sistema": "operativo"}