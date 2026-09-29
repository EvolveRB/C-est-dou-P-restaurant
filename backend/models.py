from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base

# Tabla de Mesas
class Mesa(Base):
    __tablename__ = "mesa"
    num_mesa = Column(Integer, primary_key=True, index=True)
    estado = Column(String(50), default="Libre")

# Tabla de Productos
class Producto(Base):
    __tablename__ = "producto"
    id_plato = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), index=True)
    descripcion = Column(String(255), nullable=True)
    precio = Column(Integer)
    disponible = Column(Boolean, default=True)
    imagen = Column(String(200), nullable=True)
    tiempo_preparacion = Column(Integer)

# Tabla de Visitas
class Visita(Base):
    __tablename__ = "visita_mesa"
    id_visita = Column(Integer, primary_key=True, index=True)
    num_mesa = Column(Integer, ForeignKey("mesa.num_mesa"))

# Tabla de Pedidos
class Pedido(Base):
    __tablename__ = "pedido"
    id_pedido = Column(Integer, primary_key=True, index=True)
    id_visita = Column(Integer, ForeignKey("visita_mesa.id_visita"))
    estado_pedido = Column(String(50), default="Pendiente")
    total = Column(Integer, default=0)

# Tabla de Detalles de Pedido
class DetallePedido(Base):
    __tablename__ = "detalle_pedido"
    id_detalle = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedido.id_pedido"))
    id_plato = Column(Integer, ForeignKey("producto.id_plato"))
    cantidad = Column(Integer, default=1)
    subtotal = Column(Integer, default=0)