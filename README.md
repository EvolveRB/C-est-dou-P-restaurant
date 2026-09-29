# Sistema de Restaurante (C'est doux P)

Este proyecto es un sistema de gestión para un restaurante, compuesto por un **backend** desarrollado en Python con **FastAPI** y un **frontend** desarrollado con **Vite**.

La base de datos fue migrada de un servidor MySQL local a **Turso (SQLite distribuido en la nube)**, consumida a través de la librería oficial asíncrona `libsql-client`.

---

## Arquitectura del Proyecto

El repositorio está estructurado en dos módulos principales:

### 1. Backend (`/backend`)

Construido con **FastAPI** en modo asíncrono, conectado a Turso mediante HTTPS:

- **`main.py`**: Punto de entrada de la aplicación. Configura la instancia de FastAPI, inyecta la conexión a la base de datos y expone los endpoints organizados exactamente en las **13 consultas obligatorias** del proyecto.
- **`database.py`**: Administra la conexión a Turso. Lee las variables de entorno (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`) y proporciona la dependencia asíncrona `get_db` para las rutas de FastAPI mediante `libsql_client.create_client(...)`.
- **`models.py`**: Modelos de referencia para la estructura de las entidades del restaurante (`Mesa`, `Producto`, etc.).
- **`schemas.py`**: Esquemas de **Pydantic** para validar entradas y salidas de la API.
- **`requirements.txt`**: Listado limpio de dependencias necesarias (`fastapi`, `uvicorn[standard]`, `python-dotenv`, `libsql-client`, `pydantic`).

### 2. Frontend (`/frontend`)

Construido sobre **Vite** (React), encargado de consumir los endpoints expuestos por FastAPI para la visualización del salón, gestión de pedidos y carta de productos.

---

## Resumen de las 13 Consultas SQL y Álgebra Relacional

El sistema cumple rigurosamente con los requerimientos académicos evaluados:

### 1. Inserciones (`INSERT` - 3 consultas)
- `POST /mesas`: Registra una nueva mesa en el salón.
- `POST /productos`: Añade un nuevo producto/plato al menú.
- `POST /pedidos`: Crea una nueva comanda asociada a una visita y empleado.

### 2. Consultas de Selección (`SELECT` - 3 consultas)
*Incluyen sus equivalentes formales en Álgebra Relacional:*
- **SELECT 1 (Filtro simple):** `GET /productos/filtrados`
  - *Álgebra Relacional:* $\pi_{id\_plato, nombre, precio} (\sigma_{precio < 10000} (producto))$
- **SELECT 2 (JOIN de 3 tablas):** `GET /pedidos/info-mesas`
  - *Álgebra Relacional:* $\pi_{id\_pedido, num\_mesa, estado\_pedido, hora\_pedido} ((pedido \bowtie_{id\_visita} visita\_mesa) \bowtie_{num\_mesa} mesa)$
- **SELECT 3 (JOIN de 2 tablas):** `GET /pedidos/detalles-platos`
  - *Álgebra Relacional:* $\pi_{id\_detalle, nombre, cantidad, observaciones} (detalle\_pedido \bowtie_{id\_plato} producto)$

### 3. Modificaciones de Datos (`UPDATE` - 2 consultas)
- `PUT /mesas/{num_mesa}/estado`: Actualiza el estado operativo de una mesa.
- `PUT /productos/{id_plato}/precio`: Modifica el valor de un plato en el catálogo.

### 4. Eliminaciones (`DELETE` - 2 consultas)
- `DELETE /productos/{id_plato}`: Elimina un producto específico de la carta por su ID.
- `DELETE /mesas/{num_mesa}`: Elimina una mesa aplicando restricciones de negocio (estado 'Libre').

### 5. Modificación de Esquema y Estructura (`ALTER` y `DROP` - 3 operaciones)
- `POST /admin/alter-1` / `DELETE /admin/alter-1/revertir`: Añade o elimina dinámicamente la columna `telefono` en empleados.
- `POST /admin/alter-2` / `DELETE /admin/alter-2/revertir`: Añade o elimina la columna `fecha_entrega` en pedidos.
- `POST /admin/preparar-temporada` & `DELETE /admin/drop/promociones`: Demuestra la creación y eliminación en caliente (`DROP TABLE`) de una tabla temporal de promociones.

*(Nota Teórica: Operaciones como INSERT, UPDATE, DELETE, ALTER y DROP corresponden al DML/DDL de SQL y no forman parte del Álgebra Relacional pura, la cual está diseñada exclusivamente para consultas SELECT).*

---

## Base de Datos (Turso / SQLite)

La base de datos se encuentra alojada en **Turso**. El esquema incluye las tablas: `mesa`, `producto`, `empleado`, `visita_mesa`, `pedido`, `detalle_pedido` y `pago`.

---

## Configuración y Ejecución

### Prerrequisitos
- Python 3.10+
- Node.js 18+ y npm

### 1. Configurar y Ejecutar el Backend

1. Entra a la carpeta del backend:
   ```bash
   cd backend

2. Crea y activa tu entorno virtual
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1

3. Instala las dependencias del backend
   ```bash
   pip install -r requirements.txt
4. Verifica que la bd este bien conectada a partir del archivo .env dentro de la carpeta backend/

5. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload
  
6. Accede a la documentacion swagger interactiva con el endpoint \docs


   

   
