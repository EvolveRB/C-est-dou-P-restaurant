# Sistema de Restaurante (C'est doux P)

## Introducción

El restaurante "Ce sont doux P" enfrenta un problema de saturación operativa debido a que su personal debe centralizar múltiples tareas manuales, como limpiar, tomar pedidos y cobrar. Esta excesiva dependencia de la atención presencial genera largos tiempos de espera desde antes de ordenar, especialmente durante los períodos de mayor demanda. Como consecuencia directa, las mesas permanecen ocupadas por más tiempo y se produce la pérdida de clientes que abandonan el establecimiento sin consumir, lo que hace indispensable optimizar sus procesos de atención.

Ante esta problemática, se propone una solución integral que permita reducir los tiempos de espera que genera la atención presencial de los clientes, la cual consiste en la utilización de códigos QR dinámicos dispuestos en cada mesa. A través de estos, los comensales pueden escanear con sus dispositivos móviles y acceder instantáneamente a la carta digital interactiva, realizar sus pedidos de forma autónoma, solicitar rondas adicionales y autogestionar el pago de su cuenta de manera segura e intuitiva.

De esta forma, se busca disminuir la dependencia del garzón para realizar pedidos y pagos, permitiendo agilizar la atención de las mesas y reducir el tiempo que estas permanecen ocupadas. Además, se busca mejorar la coordinación entre cocina y garzones, facilitando el seguimiento de los pedidos durante su preparación y entrega mediante una comandera digital en tiempo real y paneles diferenciados según el rol del personal (Cocineros, Garzones y Administrador). Con ello, la solución pretende optimizar el proceso de atención del restaurante, permitiendo atender las mesas de manera más eficiente y disminuir las situaciones en que los clientes deban esperar prolongadamente o abandonar el establecimiento sin consumir.

---

## Actualizaciones Recientes

1. **Arquitectura Híbrida de Bases de Datos (SQLite + MongoDB Atlas):**
   - **Separación de responsabilidades:** Todo lo relacionado con registro de usuarios, roles, credenciales y bitácora por perfil se almacena en **SQLite** (`backend/restaurant.db` con SQLAlchemy), mientras que la operación del restaurante (catálogo, mesas, pedidos, visitas y promociones) continúa en **MongoDB Atlas** con Motor.
   - **Script de migración ([`migracion.py`](backend/migracion.py)):** Actualizado para migrar empleados desde MongoDB hacia SQLite con contraseñas hasheadas y limpiar cualquier campo sensible residual en la base NoSQL.

2. **Seguridad Integral, Hashing y Sesiones por Cookies `HttpOnly`:**
   - **Contraseñas hasheadas (`PBKDF2-HMAC-SHA256`):** Las claves en SQLite se guardan con salt aleatorio de 16 bytes y 600 000 iteraciones, verificándose en tiempo constante (`hmac.compare_digest`). Ningún endpoint retorna contraseñas ni hashes.
   - **Eliminación de accesos expuestos y bypass:** Se removieron del frontend los botones con credenciales visibles en el JS y el modo de contingencia offline sin contraseña.
   - **Sesiones protegidas con cookies `HttpOnly`:** El backend emite tokens firmados HMAC-SHA256 en cookies `HttpOnly` y valida el rol requerido en cada endpoint protegido (`Administrador`, `Cocinero`, `Garzón`).
   - **`localStorage` exclusivo para el comensal:** El navegador únicamente persiste en `localStorage` el carrito y mesa activa del cliente que escanea el QR para que no pierda su pedido al salir o recargar; el personal no guarda listas ni sesiones manipulables en `localStorage`.

3. **Asistente de Activación Inicial, Contraseñas Aleatorias y Primer Ingreso:**
   - **Activación inicial del Administrador (`GET /auth/status`, `POST /auth/setup-admin`):** Al iniciar el sistema por primera vez sin administradores en SQLite, el login muestra automáticamente el asistente para registrar al Administrador principal con su **RUT** y contraseña definitiva (con soporte opcional para `ADMIN_SETUP_CODE` en `.env`), bloqueándose permanentemente al completarse.
   - **Alta con contraseña temporal aleatoria:** Al crear o resetear un trabajador desde el panel de Administrador, el servidor genera una contraseña aleatoria segura (`must_change_password = True`) que se muestra **una sola vez** para entregarla al empleado.
   - **Cambio obligatorio en el primer ingreso:** Al iniciar sesión por primera vez con la clave temporal, el mismo layout del login cambia al formulario de actualización de contraseña (`POST /empleados/cambiar-password`) antes de permitir el acceso al flujo normal de Garzón o Cocinero.

