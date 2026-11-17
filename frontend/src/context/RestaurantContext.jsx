import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeCategoryKey } from '../data/initialProducts';
import { useAuth } from './AuthContext';
import { roleLog } from '../utils/roleLogger';
import { capitalizePersonName, normalizeRut } from '../utils/rut';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const AZURE_IMAGES_BASE_URL = (
  import.meta.env.VITE_CDN_IMAGES_BASE_URL ||
  import.meta.env.VITE_AZURE_IMAGES_BASE_URL ||
  'https://d29jcylbmgo4bc.cloudfront.net'
).trim().replace(/\/+$/, '');
const POLLING_INTERVAL_MS = 3000;

const RestaurantContext = createContext(null);

function formatImageUrl(img) {
  if (!img || typeof img !== 'string') return '';
  const trimmed = img.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanName = trimmed.replace(/^[/\\]+/, '').replace(/^Imagenes[/\\]+/i, '');
  if (AZURE_IMAGES_BASE_URL && cleanName) {
    return `${AZURE_IMAGES_BASE_URL}/${cleanName}`;
  }
  return '';
}

function resolveProductImage(p) {
  if (!p) return '';
  if (p.imagen && typeof p.imagen === 'string' && p.imagen.trim()) {
    return formatImageUrl(p.imagen);
  }
  return '';
}

function mapEstadoBackendToUI(estadoBackend) {
  const map = {
    Pendiente: 'Esperando',
    'En preparación': 'En preparación',
    Listo: 'Listo para servir',
    Entregado: 'Libre',
    Libre: 'Libre',
  };
  return map[estadoBackend] ?? estadoBackend ?? 'Esperando';
}

function mapEstadoUIToBackend(estadoUI) {
  const map = {
    Esperando: 'Pendiente',
    'En preparación': 'En preparación',
    'Listo para servir': 'Listo',
    Libre: 'Libre',
  };
  return map[estadoUI] ?? estadoUI;
}

function normalizeOrderItems(rawItems) {
  return (Array.isArray(rawItems) ? rawItems : []).map((it) => {
    const prodName = it.product?.nombre || it.nombre || it.name || 'Platillo';
    const prodPrice = Number(it.product?.precio ?? it.precio_unitario ?? it.precio ?? 0);
    const prodId = it.product?.id || it.producto_id || it.id || it._id || 'item';
    const qty = Math.max(1, parseInt(it.quantity ?? it.cantidad ?? 1, 10));
    const note = it.note || it.observaciones || it.notas || '';
    const rawImg = it.product?.imagen || it.imagen;
    const imgResolved = formatImageUrl(rawImg);
    return {
      product: {
        id: prodId,
        nombre: prodName,
        precio: prodPrice,
        imagen: imgResolved,
      },
      quantity: qty,
      note,
      nombre: prodName,
      precio: prodPrice,
      precio_unitario: prodPrice,
      cantidad: qty,
      observaciones: note,
      imagen: imgResolved,
    };
  });
}

