# Sistema de Restaurante (C'est doux P)

> ## Actualizaciones Recientes
>
> 1. **Sincronización en Tiempo Real a 3 Segundos (`3000 ms`):**
>    - Se unificó el intervalo de polling a **3 segundos** (`POLLING_INTERVAL_MS = 3000`) en [`RestaurantContext.jsx`](frontend/src/context/RestaurantContext.jsx) para cocina, garzón, administrador y seguimiento de mesa del cliente, reduciendo carga innecesaria de peticiones manteniendo avisos por debajo de los 3 segundos.
> 2. **Almacenamiento de Imágenes en la Nube (Amazon S3 + AWS CloudFront):**
>    - Se implementó [`backend/storage_service.py`](backend/storage_service.py) y el endpoint [`POST /productos/upload-imagen`](backend/main.py) para subir imágenes directamente desde el gestor de archivos del panel de Administrador hacia el bucket privado **Amazon S3**
>    - Las imágenes se distribuyen globalmente a través de **AWS CloudFront**
> 3. **Comprobante Electrónico Opcional por Correo o Retiro Presencial:**
>    - Se implementó [`backend/email_service.py`](backend/email_service.py) y [`POST /mesas/{num_mesa}/pagar`](backend/main.py) junto con el campo opcional de correo en [`ClientCartPage.jsx`](frontend/src/pages/client/ClientCartPage.jsx).
>    - Si el comensal ingresa un correo válido (ej. Gmail, Outlook, etc.), recibe su comprobante HTML por SMTP; si lo deja vacío, registra su transacción y solicita su boleta de forma presencial.
> 4. **Nuevos Layouts para Administrador (Transacciones + Carta, Filtros y Etiquetas):**
>    - **Pedidos y Transacciones ([`AdminOrdersPage.jsx`](frontend/src/pages/employee/AdminOrdersPage.jsx)):** Diseñado con enfoque financiero prioritario en **transacciones y caja** (ingresos totales, propinas, ticket promedio, desglose por medio de pago, estado/reenvío de comprobantes y filtro multi-sucursal para múltiples locales), manteniendo la **vista de mesas en vivo** y comandas clicables.
>    - **Carta, Filtros y Etiquetas ([`AdminProductsPage.jsx`](frontend/src/pages/employee/AdminProductsPage.jsx)):** Panel CRUD conectado a MongoDB para administrar platos, subir fotos desde archivos locales hacia S3/CloudFront y gestionar categorías/etiquetas con propagación hacia el catálogo de clientes.

---

## Introducción

El restaurante "Ce sont doux P" enfrenta un problema de saturación operativa debido a que su personal debe centralizar múltiples tareas manuales, como limpiar, tomar pedidos y cobrar. Esta excesiva dependencia de la atención presencial genera largos tiempos de espera desde antes de ordenar, especialmente durante los períodos de mayor demanda. Como consecuencia directa, las mesas permanecen ocupadas por más tiempo y se produce la pérdida de clientes que abandonan el establecimiento sin consumir, lo que hace indispensable optimizar sus procesos de atención.

Ante esta problemática, se propone una solución integral que permita reducir los tiempos de espera que genera la atención presencial de los clientes, la cual consiste en la utilización de códigos QR dinámicos dispuestos en cada mesa. A través de estos, los comensales pueden escanear con sus dispositivos móviles y acceder instantáneamente a la carta digital interactiva, realizar sus pedidos de forma autónoma, solicitar rondas adicionales y autogestionar el pago de su cuenta de manera segura e intuitiva.

De esta forma, se busca disminuir la dependencia del garzón para realizar pedidos y pagos, permitiendo agilizar la atención de las mesas y reducir el tiempo que estas permanecen ocupadas. Además, se busca mejorar la coordinación entre cocina y garzones, facilitando el seguimiento de los pedidos durante su preparación y entrega mediante una comandera digital en tiempo real (sincronizada cada 3 segundos) y paneles diferenciados según el rol del personal (Cocineros, Garzones y Administrador).

---

## Arquitectura de Seguridad, Datos y Roles (Base Anterior)

