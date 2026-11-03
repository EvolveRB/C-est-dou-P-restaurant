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
 * Resuelve la URL absoluta para imágenes almacenadas localmente en backend/Imagenes
 * o URLs remotas (HTTP / HTTPS / Base64).
 */
function formatImageUrl(img) {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = img.replace(/^\/+/, '');
  if (cleanPath.toLowerCase().startsWith('imagenes/')) {
    return `${API_URL}/${cleanPath}`;
  }
  return `${API_URL}/Imagenes/${cleanPath}`;
}

/**
 * Convierte un array de pedidos del backend [{ _id, num_mesa, estado_pedido, hora_pedido }]
 * al array de mesas { id, estado, pedido } que usa la UI.
 * Con MongoDB el campo `_id` ya viene serializado como string desde el backend.
 * Las mesas sin pedido activo se incluyen como 'Libre'.
 */
function normalizeMesas(pedidosBackend, totalMesas = 8) {
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
      const rawImg = it.product?.imagen || it.imagen;
      return {
        product: {
          id: prodId,
          nombre: prodName,
          precio: prodPrice,
          imagen: formatImageUrl(rawImg)
        },
        quantity: qty,
        note: note,
        nombre: prodName,
        precio: prodPrice,
        precio_unitario: prodPrice,
        cantidad: qty,
        observaciones: note,
        imagen: formatImageUrl(rawImg)
      };
    });

    const totalCalculado = normalizedItems.reduce(
      (acc, item) => acc + (item.product.precio * item.quantity),
      0
    );

    return {
      id: num,
      estado: estadoUI,
      visita_activa_id: pedido.visita_id || null,
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

function mapEstadoUIToBackend(estadoUI) {
  const map = {
    Esperando: 'Pendiente',
    'En preparación': 'En preparación',
    'Listo para servir': 'Listo',
    Libre: 'Libre'
  };
  return map[estadoUI] ?? estadoUI;
}

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

function normalizeProducto(p) {
  return {
    id: p._id ?? p.id_plato ?? p.id,
    nombre: p.nombre,
    categoria: (p.categoria ?? 'otros').toLowerCase(),
    precio: Number(p.precio ?? 0),
    descripcion: p.descripcion ?? '',
    tiempo: p.tiempo_preparacion ?? p.tiempo ?? 0,
    disponible: isProductAvailable(p),
    imagen: formatImageUrl(p.imagen),
    destacado: p.destacado ?? false,
    etiquetas: Array.isArray(p.etiquetas) ? p.etiquetas : []
  };
}

export function RestaurantProvider({ children }) {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState(() => INITIAL_PRODUCTS.map(normalizeProducto));
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/info-mesas`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener mesas`);
      const data = await res.json();
      setTables(normalizeMesas(data));
    } catch (err) {
      console.error('[RestaurantContext] fetchTables error:', err);
      setTables(
        Array.from({ length: 8 }, (_, i) => ({ id: i + 1, estado: 'Libre', pedido: null }))
      );
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/productos/filtrados?precio_maximo=9999999`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener productos`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(normalizeProducto));
      }
    } catch (err) {
      console.error('[RestaurantContext] fetchProducts error:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    fetchProducts();

    const interval = setInterval(() => {
      fetchTables();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchTables, fetchProducts]);

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

  const submitOrderForTable = async (tableNumber, cartItems, customerNotes = '') => {
    const num_mesa = parseInt(tableNumber, 10);
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

    try {
      await fetch(`${API_URL}/mesas/${num_mesa}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Pendiente' })
      });
    } catch (mesaErr) {
      console.warn('[RestaurantContext] No se pudo actualizar el estado de mesa en backend:', mesaErr);
    }

    await fetchTables();
    return newOrder;
  };

  const updateTableStatus = async (tableId, newStatus) => {
    const estadoBackend = mapEstadoUIToBackend(newStatus);

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          if (newStatus === 'Libre') return { ...t, estado: 'Libre', pedido: null };
          return { ...t, estado: newStatus };
        }
        return t;
      })
    );

    try {
      const res = await fetch(`${API_URL}/mesas/${tableId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: estadoBackend })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[RestaurantContext] updateTableStatus HTTP ${res.status}:`, errBody);
      }
      await fetchTables();
    } catch (err) {
      console.error('[RestaurantContext] updateTableStatus error de red:', err);
      fetchTables();
    }
  };

  const toggleProductAvailability = async (productId) => {
    const productoActual = products.find((p) => p.id === productId);
    const nuevoEstado = !productoActual?.disponible;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, disponible: nuevoEstado } : p
      )
    );

    try {
      const res = await fetch(`${API_URL}/productos/${productId}/disponible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: nuevoEstado })
      });
      if (!res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
        );
      }
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
      );
    }
  };

  const validarQrMesa = async (numMesa, token) => {
    try {
      const res = await fetch(`${API_URL}/mesas/${numMesa}/validar-qr?token=${encodeURIComponent(token)}`);
      if (res.status === 403) {
        return { valid: false, status: 403, error: 'QR Inválido: Acceso no autorizado' };
      }
      if (!res.ok) {
        return { valid: false, status: res.status, error: 'Error al validar QR' };
      }
      const data = await res.json();
      return { valid: true, data };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  };

  const llamarGarzon = async (visitaIdOrMesa, motivo = 'Atención solicitada en mesa') => {
    try {
      const res = await fetch(`${API_URL}/visitas/${visitaIdOrMesa}/llamar-garzon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[RestaurantContext] llamarGarzon error:', err);
      throw err;
    }
  };

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

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        setTableCount,
        products,
        submitOrderForTable,
        updateTableStatus,
        toggleProductAvailability,
        validarQrMesa,
        llamarGarzon,
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
