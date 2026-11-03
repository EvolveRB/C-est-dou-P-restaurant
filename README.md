# Sistema de Restaurante (C'est doux P)

Sistema integral de gestión para restaurantes compuesto por un **backend** asíncrono de alto rendimiento desarrollado en Python con **FastAPI** y base de datos NoSQL en la nube con **MongoDB Atlas** (driver asíncrono **Motor**), junto con un **frontend** reactivo desarrollado en **React 19** y **Vite**.

El sistema ofrece una experiencia dual sincronizada en tiempo real: una interfaz **Mobile-First para clientes** accesible directamente mediante códigos QR en cada mesa, y un **panel de control para personal y cocina** optimizado para PC y tablets.

- **Documentación Swagger interactiva**: `http://localhost:8000/docs`.

---

## 🌟 Novedades Recientes de la Versión

1. **Alineación de Modelos Pydantic con Esquema Final MongoDB Atlas:**
   - **Producto**: Se integró `etiquetas: List[str] = []` (RF-05 para filtros dietéticos), `descripcion`, `imagen` y `tiempo_preparacion`.
   - **Mesa**: Se incorporaron `piso: int`, `qr_token: Optional[str]` y `visita_activa_id: Optional[str]`.
   - **Visita (Nueva Colección `visitas`)**: Modelo completo con `num_mesa`, `hora_inicio`, `estado_visita`, objeto embebido `solicitud_garzon` (`activa`, `hora_solicitud`, `motivo`) y lista de transacciones `pagos`.
   - **Pedido**: Patrón de diseño snapshot en `items` (copia inmutable de `nombre` y `precio_unitario`) e integración de `visita_id`.

2. **Nuevos Endpoints del Ciclo de Servicio y Seguridad:**
   - `PATCH /visitas/{visita_id}/llamar-garzon`: Activa `solicitud_garzon.activa = True` con marca de tiempo y motivo especificado (RF-08).
   - `GET /mesas/{num_mesa}/validar-qr?token={qr_token}`: Retorna `HTTP 403 Forbidden` si el token del código QR no coincide con la mesa registrada.
   - `POST /visitas`: Creación e inicialización de la sesión de una mesa en salón.

3. **Refactorización UX/UI en Frontend (React):**
   - **Unificación de Botones y Tipografía**: Se estandarizaron los botones de acción principal en toda la aplicación bajo la paleta oficial (Borgoña `var(--c-burgundy-800)` / `#5C1D24` y Terracota), eliminando inconsistencias con botones negros o cafés (`#23272F`).
   - **RF-05 (Badges de Etiquetas)**: En el catálogo del cliente y modal de detalle, se mapea el arreglo `etiquetas` de cada plato mostrando insignias visuales (ej. _"Vegetariano"_, _"Sin Gluten"_, _"Chef Choice"_).
   - **RF-08 (Llamar al Garzón)**: Botón de acción directa disponible en el flujo del cliente (carrito y monitor de comanda) que consume el endpoint dedicado de visitas con confirmación inmediata.
   - **Manejo de Errores UX con Toasts**: Notificaciones flotantes claras y consistentes para _"QR Inválido"_ (al escanear un QR con token no autorizado / 403), _"Producto agotado"_ (al intentar agregar platos pausados) y _"Carrito vacío"_ (al intentar ordenar sin ítems).
   - **Vista de Cocina e Inventario**: Eliminación de placeholders rectangulares falsos y etiquetas de texto estáticas ("Sin imagen asignada"). Se implementó renderizado condicional inteligente: si hay imagen válida se exhibe la foto; de lo contrario se presenta un icono neutro de cocina (`<Utensils />`).

---

## Características Principales

### 📱 Experiencia del Cliente (Mobile-First / Acceso por Código QR)

- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a la URL dedicada `/mesa/:numeroMesa` con validación de token QR en tiempo real.
- **Catálogo Interactivo con Badges**: Filtrado rápido por categorías y visualización de etiquetas dietéticas (RF-05).
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades y campo de especificaciones/notas para cocina.
- **Carrito de Compras y Comanda**: Persistencia temporal local mientras el cliente arma el pedido, validación de stock y envío asíncrono (`POST /pedidos`).
- **Botón Llamar al Garzón (RF-08)**: Asistencia en salón al instante desde cualquier vista del cliente.
- **Monitor de Estado del Pedido**: Visualización en vivo del estado de preparación de la mesa (_Esperando_, _En preparación_, _Listo_, _Entregado_).

### 🖥️ Portal de Personal y Cocina (Desktop & Tablet)

- **Autenticación y Control de Turnos**: Pantalla de acceso conectada a la base de datos con gestión de roles (_Mesero / Garzón_, _Cocinero / Chef_, _Administrador_) y persistencia de sesión.
- **Panel de Salón y Mesas**: Cuadrícula dinámica con el estado operativo de todas las mesas del restaurante.
- **Comandera Digital Interactiva (`CookOrderModal`)**: Popup al hacer clic en mesas con órdenes activas; permite revisar ítems, notas especiales y avanzar de estado con un solo clic.
- **Gestión de Inventario en Tiempo Real**: Pestaña dedicada para habilitar o pausar la disponibilidad de platos del catálogo en vivo (`PATCH /productos/{id}/disponible`).
- **Generador e Impresor de Códigos QR**: Configuración de número de mesas (1 a 50 mesas) y generación de códigos QR individuales con enlaces de validación.

