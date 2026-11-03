# Sistema de Restaurante (C'est doux P)

## 📌 Introducción

El restaurante "Ce sont doux P" enfrenta un problema de saturación operativa debido a que su personal debe centralizar múltiples tareas manuales, como limpiar, tomar pedidos y cobrar. Esta excesiva dependencia de la atención presencial genera largos tiempos de espera desde antes de ordenar, especialmente durante los períodos de mayor demanda. Como consecuencia directa, las mesas permanecen ocupadas por más tiempo y se produce la pérdida de clientes que abandonan el establecimiento sin consumir, lo que hace indispensable optimizar sus procesos de atención.

Ante esta problemática, se propone una solución integral que permita reducir los tiempos de espera que genera la atención presencial de los clientes, la cual consiste en la utilización de códigos QR dinámicos dispuestos en cada mesa. A través de estos, los comensales pueden escanear con sus dispositivos móviles y acceder instantáneamente a la carta digital interactiva, realizar sus pedidos de forma autónoma, solicitar rondas adicionales y autogestionar el pago de su cuenta de manera segura e intuitiva.

De esta forma, se busca disminuir la dependencia del garzón para realizar pedidos y pagos, permitiendo agilizar la atención de las mesas y reducir el tiempo que estas permanecen ocupadas. Además, se busca mejorar la coordinación entre cocina y garzones, facilitando el seguimiento de los pedidos durante su preparación y entrega mediante una comandera digital en tiempo real y paneles diferenciados según el rol del personal (Cocineros, Garzones y Administrador). Con ello, la solución pretende optimizar el proceso de atención del restaurante, permitiendo atender las mesas de manera más eficiente y disminuir las situaciones en que los clientes deban esperar prolongadamente o abandonar el establecimiento sin consumir.

---

## 🚀 Apartado de Actualizaciones Recientes

1. **Destello Luminoso de Llamada a Garzón (Exclusivo en Salón):**
   - **Alerta Visual Reactiva:** Al presionar *"Llamar al Garzón"* desde el carrito o estado de pedido del comensal, la mesa correspondiente activa un destello luminoso pulsante de alta visibilidad (`@keyframes destelloLlamadaGarzon`) **única y exclusivamente en la vista del Garzón** (`GarzonTablesPage`).
   - **Aislamiento por Rol:** La vista de Cocineros (`EmployeeDashboardPage`) y el panel de Administrador no reciben ni muestran este destello, manteniendo la cocina enfocada en la preparación de comandas.
   - **Atención y Reconocimiento Interactivo:** Al hacer clic sobre la mesa en destello, el garzón atiende la solicitud apagando la animación luminosa y abriendo la comanda, sincronizando el estado en tiempo real vía eventos locales y backend (`PATCH /visitas/{id}/atender-garzon`).

2. **Estandarización Tipográfica y Erradicación de Placeholders:**
   - **Tipografía Unificada:** Se estandarizó transversalmente toda la aplicación (encabezados, textos, tarjetas, formularios y botones) bajo la misma familia tipográfica `'Plus Jakarta Sans', sans-serif`, eliminando disparidades entre fuentes con y sin serifa.
   - **Eliminación Total de Placeholders:** Se erradicaron todos los componentes visuales de placeholder gráfico residuales en fichas y modales de producto (`PlaceholderIcon`), optimizando la resolución de rutas de imágenes locales y remotas con fallbacks culinarios limpios.

3. **Filtros Dietéticos Estandarizados (Texto Limpio sin Emojis):**
   - **Filtros Depurados:** Se eliminaron los emojis de los chips de filtrado rápido de la carta digital (`Libre de gluten`, `Vegetariano`, `Vegano`, `Chef Choice`, `Especialidad`, `Casero`, etc.), adoptando un diseño sobrio de texto puro.
   - **Agrupación Inteligente:** Mantenimiento de la agregación automática de variantes celíacas (*"Sin Gluten"*, *"Sin TACC"*, *"Libre de gluten"*) bajo un único filtro seleccionable con contador dinámico.

4. **Grillas Simétricas y Comandas de Altura Estática:**
   - **Distribución Geométrica Fija:** Tanto en el monitor de Garzones como en el de Cocineros, las tarjetas de mesa cuentan con dimensiones estáticas fijas y alineación simétrica.
   - **Inspección Expandible:** Cuando una orden contiene múltiples platos, la tarjeta previsualiza los ítems principales con indicación de platos restantes, y al pulsar la comanda se despliega el detalle completo sin alterar la grilla general.
   - **Aprovechamiento Integral de Pantalla:** En la vista de inventario de cocina, la carta de platos y el formulario abarcan equilibradamente la totalidad del espacio disponible.

5. **Gestión de Personal y Capacidad Dinámica de Mesas:**
   - **Plantilla Oficial de Empleados:** Administración de personal activo con nombres iniciales (**Marcela Soto**, **Ana Morales**, etc.) y cambio dinámico de roles entre Cocinero, Garzón y Administrador.
   - **Mesas Escalables (1 a 50):** Control dinámico de capacidad en panel de administración con reflejo instantáneo en los tableros de cocina y salón.

