import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

// ──────────────────────────────────────────────────────────────────────────────
// Variable global del backend. Sobreponible vía .env (VITE_API_URL).
// En producción (Railway / Docker SPA), usa ruta relativa ('')
// ──────────────────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const RestaurantContext = createContext(null);

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de normalización — adaptan la respuesta del backend al shape
// que los componentes visuales ya conocen
// ──────────────────────────────────────────────────────────────────────────────

// Mapa exhaustivo de nombres de platos a nombres de archivo de imagen
const IMAGE_FALLBACK_BY_NAME = {
  'plato principal alpha': 'plato_alpha.jpg',
  'entrada especial beta': 'entrada_beta.jpg',
  'sopa tradicional gamma': 'sopa_gamma.jpg',
  'corte de carne delta': 'corte_delta.jpg',
  'pasta artesanal epsilon': 'pasta_epsilon.jpg',
  'postre tentación zeta': 'postreUV.jpeg',
  'postre tentacion zeta': 'postreUV.jpeg',
  'carpaccio de res trufado': 'carpaccio_trufado.jpg',
  'bisque de mariscos del puerto': 'bisque_mariscos.jpg',
  'ravioles de ricotta y nueces': 'ravioles_ricotta.jpg',
  'limonada menta jengibre': 'limonada_menta.jpg',
  'copa de vino reserva syrah': 'vino_reserva.jpg'
};

const IMAGE_FALLBACK_BY_ID = {
  1: 'plato_alpha.jpg',
  2: 'entrada_beta.jpg',
  3: 'sopa_gamma.jpg',
  4: 'corte_delta.jpg',
  5: 'pasta_epsilon.jpg',
  6: 'postreUV.jpeg',
  7: 'carpaccio_trufado.jpg',
  8: 'bisque_mariscos.jpg',
  9: 'ravioles_ricotta.jpg',
  10: 'limonada_menta.jpg',
  11: 'vino_reserva.jpg'
};

/**
 * Resuelve la URL absoluta para imágenes almacenadas localmente en backend/Imagenes
 * o URLs remotas (HTTP / HTTPS / Base64).
 */
function formatImageUrl(img) {
  if (!img) return '/Imagenes/plato_alpha.jpg';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = String(img).replace(/^[/\\]+/, '').replace(/^Imagenes[/\\]+/i, '');
  return `/Imagenes/${cleanPath}`;
}

/**
 * Resuelve la imagen correcta para cualquier plato, incluso si la BD retornó null o vacío.
 */
function resolveProductImage(p) {
  if (!p) return '/Imagenes/plato_alpha.jpg';
  if (p.imagen && typeof p.imagen === 'string' && p.imagen.trim()) {
    return formatImageUrl(p.imagen);
  }
  const nameNorm = (p.nombre || '').toLowerCase().trim();
  if (IMAGE_FALLBACK_BY_NAME[nameNorm]) {
    return formatImageUrl(IMAGE_FALLBACK_BY_NAME[nameNorm]);
  }
  for (const [k, v] of Object.entries(IMAGE_FALLBACK_BY_NAME)) {
    if (nameNorm.includes(k) || k.includes(nameNorm)) {
      return formatImageUrl(v);
    }
  }
  const idNum = Number(p.id_plato || p.id);
  if (IMAGE_FALLBACK_BY_ID[idNum]) {
    return formatImageUrl(IMAGE_FALLBACK_BY_ID[idNum]);
  }
  const initMatch = INITIAL_PRODUCTS.find(
    (ip) => ip.id === idNum || ip.nombre.toLowerCase() === nameNorm
  );
  if (initMatch?.imagen) {
    return formatImageUrl(initMatch.imagen);
  }
  return '/Imagenes/plato_alpha.jpg';
}

