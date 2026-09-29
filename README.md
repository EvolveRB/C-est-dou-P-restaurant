====================================================================
SISTEMA DE RESTAURANTE (C'est doux P) - README COMPLETO
====================================================================

Este proyecto es un sistema de gestion integral para un restaurante, compuesto por un backend desarrollado en Python con FastAPI y un frontend desarrollado con Vite.

La base de datos fue migrada a Turso (SQLite distribuido en la nube), consumida de forma asincrona mediante la libreria oficial libsql-client.

---

1. ARQUITECTURA DEL PROYECTO

El repositorio esta estructurado en dos modulos principales:

A. Backend (/backend)
Construido con FastAPI en modo asincrono y conectado a Turso mediante HTTPS:
- main.py: Punto de entrada de la aplicacion. Configura la instancia de FastAPI, inyecta la conexion a la base de datos y expone los endpoints organizados exactamente en las 13 consultas obligatorias del proyecto (INSERT, SELECT, UPDATE, DELETE, ALTER y DROP).
- database.py: Administra la conexion segura a Turso leyendo las variables de entorno (TURSO_DATABASE_URL y TURSO_AUTH_TOKEN) y proveyendo la dependencia get_db.
- models.py / schemas.py: Definicion de modelos de referencia y validacion de entradas/salidas mediante Pydantic.
- requirements.txt: Dependencias oficiales (fastapi, uvicorn, python-dotenv, libsql-client, pydantic).

B. Frontend (/frontend)
Construido sobre Vite (React), encargado de consumir los endpoints expuestos por FastAPI para la visualizacion del salon, gestion de pedidos y carta de productos.

---

2. RESUMEN DE LAS 13 CONSULTAS SQL Y ENDPOINTS

El sistema cumple rigurosamente con los requerimientos academicos evaluados en el proyecto, distribuidos de la siguiente manera:

A. Inserciones (INSERT - 3 consultas)
- POST /mesas: Registra una nueva mesa en el salon.
- POST /productos: Anade un nuevo producto/plato al menu.
- POST /pedidos: Crea una nueva comanda asociada a una visita y empleado.

B. Consultas de Seleccion y Joins (SELECT - 3 consultas)
Incluyen sus equivalentes formales en Algebra Relacional:

- SELECT 1 (Filtro simple): GET /productos/filtrados
  * SQL: SELECT id_plato, nombre, precio FROM producto WHERE precio < ?;
  * Algebra Relacional: pi (id_plato, nombre, precio) [ sigma (precio < 10000) (producto) ]

- SELECT 2 (JOIN de 3 tablas): GET /pedidos/info-mesas
  * SQL: Relaciona pedido, visita_mesa y mesa para obtener el numero de mesa de cada comanda.
  * Algebra Relacional: pi (id_pedido, num_mesa, estado_pedido, hora_pedido) [ (pedido ⨝ visita_mesa) ⨝ mesa ]

- SELECT 3 (JOIN de 2 tablas): GET /pedidos/detalles-platos
  * SQL: Une detalle_pedido con producto para mostrar los nombres de los platos solicitados.
  * Algebra Relacional: pi (id_detalle, nombre, cantidad, observaciones) [ detalle_pedido ⨝ producto ]

C. Modificaciones de Datos (UPDATE - 2 consultas)
- PUT /mesas/{num_mesa}/estado: Actualiza el estado operativo de una mesa.
- PUT /productos/{id_plato}/precio: Modifica el valor de un plato en el catalogo.

D. Eliminaciones de Registros (DELETE - 2 consultas)
- DELETE /productos/{id_plato}: Elimina un producto especifico de la carta por su llave primaria.
- DELETE /mesas/{num_mesa}: Elimina una mesa aplicando restricciones de negocio (ej. estado 'Libre').

E. Modificacion de Esquema y Estructura (ALTER y DROP - 3 operaciones)
- POST /admin/alter-1 / DELETE /admin/alter-1/revertir: Anade o elimina dinamicamente la columna telefono en la tabla empleado.
- POST /admin/alter-2 / DELETE /admin/alter-2/revertir: Anade o elimina la columna fecha_entrega en la tabla pedido.
- POST /admin/preparar-temporada & DELETE /admin/drop/promociones: Demuestra la creacion y eliminacion en caliente (DROP TABLE) de una tabla temporal de promociones.

---

3. NOTA TEORICA SOBRE EL ALGEBRA RELACIONAL

El Algebra Relacional es un lenguaje formal disenado exclusivamente para la recuperacion y consulta de datos (SELECT), basado en la teoria matematica de conjuntos. Por esta razon, las operaciones de modificacion de datos (INSERT, UPDATE, DELETE) y modificacion de esquemas (ALTER, DROP) no forman parte del algebra relacional pura, ya que corresponden al Lenguaje de Manipulacion de Datos (DML) y Definicion de Datos (DDL) estandar de SQL, los cuales se encuentran completamente implementados y documentados en los endpoints de administracion y gestion de esta API.

---

4. CONFIGURACION Y EJECUCION LOCAL

Prerrequisitos:
- Python 3.10+
- Node.js 18+ y npm

A. Configurar y Ejecutar el Backend
1. Entra a la carpeta del backend:
   cd backend
2. Crea y activa tu entorno virtual (Windows PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1
3. Instala las dependencias:
   pip install -r requirements.txt
4. Configura tus variables de entorno creando un archivo .env dentro de la carpeta backend/:
   TURSO_DATABASE_URL=https://tu-base-de-datos.turso.io
   TURSO_AUTH_TOKEN=tu_token_de_turso_aqui
5. Inicia el servidor de desarrollo:
   uvicorn main:app --reload
6. Accede a la Documentacion Swagger interactiva: http://localhost:8000/docs

B. Configurar y Ejecutar el Frontend
1. Entra a la carpeta del frontend:
   cd frontend
2. Instala los paquetes y arranca el entorno Vite:
   npm install
   npm run dev
====================================================================