1. **Arquitectura Híbrida de Bases de Datos (SQLite + MongoDB Atlas):**
   - **Separación de responsabilidades:** Todo lo relacionado con registro de usuarios, roles, credenciales y bitácora por perfil se almacena en **SQLite** (`backend/restaurant.db` con SQLAlchemy), mientras que la operación del restaurante (catálogo, categorías/etiquetas, mesas, pedidos, transacciones y visitas) reside en **MongoDB Atlas** con Motor.
   - **Script de migración ([`migracion.py`](backend/migracion.py)):** Migra empleados desde MongoDB hacia SQLite con contraseñas hasheadas y limpia campos sensibles en la base NoSQL.

2. **Seguridad Integral, Hashing y Sesiones por Cookies `HttpOnly`:**
   - **Contraseñas hasheadas (`PBKDF2-HMAC-SHA256`):** Las claves en SQLite se guardan con salt aleatorio de 16 bytes y 600 000 iteraciones, verificándose en tiempo constante (`hmac.compare_digest`). Ningún endpoint retorna contraseñas ni hashes.
   - **Sesiones protegidas con cookies `HttpOnly`:** El backend emite tokens firmados HMAC-SHA256 en cookies `HttpOnly` y valida el rol requerido en cada endpoint protegido (`Administrador`, `Cocinero`, `Garzón`).
   - **`localStorage` exclusivo para el comensal:** El navegador únicamente persiste en `localStorage` el carrito y mesa activa del cliente QR.

3. **Activación Inicial, Contraseñas Aleatorias y Primer Ingreso:**
   - **Activación inicial del Administrador (`GET /auth/status`, `POST /auth/setup-admin`):** Al iniciar sin administradores en SQLite, el login guía la creación del Administrador principal con su RUT y contraseña definitiva.
   - **Cambio obligatorio en el primer ingreso:** Los trabajadores creados o reseteados reciben una contraseña temporal aleatoria (`must_change_password = True`) que deben cambiar antes de operar.

---

## Características Principales

### Experiencia del Cliente (Mobile-First / Acceso por Código QR)

- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a `/mesa/:numeroMesa` con validación de token QR en tiempo real.
- **Catálogo Interactivo con Filtros y Etiquetas Dinámicas**: Filtrado por categorías sincronizadas con MongoDB (`/catalogo/filtros`), etiquetas dietéticas e imágenes servidas vía **AWS CloudFront + Amazon S3** (`loading="lazy"`).
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades, notas para cocina y visualización fotográfica.
- **Carrito Dinámico y Comanda en Dos Tiempos**: Persistencia local del carrito solo para el comensal, bloqueo de platos despachados a cocina y sección inferior para rondas adicionales.
- **Botón Llamar al Garzón**: Asistencia en salón con destello reactivo para el Garzón y apagado inmediato al atender la mesa.
- **Autogestión de Pago, Comprobante y Cierre de Mesa**: Modal de cierre de cuenta con cálculo de propina (0%, 10%, 15%), correo opcional para boleta electrónica (o solicitud presencial si queda vacío), registro en `transacciones` y liberación automática de la mesa.

### Portal de Personal, Salón y Cocina (Desktop & Tablet)

- **Acceso por RUT y Rol**: Login unificado con asistente de activación inicial en primer arranque y cambio obligatorio de clave temporal para nuevos trabajadores.
- **Vistas Especializadas por Rol**:
  - **Administrador — Personal (`AdminDashboardPage`)**: Gestión de plantilla de trabajadores en SQLite, reseteo de claves y cambio de rol.
  - **Administrador — Pedidos y Transacciones (`AdminOrdersPage`)**: Panel prioritario de transacciones, ingresos, propinas, desglose por medio de pago, filtro por sucursal/local, reenvío de comprobantes y vista en vivo de mesas clicables.
  - **Administrador — Carta, Filtros y Etiquetas (`AdminProductsPage`)**: Gestión CRUD completa de platos en MongoDB (con subida de fotos directa hacia S3/CloudFront desde archivo local) y administración en cascada de categorías y etiquetas.
  - **Generador de Códigos QR (`EmployeeQRPage`)**: Control único para ajustar dinámicamente entre **1 y 50 mesas** y exportar/imprimir los códigos QR de cada mesa.
  - **Garzón (`GarzonTablesPage`)**: Salón interactivo con filtros rápidos, monitor de llamadas de comensales con destello luminoso interactivo y registros propios del perfil.
  - **Cocina (`EmployeeDashboardPage`)**: Carta de elaboración en tiempo real (polling cada 3s), visor de comanda (`CookOrderModal`) y control de disponibilidad de platos.