// Estado inicial de prueba: Mesa 2 esperando elaboración, Mesa 1 libre para tiempo real
export const INITIAL_TEST_TABLES = Array.from({ length: 8 }, (_, i) => {
  const num = i + 1;
  if (num === 2) {
    return {
      id: 2,
      estado: 'Esperando',
      visita_activa_id: null,
      pedido: {
        id: 'PED-TEST-MESA2',
        hora: '14:20',
        num_mesa: 2,
        notas: 'Mesa de prueba: esperando a elaboración',
        items: [
          {
            product: { id: '1', nombre: 'Plato Principal Alpha', precio: 12500, imagen: '/Imagenes/plato_alpha.jpg' },
            quantity: 1,
            cantidad: 1,
            note: 'Término medio',
            nombre: 'Plato Principal Alpha',
            precio: 12500,
            precio_unitario: 12500,
            imagen: '/Imagenes/plato_alpha.jpg'
          },
          {
            product: { id: '2', nombre: 'Entrada Especial Beta', precio: 8000, imagen: '/Imagenes/entrada_beta.jpg' },
            quantity: 1,
            cantidad: 1,
            note: 'Sin sal añadida',
            nombre: 'Entrada Especial Beta',
            precio: 8000,
            precio_unitario: 8000,
            imagen: '/Imagenes/entrada_beta.jpg'
          }
        ],
        subtotal: 20500,
        total: 20500
      }
    };
  }
  return { id: num, estado: 'Libre', pedido: null };
});

/**
 * Convierte un array de pedidos del backend [{ _id, num_mesa, estado_pedido, hora_pedido }]
 * al array de mesas { id, estado, pedido } que usa la UI.
 * Con MongoDB el campo `_id` ya viene serializado como string desde el backend.
 * Las mesas sin pedido activo se incluyen como 'Libre'.
 */
