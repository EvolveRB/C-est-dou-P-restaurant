# Sistema de Restaurante (C'est doux P)

Sistema integral de gestión para restaurantes compuesto por un **backend** asíncrono desarrollado en Python con **FastAPI** y base de datos distribuida en la nube con **Turso (SQLite)**, junto con un **frontend** moderno desarrollado en **React 19** y **Vite**.

El sistema ofrece una experiencia dual sincronizada: una interfaz **Mobile-First para clientes** accesible directamente mediante códigos QR en cada mesa, y un **panel de control para personal y cocina** optimizado para PC y tablets.

- **Documentación Swagger interactiva**: [https://embark-magnetism-mosaic.ngrok-free.dev/docs](https://embark-magnetism-mosaic.ngrok-free.dev/docs) (o localmente en `http://localhost:8000/docs`).

---

## Características Principales

### 📱 Experiencia del Cliente (Mobile-First / Acceso por Código QR)
- **Acceso Directo por Mesa**: El cliente escanea el código QR de su mesa y accede a la URL dedicada `/mesa/:numeroMesa` sin necesidad de registro ni descargas.
- **Catálogo Interactivo**: Filtrado rápido por categorías (Entradas, Platos de Fondo, Postres, Bebidas) y barra de búsqueda en tiempo real.
- **Detalle y Personalización de Platillos**: Modal con selector de cantidades y campo de especificaciones/notas para cocina (ej. término de cocción, sin alérgenos).
- **Carrito de Compras**: Control de pedidos, edición de cantidades, notas generales de la mesa, cálculo de total y envío de comanda.
- **Monitor de Estado del Pedido**: Visualización en vivo del estado de preparación de la mesa (*Esperando*, *En preparación*, *Listo*, *Entregado*).
- **Indicadores de Disponibilidad**: Platillos no disponibles marcados al instante para evitar pedidos sin stock.

### 🖥️ Portal de Personal y Cocina (Desktop & Tablet)
- **Autenticación y Control de Turnos**: Pantalla de acceso centrada con gestión de roles (*Mesero*, *Jefe de Cocina / Chef*, *Administrador*) y persistencia de sesión.
- **Panel de Salón y Mesas**: Cuadrícula dinámica con el estado operativo de todas las mesas del restaurante (*Libre*, *Esperando*, *En preparación*, *Listo*, *Ocupada*).
- **Comandera Digital Interactiva (`CookOrderModal`)**: Popup al hacer clic en mesas con órdenes activas; permite revisar ítems, cantidades, notas especiales de comensales y actualizar el estado de preparación con un solo clic.
- **Gestión de Inventario en Tiempo Real**: Pestaña dedicada para habilitar o pausar la disponibilidad de platos del catálogo en vivo.
- **Generador e Impresor de Códigos QR**: Configuración de número de mesas (1 a 50 mesas), previsualización de códigos QR individuales y botón de impresión optimizado para mesas y manteles.

---

## Arquitectura del Proyecto

```text
doux_p/
├── backend/
│   ├── database.py         # Configuración y conexión asíncrona a Turso con libsql-client
│   ├── main.py             # Instancia FastAPI, rutas y las 13 consultas obligatorias
│   ├── models.py           # Modelos de datos y estructura de entidades del restaurante
│   ├── schemas.py          # Esquemas Pydantic para validación de entrada/salida
│   ├── requirements.txt    # Dependencias de Python
│   └── restaurant.db       # Base de datos SQLite local de respaldo
│
└── frontend/
    ├── index.html          # Entrada HTML con metadatos y fuentes
    ├── package.json        # Dependencias (React 19, Vite, React Router, Lucide, QRCode)
    └── src/
        ├── App.jsx         # Enrutador principal (rutas de cliente y personal)
        ├── components/
        │   ├── client/     # Componentes móviles (BottomNav, CategoryPills, ClientHeader, ProductCard, etc.)
        │   └── employee/   # Componentes de gestión (CookOrderModal, StaffLoginForm, StaffNavbar)
        ├── context/
        │   ├── AuthContext.jsx         # Autenticación, roles y sesión de empleados
        │   ├── CartContext.jsx         # Carrito de compras y comanda de la mesa activa
        │   └── RestaurantContext.jsx   # Estado global de mesas, pedidos e inventario
        ├── data/
        │   └── initialProducts.js      # Catálogo base y categorías del menú
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

La base de datos se encuentra alojada en **Turso** (SQLite distribuido), garantizando baja latencia y alta disponibilidad.

**Esquema de tablas:**
- `mesa`: Registro y estado operativo de mesas.
- `producto`: Carta de platillos, precios y descripciones.
- `empleado`: Personal de servicio, roles y datos de contacto.
- `visita_mesa`: Apertura y control de sesiones por mesa.
- `pedido`: Comandas asociadas a visitas y atendidas por empleados.
- `detalle_pedido`: Relación de ítems, cantidades y especificaciones de comanda.
- `pago`: Registro de métodos de pago y liquidación de cuentas.

---

## Configuración y Ejecución

### Prerrequisitos
- **Python 3.10+**
- **Node.js 18+** y **npm**

---

### 1. Configurar y Ejecutar el Backend

1. Navega a la carpeta del backend:
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

4. Configura las variables de entorno:
   Verifica o crea el archivo `backend/.env` con tus credenciales de Turso:
   ```env
   TURSO_DATABASE_URL=libsql://tu-base-de-datos.turso.io
   TURSO_AUTH_TOKEN=tu_token_de_turso
   ```

5. Inicia el servidor de desarrollo FastAPI:
   ```bash
   uvicorn main:app --reload
   ```
   La API quedará disponible en `http://localhost:8000`.

6. Accede a la documentación interactiva Swagger:
   - [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Configurar y Ejecutar el Frontend

1. Abre una nueva terminal y navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```

2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:5173`.

---

## Rutas y Flujo de Uso

| Ruta | Audiencia | Descripción |
| :--- | :--- | :--- |
| `/` | Personal / Cocina | Portal principal para empleados. Solicita login si no hay sesión y da acceso a la comandera, salón e inventario. |
| `/staff/qrs` | Personal / Admin | Generador de códigos QR para imprimir y colocar en cada mesa del restaurante. |
| `/mesa/:numeroMesa` | Clientes (QR) | Vista exclusiva tipo smartphone para clientes de la mesa indicada (ej. `/mesa/1`, `/mesa/2`). |
| `/menu` / `/cliente` | Clientes | Redirecciones directas a `/mesa/1` para pruebas rápidas. |

### Flujo de Prueba Recomendado
1. Abre `http://localhost:5173/` e inicia sesión como cocinero o mesero.
2. Ve a la sección **Códigos QR** (`/staff/qrs`) o abre en una ventana incógnito/móvil la ruta `http://localhost:5173/mesa/1`.
3. Desde la vista de la mesa 1, agrega productos al carrito con notas especiales y pulsa **Confirmar Pedido**.
4. Revisa la pestaña **Estado** en el móvil del cliente y el panel del personal en la PC: verás la mesa 1 pasar a **Esperando** y podrás abrir la comanda para pasarla a **En preparación** o **Listo**.