---

## Arquitectura del Proyecto

```text
doux_p/
├── .gitignore                  # Excluye .env, __pycache__, *.pyc, dist/ y node_modules
├── backend/
│   ├── database.py             # Conexión dual: Motor (MONGO_URI por env) + SQLAlchemy (SQLite restaurant.db)
│   ├── email_service.py        # Envío de comprobantes HTML/texto por SMTP al cliente
│   ├── storage_service.py      # Subida segura a Amazon S3 (boto3) y entrega vía AWS CloudFront
│   ├── models.py               # Modelos relacionales SQLite (Usuario, PerfilLog, AppConfig)
│   ├── security.py             # RUT chileno (9 dígitos + M11), hashing PBKDF2-HMAC-SHA256, tokens HMAC
│   ├── main.py                 # API FastAPI, cookies HttpOnly, pagos/transacciones, catálogo, filtros y SPA
│   ├── migracion.py            # Migración de usuarios a SQLite con hasheo y limpieza en MongoDB
│   ├── test_suite.py           # Suite de pruebas automatizadas (seguridad + endpoints MongoDB/SQLite)
│   ├── test_mongo.py           # Script de verificación de conectividad y ping a Atlas
│   ├── restaurant.db           # Base de datos SQLite (usuarios, contraseñas hasheadas y logs por perfil)
│   ├── requirements.txt        # Dependencias Python (FastAPI, SQLAlchemy, Motor, boto3, Uvicorn, etc.)
│   └── .env.example            # Plantilla segura (MONGO_URI, AWS_S3_*, CLOUDFRONT_BASE_URL, SMTP_*, AUTH_SECRET_KEY)
│
└── frontend/
    ├── index.html              # Entrada HTML con tipografía unificada Plus Jakarta Sans
    ├── package.json            # Dependencias (React 19, Vite, React Router, Lucide, QRCode)
    ├── .env.example            # Plantilla segura (VITE_API_URL, VITE_CDN_IMAGES_BASE_URL)
    └── src/
        ├── App.jsx             # Enrutador con carga diferida (React.lazy) y rutas Admin (/admin/pedidos, /admin/productos)
        ├── utils/
        │   ├── roleLogger.js           # Logger aislado por rol de sesión
        │   └── rut.js                  # Formateo, normalización y validación de RUT
        ├── components/
        │   ├── client/     # ProductCard, ProductDetailModal, CategoryPills, BottomNav, ClientHeader
        │   └── employee/   # StaffLoginForm, CookOrderModal, RoleLogsPanel, AdminNavbar, GarzonNavbar, CookNavbar
        ├── context/
        │   ├── AuthContext.jsx         # Sesión en memoria con cookie HttpOnly, setup inicial y cambio de clave
        │   ├── CartContext.jsx         # Carrito en dos tiempos, localStorage exclusivo de cliente y pagarMesa
        │   └── RestaurantContext.jsx   # Polling unificado cada 3s, mesas (1-50), catálogo, filtros y transacciones
        ├── data/
        │   └── initialProducts.js      # Categorías base, normalizador de categorías y formateador CLP
        ├── layouts/
        │   ├── ClientLayout.jsx        # Contenedor móvil del comensal con validación QR
        │   ├── EmployeeLayout.jsx      # Control de acceso y flujo obligatorio de cambio de clave
        │   ├── AdminLayout.jsx         # Layout para administradores
        │   └── GarzonLayout.jsx        # Layout para garzones
        ├── pages/
        │   ├── client/     # ClientCatalogPage, ClientCartPage y ClientOrderStatusPage
        │   └── employee/   # AdminDashboardPage, AdminOrdersPage, AdminProductsPage, GarzonTablesPage, EmployeeDashboardPage, EmployeeQRPage
        └── styles/
            ├── theme.css    # Tipografía Plus Jakarta Sans, variables de diseño y botones
            ├── client.css   # Estilos de la app móvil de clientes
            └── employee.css # Estilos del portal de personal
```

