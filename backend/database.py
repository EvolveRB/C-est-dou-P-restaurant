from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# URL de conexión: usuario root, sin contraseña, puerto 3306, base de datos restaurante_db
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost:3306/restaurante"

# Creamos el motor de conexión
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Configuramos la fábrica de sesiones para ejecutar consultas
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán todos nuestros modelos (tablas)
Base = declarative_base()