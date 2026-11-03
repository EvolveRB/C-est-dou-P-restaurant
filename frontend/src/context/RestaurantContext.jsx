import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

// ──────────────────────────────────────────────────────────────────────────────
// Variable global del backend. Sobreponible vía .env (VITE_API_URL)
// ──────────────────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const RestaurantContext = createContext(null);

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de normalización — adaptan la respuesta del backend al shape
// que los componentes visuales ya conocen
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convierte un array de pedidos del backend [{ _id, num_mesa, estado_pedido, hora_pedido }]
 * al array de mesas { id, estado, pedido } que usa la UI.
 * Con MongoDB el campo `_id` ya viene serializado como string desde el backend.
 * Las mesas sin pedido activo se incluyen como 'Libre'.
 */
function normalizeMesas(pedidosBackend, totalMesas = 8) {
  // Mapa de num_mesa (entero) → último pedido activo
  const pedidosPorMesa = {};
  for (const p of pedidosBackend) {
    if (p.num_mesa != null) {
      const num = parseInt(p.num_mesa, 10);
      if (!isNaN(num)) {
        pedidosPorMesa[num] = p;
      }
    }
  }

  return Array.from({ length: totalMesas }, (_, i) => {
    const num = i + 1;
    const pedido = pedidosPorMesa[num];
    if (!pedido || pedido.estado_pedido === 'Entregado' || pedido.estado_pedido === 'Libre' || pedido.estado_pedido === 'Archivado') {
      return { id: num, estado: 'Libre', pedido: null };
    }

    const estadoUI = mapEstadoBackendToUI(pedido.estado_pedido);

    const rawItems = Array.isArray(pedido.items) ? pedido.items : [];
    const normalizedItems = rawItems.map((it) => {
      const prodName = it.product?.nombre || it.nombre || it.name || 'Platillo';
      const prodPrice = Number(it.product?.precio ?? it.precio_unitario ?? it.precio ?? 0);
      const prodId = it.product?.id || it.producto_id || it.id || it._id || 'item';
      const qty = Math.max(1, parseInt(it.quantity ?? it.cantidad ?? 1, 10));
      const note = it.note || it.observaciones || it.notas || '';
      return {
        product: {
          id: prodId,
          nombre: prodName,
          precio: prodPrice
        },
        quantity: qty,
        note: note,
        // Propiedades planas para máxima compatibilidad con cualquier vista
        nombre: prodName,
        precio: prodPrice,
        precio_unitario: prodPrice,
        cantidad: qty,
        observaciones: note
      };
    });

    const totalCalculado = normalizedItems.reduce(
      (acc, item) => acc + (item.product.precio * item.quantity),
      0
    );

    return {
      id: num,
      estado: estadoUI,
      pedido: {
        id: String(pedido._id ?? pedido.id_pedido ?? `PED-${num}`),
        hora: pedido.hora_pedido ?? '--:--',
        items: normalizedItems,
        total: pedido.total || pedido.subtotal || totalCalculado,
        subtotal: pedido.subtotal || pedido.total || totalCalculado,
        notas: pedido.notas || ''
      }
    };
  });
}

/**
 * Mapea los estados del backend a los estados internos de la UI.
 */
function mapEstadoBackendToUI(estadoBackend) {
  const map = {
    Pendiente: 'Esperando',
    'En preparación': 'En preparación',
    Listo: 'Listo para servir',
    Entregado: 'Libre',
    Libre: 'Libre'
  };
  return map[estadoBackend] ?? estadoBackend ?? 'Esperando';
}

/**
 * Mapea los estados internos de la UI al formato que acepta el backend.
 */
function mapEstadoUIToBackend(estadoUI) {
  const map = {
    Esperando: 'Pendiente',
    'En preparación': 'En preparación',
    'Listo para servir': 'Listo',
    Libre: 'Libre'
  };
  return map[estadoUI] ?? estadoUI;
}

/**
 * Determina de forma robusta si un producto está disponible en inventario.
 */
function isProductAvailable(p) {
  if (p.disponible === false || p.disponible === 0 || p.disponible === 'false' || p.disponible === '0') {
    return false;
  }
  if (p.disponibilidad != null) {
    const dispStr = String(p.disponibilidad).trim().toLowerCase();
    if (dispStr === 'agotado' || dispStr === 'no disponible' || dispStr === 'false' || dispStr === '0') {
      return false;
    }
    return true;
  }
  return true;
}

/**
 * Convierte un producto del backend al shape que usa la UI.
 */