---

## Arquitectura del Proyecto

```text
C-est-dou-P-restaurant/
├── backend/
│   ├── database.py         # Conexión Singleton no bloqueante a MongoDB Atlas con Motor
│   ├── main.py             # Instancia FastAPI, CORS, 13 operaciones NoSQL + Auth, Visitas y QR
│   ├── models.py           # Modelos de datos / entidades de respaldo
│   ├── test_suite.py       # Suite integral de pruebas automatizadas
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
        │   ├── client/     # Componentes móviles (ProductCard con badges, ProductDetailModal, BottomNav, etc.)
        │   └── employee/   # Componentes de gestión (CookOrderModal unificado, StaffLoginForm, StaffNavbar)
        ├── context/
        │   ├── AuthContext.jsx         # Login real contra /empleados/login y roles
        │   ├── CartContext.jsx         # Carrito temporal, llamar garzón, toasts de agotado/vacío
        │   └── RestaurantContext.jsx   # Estado global de mesas, catálogo NoSQL, validar QR y visitas
        ├── data/
        │   └── initialProducts.js      # Catálogo base enriquecido con etiquetas dietéticas
        ├── layouts/
        │   ├── ClientLayout.jsx        # Contenedor smartphone con validación QR y toasts
        │   └── EmployeeLayout.jsx      # Plantilla general con autenticación para empleados
        ├── pages/
        │   ├── client/     # Vistas de catálogo, carrito y estado de orden con botón garzón
        │   └── employee/   # Panel de mesas/inventario condicional, login y módulo QR
        └── styles/
            ├── theme.css    # Paleta unificada (.btn-primary Borgoña, .btn-secondary, .badge-tag)
            ├── client.css   # Estilos de la app móvil de clientes
            └── employee.css # Estilos del dashboard de cocina y personal
```

---

## Catálogo de Endpoints de la API

| Endpoint                      | Método   | Tag           | Descripción                                          |
| :---------------------------- | :------- | :------------ | :--------------------------------------------------- |
| `/empleados/login`            | `POST`   | Auth          | Autentica empleados y retorna rol de acceso          |
| `/mesas`                      | `POST`   | 1. INSERT     | Crea nueva mesa con número, estado y piso            |
| `/productos`                  | `POST`   | 1. INSERT     | Registra plato con `etiquetas`, tiempo y precio      |
| `/pedidos`                    | `POST`   | 1. INSERT     | Inserta pedido con `items` en snapshot y `visita_id` |
| `/visitas`                    | `POST`   | Visita        | Inicia nueva visita para comensales en mesa          |
| `/productos/filtrados`        | `GET`    | 2. SELECT     | Consulta catálogo de productos con sus etiquetas     |
| `/pedidos/info-mesas`         | `GET`    | 2. SELECT     | Retorna comanda activa más reciente por mesa         |
| `/pedidos/detalles-platos`    | `GET`    | 2. SELECT     | Retorna items embebidos en los pedidos               |
| `/mesas/{num_mesa}/estado`    | `PUT`    | 3. UPDATE     | Sincroniza estado de mesa y pedidos activos          |
| `/mesas/{num_mesa}/liberar`   | `POST`   | 3. UPDATE     | Libera mesa y finaliza pedidos anteriores            |
| `/productos/{id}/precio`      | `PUT`    | 3. UPDATE     | Actualiza precio unitario del producto               |
| `/productos/{id}/disponible`  | `PATCH`  | 3. UPDATE     | Activa o pausa disponibilidad en carta               |
| `/visitas/{id}/llamar-garzon` | `PATCH`  | Visita        | Marca `solicitud_garzon.activa = True` (RF-08)       |
| `/mesas/{num}/validar-qr`     | `GET`    | Mesa          | Valida token QR; retorna 403 si no coincide          |
| `/productos/{id}`             | `DELETE` | 4. DELETE     | Elimina plato por ObjectId o id_plato                |
| `/mesas/{num_mesa}`           | `DELETE` | 4. DELETE     | Elimina mesa si su estado es 'Libre'                 |
| `/admin/alter-1`              | `POST`   | 5. ALTER/DROP | Agrega atributo `telefono` a empleados               |
| `/admin/alter-1/revertir`     | `DELETE` | 5. ALTER/DROP | Elimina atributo `telefono` de empleados             |
| `/admin/alter-2`              | `POST`   | 5. ALTER/DROP | Agrega atributo `fecha_entrega` a pedidos            |
| `/admin/alter-2/revertir`     | `DELETE` | 5. ALTER/DROP | Elimina atributo `fecha_entrega` de pedidos          |
| `/admin/preparar-temporada`   | `POST`   | 5. ALTER/DROP | Crea colección promocional semilla                   |
| `/admin/drop/promociones`     | `DELETE` | 5. ALTER/DROP | Elimina colección promocional (DROP)                 |

---

## Configuración y Ejecución

### 1. Backend (FastAPI + MongoDB Atlas)

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # En Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI disponible en: `http://localhost:8000/docs`.

### 2. Frontend (React 19 + Vite)

```bash
cd frontend
pnpm install
pnpm dev
```

Aplicación disponible en: `http://localhost:5173`.
Compilación de producción verificada con: `pnpm build`.