---

## Catálogo de Endpoints de la API

| Endpoint                                         | Método               | Tag                | Descripción                                                                             |
| :----------------------------------------------- | :------------------- | :----------------- | :-------------------------------------------------------------------------------------- |
| `/auth/status`                                   | `GET`                | Auth               | Verifica si el sistema requiere activación inicial del Administrador                    |
| `/auth/setup-admin`                              | `POST`               | Auth               | Crea el primer Administrador en SQLite (se bloquea tras su uso)                         |
| `/empleados/login`                               | `POST`               | Auth               | Autentica por RUT/usuario contra SQLite y emite cookie `HttpOnly`                       |
| `/empleados/me`                                  | `GET`                | Auth               | Valida la sesión activa desde cookie `HttpOnly`                                         |
| `/empleados/logout`                              | `POST`               | Auth               | Cierra sesión y elimina la cookie `HttpOnly`                                            |
| `/empleados/cambiar-password`                    | `POST`               | Auth               | Cambia la clave temporal obligatoria o actualiza la contraseña actual                   |
| `/auth/logs`                                     | `GET`                | Auth               | Retorna los registros de actividad filtrados por el rol autenticado                     |
| `/empleados`                                     | `GET` / `POST`       | Empleados          | Lista trabajadores o crea trabajador con clave temporal aleatoria (Solo Admin)          |
| `/empleados/{id}/reset-password`                 | `POST`               | Empleados          | Genera nueva contraseña temporal aleatoria para el trabajador (Solo Admin)              |
| `/empleados/{id}/rol`                            | `PUT` / `PATCH`      | Empleados          | Modifica el rol del trabajador en SQLite (Solo Admin)                                   |
| `/empleados/{id}`                                | `DELETE`             | Empleados          | Elimina trabajador de SQLite (Solo Admin)                                               |
| `/mesas`                                         | `GET` / `POST`       | Mesas              | Retorna listado único de mesas (`1..N`) o crea nueva mesa en MongoDB                    |
| `/mesas/cantidad`                                | `POST`               | Mesas              | Ajusta dinámicamente el total de mesas entre **1 y 50** (Solo Admin)                    |
| `/mesas/{num_mesa}/estado`                       | `PUT`                | 3. UPDATE          | Sincroniza estado de mesa y pedidos activos                                             |
| `/mesas/{num_mesa}/pagar`                        | `POST`               | Pagos/Comprobantes | Registra transacción, envía comprobante por correo si se ingresa email y libera la mesa |
| `/mesas/{num_mesa}/liberar`                      | `POST`               | 3. UPDATE          | Libera mesa, marca pedidos entregados y cierra llamadas tras pago del cliente           |
| `/mesas/{num_mesa}`                              | `DELETE`             | 4. DELETE          | Elimina mesa si su estado es `'Libre'` (Solo Admin)                                     |
| `/mesas/{num}/validar-qr`                        | `GET`                | Mesa               | Valida token QR; retorna 403 si no coincide                                             |
| `/catalogo/filtros`                              | `GET`                | Catálogo           | Retorna categorías y etiquetas activas sincronizadas con `db.producto`                  |
| `/productos/upload-imagen`                       | `POST`               | Catálogo           | Sube imagen desde archivo local al bucket S3 (`carta-img`) y devuelve URL de CloudFront |
| `/productos`                                     | `POST`               | 1. INSERT          | Registra plato en catálogo (Cocina/Admin)                                               |
| `/productos/filtrados`                           | `GET`                | 2. SELECT          | Consulta catálogo de productos con categorías normalizadas y URLs CloudFront            |
| `/productos/{id}`                                | `PUT` / `DELETE`     | Catálogo           | Actualiza todos los campos del plato (incl. categoría, etiquetas, imagen) o lo elimina  |
| `/productos/{id}/precio`                         | `PUT`                | 3. UPDATE          | Actualiza precio unitario del producto (Cocina/Admin)                                   |
| `/productos/{id}/disponible`                     | `PATCH`              | 3. UPDATE          | Activa o pausa disponibilidad en carta (Cocina/Admin)                                   |
| `/admin/pedidos-transacciones`                   | `GET`                | Admin Finanzas     | Resumen financiero, medios de pago, comprobantes, pedidos y filtro por sucursal         |
| `/admin/transacciones/{id}/reenviar-comprobante` | `POST`               | Admin Finanzas     | Reintenta envío del comprobante por correo electrónico para una transacción             |
| `/admin/filtros/categorias`                      | `POST` / `PUT`/`DEL` | Admin Catálogo     | Crea, renombra o elimina categorías en cascada sobre `db.producto` (Solo Admin)         |
| `/admin/filtros/etiquetas`                       | `POST` / `PUT`/`DEL` | Admin Catálogo     | Crea, renombra o elimina etiquetas en cascada sobre `db.producto` (Solo Admin)          |
| `/pedidos`                                       | `POST`               | 1. INSERT          | Inserta comanda o acumula platos adicionales a la mesa activa                           |
| `/pedidos/mesa/{num_mesa}`                       | `GET`                | 2. SELECT          | Retorna el pedido activo de una mesa específica para el comensal                        |
| `/pedidos/info-mesas`                            | `GET`                | 2. SELECT          | Retorna comanda activa más reciente por mesa para el personal                           |
| `/pedidos/detalles-platos`                       | `GET`                | 2. SELECT          | Retorna items embebidos en los pedidos para el personal                                 |
| `/visitas`                                       | `POST`               | Visita             | Inicia nueva visita para comensales en mesa                                             |
| `/visitas/{id}/llamar-garzon`                    | `PATCH`              | Visita             | Marca `solicitud_garzon.activa = True`                                                  |
| `/visitas/{id}/atender-garzon`                   | `PATCH`              | Visita             | Desactiva las alertas de garzón activas en la mesa                                      |
| `/admin/alter-1` / `revertir`                    | `POST` / `DELETE`    | 5. ALTER/DROP      | Agrega o revierte atributo `telefono` en MongoDB (Solo Admin)                           |
| `/admin/alter-2` / `revertir`                    | `POST` / `DELETE`    | 5. ALTER/DROP      | Agrega o revierte atributo `fecha_entrega` en pedidos (Solo Admin)                      |
| `/admin/preparar-temporada` / `drop`             | `POST` / `DELETE`    | 5. ALTER/DROP      | Crea o elimina colección promocional semilla (Solo Admin)                               |

---

## Configuración y Ejecución

### 1. Variables de Entorno (Copiar desde `.env.example`)

Antes de ejecutar localmente o desplegar, copia los archivos de ejemplo y completa tus propias credenciales (nunca subas `.env` reales al repositorio):

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

- En `backend/.env`: configura `MONGO_URI`, `AUTH_SECRET_KEY`, las credenciales de AWS (`AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_BASE_URL`) y las variables `SMTP_*` para el envío de comprobantes por correo.
- En `frontend/.env`: configura `VITE_API_URL` y opcionalmente `VITE_CDN_IMAGES_BASE_URL`.

### 2. Backend (FastAPI + SQLite + MongoDB Atlas)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # En Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Swagger UI disponible en: `http://localhost:8000/docs`.
- Suite de pruebas backend:

```powershell
python test_suite.py
```

### 3. Frontend (React 19 + Vite)

```powershell
cd frontend
npm install
npm run dev
```

- Aplicación disponible en: `http://localhost:5173` _(usar `localhost` para coincidir con `VITE_API_URL=http://localhost:8000` en el envío de cookies `HttpOnly`)_.
- Verificación de calidad y compilación:

```powershell
npm run lint
npm run build
```