function normalizeMesas(pedidosBackend, totalMesas = 8, strictTotal = false) {
  const pedidosPorMesa = {};
  let maxMesaPedido = 0;
  for (const p of pedidosBackend) {
    if (p && p.num_mesa != null) {
      const num = parseInt(p.num_mesa, 10);
      if (!isNaN(num)) {
        pedidosPorMesa[num] = p;
        if (num > maxMesaPedido) maxMesaPedido = num;
      }
    }
  }

  const parsedTotal = Number(totalMesas) || 1;
  const effectiveTotal = strictTotal ? Math.max(1, parsedTotal) : Math.max(parsedTotal, maxMesaPedido);

  return Array.from({ length: effectiveTotal }, (_, i) => {
    const num = i + 1;
    const pedido = pedidosPorMesa[num];
    if (!pedido || pedido.estado_pedido === 'Entregado' || pedido.estado_pedido === 'Libre' || pedido.estado_pedido === 'Archivado') {
      return { id: num, estado: 'Libre', pedido: null };
    }

    const estadoUI = mapEstadoBackendToUI(pedido.estado_pedido);
    const normalizedItems = normalizeOrderItems(pedido.items);
    const totalCalculado = normalizedItems.reduce(
      (acc, item) => acc + item.product.precio * item.quantity,
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
        notas: pedido.notas || '',
        sucursal: pedido.sucursal || 'Local 1 - Casa Matriz',
      },
    };
  });
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
  const rawCategory = (p.categoria ?? 'Platos de Fondo').trim();
  const displayCategory = rawCategory.toLowerCase() === 'postre' ? 'Postres' : rawCategory;
  return {
    id: p._id ?? p.id_plato ?? p.id,
    nombre: p.nombre,
    categoria: normalizeCategoryKey(displayCategory),
    categoriaNombre: displayCategory,
    precio: Number(p.precio ?? 0),
    descripcion: p.descripcion ?? '',
    tiempo: p.tiempo_preparacion ?? p.tiempo ?? 15,
    disponible: isProductAvailable(p),
    disponibilidad: p.disponibilidad ?? (isProductAvailable(p) ? 'En stock' : 'Agotado'),
    imagen: resolveProductImage(p),
    imagenRaw: p.imagen ?? '',
    destacado: Boolean(p.destacado),
    etiquetas: Array.isArray(p.etiquetas) ? p.etiquetas : [],
  };
}