4. **Carga Bajo Demanda y Logs Aislados por Perfil:**
   - **Code-splitting por ruta y rol (`React.lazy` + `Suspense`):** El login y cada vista de rol (`Admin`, `Garzón`, `Cocina`, `Cliente`) se cargan por separado sin descargar módulos de otros perfiles al inicio.
   - **Peticiones y consola filtradas por perfil:** En el login no se ejecutan cargas operacionales ni logs; cada usuario autenticado descarga solo los datos de su rol y visualiza únicamente sus registros propios mediante [`GET /auth/logs`](backend/main.py) y [`RoleLogsPanel`](frontend/src/components/employee/RoleLogsPanel.jsx).
   - **Vista de comensal aislada por mesa:** El cliente consulta únicamente su propia mesa (`GET /pedidos/mesa/{num_mesa}`).

5. **Arreglos Generales de Operación y Flujo de Mesas:**
   - **Atención y apagado real de alarma de Garzón:** Se corrigió el `$lookup` de pedidos/visitas (`id_visita != None`), se amplió [`PATCH /visitas/{id}/atender-garzon`](backend/main.py) para desactivar todas las alertas activas de la mesa en MongoDB y se protegió el polling del frontend contra respuestas desfasadas para que el destello luminoso se apague de inmediato al pulsar la mesa.
   - **Gestión centralizada de mesas (1 a 50) solo en Generador de QRs:** Se retiró el bloque de capacidad de mesas del panel de Administrador (`AdminDashboardPage`), dejando el control de agregar y eliminar mesas exclusivamente en `EmployeeQRPage`. Además, se corrigió el bloqueo que impedía bajar de 5 mesas, permitiendo configurar libremente desde **1** hasta **50** mesas.
   - **Liberación de mesa exclusiva al pagar:** Se eliminó de la comandera de Cocina (`CookOrderModal`) la opción de liberar o cancelar mesas y se ocultó al Cocinero el mensaje _"Pedido listo para llevar a la mesa"_ (también se removió la liberación sin pago en `ClientOrderStatusPage`). Ahora la mesa se libera **únicamente cuando el cliente confirma el pago** de su cuenta.
   - **Estabilidad de proyecto y lint:** Se resolvieron conflictos de fusión previos, se unificaron rutas duplicadas en FastAPI y el frontend compila limpio (`npm run lint` con 0 errores y `npm run build` exitoso).

---

## Características Principales

### Experiencia del Cliente (Mobile-First / Acceso por Código QR)

- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a `/mesa/:numeroMesa` con validación de token QR en tiempo real.
- **Catálogo Interactivo con Badges**: Filtrado rápido por categorías y etiquetas dietéticas en texto limpio (`Libre de gluten`, `Vegetariano`, `Vegano`, etc.).
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades, notas para cocina y visualización fotográfica.
- **Carrito Dinámico y Comanda en Dos Tiempos**: Persistencia local del carrito solo para el comensal, bloqueo de platos despachados a cocina y sección inferior para rondas adicionales.
- **Botón Llamar al Garzón**: Asistencia en salón con destello reactivo para el Garzón y apagado inmediato al atender la mesa.
- **Autogestión de Pago y Cierre de Mesa**: Modal de cierre de cuenta con cálculo de propina (0%, 10%, 15%) y liberación automática de la mesa al completar el pago.

### Portal de Personal, Salón y Cocina (Desktop & Tablet)

- **Acceso por RUT y Rol**: Login unificado con asistente de activación inicial en primer arranque y cambio obligatorio de clave temporal para nuevos trabajadores.
- **Vistas Especializadas por Rol**:
  - **Administrador (`AdminDashboardPage`)**: Gestión de plantilla de trabajadores en SQLite (alta con RUT y clave temporal aleatoria, reseteo de clave, cambio de rol y baja), acceso a bitácora del perfil y enlace al generador de QRs.
  - **Generador de Códigos QR (`EmployeeQRPage`)**: Control único para ajustar dinámicamente entre **1 y 50 mesas** y exportar/imprimir los códigos QR de cada mesa.
  - **Garzón (`GarzonTablesPage`)**: Salón interactivo con filtros rápidos (todas, ocupadas, libres), monitor de llamadas de comensales con destello luminoso interactivo y registros propios del perfil.
  - **Cocina (`EmployeeDashboardPage`)**: Carta de elaboración en tiempo real, visor de comanda (`CookOrderModal` limitado a preparar y marcar _"Listo para servir"_ sin liberar mesas ni mostrar avisos de entrega en salón) y control de disponibilidad de platos.

---

## Arquitectura del Proyecto