function normalizeMesas(pedidosBackend, totalMesas = 8) {
  const pedidosPorMesa = {};
  let maxMesaPedido = 0;
  for (const p of pedidosBackend) {
    if (p.num_mesa != null) {
      const num = parseInt(p.num_mesa, 10);
      if (!isNaN(num)) {
        pedidosPorMesa[num] = p;
        if (num > maxMesaPedido) maxMesaPedido = num;
      }
    }
  }

  const effectiveTotal = Math.max(Number(totalMesas) || 8, maxMesaPedido);

  return Array.from({ length: effectiveTotal }, (_, i) => {
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
      const imgResolved = resolveProductImage({
        nombre: prodName,
        id_plato: prodId,
        imagen: rawImg
      });
      return {
        product: {
          id: prodId,
          nombre: prodName,
          precio: prodPrice,
          imagen: imgResolved
        },
        quantity: qty,
        note: note,
        nombre: prodName,
        precio: prodPrice,
        precio_unitario: prodPrice,
        cantidad: qty,
        observaciones: note,
        imagen: imgResolved
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
    imagen: resolveProductImage(p),
    destacado: p.destacado ?? false,
    etiquetas: Array.isArray(p.etiquetas) ? p.etiquetas : []
  };
}

export function RestaurantProvider({ children }) {
  const [tableCount, setTableCountState] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_total_mesas');
      return saved ? parseInt(saved, 10) : 8;
    } catch {
      return 8;
    }
  });
  const tableCountRef = useRef(tableCount);
  useEffect(() => {
    tableCountRef.current = tableCount;
  }, [tableCount]);

  const [tables, setTables] = useState(() => {
    const count = parseInt(localStorage.getItem('cest_doux_total_mesas') || '8', 10);
    return Array.from({ length: Math.max(8, count) }, (_, i) => {
      const num = i + 1;
      if (num === 2) {
        return INITIAL_TEST_TABLES[1] || { id: 2, estado: 'Esperando', pedido: null };
      }
      return { id: num, estado: 'Libre', pedido: null };
    });
  });

  const [products, setProducts] = useState(() => INITIAL_PRODUCTS.map(normalizeProducto));
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ── Llamadas a Garzón en Salón (RF-08 con destello reactivo para Garzones) ──
  const [llamadasGarzon, setLlamadasGarzon] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_llamadas_garzon');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleLlamadaSync = (e) => {
      try {
        if (e.type === 'storage' && e.key === 'cest_doux_llamadas_garzon') {
          setLlamadasGarzon(e.newValue ? JSON.parse(e.newValue) : {});
        } else if (e.type === 'cest_doux_llamada_garzon_event') {
          setLlamadasGarzon(e.detail || {});
        }
      } catch {}
    };
    window.addEventListener('storage', handleLlamadaSync);
    window.addEventListener('cest_doux_llamada_garzon_event', handleLlamadaSync);
    return () => {
      window.removeEventListener('storage', handleLlamadaSync);
      window.removeEventListener('cest_doux_llamada_garzon_event', handleLlamadaSync);
    };
  }, []);

  // ── Empleados (Plantilla de trabajadores) ──────────────────────────────────
  const DEFAULT_EMPLOYEES = [
    {
      id: '1',
      _id: '1',
      nombre: 'Marcela',
      apellido: 'Soto',
      correo: 'marcela.soto@restaurant.cl',
      username: 'marcela.soto',
      rol: 'Cocinero',
      cargo: 'Cocinero',
      telefono: '+56 9 8765 4321',
      estado: 'Activo'
    },
    {
      id: '2',
      _id: '2',
      nombre: 'Ana',
      apellido: 'Morales',
      correo: 'ana.morales@restaurant.cl',
      username: 'ana.morales',
      rol: 'Garzón',
      cargo: 'Garzón',
      telefono: '+56 9 7654 3210',
      estado: 'Activo'
    },
    {
      id: '3',
      _id: '3',
      nombre: 'Carlos',
      apellido: 'Silva',
      correo: 'admin@restaurant.cl',
      username: 'admin',
      rol: 'Administrador',
      cargo: 'Administrador',
      telefono: '+56 9 1234 5678',
      estado: 'Activo'
    }
  ];

  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_empleados_cache');
      return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEES;
    } catch {
      return DEFAULT_EMPLOYEES;
    }
  });
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch(`${API_URL}/empleados`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(data);
        localStorage.setItem('cest_doux_empleados_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('[RestaurantContext] fetchEmployees usando caché:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const addEmployee = async (newEmp) => {
    const empData = {
      id: String(Date.now()),
      _id: String(Date.now()),
      nombre: newEmp.nombre?.trim() || 'Nuevo',
      apellido: newEmp.apellido?.trim() || '',
      correo: newEmp.correo?.trim() || `${newEmp.nombre?.toLowerCase() || 'empleado'}@restaurant.cl`,
      username: newEmp.username?.trim() || `${newEmp.nombre?.toLowerCase() || 'empleado'}`,
      rol: newEmp.rol || 'Garzón',
      cargo: newEmp.rol || 'Garzón',
      telefono: newEmp.telefono?.trim() || '+56 9 0000 0000',
      estado: 'Activo'
    };

    setEmployees((prev) => {
      const updated = [...prev, empData];
      localStorage.setItem('cest_doux_empleados_cache', JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch(`${API_URL}/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        await fetchEmployees();
      }
    } catch (err) {
      console.warn('[RestaurantContext] addEmployee backend offline:', err);
    }
    return empData;
  };

  const updateEmployeeRole = async (empId, newRole) => {
    setEmployees((prev) => {
      const updated = prev.map((e) =>
        String(e._id || e.id) === String(empId) ? { ...e, rol: newRole, cargo: newRole } : e
      );
      localStorage.setItem('cest_doux_empleados_cache', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`${API_URL}/empleados/${empId}/rol`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: newRole })
      });
    } catch (err) {
      console.warn('[RestaurantContext] updateEmployeeRole backend offline:', err);
    }
  };

  const deleteEmployee = async (empId) => {
    setEmployees((prev) => {
      const updated = prev.filter((e) => String(e._id || e.id) !== String(empId));
      localStorage.setItem('cest_doux_empleados_cache', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`${API_URL}/empleados/${empId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[RestaurantContext] deleteEmployee backend offline:', err);
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/info-mesas`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener mesas`);
      const data = await res.json();
      setTables(normalizeMesas(data, tableCountRef.current));

      if (Array.isArray(data)) {
        const backendCalls = {};
        let hasBackendCalls = false;
        data.forEach((p) => {
          if (p.solicitud_garzon && p.solicitud_garzon.activa) {
            const mNum = parseInt(p.num_mesa, 10);
            if (!isNaN(mNum)) {
              backendCalls[mNum] = {
                timestamp: Date.now(),
                motivo: p.solicitud_garzon.motivo || 'Atención solicitada en mesa'
              };
              hasBackendCalls = true;
            }
          }
        });
        if (hasBackendCalls) {
          setLlamadasGarzon((prev) => {
            const merged = { ...prev, ...backendCalls };
            try {
              localStorage.setItem('cest_doux_llamadas_garzon', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('[RestaurantContext] fetchTables error:', err);
      setTables((prev) => (prev && prev.length > 0 ? prev : INITIAL_TEST_TABLES));
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
    fetchEmployees();

    const interval = setInterval(() => {
      fetchTables();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchTables, fetchProducts, fetchEmployees]);

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
    // Extrae la hora exacta actual del computador del cliente (formato 24h HH:MM)
    const now = new Date();
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
        return prev.map((t) => {
          if (t.id === num_mesa) {
            const prevItems = (t.pedido && Array.isArray(t.pedido.items) && t.estado !== 'Libre') ? t.pedido.items : [];
            const mergedItems = [...prevItems, ...uiItems];
            const mergedTotal = mergedItems.reduce(
              (acc, it) => acc + (Number(it.product?.precio ?? it.precio_unitario ?? 0) * (it.quantity || it.cantidad || 1)),
              0
            );
            const mergedNotes = [t.pedido?.notas, customerNotes].filter(Boolean).join(' | ');

            return {
              ...t,
              estado: 'Esperando',
              pedido: {
                id: backendResponse.id ?? t.pedido?.id ?? `PED-${num_mesa}`,
                hora: horaActual,
                num_mesa: num_mesa,
                items: mergedItems,
                total: mergedTotal,
                subtotal: mergedTotal,
                notas: mergedNotes
              }
            };
          }
          return t;
        });
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

  const reiniciarEstadoPruebas = async () => {
    try {
      // 1. Limpiar storage del cliente para mesa 1
      localStorage.removeItem('carrito_cest_dou_p');
      localStorage.removeItem('carrito_cest_dou_p_mesa_1');
      // 2. Aplicar estado local inmediato
      setTables(INITIAL_TEST_TABLES);
      // 3. Notificar al backend
      try {
        await fetch(`${API_URL}/sistema/reiniciar-pruebas`, { method: 'POST' });
      } catch (err) {
        console.warn('[RestaurantContext] Backend offline para reiniciar-pruebas:', err);
      }
      await fetchTables();
      await fetchProducts();
      return true;
    } catch (e) {
      console.error('[RestaurantContext] Error en reiniciarEstadoPruebas:', e);
      return false;
    }
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
    const mesaNum = parseInt(visitaIdOrMesa, 10);
    if (!isNaN(mesaNum)) {
      setLlamadasGarzon((prev) => {
        const next = { ...prev, [mesaNum]: { timestamp: Date.now(), motivo } };
        try {
          localStorage.setItem('cest_doux_llamadas_garzon', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('cest_doux_llamada_garzon_event', { detail: next }));
        } catch {}
        return next;
      });
    }

    try {
      const res = await fetch(`${API_URL}/visitas/${visitaIdOrMesa}/llamar-garzon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[RestaurantContext] llamarGarzon error:', err);
    }
    return { status: 'notified', mesa: mesaNum };
  };

  const atenderLlamada = async (mesaId) => {
    const mesaNum = parseInt(mesaId, 10);
    setLlamadasGarzon((prev) => {
      const next = { ...prev };
      delete next[mesaNum];
      try {
        localStorage.setItem('cest_doux_llamadas_garzon', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('cest_doux_llamada_garzon_event', { detail: next }));
      } catch {}
      return next;
    });

    try {
      await fetch(`${API_URL}/visitas/${mesaNum}/atender-garzon`, { method: 'PATCH' });
    } catch (err) {
      console.warn('[RestaurantContext] atenderLlamada backend sync:', err);
    }
  };

  const setTableCount = async (newCount) => {
    const val = parseInt(newCount, 10);
    if (isNaN(val)) return;
    const targetCount = Math.max(1, Math.min(50, val));
    setTableCountState(targetCount);
    tableCountRef.current = targetCount;
    try {
      localStorage.setItem('cest_doux_total_mesas', targetCount.toString());
    } catch {}

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

    try {
      await fetch(`${API_URL}/mesas/cantidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: targetCount })
      });
    } catch (err) {
      console.warn('[RestaurantContext] No se pudo sincronizar cantidad con backend:', err);
    }
  };

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        tableCount,
        setTableCount,
        products,
        employees,
        loadingEmployees,
        fetchEmployees,
        addEmployee,
        updateEmployeeRole,
        deleteEmployee,
        submitOrderForTable,
        updateTableStatus,
        toggleProductAvailability,
        validarQrMesa,
        llamarGarzon,
        atenderLlamada,
        llamadasGarzon,
        loadingTables,
        loadingProducts,
        resetTable,
        reiniciarEstadoPruebas,
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