export function RestaurantProvider({ children }) {
  const { user, isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  const isClientRoute = /^\/(mesa|menu|cliente)(\/|$)/.test(location.pathname);
  const clientMesaMatch = location.pathname.match(/^\/mesa\/(\d+)/);
  const clientMesaNum = clientMesaMatch ? parseInt(clientMesaMatch[1], 10) : 1;

  const activeStaffRole = isAuthenticated && !mustChangePassword && !isClientRoute ? user?.role : null;

  const [tableCount, setTableCountState] = useState(8);
  const tableCountRef = useRef(8);
  const recentlyAttendedRef = useRef({});
  const lastTableCountChangeRef = useRef(0);
  const tableCountSeqRef = useRef(0);
  const fetchSeqRef = useRef(0);

  const [tables, setTables] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({ id: i + 1, estado: 'Libre', pedido: null }))
  );
  const [products, setProducts] = useState([]);
  const [catalogFilters, setCatalogFilters] = useState({ categorias: [], etiquetas: [] });
  const [employees, setEmployees] = useState([]);
  const [roleLogs, setRoleLogs] = useState([]);
  const [llamadasGarzon, setLlamadasGarzon] = useState({});
  const [adminPedidosData, setAdminPedidosData] = useState({
    resumen: {
      total_ingresos: 0,
      total_propinas: 0,
      cantidad_transacciones: 0,
      ticket_promedio: 0,
      comprobantes_enviados: 0,
      comprobantes_registrados: 0,
      por_metodo: { tarjeta: 0, efectivo: 0, transferencia: 0 },
      monto_por_metodo: { tarjeta: 0, efectivo: 0, transferencia: 0 },
      sucursales: ['Local 1 - Casa Matriz'],
    },
    transacciones: [],
    pedidos: [],
  });

  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAdminPedidos, setLoadingAdminPedidos] = useState(false);
  const [adminPedidosError, setAdminPedidosError] = useState('');

  const fetchRoleLogs = useCallback(async () => {
    if (!activeStaffRole) return;
    try {
      const res = await fetch(`${API_URL}/auth/logs`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoleLogs(data);
        }
      }
    } catch {
      // Silencioso si no hay conexión
    }
  }, [activeStaffRole]);

  const fetchEmployees = useCallback(async () => {
    if (activeStaffRole !== 'Administrador') {
      setEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const res = await fetch(`${API_URL}/empleados`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
        roleLog('Administrador', 'info', `Plantilla cargada (${data.length} registros)`);
      }
    } catch (err) {
      roleLog('Administrador', 'warn', `Error cargando empleados: ${err.message}`);
    } finally {
      setLoadingEmployees(false);
    }
  }, [activeStaffRole]);

  const fetchAdminOrdersAndTransactions = useCallback(async (sucursal = 'todas') => {
    if (activeStaffRole !== 'Administrador') return;
    setLoadingAdminPedidos(true);
    try {
      const q = sucursal && sucursal !== 'todas' ? `?sucursal=${encodeURIComponent(sucursal)}` : '';
      const res = await fetch(`${API_URL}/admin/pedidos-transacciones${q}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setAdminPedidosData(data);
          setAdminPedidosError('');
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        setAdminPedidosError(errBody?.detail || `Error HTTP ${res.status} al cargar pedidos y transacciones.`);
      }
    } catch (err) {
      setAdminPedidosError(err?.message || 'No se pudo conectar con el servidor.');
      roleLog('Administrador', 'warn', `Error cargando transacciones: ${err.message}`);
    } finally {
      setLoadingAdminPedidos(false);
    }
  }, [activeStaffRole]);

  const fetchTables = useCallback(async () => {
    if (!activeStaffRole) return;
    const seq = ++fetchSeqRef.current;
    const pollStartedAt = Date.now();
    setLoadingTables(true);
    try {
      const [mesasRes, pedidosRes] = await Promise.all([
        fetch(`${API_URL}/mesas`, { credentials: 'include' }),
        fetch(`${API_URL}/pedidos/info-mesas`, { credentials: 'include' }),
      ]);

      if (seq !== fetchSeqRef.current) return;

      let effectiveCount = tableCountRef.current;
      const callsFromDb = {};
      const countRecentlyChanged = Date.now() - lastTableCountChangeRef.current < 4000;

      if (mesasRes.ok) {
        const mesasData = await mesasRes.json();
        if (!countRecentlyChanged && typeof mesasData.total === 'number' && mesasData.total > 0) {
          effectiveCount = mesasData.total;
          tableCountRef.current = effectiveCount;
          setTableCountState(effectiveCount);
        }
        if (mesasData.llamadas_activas && typeof mesasData.llamadas_activas === 'object') {
          Object.entries(mesasData.llamadas_activas).forEach(([k, info]) => {
            const mNum = parseInt(k, 10);
            const attendedAt = recentlyAttendedRef.current[mNum] || 0;
            if (!isNaN(mNum) && mNum <= effectiveCount && attendedAt < pollStartedAt && Date.now() - attendedAt > 4000) {
              callsFromDb[mNum] = {
                timestamp: Date.now(),
                motivo: info?.motivo || 'Atención solicitada en mesa',
              };
            }
          });
        }
      }

      if (pedidosRes.ok) {
        const pedidosData = await pedidosRes.json();
        setTables(normalizeMesas(pedidosData, effectiveCount, true));
        if (Array.isArray(pedidosData)) {
          pedidosData.forEach((p) => {
            if (p.solicitud_garzon && p.solicitud_garzon.activa && p.num_mesa != null) {
              const mNum = parseInt(p.num_mesa, 10);
              const attendedAt = recentlyAttendedRef.current[mNum] || 0;
              if (!isNaN(mNum) && mNum <= effectiveCount && attendedAt < pollStartedAt && Date.now() - attendedAt > 4000) {
                callsFromDb[mNum] = {
                  timestamp: Date.now(),
                  motivo: p.solicitud_garzon.motivo || 'Atención solicitada en mesa',
                };
              }
            }
          });
        }
      }

      setLlamadasGarzon(callsFromDb);
    } catch (err) {
      roleLog(activeStaffRole, 'error', `Error obteniendo mesas: ${err.message}`);
    } finally {
      setLoadingTables(false);
    }
  }, [activeStaffRole]);

  const fetchClientTableOrder = useCallback(async (numMesa) => {
    if (!numMesa) return;
    try {
      const res = await fetch(`${API_URL}/pedidos/mesa/${numMesa}`);
      if (!res.ok) return;
      const pedido = await res.json();
      setTables((prev) => normalizeMesas(pedido ? [pedido] : [], Math.max(numMesa, prev.length || 8)));
    } catch (err) {
      roleLog('Cliente', 'warn', `Error consultando estado de mesa ${numMesa}: ${err.message}`);
    }
  }, []);

  const fetchCatalogFilters = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/catalogo/filtros`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.categorias) && Array.isArray(data.etiquetas)) {
          setCatalogFilters(data);
        }
      }
    } catch {
      // Silencioso si no hay conexión
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!isClientRoute && activeStaffRole !== 'Cocina' && activeStaffRole !== 'Administrador') {
      return;
    }
    setLoadingProducts(true);
    try {
      const [prodRes] = await Promise.all([
        fetch(`${API_URL}/productos/filtrados`),
        fetchCatalogFilters(),
      ]);
      if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}`);
      const data = await prodRes.json();
      if (Array.isArray(data)) {
        setProducts(data.map(normalizeProducto));
      }
    } catch (err) {
      roleLog(isClientRoute ? 'Cliente' : activeStaffRole, 'warn', `Error obteniendo productos: ${err.message}`);
    } finally {
      setLoadingProducts(false);
    }
  }, [isClientRoute, activeStaffRole, fetchCatalogFilters]);

  // Carga separada por perfil y ruta con polling unificado de 3 segundos (3000 ms)
  useEffect(() => {
    if (isClientRoute) {
      const initTimer = setTimeout(() => {
        fetchProducts();
        fetchClientTableOrder(clientMesaNum);
      }, 0);
      const clientInterval = setInterval(() => {
        fetchClientTableOrder(clientMesaNum);
      }, POLLING_INTERVAL_MS);
      return () => {
        clearTimeout(initTimer);
        clearInterval(clientInterval);
      };
    }

    if (!activeStaffRole) {
      const resetTimer = setTimeout(() => {
        setEmployees([]);
        setRoleLogs([]);
        setLlamadasGarzon({});
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const staffTimer = setTimeout(() => {
      fetchTables();
      fetchRoleLogs();

      if (activeStaffRole === 'Administrador') {
        fetchEmployees();
        fetchProducts();
        fetchAdminOrdersAndTransactions();
      } else {
        setEmployees([]);
      }

      if (activeStaffRole === 'Cocina') {
        fetchProducts();
      }
    }, 0);

    const staffInterval = setInterval(() => {
      fetchTables();
      if (activeStaffRole === 'Administrador') {
        fetchAdminOrdersAndTransactions();
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      clearTimeout(staffTimer);
      clearInterval(staffInterval);
    };
  }, [
    isClientRoute,
    clientMesaNum,
    activeStaffRole,
    fetchTables,
    fetchProducts,
    fetchEmployees,
    fetchRoleLogs,
    fetchClientTableOrder,
    fetchAdminOrdersAndTransactions,
  ]);

  const addEmployee = async (newEmp) => {
    try {
      const res = await fetch(`${API_URL}/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rut: normalizeRut(newEmp.rut),
          nombre: capitalizePersonName(newEmp.nombre),
          apellido: capitalizePersonName(newEmp.apellido),
          correo: newEmp.correo?.trim() || null,
          telefono: newEmp.telefono?.trim() || null,
          rol: newEmp.rol || 'Garzón',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body?.detail || 'No se pudo registrar el trabajador.' };
      }
      await fetchEmployees();
      await fetchRoleLogs();
      roleLog('Administrador', 'info', `Nuevo trabajador creado (${body.empleado?.rol})`);
      return {
        success: true,
        empleado: body.empleado,
        temporaryPassword: body.temporary_password,
      };
    } catch {
      return { success: false, error: 'Error de red al crear trabajador.' };
    }
  };

  const resetEmployeePassword = async (empId) => {
    try {
      const res = await fetch(`${API_URL}/empleados/${empId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body?.detail || 'No se pudo regenerar la contraseña.' };
      }
      await fetchEmployees();
      await fetchRoleLogs();
      return {
        success: true,
        empleado: body.empleado,
        temporaryPassword: body.temporary_password,
      };
    } catch {
      return { success: false, error: 'Error de conexión al resetear contraseña.' };
    }
  };

  const updateEmployeeRole = async (empId, newRole) => {
    try {
      const res = await fetch(`${API_URL}/empleados/${empId}/rol`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rol: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body?.detail || 'No se pudo cambiar el rol.' };
      }
      await fetchEmployees();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión al actualizar rol.' };
    }
  };

  const deleteEmployee = async (empId) => {
    try {
      const res = await fetch(`${API_URL}/empleados/${empId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body?.detail || 'No se pudo eliminar el trabajador.' };
      }
      await fetchEmployees();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión al eliminar trabajador.' };
    }
  };

  const resetTable = async (tableNumber) => {
    const num = parseInt(tableNumber, 10);
    setTables((prev) =>
      prev.map((t) => (t.id === num ? { ...t, estado: 'Libre', pedido: null } : t))
    );
    try {
      await fetch(`${API_URL}/mesas/${num}/liberar`, {
        method: 'POST',
        credentials: 'include',
      });
      if (isClientRoute) {
        await fetchClientTableOrder(num);
      } else {
        await fetchTables();
      }
    } catch (err) {
      roleLog(isClientRoute ? 'Cliente' : activeStaffRole, 'warn', `Error al liberar mesa: ${err.message}`);
    }
  };

  const pagarMesa = async (tableNumber, { correoCliente, metodoPago, propinaPorcentaje }) => {
    const num = parseInt(tableNumber, 10);
    const res = await fetch(`${API_URL}/mesas/${num}/pagar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_cliente: correoCliente,
        metodo_pago: metodoPago,
        propina_porcentaje: propinaPorcentaje,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.detail || `No se pudo procesar el pago (HTTP ${res.status})`);
    }
    setTables((prev) =>
      prev.map((t) => (t.id === num ? { ...t, estado: 'Libre', pedido: null } : t))
    );
    await fetchClientTableOrder(num);
    return body;
  };

  const resendTransactionReceipt = async (transaccionId) => {
    try {
      const res = await fetch(`${API_URL}/admin/transacciones/${transaccionId}/reenviar-comprobante`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body?.detail || 'No se pudo reenviar el comprobante.' };
      }
      await fetchAdminOrdersAndTransactions();
      await fetchRoleLogs();
      return { success: true, ...body };
    } catch {
      return { success: false, error: 'Error de red al reenviar comprobante.' };
    }
  };

  const submitOrderForTable = async (tableNumber, cartItems, customerNotes = '') => {
    const num_mesa = parseInt(tableNumber, 10);
    const now = new Date();
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const payloadItems = cartItems.map((item) => ({
      producto_id: String(item.product?.id || item.id || item._id || 'item'),
      nombre: item.product?.nombre || item.nombre || 'Platillo',
      precio_unitario: Number(item.product?.precio ?? item.precio_unitario ?? item.precio ?? 0),
      cantidad: Math.max(1, parseInt(item.quantity ?? item.cantidad ?? 1, 10)),
      observaciones: item.note || item.observaciones || '',
    }));

    const body = {
      num_mesa,
      empleado_id: null,
      estado_pedido: 'Pendiente',
      hora_pedido: horaActual,
      notas: customerNotes || '',
      items: payloadItems,
    };

    const res = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`[submitOrderForTable] HTTP ${res.status}: ${errBody}`);
    }

    const backendResponse = await res.json();
    const uiItems = normalizeOrderItems(payloadItems);
    const total = uiItems.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);

    const newOrder = {
      id: backendResponse.id ?? `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      hora: horaActual,
      num_mesa,
      items: uiItems,
      total,
      subtotal: total,
      notas: customerNotes,
    };

    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== num_mesa) return t;
        const prevItems = t.pedido && Array.isArray(t.pedido.items) && t.estado !== 'Libre' ? t.pedido.items : [];
        const mergedItems = [...prevItems, ...uiItems];
        const mergedTotal = mergedItems.reduce(
          (acc, it) => acc + Number(it.product?.precio ?? it.precio_unitario ?? 0) * (it.quantity || it.cantidad || 1),
          0
        );
        const mergedNotes = [t.pedido?.notas, customerNotes].filter(Boolean).join(' | ');
        return {
          ...t,
          estado: 'Esperando',
          pedido: {
            id: backendResponse.id ?? t.pedido?.id ?? `PED-${num_mesa}`,
            hora: horaActual,
            num_mesa,
            items: mergedItems,
            total: mergedTotal,
            subtotal: mergedTotal,
            notas: mergedNotes,
          },
        };
      })
    );

    await fetchClientTableOrder(num_mesa);
    roleLog('Cliente', 'info', `Pedido enviado para mesa ${num_mesa}`);
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
        credentials: 'include',
        body: JSON.stringify({ estado: estadoBackend }),
      });

      if (res.ok) {
        roleLog(activeStaffRole, 'info', `Mesa ${tableId} -> ${newStatus}`);
      }
      await fetchTables();
      await fetchRoleLogs();
    } catch (err) {
      roleLog(activeStaffRole, 'error', `Error cambiando estado mesa: ${err.message}`);
      fetchTables();
    }
  };

  const toggleProductAvailability = async (productId) => {
    const productoActual = products.find((p) => p.id === productId);
    const nuevoEstado = !productoActual?.disponible;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, disponible: nuevoEstado } : p))
    );

    try {
      const res = await fetch(`${API_URL}/productos/${productId}/disponible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ disponible: nuevoEstado }),
      });
      if (!res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
        );
      } else {
        await fetchRoleLogs();
        roleLog(activeStaffRole, 'info', 'Disponibilidad plato actualizada');
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, disponible: !p.disponible } : p))
      );
    }
  };

  const uploadProductImage = async (file, nombrePlato = '') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (nombrePlato && String(nombrePlato).trim()) {
        formData.append('nombre_plato', String(nombrePlato).trim());
      }
      const res = await fetch(`${API_URL}/productos/upload-imagen`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body?.detail || 'No se pudo subir la imagen a la nube.' };
      }
      return { success: true, url: body.url, key: body.key };
    } catch {
      return { success: false, error: 'Error de red al subir la imagen.' };
    }
  };

  const createProduct = async (productData) => {
    try {
      const res = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo crear el plato.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true, id: body.id };
    } catch {
      return { success: false, error: 'Error de red al crear el plato.' };
    }
  };

  const updateProduct = async (productId, productData) => {
    try {
      const res = await fetch(`${API_URL}/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo actualizar el plato.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de red al actualizar el plato.' };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/productos/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo eliminar el plato.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de red al eliminar el plato.' };
    }
  };

  const createCategory = async (nombre) => {
    try {
      const res = await fetch(`${API_URL}/admin/filtros/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo crear la categoría.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const renameCategory = async (nombreActual, nombreNuevo) => {
    try {
      const res = await fetch(`${API_URL}/admin/filtros/categorias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre_actual: nombreActual, nombre_nuevo: nombreNuevo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo renombrar la categoría.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const deleteCategory = async (nombre, reassignTo = 'Platos de Fondo') => {
    try {
      const res = await fetch(
        `${API_URL}/admin/filtros/categorias/${encodeURIComponent(nombre)}?reassign_to=${encodeURIComponent(reassignTo)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo eliminar la categoría.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const createTag = async (nombre) => {
    try {
      const res = await fetch(`${API_URL}/admin/filtros/etiquetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo crear la etiqueta.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const renameTag = async (nombreActual, nombreNuevo) => {
    try {
      const res = await fetch(`${API_URL}/admin/filtros/etiquetas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre_actual: nombreActual, nombre_nuevo: nombreNuevo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo actualizar la etiqueta.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const deleteTag = async (nombre) => {
    try {
      const res = await fetch(`${API_URL}/admin/filtros/etiquetas/${encodeURIComponent(nombre)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: body?.detail || 'No se pudo eliminar la etiqueta.' };
      await fetchProducts();
      await fetchRoleLogs();
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
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
    try {
      const res = await fetch(`${API_URL}/visitas/${visitaIdOrMesa}/llamar-garzon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      if (res.ok) {
        roleLog('Cliente', 'info', `Llamado a garzón desde mesa ${mesaNum}`);
        return await res.json();
      }
    } catch (err) {
      roleLog('Cliente', 'warn', `Error llamando garzón: ${err.message}`);
    }
    return { status: 'notified', mesa: mesaNum };
  };

  const atenderLlamada = async (mesaId) => {
    const mesaNum = parseInt(mesaId, 10);
    if (isNaN(mesaNum)) return;

    recentlyAttendedRef.current[mesaNum] = Date.now();
    setLlamadasGarzon((prev) => {
      const next = { ...prev };
      delete next[mesaNum];
      delete next[String(mesaNum)];
      return next;
    });

    try {
      const res = await fetch(`${API_URL}/visitas/${mesaNum}/atender-garzon`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchTables();
        await fetchRoleLogs();
      }
      roleLog(activeStaffRole, 'info', `Atendida llamada de mesa ${mesaNum}`);
    } catch (err) {
      roleLog(activeStaffRole, 'warn', `Error atendiendo llamada: ${err.message}`);
    }
  };

  const setTableCount = async (newCount) => {
    const val = parseInt(newCount, 10);
    if (isNaN(val)) return;
    const targetCount = Math.max(1, Math.min(50, val));
    const seq = ++tableCountSeqRef.current;
    lastTableCountChangeRef.current = Date.now();
    setTableCountState(targetCount);
    tableCountRef.current = targetCount;

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
      const res = await fetch(`${API_URL}/mesas/cantidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cantidad: targetCount }),
      });
      if (res.ok && seq === tableCountSeqRef.current) {
        await fetchTables();
        await fetchRoleLogs();
      }
    } catch (err) {
      roleLog(activeStaffRole, 'warn', `No se pudo sincronizar cantidad de mesas: ${err.message}`);
    }
  };

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        tableCount,
        setTableCount,
        products,
        catalogFilters,
        employees,
        roleLogs,
        fetchRoleLogs,
        loadingEmployees,
        fetchEmployees,
        addEmployee,
        resetEmployeePassword,
        updateEmployeeRole,
        deleteEmployee,
        adminPedidosData,
        adminPedidosError,
        loadingAdminPedidos,
        fetchAdminOrdersAndTransactions,
        resendTransactionReceipt,
        pagarMesa,
        submitOrderForTable,
        updateTableStatus,
        toggleProductAvailability,
        uploadProductImage,
        createProduct,
        updateProduct,
        deleteProduct,
        createCategory,
        renameCategory,
        deleteCategory,
        createTag,
        renameTag,
        deleteTag,
        validarQrMesa,
        llamarGarzon,
        atenderLlamada,
        llamadasGarzon,
        loadingTables,
        loadingProducts,
        resetTable,
        refreshTables: fetchTables,
        refreshProducts: fetchProducts,
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
