# Sistema de Restaurante (C'est doux P)

Sistema integral de gestión para restaurantes compuesto por un **backend** asíncrono de alto rendimiento desarrollado en Python con **FastAPI** y base de datos NoSQL en la nube con **MongoDB Atlas** (driver asíncrono **Motor**), junto con un **frontend** reactivo desarrollado en **React 19** y **Vite**.

El sistema ofrece una experiencia dual sincronizada en tiempo real: una interfaz **Mobile-First para clientes** accesible directamente mediante códigos QR en cada mesa, y un **panel de control para personal y cocina** optimizado para PC y tablets.

- **Documentación Swagger interactiva**: `http://localhost:8000/docs`.

---

## 🌟 Novedades Recientes de la Versión

1. **Frontend Desacoplado de Simulaciones:**
   - Se refactorizaron completamente los contextos de React (`RestaurantContext.jsx`, `CartContext.jsx` y `AuthContext.jsx`) eliminando los datos simulados de `localStorage` y `setTimeout`.
   - Todas las operaciones de carga de mesas, catálogo, pedidos y turnos se sincronizan de forma asíncrona mediante llamadas HTTP `fetch` reales al backend.
   - Manejo de UI optimista (_Optimistic UI_) con reversión automática ante fallos de red.

2. **Migración Integral a MongoDB Atlas (Motor):**
   - Transición de la capa de persistencia relacional (SQLite/Turso) a base de datos orientada a documentos en **MongoDB Atlas**.
   - Conexión no bloqueante (_async/await_) mediante `AsyncIOMotorClient` (`motor.motor_asyncio`).
   - Modelo de datos con **documentos embebidos** (`items` dentro de `pedidos`, eliminando los costosos JOINs relacionales).
   - Traducción de las 13 consultas académicas obligatorias a operadores y agregaciones nativas de MongoDB (`$lookup`, `$lt`, `$set`, `$unset`, `drop()`).

3. **Autenticación y Control de Carta en Vivo:**
   - Nuevo endpoint `POST /empleados/login` con validación de credenciales reales contra la colección `empleados`.
   - Nuevo endpoint `PATCH /productos/{id}/disponible` para que el cocinero active o pause platillos al instante.
   - Suite de pruebas automatizadas [`backend/test_suite.py`](backend/test_suite.py) (8/8 pruebas exitosas en tiempo real).

---

## Características Principales

### 📱 Experiencia del Cliente (Mobile-First / Acceso por Código QR)

- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a la URL dedicada `/mesa/:numeroMesa` sin necesidad de registro ni descargas.
- **Catálogo Interactivo**: Filtrado rápido por categorías (Entradas, Platos de Fondo, Postres, Bebidas) y consulta en vivo desde MongoDB Atlas.
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades y campo de especificaciones/notas para cocina (ej. término de cocción, sin alérgenos).
- **Carrito de Compras y Comanda**: Persistencia temporal local mientras el cliente arma el pedido, envío asíncrono (`POST /pedidos`) con items embebidos y bloqueo contra doble envío accidental.
- **Monitor de Estado del Pedido**: Visualización en vivo del estado de preparación de la mesa (_Esperando_, _En preparación_, _Listo_, _Entregado_).
- **Indicadores de Disponibilidad**: Platillos no disponibles marcados al instante para evitar pedidos sin stock.

### 🖥️ Portal de Personal y Cocina (Desktop & Tablet)

- **Autenticación y Control de Turnos**: Pantalla de acceso conectada a la base de datos con gestión de roles (_Mesero / Garzón_, _Cocinero / Chef_, _Administrador_) y persistencia de sesión.
- **Panel de Salón y Mesas**: Cuadrícula dinámica con el estado operativo de todas las mesas del restaurante (_Libre_, _Esperando_, _En preparación_, _Listo_, _Ocupada_).
- **Comandera Digital Interactiva (`CookOrderModal`)**: Popup al hacer clic en mesas con órdenes activas; permite revisar ítems, cantidades, notas especiales de comensales y actualizar el estado de preparación con un solo clic (`PUT /mesas/{num_mesa}/estado`).
- **Gestión de Inventario en Tiempo Real**: Pestaña dedicada para habilitar o pausar la disponibilidad de platos del catálogo en vivo mediante `PATCH /productos/{id}/disponible`.
- **Generador e Impresor de Códigos QR**: Configuración de número de mesas (1 a 50 mesas), previsualización de códigos QR individuales y botón de impresión optimizado para mesas y manteles.

---

## Arquitectura del Proyecto