6. **Flujo de Carrito en Dos Tiempos y Autogestión de Pago:**
   - **Bloqueo de Pedido en Cocina:** Protección de platos despachados a elaboración contra modificaciones accidentales.
   - **Rondas de Platos Adicionales:** Posibilidad de sumar nuevos pedidos más abajo sin reiniciar ni archivar el consumo previo.
   - **Cierre de Cuenta en Mesa:** Modal de pago con cálculo interactivo de propina (0%, 10%, 15%) y medios de pago integrados.

7. **Ajustes Visuales Generales:**
   - Pulido general de la interfaz: eliminación de barras de estado simuladas de teléfono en la cabecera del cliente, centrado de modales en escritorio, estandarización de badges y neutralización de colores discordantes en selectores de personal.

---

## Características Principales

### 📱 Experiencia del Cliente (Mobile-First / Acceso por Código QR)

- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a la URL dedicada `/mesa/:numeroMesa` con validación de token QR en tiempo real.
- **Catálogo Interactivo con Badges**: Filtrado rápido por categorías y etiquetas dietéticas en texto limpio (RF-05).
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades, notas para cocina y visualización fotográfica.
- **Carrito Dinámico y Comanda en Dos Tiempos**: Bloqueo de platos en cocina y área inferior editable para nuevas rondas de platos o bebidas.
- **Botón Llamar al Garzón (RF-08)**: Asistencia en salón al instante con destello reactivo para el personal de servicio.
- **Autogestión de Pago en Mesa**: Modal de cierre de cuenta con cálculo de propina sugerida y selección de medio de pago.

### 🖥️ Portal de Personal, Salón y Cocina (Desktop & Tablet)

- **Vistas Especializadas por Rol**:
  - **Administrador (`AdminDashboardPage`)**: Gestión de plantilla de trabajadores (alta y cambio de roles entre Cocinero, Garzón y Administrador) y control dinámico de la capacidad de mesas del salón.
  - **Garzón (`GarzonTablesPage`)**: Salón interactivo con filtros rápidos (todas, ocupadas, libres) y monitor de llamadas de comensales con destello luminoso interactivo.
  - **Cocina (`EmployeeDashboardPage`)**: Carta de elaboración en tiempo real con cuadrícula simétrica, visor de comanda expandible y control de inventario/disponibilidad sin espacios vacíos.
- **Comandera Digital Interactiva (`CookOrderModal`)**: Popup al hacer clic en mesas con órdenes activas; permite revisar ítems, notas especiales y avanzar de estado con un solo clic.
- **Generador y Exportador de Códigos QR (`EmployeeQRPage`)**: Ajuste de mesas y botón "Exportar QR" para imprimir y descargar tarjetas QR de mesa.

---

## Arquitectura del Proyecto

```text
C-est-dou-P-restaurant/
├── backend/
│   ├── database.py         # Conexión Singleton no bloqueante a MongoDB Atlas con Motor
│   ├── main.py             # Instancia FastAPI, CORS, CRUD NoSQL + Auth, Empleados, Mesas, Visitas y QR
│   ├── models.py           # Modelos de datos / entidades de respaldo
│   ├── test_suite.py       # Suite integral de pruebas automatizadas
│   ├── test_mongo.py       # Script de verificación de conectividad y ping a Atlas
│   ├── requirements.txt    # Dependencias de Python (FastAPI, Motor, Pymongo, Uvicorn, etc.)
│   └── .env                # Credenciales MONGO_URI
│
└── frontend/
    ├── index.html          # Entrada HTML con tipografía unificada Plus Jakarta Sans
    ├── package.json        # Dependencias (React 19, Vite, React Router, Lucide, QRCode)
    ├── .env                # Variable VITE_API_URL hacia FastAPI
    └── src/
        ├── App.jsx         # Enrutador principal (rutas de cliente y personal)
        ├── components/
        │   ├── client/     # Componentes móviles (ProductCard, ProductDetailModal, CategoryPills)
        │   └── employee/   # Componentes de gestión (CookOrderModal, AdminNavbar, GarzonNavbar)
        ├── context/
        │   ├── AuthContext.jsx         # Login real contra /empleados/login y roles
        │   ├── CartContext.jsx         # Carrito en dos tiempos, rondas adicionales, pago y llamada a garzón
        │   └── RestaurantContext.jsx   # Mesas dinámicas, destello garzón, plantilla empleados, catálogo NoSQL
        ├── data/
        │   └── initialProducts.js      # Catálogo base enriquecido con etiquetas dietéticas e imágenes
        ├── layouts/
        │   ├── ClientLayout.jsx        # Contenedor smartphone con validación QR y toasts
        │   ├── EmployeeLayout.jsx      # Distribuidor de layouts por rol
        │   ├── AdminLayout.jsx         # Layout exclusivo para administradores
        │   └── GarzonLayout.jsx        # Layout enfocado para garzones de salón
        ├── pages/
        │   ├── client/     # Vistas de catálogo, carrito bloqueado + adicionales y modal de pago
        │   └── employee/   # AdminDashboardPage, GarzonTablesPage, EmployeeDashboardPage y EmployeeQRPage
        └── styles/
            ├── theme.css    # Tipografía unificada Plus Jakarta Sans, variables de diseño y botones
            ├── client.css   # Estilos de la app móvil de clientes
            └── employee.css # Estilos del dashboard de cocina, salón y administración
```

