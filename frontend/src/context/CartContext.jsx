import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRestaurant } from './RestaurantContext';

// ──────────────────────────────────────────────────────────────────────────────
// El carrito mantiene su persistencia temporal en localStorage mientras el
// cliente arma el pedido. La función sendOrder delega al backend a través de
// submitOrderForTable (RestaurantContext), que ahora es async.
// ──────────────────────────────────────────────────────────────────────────────

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { tables, submitOrderForTable, resetTable } = useRestaurant();

  // ──────────────────────────────────────────────────────────────────────────
  // Estado: número de mesa activa (leído del QR)
  // ──────────────────────────────────────────────────────────────────────────
  const [tableNumber, setTableNumber] = useState(() => {
    return localStorage.getItem('cest_doux_mesa_activa') || '1';
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Estado: items del carrito (persistencia temporal en localStorage)
  // ──────────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('carrito_cest_dou_p');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Estado del toast de notificación
  const [toastMessage, setToastMessage] = useState(null);

  // Estado de carga del envío (evita doble-clic mientras el backend responde)
  const [sendingOrder, setSendingOrder] = useState(false);

  // Pedido recién enviado (garantiza que activeOrder se refleje al instante)
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Persistencia temporal del carrito en localStorage (por mesa)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('carrito_cest_dou_p', JSON.stringify(cart));
    if (tableNumber) {
      localStorage.setItem(`carrito_cest_dou_p_mesa_${tableNumber}`, JSON.stringify(cart));
    }
  }, [cart, tableNumber]);

  // ──────────────────────────────────────────────────────────────────────────
  // Sincronización del carrito cuando el usuario vuelve a la pestaña /
  // desbloquea el teléfono
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const saved = localStorage.getItem('carrito_cest_dou_p');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch {}
    };

    const handleStorageChange = (e) => {
      if (e.key === 'carrito_cest_dou_p' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCart(parsed);
        } catch {}
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromStorage();
    };

    window.addEventListener('pageshow', syncFromStorage);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pageshow', syncFromStorage);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers UI
  // ──────────────────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // updateTable — se llama al escanear el QR (/mesa/:num)
  // Memoizada con useCallback para evitar re-renders y ciclos infinitos
  // ──────────────────────────────────────────────────────────────────────────
  const updateTable = useCallback((num) => {
    if (!num) return;
    const strNum = String(num);
    setTableNumber(strNum);
    localStorage.setItem('cest_doux_mesa_activa', strNum);

    try {
      const tableCart = localStorage.getItem(`carrito_cest_dou_p_mesa_${strNum}`);
      const generalCart = localStorage.getItem('carrito_cest_dou_p');
      const cartToRestore = tableCart || generalCart;
      if (cartToRestore) {
        const parsed = JSON.parse(cartToRestore);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {}
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones del carrito
  // ──────────────────────────────────────────────────────────────────────────
  const addToCart = (product, qty = 1, note = '') => {
    if (!product) return;
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const prodId = String(product.id ?? product._id ?? product.id_plato ?? '');

    setCart((prev) => {
      const index = prev.findIndex((item) => String(item.product?.id ?? item.id) === prodId);
      if (index > -1) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          quantity: next[index].quantity + parsedQty,
          note: note || next[index].note
        };
        return next;
      }
      return [...prev, { product, quantity: parsedQty, note }];
    });
    showToast(`"${product.nombre}" agregado al pedido`);
  };

  const updateQuantity = (productId, delta) => {
    const strId = String(productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (String(item.product?.id ?? item.id) === strId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    const strId = String(productId);
    setCart((prev) => prev.filter((item) => String(item.product?.id ?? item.id) !== strId));
  };

  const clearCart = () => setCart([]);

  const resetActiveTable = async () => {
    clearCart();
    setLastSubmittedOrder(null);
    if (tableNumber) {
      try {
        localStorage.removeItem(`carrito_cest_dou_p_mesa_${tableNumber}`);
        localStorage.removeItem('carrito_cest_dou_p');
      } catch {}
      if (resetTable) {
        await resetTable(tableNumber);
      }
    }
    showToast('Mesa lista para un nuevo pedido');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // sendOrder — envía el pedido al backend a través de submitOrderForTable
  // ──────────────────────────────────────────────────────────────────────────
  const sendOrder = async (customNotes = '') => {
    if (cart.length === 0) return null;
    if (sendingOrder) return null; // Evita doble-clic

    setSendingOrder(true);
    try {
      const newOrder = await submitOrderForTable(tableNumber, cart, customNotes);
      setLastSubmittedOrder(newOrder);
      showToast('✅ Pedido enviado a cocina con éxito');
      console.info('[CartContext] Pedido confirmado por backend:', newOrder);
      return newOrder;
    } catch (err) {
      console.error('[CartContext] sendOrder falló:', err);
      showToast('❌ Error al enviar el pedido. Intenta de nuevo.');
      return null;
    } finally {
      setSendingOrder(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Datos derivados
  // ──────────────────────────────────────────────────────────────────────────
  const currentTableState = tables.find((t) => String(t.id) === String(tableNumber));
  const activeOrder = (currentTableState && currentTableState.pedido && currentTableState.estado !== 'Libre')
    ? {
        ...currentTableState.pedido,
        mesa: tableNumber,
        estado: currentTableState.estado
      }
    : (lastSubmittedOrder && String(lastSubmittedOrder.num_mesa) === String(tableNumber))
      ? {
          ...lastSubmittedOrder,
          mesa: tableNumber,
          estado: 'Esperando'
        }
      : null;

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.product?.precio ?? item.precio ?? 0) * (item.quantity || 1),
    0
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Context value — misma firma que la versión anterior para no romper la UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <CartContext.Provider
      value={{
        tableNumber,
        updateTable,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        resetActiveTable,
        sendOrder,
        activeOrder,
        totalItems,
        totalPrice,
        toastMessage,
        showToast,
        // Extra: útil para deshabilitar el botón "Enviar pedido" mientras carga
        sendingOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