```text
C-est-dou-P-restaurant/
├── backend/
│   ├── database.py         # Conexión dual: Motor (MongoDB Atlas) + SQLAlchemy (SQLite restaurant.db)
│   ├── models.py           # Modelos relacionales SQLite (Usuario, PerfilLog, AppConfig)
│   ├── security.py         # RUT chileno, hashing PBKDF2-HMAC-SHA256, claves aleatorias y tokens HMAC
│   ├── main.py             # API FastAPI, cookies HttpOnly, setup inicial, CRUD SQLite/MongoDB y SPA
│   ├── migracion.py        # Migración de usuarios a SQLite con hasheo y limpieza en MongoDB
│   ├── test_suite.py       # Suite de pruebas automatizadas (seguridad + endpoints)
│   ├── test_mongo.py       # Script de verificación de conectividad y ping a Atlas
│   ├── restaurant.db       # Base de datos SQLite (usuarios, contraseñas hasheadas y logs por perfil)
│   ├── requirements.txt    # Dependencias Python (FastAPI, SQLAlchemy, Motor, Pymongo, Uvicorn, etc.)
│   └── .env                # Variables de entorno (MONGO_URI, SQLITE_URL, AUTH_SECRET_KEY, ADMIN_SETUP_CODE)
│
└── frontend/
    ├── index.html          # Entrada HTML con tipografía unificada Plus Jakarta Sans
    ├── package.json        # Dependencias (React 19, Vite, React Router, Lucide, QRCode)
    ├── .env                # Variable VITE_API_URL hacia FastAPI
    └── src/
        ├── App.jsx         # Enrutador con carga diferida (React.lazy) y rutas protegidas de Admin
        ├── utils/
        │   ├── roleLogger.js           # Logger aislado por rol de sesión
        │   └── rut.js                  # Formateo, normalización y validación de RUT
        ├── components/
        │   ├── client/     # ProductCard, ProductDetailModal, CategoryPills, BottomNav, ClientHeader
        │   └── employee/   # StaffLoginForm (login/setup/cambio clave), CookOrderModal, RoleLogsPanel, Navbars
        ├── context/
        │   ├── AuthContext.jsx         # Sesión en memoria con cookie HttpOnly, setup inicial y cambio de clave
        │   ├── CartContext.jsx         # Carrito en dos tiempos, localStorage exclusivo de cliente y pago
        │   └── RestaurantContext.jsx   # Carga condicionada por rol/ruta, mesas (1-50), llamadas y logs
        ├── data/
        │   └── initialProducts.js      # Catálogo base con etiquetas dietéticas e imágenes
        ├── layouts/
        │   ├── ClientLayout.jsx        # Contenedor móvil del comensal con validación QR
        │   ├── EmployeeLayout.jsx      # Control de acceso y flujo obligatorio de cambio de clave
        │   ├── AdminLayout.jsx         # Layout para administradores
        │   └── GarzonLayout.jsx        # Layout para garzones
        ├── pages/
        │   ├── client/     # ClientCatalogPage, ClientCartPage y ClientOrderStatusPage
        │   └── employee/   # AdminDashboardPage, GarzonTablesPage, EmployeeDashboardPage, EmployeeQRPage
        └── styles/
            ├── theme.css    # Tipografía Plus Jakarta Sans, variables de diseño y botones
            ├── client.css   # Estilos de la app móvil de clientes
            └── employee.css # Estilos del portal de personal
```

---

## Catálogo de Endpoints de la API

