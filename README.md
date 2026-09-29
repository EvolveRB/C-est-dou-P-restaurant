# Sistema de Restaurante (C'est doux P)

Este proyecto es un sistema de gestión para un restaurante, compuesto por un **backend** desarrollado en Python con **FastAPI** y un **frontend** desarrollado con **Vite**.

La base de datos fue migrada de un servidor MySQL local a **Turso (SQLite distribuido en la nube)**, consumida a través de la librería oficial asíncrona `libsql-client`.

---

## Arquitectura del Proyecto

El repositorio está estructurado en dos módulos principales:

### 1. Backend (`/backend`)

Construido con **FastAPI** en modo asíncrono, conectado a Turso mediante HTTPS:

- **`main.py`**: Punto de entrada de la aplicación. Configura la instancia de FastAPI, inyecta la conexión a la base de datos y expone los endpoints:
  - `GET /`: Mensaje de bienvenida/estado.
  - `GET /test-db`: Verifica la conectividad con Turso y retorna el total de mesas registradas.
  - `GET /mesas`: Retorna el listado completo de mesas registradas en la tabla `mesa`.
  - `GET /productos`: Retorna el catálogo completo de productos registrados en la tabla `producto`.
- **`database.py`**: Administra la conexión a Turso. Lee las variables de entorno (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`) y proporciona la dependencia asíncrona `get_db` para las rutas de FastAPI mediante `libsql_client.create_client(...)`.
- **`models.py`**: Modelos de referencia para la estructura de las entidades del restaurante (`Mesa`, `Producto`, etc.).
- **`schemas.py`**: Esquemas de **Pydantic** para validar entradas y salidas de la API.
- **`requirements.txt`**: Listado limpio de dependencias necesarias (`fastapi`, `uvicorn[standard]`, `python-dotenv`, `libsql-client`, `pydantic`).
- **`.env`** *(ignorado por Git)*: Contiene la URL y el token de autenticación de Turso.

### 2. Frontend (`/frontend`)

Construido sobre **Vite** (React), encargado de consumir los endpoints expuestos por FastAPI para la visualización del salón, gestión de pedidos y carta de productos.

---

## Base de Datos (Turso / SQLite)

La base de datos se encuentra alojada en **Turso**. El esquema incluye las siguientes tablas:

- `mesa`: Registro y estado de las mesas (`libre`, `ocupada`, etc.).
- `producto`: Carta/menú del restaurante con nombre, precio (CLP) y disponibilidad.
- `empleado`: Personal de servicio y cocina.
- `visita_mesa`: Control de ocupación y apertura de mesa por clientes.
- `pedido`: Cabecera de comandas asignadas a una mesa/visita.
- `detalle_pedido`: Ítems asociados a cada pedido.
- `pago`: Registro de transacciones y cobros asociados.

---

## Configuración y Ejecución

### Prerrequisitos
- Python 3.10+
- Node.js 18+ y npm
- Turso CLI (opcional, para gestión directa desde consola)

---

### 1. Configurar y Ejecutar el Backend

1. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```

2. Crea y activa tu entorno virtual:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Instala las dependencias del backend:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura tus variables de entorno creando un archivo `.env` dentro de la carpeta `backend/`:
   ```env
   TURSO_DATABASE_URL=https://tu-base-de-datos.turso.io
   TURSO_AUTH_TOKEN=tu_token_de_turso_aqui
   ```

5. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload
   ```

6. Comprueba el funcionamiento:
   - **API base**: [http://localhost:8000](http://localhost:8000)
   - **Prueba de conexión con Turso**: [http://localhost:8000/test-db](http://localhost:8000/test-db)
   - **Documentación Swagger interactiva**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Configurar y Ejecutar el Frontend

1. Entra a la carpeta del frontend:
   ```bash
   cd frontend
   ```

2. Instala los paquetes requeridos:
   ```bash
   npm install
   ```

3. Inicia el entorno de desarrollo de Vite:
   ```bash
   npm run dev
   ```

---

## Consultas directas a la Base de Datos (Turso CLI)

Para interactuar con la base de datos sin levantar la API, puedes usar la consola oficial de Turso:

1. Iniciar sesión en Turso (si no lo has hecho):
   ```bash
   turso auth login
   ```

2. Abrir la shell interactiva de la base de datos:
   ```bash
   turso db shell restaurant-natanielrv
   ```

3. Consultas SQL de ejemplo:
   ```sql
   -- Listar mesas registradas
   SELECT * FROM mesa;

   -- Ver productos disponibles
   SELECT * FROM producto WHERE disponible = 1;
   ```