```text
C-est-dou-P-restaurant/
├── backend/
│   ├── database.py         # Conexión Singleton no bloqueante a MongoDB Atlas con Motor
│   ├── main.py             # Instancia FastAPI, CORS, 13 operaciones NoSQL + Auth y Disponibilidad
│   ├── models.py           # Modelos de datos / entidades de respaldo
│   ├── test_suite.py       # Suite integral de pruebas automatizadas (8/8 pruebas verificadas)
│   ├── test_mongo.py       # Script de verificación de conectividad y ping a Atlas
│   ├── requirements.txt    # Dependencias de Python (FastAPI, Motor, Pymongo, Uvicorn, etc.)
│   └── .env                # Credenciales MONGO_URI
│
└── frontend/
    ├── index.html          # Entrada HTML con metadatos y fuentes
    ├── package.json        # Dependencias (React 19, Vite, React Router, Lucide, QRCode)
    ├── .env                # Variable VITE_API_URL hacia FastAPI
    └── src/
        ├── App.jsx         # Enrutador principal (rutas de cliente y personal)
        ├── components/
        │   ├── client/     # Componentes móviles (BottomNav, CategoryPills, ClientHeader, ProductCard, etc.)
        │   └── employee/   # Componentes de gestión (CookOrderModal, StaffLoginForm, StaffNavbar)
        ├── context/
        │   ├── AuthContext.jsx         # Login real contra /empleados/login y roles
        │   ├── CartContext.jsx         # Carrito temporal y envío async con submitOrderForTable
        │   └── RestaurantContext.jsx   # Estado global de mesas, catálogo NoSQL y sincronización
        ├── data/
        │   └── initialProducts.js      # Catálogo base de respaldo / fallback offline
        ├── layouts/
        │   ├── ClientLayout.jsx        # Contenedor estilo smartphone para clientes QR
        │   └── EmployeeLayout.jsx      # Plantilla general con autenticación para empleados
        ├── pages/
        │   ├── client/     # Vistas de catálogo, carrito y estado de orden
        │   └── employee/   # Panel de mesas/inventario, login y módulo de códigos QR
        └── styles/
            ├── theme.css    # Paleta de colores, tipografías y variables globales
            ├── client.css   # Estilos de la app móvil de clientes
            └── employee.css # Estilos del dashboard de cocina y personal
```

---

## Equivalencias: De Consultas SQL a Operaciones MongoDB (NoSQL)

El backend traduce las 13 consultas obligatorias a sintaxis nativa de MongoDB mediante el driver `motor`:

| Nº     | Operación / Endpoint             | Equivalente SQL                         | Implementación MongoDB (Motor)                                        |
| :----- | :------------------------------- | :-------------------------------------- | :-------------------------------------------------------------------- |
| **1**  | `POST /mesas`                    | `INSERT INTO mesa`                      | `db.mesas.insert_one(mesa)`                                           |
| **2**  | `POST /productos`                | `INSERT INTO producto`                  | `db.producto.insert_one(producto)`                                    |
| **3**  | `POST /pedidos`                  | `INSERT INTO pedido + detalle_pedido`   | `db.pedidos.insert_one(pedido)` con `items` embebidos                 |
| **4**  | `GET /productos/filtrados`       | `SELECT WHERE precio < ?`               | `db.producto.find({"precio": {"$lt": x}})`                            |
| **5**  | `GET /pedidos/info-mesas`        | `SELECT con JOIN (3 tablas)`            | Agregación `$lookup` con colección `visitas` para resolver `num_mesa` |
| **6**  | `GET /pedidos/detalles-platos`   | `SELECT con JOIN (2 tablas)`            | Proyección directa sobre `items` embebidos en `pedidos`               |
| **7**  | `PUT /mesas/{num_mesa}/estado`   | `UPDATE mesa SET estado = ?`            | `db.mesas.update_one({"num_mesa": n}, {"$set": {"estado": s}})`       |
| **8**  | `PUT /productos/{id}/precio`     | `UPDATE producto SET precio = ?`        | `db.producto.update_one(filtro, {"$set": {"precio": p}})`             |
| **9**  | `DELETE /productos/{id}`         | `DELETE FROM producto WHERE id`         | `db.producto.delete_one(filtro)` por `ObjectId` o `id_plato`          |
| **10** | `DELETE /mesas/{num_mesa}`       | `DELETE FROM mesa WHERE estado='Libre'` | `db.mesas.delete_one({"num_mesa": n, "estado": "Libre"})`             |
| **11** | `POST /admin/alter-1`            | `ALTER TABLE ADD COLUMN telefono`       | `db.empleados.update_many({}, {"$set": {"telefono": None}})`          |
| **12** | `DELETE /admin/alter-1/revertir` | `ALTER TABLE DROP COLUMN telefono`      | `db.empleados.update_many({}, {"$unset": {"telefono": ""}})`          |
| **13** | `DELETE /admin/drop/promociones` | `DROP TABLE promocion_temporada`        | `db.promocion_temporada.drop()`                                       |

