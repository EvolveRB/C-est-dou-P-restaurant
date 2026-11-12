import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { useAuth } from './AuthContext';
import { roleLog } from '../utils/roleLogger';
import { normalizeRut } from '../utils/rut';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const RestaurantContext = createContext(null);

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
  'copa de vino reserva syrah': 'vino_reserva.jpg',
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
  11: 'vino_reserva.jpg',
};

function formatImageUrl(img) {
  if (!img) return '/Imagenes/plato_alpha.jpg';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = String(img).replace(/^[/\\]+/, '').replace(/^Imagenes[/\\]+/i, '');
  return `/Imagenes/${cleanPath}`;
}

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
    const imgResolved = resolveProductImage({
      nombre: prodName,
      id_plato: prodId,
      imagen: rawImg,
    });
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
  const [products, setProducts] = useState(() => INITIAL_PRODUCTS.map(normalizeProducto));
  const [employees, setEmployees] = useState([]);
  const [llamadasGarzon, setLlamadasGarzon] = useState({});
  const [roleLogs, setRoleLogs] = useState([]);

  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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

      // Ignorar respuestas obsoletas que llegaron fuera de orden
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
      setTables((prev) => {
        const nextList = normalizeMesas(pedido ? [pedido] : [], Math.max(numMesa, prev.length || 8));
        return nextList;
      });
    } catch (err) {
      roleLog('Cliente', 'warn', `Error consultando estado de mesa ${numMesa}: ${err.message}`);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!isClientRoute && activeStaffRole !== 'Cocina' && activeStaffRole !== 'Administrador') {
      return;
    }
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_URL}/productos/filtrados?precio_maximo=9999999`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(normalizeProducto));
      }
    } catch (err) {
      roleLog(isClientRoute ? 'Cliente' : activeStaffRole, 'warn', `Error obteniendo productos: ${err.message}`);
    } finally {
      setLoadingProducts(false);
    }
  }, [isClientRoute, activeStaffRole]);

  // Carga estrictamente separada por perfil y ruta:
  // En login / setup / cambio obligatorio de contraseña NO ejecuta ninguna petición.
  useEffect(() => {
    if (isClientRoute) {
      const initTimer = setTimeout(() => {
        fetchProducts();
        fetchClientTableOrder(clientMesaNum);
      }, 0);
      const clientInterval = setInterval(() => {
        fetchClientTableOrder(clientMesaNum);
      }, 3000);
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
      } else {
        setEmployees([]);
      }

      if (activeStaffRole === 'Cocina') {
        fetchProducts();
      }
    }, 0);

    const staffInterval = setInterval(() => {
      fetchTables();
    }, 2500);

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
  ]);

  const addEmployee = async (newEmp) => {
    try {
      const res = await fetch(`${API_URL}/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rut: normalizeRut(newEmp.rut),
          nombre: newEmp.nombre?.trim(),
          apellido: newEmp.apellido?.trim() || '',
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

  const reiniciarEstadoPruebas = async () => {
    try {
      const res = await fetch(`${API_URL}/sistema/reiniciar-pruebas`, {
        method: 'POST',
        credentials: 'include',
      });
      await fetchTables();
      await fetchProducts();
      await fetchRoleLogs();
      return res.ok;
    } catch {
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
        roleLog(activeStaffRole, 'info', `Disponibilidad plato actualizada`);
      }
    } catch {
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
        employees,
        roleLogs,
        fetchRoleLogs,
        loadingEmployees,
        fetchEmployees,
        addEmployee,
        resetEmployeePassword,
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
