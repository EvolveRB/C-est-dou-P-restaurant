# Sistema de Restaurante (Doux P)

Este proyecto es un sistema básico para la gestión de un restaurante, compuesto por un **backend** desarrollado con Python (FastAPI) y un **frontend** (Vite).

## Arquitectura del Proyecto

El proyecto está dividido en dos partes principales:

### 1. Backend (`/backend`)

Construido con **FastAPI** y **SQLAlchemy** para manejar la base de datos (MySQL).

- **`main.py`**: Es el archivo principal de la aplicación. Configura la API y define los endpoints (rutas). Actualmente tiene dos rutas GET para obtener mesas (`/mesas`) y productos (`/productos`).
- **`database.py`**: Configura la conexión a la base de datos MySQL (utilizando `pymysql`). La base de datos objetivo es `restaurante`.
- **`models.py`**: Define los modelos de la base de datos utilizando SQLAlchemy (las tablas).
  - `Mesa`: Representa las mesas del restaurante con su estado (`libre` u `ocupada`).
  - `Producto`: Representa el menú, con su nombre, precio (en CLP, sin decimales) y si está disponible.
- **`schemas.py`**: Contiene los esquemas de **Pydantic** que validan la información que entra y sale de la API.
- **`requirements.txt`**: Archivo con las dependencias del backend.

### 2. Frontend (`/frontend`)

Construido utilizando **Vite** (probablemente con React, de acuerdo a la estructura típica). Contiene la interfaz de usuario que se comunica con el backend.

---

## Estado Actual de la Base de Datos

El proyecto está configurado para conectarse a una base de datos local llamada `restaurante` en MySQL:
`mysql+pymysql://root:@localhost:3306/restaurante`

## Cómo Ejecutar el Proyecto

### Ejecutar el Backend

1. Entra a la carpeta del backend: `cd backend`
2. Activa tu entorno virtual (si estás usando uno): `venv\Scripts\activate`
3. Inicia el servidor de FastAPI con uvicorn: `uvicorn main:app --reload`
4. La API estará disponible en `http://localhost:8000` y la documentación interactiva en `http://localhost:8000/docs`.

### Ejecutar el Frontend

1. Entra a la carpeta del frontend
2. Instala las dependencias (solo la primera vez): `npm install`
3. Inicia el servidor de desarrollo: `npm run dev`

## Acceder a MySQL y Hacer Consultas

1. Abre una nueva terminal.
2. Conéctate al servidor de MySQL utilizando el usuario `root`:`mysql -u root -p`
3. Selecciona la base de datos del proyecto:`USE restaurante;`

4. Ahora puedes ejecutar consultas SQL. Aquí tienes algunos ejemplos:

   **Ver todas las mesas:** `SELECT * FROM mesas;`
