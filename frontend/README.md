# Frontend — C'est doux P (React 19 + Vite)

Aplicación cliente y panel de administración para el sistema de restaurante **C'est doux P**, construida con **React 19**, **Vite** y **React Router**.

---

## 🚀 Conexión con el Backend

El frontend se conecta asíncronamente a la API de **FastAPI** mediante `fetch` nativo centralizado a través de la variable de entorno `VITE_API_URL`.

### Variables de Entorno (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

---

## 🧠 Arquitectura de Contextos (`src/context/`)

Se eliminó toda simulación de `localStorage` para el estado del negocio, delegando la persistencia a **MongoDB Atlas**:

1. **`RestaurantContext.jsx`:**
   - Carga inicial reactiva: mesas desde `GET /pedidos/info-mesas` y catálogo desde `GET /productos/filtrados`.
   - `submitOrderForTable(tableNumber, cartItems, notes)`: Envía la comanda con items embebidos vía `POST /pedidos`.
   - `updateTableStatus(tableId, newStatus)`: Actualiza mesas vía `PUT /mesas/{num_mesa}/estado` con *Optimistic UI*.
   - `toggleProductAvailability(productId)`: Conecta con `PATCH /productos/{id}/disponible` para alternar la disponibilidad de platos en cocina.

2. **`CartContext.jsx`:**
   - Mantiene temporalmente el carrito por mesa mientras el comensal arma el pedido.
   - `sendOrder(customNotes)`: Invoca asíncronamente a `submitOrderForTable`, mostrando Toast de éxito solo si el backend responde con código 200/201 y bloqueando envíos duplicados con `sendingOrder`.

3. **`AuthContext.jsx`:**
   - `login(username, password)`: Autenticación real contra `POST /empleados/login`.
   - Mapeo automático de roles (`Administrador`, `Cocina`, `Mesero`).
   - Gestión adecuada de estados de carga (`loading`) y captura de errores HTTP (401/404) y de red.

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (puerto 5173)
pnpm dev

# Compilar para producción
pnpm build

# Previsualizar build de producción
pnpm preview
```
