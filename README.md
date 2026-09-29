# Sistema de Restaurante (C'est doux P)

Este proyecto es un sistema de gestión integral para un restaurante, compuesto por un **backend** desarrollado en Python con **FastAPI** y un **frontend** desarrollado con **Vite**.

La base de datos fue migrada a **Turso (SQLite distribuido en la nube)**, consumida de forma asíncrona mediante la librería oficial `libsql-client`.

---

## Arquitectura del Proyecto

El repositorio está estructurado en dos módulos principales:

### 1. Backend (`/backend`)

Construido con **FastAPI** en modo asíncrono y conectado a Turso mediante HTTPS:

- **`main.py`**: Punto de entrada de la aplicación. Configura la instancia de FastAPI, inyecta la conexión a la base de datos y expone los endpoints organizados exactamente en las **13 consultas obligatorias** del proyecto (INSERT, SELECT, UPDATE, DELETE, ALTER y DROP).
- **`database.py`**: Administra la conexión segura a Turso leyendo las variables de entorno (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`) y proveyendo la dependencia `get_db`.
- **`models.py` / `schemas.py`**: Definición de modelos de referencia y validación de entradas/salidas mediante **Pydantic**.
- **`requirements.txt`**: Dependencias oficiales (`fastapi`, `uvicorn[standard]`, `python-dotenv`, `libsql-client`, `pydantic`).

### 2. Frontend (`/frontend`)

Construido sobre **Vite** (React), encargado de consumir los endpoints expuestos por FastAPI para la visualización del salón, gestión de pedidos y carta de productos.

---

## Resumen de las 13 Consultas SQL y Endpoints

El sistema cumple rigurosamente con los requerimientos académicos evaluados en el proyecto, distribuidos de la siguiente manera:

### 1. Inserciones (`INSERT` - 3 consultas)
- `POST /mesas`: Registra una nueva mesa en el salón.
- `POST /productos`: Añade un nuevo producto/plato al menú.
- `POST /pedidos`: Crea una nueva comanda asociada a una visita y empleado.

### 2. Consultas de Selección y Joins (`SELECT` - 3 consultas)
*Incluyen sus equivalentes formales en Álgebra Relacional:*

* **SELECT 1 (Filtro simple):** `GET /productos/filtrados`
  * *SQL:* `SELECT id_plato, nombre, precio FROM producto WHERE precio < ?;`
  * *Álgebra Relacional:* $\pi_{id\_plato, nombre, precio} (\sigma_{precio < 10000} (producto))$
* **SELECT 2 (JOIN de 3 tablas):** `GET /pedidos/info-mesas`
  * *SQL:* Relaciona `pedido`, `visita_mesa` y `mesa` para obtener el número de mesa de cada comanda.
  * *Álgebra Relacional:* $\pi_{id\_pedido, num\_mesa, estado\_pedido, hora\_pedido} ((pedido \bowtie_{id\_visita} visita\_mesa) \bowtie_{num\_mesa} mesa)$
* **SELECT 3 (JOIN de 2 tablas):** `GET /pedidos/detalles-platos`
  * *SQL:* Une `detalle_pedido` con `producto` para mostrar los nombres de los platos solicitados.
  * *Álgebra Relacional:* $\pi_{id\_detalle, nombre, cantidad, observaciones} (detalle\_pedido \bowtie_{id\_plato} producto)$

### 3. Modificaciones de Datos (`UPDATE` - 2 consultas)
- `PUT /mesas/{num_mesa}/estado`: Actualiza el estado operativo de una mesa.
- `PUT /productos/{id_plato}/precio`: Modifica el valor de un plato en el catálogo.

### 4. Eliminaciones de Registros (`DELETE` - 2 consultas)
- `DELETE /productos/{id_plato}`: Elimina un producto específico de la carta por su llave primaria.
- `DELETE /mesas/{num_mesa}`: Elimina una mesa aplicando restricciones de negocio (ej. estado `'Libre'`).

### 5. Modificación de Esquema y Estructura (`ALTER` y `DROP` - 3 operaciones)
- `POST /admin/alter-1` / `DELETE /admin/alter-1/revertir`: Añade o elimina dinámicamente la columna `telefono` en la tabla `empleado`.
- `POST /admin/alter-2` / `DELETE /admin/alter-2/revertir`: Añade o elimina la columna `fecha_entrega` en la tabla `pedido`.
- `POST /admin/preparar-temporada` & `DELETE /admin/drop/promociones`: Demuestra la creación y eliminación en caliente (`DROP TABLE`) de una tabla temporal de promociones.

---

## Nota Teórica sobre el Álgebra Relacional

El Álgebra Relacional es un lenguaje formal diseñado exclusivamente para la recuperación y consulta de datos (`SELECT`), basado en la teoría matemática de conjuntos. Por esta razón, las operaciones de modificación de datos (`INSERT`, `UPDATE`, `DELETE`) y modificación de esquemas (`ALTER`, `DROP`) no forman parte del álgebra relacional pura, ya que corresponden al Lenguaje de Manipulación de Datos (DML) y Definición de Datos (DDL) estándar de SQL, los cuales se encuentran completamente implementados y documentados en los endpoints de administración y gestión de esta API.

---

## Configuración y Ejecución Local

### Prerrequisitos
- Python 3.10+
- Node.js 18+ y npm

### 1. Configurar y Ejecutar el Backend

1. Entra a la carpeta del backend:
   ```bash
   cd backend