| Endpoint                           | Método          | Tag           | Descripción                                                                   |
| :--------------------------------- | :-------------- | :------------ | :---------------------------------------------------------------------------- |
| `/auth/status`                     | `GET`           | Auth          | Verifica si el sistema requiere activación inicial del Administrador          |
| `/auth/setup-admin`                | `POST`          | Auth          | Crea el primer Administrador en SQLite (se bloquea tras su uso)               |
| `/empleados/login`                 | `POST`          | Auth          | Autentica por RUT/usuario contra SQLite y emite cookie `HttpOnly`             |
| `/empleados/me`                    | `GET`           | Auth          | Valida la sesión activa desde cookie `HttpOnly`                               |
| `/empleados/logout`                | `POST`          | Auth          | Cierra sesión y elimina la cookie `HttpOnly`                                  |
| `/empleados/cambiar-password`      | `POST`          | Auth          | Cambia la clave temporal obligatoria o actualiza la contraseña actual         |
| `/auth/logs`                       | `GET`           | Auth          | Retorna los registros de actividad filtrados por el rol autenticado           |
| `/empleados`                       | `GET`           | Empleados     | Lista trabajadores desde SQLite sin contraseñas ni hashes (Solo Admin)        |
| `/empleados`                       | `POST`          | Empleados     | Crea trabajador con contraseña temporal aleatoria (Solo Admin)                |
| `/empleados/{id}/reset-password`   | `POST`          | Empleados     | Genera nueva contraseña temporal aleatoria para el trabajador (Solo Admin)    |
| `/empleados/{id}/rol`              | `PUT` / `PATCH` | Empleados     | Modifica el rol del trabajador en SQLite (Solo Admin)                         |
| `/empleados/{id}`                  | `DELETE`        | Empleados     | Elimina trabajador de SQLite (Solo Admin)                                     |
| `/mesas`                           | `GET`           | Mesas         | Retorna listado único de mesas (`1..N`) y llamadas activas de garzón          |
| `/mesas`                           | `POST`          | 1. INSERT     | Crea nueva mesa en MongoDB (Solo Admin)                                       |
| `/mesas/cantidad`                  | `POST`          | Mesas         | Ajusta dinámicamente el total de mesas entre **1 y 50** (Solo Admin)          |
| `/mesas/{num_mesa}/estado`         | `PUT`           | 3. UPDATE     | Sincroniza estado de mesa y pedidos activos                                   |
| `/mesas/{num_mesa}/liberar`        | `POST`          | 3. UPDATE     | Libera mesa, marca pedidos entregados y cierra llamadas tras pago del cliente |
| `/mesas/{num_mesa}`                | `DELETE`        | 4. DELETE     | Elimina mesa si su estado es `'Libre'` (Solo Admin)                           |
| `/mesas/{num}/validar-qr`          | `GET`           | Mesa          | Valida token QR; retorna 403 si no coincide                                   |
| `/productos`                       | `POST`          | 1. INSERT     | Registra plato en catálogo (Cocina/Admin)                                     |
| `/productos/filtrados`             | `GET`           | 2. SELECT     | Consulta catálogo de productos con imágenes resueltas                         |
| `/productos/{id}/precio`           | `PUT`           | 3. UPDATE     | Actualiza precio unitario del producto (Cocina/Admin)                         |
| `/productos/{id}/disponible`       | `PATCH`         | 3. UPDATE     | Activa o pausa disponibilidad en carta (Cocina/Admin)                         |
| `/productos/{id}`                  | `DELETE`        | 4. DELETE     | Elimina plato (Cocina/Admin)                                                  |
| `/pedidos`                         | `POST`          | 1. INSERT     | Inserta comanda o acumula platos adicionales a la mesa activa                 |
| `/pedidos/mesa/{num_mesa}`         | `GET`           | 2. SELECT     | Retorna el pedido activo de una mesa específica para el comensal              |
| `/pedidos/info-mesas`              | `GET`           | 2. SELECT     | Retorna comanda activa más reciente por mesa para el personal                 |
| `/pedidos/detalles-platos`         | `GET`           | 2. SELECT     | Retorna items embebidos en los pedidos para el personal                       |
| `/visitas`                         | `POST`          | Visita        | Inicia nueva visita para comensales en mesa                                   |
| `/visitas/{id}/llamar-garzon`      | `PATCH`         | Visita        | Marca `solicitud_garzon.activa = True`                                        |
| `/visitas/{id}/atender-garzon`     | `PATCH`         | Visita        | Desactiva las alertas de garzón activas en la mesa                            |
| `/sistema/reiniciar-pruebas`       | `POST`          | Pruebas       | Resetea entorno de pruebas (Cocina/Admin)                                     |
| `/admin/alter-1` / `revertir`      | `POST`/`DELETE` | 5. ALTER/DROP | Agrega o revierte atributo `telefono` en MongoDB (Solo Admin)                 |
| `/admin/alter-2` / `revertir`      | `POST`/`DELETE` | 5. ALTER/DROP | Agrega o revierte atributo `fecha_entrega` en pedidos (Solo Admin)            |
| `/admin/preparar-temporada` / drop | `POST`/`DELETE` | 5. ALTER/DROP | Crea o elimina colección promocional semilla (Solo Admin)                     |

---

## Configuración y Ejecución

### 1. Backend (FastAPI + SQLite + MongoDB Atlas)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # En Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Swagger UI disponible en: `http://localhost:8000/docs`.
- _(Opcional)_ Si vienes de una base anterior con empleados en MongoDB, ejecuta antes:

```powershell
python migracion.py
```

### 2. Frontend (React 19 + Vite)

```powershell
cd frontend
npm install
npm run dev
```

- Aplicación disponible en: `http://localhost:5173` _(usar `localhost` para coincidir con `VITE_API_URL=http://localhost:8000` en el envío de cookies `HttpOnly`)_.
- Si la base SQLite aún no tiene administradores, al ingresar a `http://localhost:5173` aparecerá automáticamente el asistente **Activación Inicial** para crear al Administrador principal con su RUT y contraseña.
- Verificación de calidad y compilación:

```powershell
npm run lint
npm run build
```