### Endpoints Complementarios

- `POST /empleados/login`: Búsqueda flexible por correo, username o rol (`find_one`), devolviendo sesión normalizada para React.
- `PATCH /productos/{id}/disponible`: Actualización atómica de `disponibilidad` (`"En stock"` o `"Agotado"`).
- `POST /admin/alter-2` y `DELETE /admin/alter-2/revertir`: Agrega o remueve el atributo `fecha_entrega` en `pedidos`.
- `POST /admin/preparar-temporada`: Inicializa la colección temporal con documento semilla.

---

## Base de Datos (MongoDB Atlas)

El clúster en la nube aloja la base de datos `restaurante_db` organizada en las siguientes colecciones:

- **`mesas`**: Control de mesas y estado (`num_mesa`, `estado`, `piso`).
- **`producto`**: Catálogo de la carta (`_id`, `id_plato`, `nombre`, `categoria`, `precio`, `disponibilidad`, `tiempo_preparacion`, `imagen`, `descripcion`).
- **`pedidos`**: Comandas con ítems embebidos (`num_mesa`, `hora_pedido`, `estado_pedido`, `items: [{ producto_id, nombre, precio_unitario, cantidad, observaciones }]`, `subtotal`).
- **`visitas`**: Control de sesiones de comensales en mesa (`id_visita`, `num_mesa`, `hora_inicio`, `estado_visita`, `pagos`).
- **`empleados`**: Personal con credenciales y roles (`nombre`, `correo`, `rol`, `password_hash`).
- **`promocion_temporada`**: Colección temporal demostrativa para operaciones de ciclo de vida (`drop()`).

---

## Configuración y Ejecución

### Prerrequisitos

- **Python 3.10+**
- **Node.js 18+** y **pnpm** (o npm)

---

### 1. Backend (FastAPI + MongoDB Atlas)

1. Ingresa a la carpeta del backend:

   ```bash
   cd backend
   ```

2. Crea y activa tu entorno virtual:
   - **En Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **En Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Instala las dependencias:

   ```bash
   pip install -r requirements.txt
   ```

4. Configura las variables de entorno en `backend/.env`:

   ```env
   MONGO_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/restaurante_db?retryWrites=true&w=majority
   ```

5. _(Opcional)_ Ejecuta la suite de verificación automatizada:

   ```bash
   python test_suite.py
   ```

   Debe arrojar `8/8 PRUEBAS EXITOSAS`.

6. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   Accede a la documentación interactiva Swagger en: `http://localhost:8000/docs`.

---

### 2. Frontend (React 19 + Vite)

1. En una nueva terminal, ingresa a la carpeta del frontend:

   ```bash
   cd frontend
   ```

2. Configura la URL del backend en `frontend/.env`:

   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. Instala los paquetes:

   ```bash
   pnpm install
   # o bien: npm install
   ```

4. Inicia el servidor Vite:
   ```bash
   pnpm dev
   # o bien: npm run dev
   ```
   La aplicación se abrirá en `http://localhost:5173`.

---

## Rutas y Flujo de Uso

| Ruta                 | Audiencia         | Descripción                                                                                                                |
| :------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Personal / Cocina | Portal principal para empleados. Solicita login autenticado contra MongoDB y da acceso a la comandera, salón e inventario. |
| `/staff/qrs`         | Personal / Admin  | Generador e impresor de códigos QR por mesa.                                                                               |
| `/mesa/:numeroMesa`  | Clientes (QR)     | Vista exclusiva tipo smartphone para clientes de la mesa indicada (ej. `/mesa/1`, `/mesa/2`).                              |
| `/menu` / `/cliente` | Clientes          | Accesos rápidos de redirección a mesa para pruebas.                                                                        |

### Flujo de Prueba Recomendado

1. Abre `http://localhost:5173/` e inicia sesión como Administrador (`admin@restaurant.cl`) o Cocinero.
2. Abre en otra pestaña o ventana de incógnito la ruta del cliente `http://localhost:5173/mesa/1`.
3. Desde la mesa 1, agrega platillos al carrito, añade observaciones para cocina y pulsa **Confirmar Pedido**.
4. En el panel de cocina verás la comanda reflejada en tiempo real desde MongoDB Atlas con sus items embebidos.
5. Cambia el estado de la mesa a **En preparación** o **Listo** y comprueba cómo se actualiza automáticamente el monitor del cliente.
