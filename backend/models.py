from sqlalchemy import Column, Integer, String, Boolean
from database import Base

# Tabla de Mesas
class Mesa(Base):
    __tablename__ = "mesas"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True, index=True)
    estado = Column(String(50), default="libre") # Puede ser "libre" u "ocupada"

# Tabla de Productos (El Menú)
class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), index=True)
    precio = Column(Integer) # Usamos Integer porque en CLP no usamos decimales
    disponible = Column(Boolean, default=True)
    