---

## Catálogo de Endpoints de la API

| Endpoint                           | Método   | Tag           | Descripción                                                    |
| :--------------------------------- | :------- | :------------ | :------------------------------------------------------------- |
| `/empleados/login`                 | `POST`   | Auth          | Autentica empleados y retorna rol de acceso                    |
| `/empleados`                       | `GET`    | Empleados     | Retorna la plantilla de trabajadores actuales (Marcela, Ana)   |
| `/empleados`                       | `POST`   | Empleados     | Da de alta un nuevo trabajador con rol asignado                |
| `/empleados/{id}/rol`              | `PUT`    | Empleados     | Modifica el rol del trabajador (Cocinero, Garzón, Admin)       |
| `/empleados/{id}`                  | `DELETE` | Empleados     | Retira a un trabajador de la plantilla                         |
| `/mesas`                           | `GET`    | Mesas         | Retorna el listado y conteo total de mesas registradas         |
| `/mesas`                           | `POST`   | 1. INSERT     | Crea nueva mesa con número, estado y piso                      |
| `/mesas/cantidad`                  | `POST`   | Mesas         | Ajusta dinámicamente la capacidad total de mesas (1 a 50)      |
| `/mesas/{num_mesa}/estado`         | `PUT`    | 3. UPDATE     | Sincroniza estado de mesa y pedidos activos                    |
| `/mesas/{num_mesa}/liberar`        | `POST`   | 3. UPDATE     | Libera mesa y finaliza pedidos anteriores                      |
| `/mesas/{num_mesa}`                | `DELETE` | 4. DELETE     | Elimina mesa si su estado es 'Libre'                           |
| `/mesas/{num}/validar-qr`          | `GET`    | Mesa          | Valida token QR; retorna 403 si no coincide                    |
| `/productos`                       | `POST`   | 1. INSERT     | Registra plato con `etiquetas`, tiempo y precio                |
| `/productos/filtrados`             | `GET`    | 2. SELECT     | Consulta catálogo de productos con imágenes resueltas          |
| `/productos/{id}/precio`           | `PUT`    | 3. UPDATE     | Actualiza precio unitario del producto                         |
| `/productos/{id}/disponible`       | `PATCH`  | 3. UPDATE     | Activa o pausa disponibilidad en carta                         |
| `/productos/{id}`                  | `DELETE` | 4. DELETE     | Elimina plato por ObjectId o id_plato                          |
| `/pedidos`                         | `POST`   | 1. INSERT     | Inserta comanda o acumula platos adicionales a la mesa activa  |
| `/pedidos/info-mesas`              | `GET`    | 2. SELECT     | Retorna comanda activa más reciente y estado de solicitud      |
| `/pedidos/detalles-platos`         | `GET`    | 2. SELECT     | Retorna items embebidos en los pedidos                         |
| `/visitas`                         | `POST`   | Visita        | Inicia nueva visita para comensales en mesa                    |
| `/visitas/{id}/llamar-garzon`      | `PATCH`  | Visita        | Marca `solicitud_garzon.activa = True` (RF-08)                 |
| `/visitas/{id}/atender-garzon`     | `PATCH`  | Visita        | Desactiva solicitud de garzón atendida (`activa: False`)       |
| `/sistema/reiniciar-pruebas`       | `POST`   | Pruebas       | Resetea entorno: Mesa 1 libre y Mesa 2 esperando elaboración   |
| `/admin/alter-1`                   | `POST`   | 5. ALTER/DROP | Agrega atributo `telefono` a empleados                         |
| `/admin/alter-1/revertir`          | `DELETE` | 5. ALTER/DROP | Elimina atributo `telefono` de empleados                       |
| `/admin/alter-2`                   | `POST`   | 5. ALTER/DROP | Agrega atributo `fecha_entrega` a pedidos                      |
| `/admin/alter-2/revertir`          | `DELETE` | 5. ALTER/DROP | Elimina atributo `fecha_entrega` de pedidos                    |
| `/admin/preparar-temporada`        | `POST`   | 5. ALTER/DROP | Crea colección promocional semilla                             |
| `/admin/drop/promociones`          | `DELETE` | 5. ALTER/DROP | Elimina colección promocional (DROP)                           |

---

## Configuración y Ejecución

### 1. Backend (FastAPI + MongoDB Atlas)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # En Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI disponible en: `http://localhost:8000/docs`.

### 2. Frontend (React 19 + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Aplicación disponible en: `http://localhost:5173`.
Compilación de producción verificada con: `npm run build`.