function normalizeProducto(p) {
  return {
    id: p._id ?? p.id_plato ?? p.id,
    nombre: p.nombre,
    categoria: (p.categoria ?? 'otros').toLowerCase(),
    precio: Number(p.precio ?? 0),
    descripcion: p.descripcion ?? '',
    tiempo: p.tiempo_preparacion ?? p.tiempo ?? 0,
    disponible: isProductAvailable(p),
    imagen: p.imagen ?? null,
    destacado: p.destacado ?? false
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────────────────────
export function RestaurantProvider({ children }) {

  // 1. Estado de mesas — cargado desde el backend al montar
  const [tables, setTables] = useState([]);

  // 2. Catálogo de productos — cargado desde el backend al montar
  const [products, setProducts] = useState(INITIAL_PRODUCTS); // Fallback local mientras carga

  // 3. Indicadores de carga para poder mostrar skeletons si se desea
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ──────────────────────────────────────────────────────────────────────────
  // Carga inicial: mesas y productos desde el backend
  // ──────────────────────────────────────────────────────────────────────────
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/info-mesas`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener mesas`);
      const data = await res.json();
      // data: [{ id_pedido, num_mesa, estado_pedido, hora_pedido }]
      setTables(normalizeMesas(data));
    } catch (err) {
      console.error('[RestaurantContext] fetchTables error:', err);
      // Fallback: inicializa 8 mesas libres para no dejar la UI en blanco
      setTables(
        Array.from({ length: 8 }, (_, i) => ({ id: i + 1, estado: 'Libre', pedido: null }))
      );
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      // El backend expone GET /productos/filtrados (con precio_maximo como query param).
      // Usamos un precio muy alto para traer todo el catálogo disponible.
      const res = await fetch(`${API_URL}/productos/filtrados?precio_maximo=9999999`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener productos`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(normalizeProducto));
      }
      // Si el backend devuelve vacío, mantenemos el fallback de INITIAL_PRODUCTS
    } catch (err) {
      console.error('[RestaurantContext] fetchProducts error:', err);
      // Mantenemos INITIAL_PRODUCTS como fallback sin pisar el estado
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    fetchProducts();

    // Sincronización en tiempo real: consulta mesas cada 2.5s
    const interval = setInterval(() => {
      fetchTables();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchTables, fetchProducts]);

  // ──────────────────────────────────────────────────────────────────────────
  // resetTable — POST /mesas/{num}/liberar
  // ──────────────────────────────────────────────────────────────────────────
  const resetTable = async (tableNumber) => {
    const num = parseInt(tableNumber, 10);
    setTables((prev) =>
      prev.map((t) => (t.id === num ? { ...t, estado: 'Libre', pedido: null } : t))
    );
    try {
      await fetch(`${API_URL}/mesas/${num}/liberar`, { method: 'POST' });
      await fetchTables();
    } catch (err) {
      console.warn('Error al liberar mesa:', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // submitOrderForTable — POST /pedidos
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Envía un pedido al backend y actualiza optimistamente el estado local.
   *
   * @param {string|number} tableNumber   - Número de mesa
   * @param {Array}         cartItems     - Items del carrito [{ product, quantity, note }]
   * @param {string}        customerNotes - Notas generales del cliente
   * @returns {Promise<Object>} - El objeto del nuevo pedido con los campos que usa la UI
   * @throws {Error} - Si el backend devuelve un error HTTP
   */
  const submitOrderForTable = async (tableNumber, cartItems, customerNotes = '') => {
    const num_mesa = parseInt(tableNumber, 10);
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Normalizar items del carrito de manera totalmente resiliente
    const payloadItems = cartItems.map((item) => ({
      producto_id: String(item.product?.id || item.id || item._id || 'item'),
      nombre: item.product?.nombre || item.nombre || 'Platillo',
      precio_unitario: Number(item.product?.precio ?? item.precio_unitario ?? item.precio ?? 0),
      cantidad: Math.max(1, parseInt(item.quantity ?? item.cantidad ?? 1, 10)),
      observaciones: item.note || item.observaciones || ''
    }));

    const body = {
      num_mesa,
      empleado_id: null,
      estado_pedido: 'Pendiente',
      hora_pedido: horaActual,
      notas: customerNotes || '',
      items: payloadItems
    };

    const res = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`[submitOrderForTable] HTTP ${res.status}: ${errBody}`);
    }

    const backendResponse = await res.json();
    console.info('[RestaurantContext] Pedido creado en backend:', backendResponse);

    // Items listos para consumo inmediato en la UI
    const uiItems = payloadItems.map((it) => ({
      product: {
        id: it.producto_id,
        nombre: it.nombre,
        precio: it.precio_unitario
      },
      quantity: it.cantidad,
      note: it.observaciones,
      nombre: it.nombre,
      precio: it.precio_unitario,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      observaciones: it.observaciones
    }));

    const total = uiItems.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);

    const newOrder = {
      id: backendResponse.id ?? `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      hora: horaActual,
      num_mesa: num_mesa,
      items: uiItems,
      total: total,
      subtotal: total,
      notas: customerNotes
    };

    // Actualización optimista del estado local garantizando que la mesa exista en la lista
    setTables((prev) => {
      const exists = prev.some((t) => t.id === num_mesa);
      if (exists) {
        return prev.map((t) =>
          t.id === num_mesa
            ? { ...t, estado: 'Esperando', pedido: newOrder }
            : t
        );
      }
      return [...prev, { id: num_mesa, estado: 'Esperando', pedido: newOrder }];
    });

    // También actualiza el estado de la mesa en el backend
    try {
      await fetch(`${API_URL}/mesas/${num_mesa}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Pendiente' })
      });
    } catch (mesaErr) {
      console.warn('[RestaurantContext] No se pudo actualizar el estado de mesa en backend:', mesaErr);
    }

    // Sincronizar mesas tras envío
    await fetchTables();

    return newOrder;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // updateTableStatus — PUT /mesas/{num_mesa}/estado
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Actualiza el estado de una mesa en el backend y de forma optimista en el estado local.
   *
   * @param {number} tableId   - ID (num_mesa) de la mesa
   * @param {string} newStatus - Nuevo estado en formato UI ('Libre', 'En preparación', etc.)
   */
  const updateTableStatus = async (tableId, newStatus) => {
    const estadoBackend = mapEstadoUIToBackend(newStatus);

    // Actualización optimista local primero
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          if (newStatus === 'Libre') return { ...t, estado: 'Libre', pedido: null };
          return { ...t, estado: newStatus };
        }
        return t;
      })
    );

    // Luego sincroniza con el backend
    try {
      const res = await fetch(`${API_URL}/mesas/${tableId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: estadoBackend })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[RestaurantContext] updateTableStatus HTTP ${res.status}:`, errBody);
        fetchTables();
      } else {
        console.info(`[RestaurantContext] Mesa ${tableId} → ${newStatus} (${estadoBackend})`);
        fetchTables();
      }
    } catch (err) {
      console.error('[RestaurantContext] updateTableStatus error de red:', err);
      fetchTables(); // Revertir al estado real del servidor
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // toggleProductAvailability — PATCH /productos/{id}/disponible
  //
  // productId es el _id string de MongoDB (ej: "507f1f77bcf86cd799439011"),
  // que queda guardado como product.id en el estado local tras normalizeProducto().
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Activa o desactiva un producto del menú (uso exclusivo del cocinero).
   *
   * @param {string} productId - _id de MongoDB del producto (string ObjectId)
   */
  const toggleProductAvailability = async (productId) => {
    // Capturamos el valor ACTUAL antes del toggle para calcular el nuevo
    const productoActual = products.find((p) => p.id === productId);
    const nuevoEstado = !productoActual?.disponible;

    // Toggle optimista local
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, disponible: nuevoEstado } : p
      )
    );

    // Sincroniza con el backend — PATCH /productos/{productId}/disponible
    try {
      const res = await fetch(`${API_URL}/productos/${productId}/disponible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: nuevoEstado })
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[RestaurantContext] toggleProductAvailability HTTP ${res.status}:`, errBody);
        // Revertir el toggle optimista si el backend falló
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
        );
      } else {
        console.info(`[RestaurantContext] Producto ${productId} → disponible: ${nuevoEstado}`);
      }
    } catch (err) {
      console.error('[RestaurantContext] toggleProductAvailability error de red:', err);
      // Revertir el toggle optimista si hay error de red
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
      );
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // setTableCount — ajusta el número total de mesas localmente
  // ──────────────────────────────────────────────────────────────────────────
  const setTableCount = (newCount) => {
    const val = parseInt(newCount, 10);
    if (isNaN(val)) return;
    const targetCount = Math.max(1, Math.min(50, val));
    setTables((prev) => {
      const currentLength = prev.length;
      if (currentLength === targetCount) return prev;
      if (targetCount > currentLength) {
        const added = [];
        for (let i = currentLength + 1; i <= targetCount; i++) {
          added.push({ id: i, estado: 'Libre', pedido: null });
        }
        return [...prev, ...added];
      }
      return prev.slice(0, targetCount);
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Context value — misma firma que la versión anterior para no romper la UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <RestaurantContext.Provider
      value={{
        tables,
        setTableCount,
        products,
        submitOrderForTable,
        updateTableStatus,
        toggleProductAvailability,
        // Extras útiles para mostrar estados de carga en la UI
        loadingTables,
        loadingProducts,
        resetTable,
        refreshTables: fetchTables,
        refreshProducts: fetchProducts
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
