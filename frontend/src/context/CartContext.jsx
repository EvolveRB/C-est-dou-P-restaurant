import { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext';

// ──────────────────────────────────────────────────────────────────────────────
// El carrito mantiene su persistencia temporal en localStorage mientras el
// cliente arma el pedido. La función sendOrder delega al backend a través de
// submitOrderForTable (RestaurantContext), que ahora es async.
// ──────────────────────────────────────────────────────────────────────────────

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { tables, submitOrderForTable } = useRestaurant();

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
  // ──────────────────────────────────────────────────────────────────────────
  const updateTable = (num) => {
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
        if (Array.isArray(parsed) && parsed.length > 0) setCart(parsed);
      }
    } catch {}
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones del carrito
  // ──────────────────────────────────────────────────────────────────────────
  const addToCart = (product, qty = 1, note = '') => {
    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id);
      if (index > -1) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          quantity: next[index].quantity + qty,
          note: note || next[index].note
        };
        return next;
      }
      return [...prev, { product, quantity: qty, note }];
    });
    showToast(`"${product.nombre}" agregado al pedido`);
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // ──────────────────────────────────────────────────────────────────────────
  // sendOrder — envía el pedido al backend a través de submitOrderForTable
  //
  // Cambios respecto a la versión anterior:
  //  • Es ahora async/await ya que submitOrderForTable hace un fetch real
  //  • El toast de éxito solo se muestra si el backend responde con 2xx
  //  • Los errores de red o 4xx/5xx muestran un toast de error y no borran el carrito
  //  • sendingOrder previene envíos duplicados
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Envía el carrito actual como pedido al backend.
   *
   * @param {string} customNotes - Notas adicionales del cliente
   * @returns {Promise<Object|null>} - El pedido creado, o null si el carrito está vacío o hay error
   */
  const sendOrder = async (customNotes = '') => {
    if (cart.length === 0) return null;
    if (sendingOrder) return null; // Evita doble-clic

    setSendingOrder(true);
    try {
      // submitOrderForTable es async y lanza un Error si el backend falla (4xx/5xx)
      const newOrder = await submitOrderForTable(tableNumber, cart, customNotes);

      // Solo llega aquí si el backend respondió con 2xx
      showToast('✅ Pedido enviado a cocina con éxito');
      console.info('[CartContext] Pedido confirmado por backend:', newOrder);

      // IMPORTANTE: No vaciamos el carrito en localStorage;
      // se preserva hasta que se finalice el pago
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
  const currentTableState = tables.find((t) => t.id === parseInt(tableNumber, 10));
  const activeOrder = currentTableState?.pedido
    ? {
        ...currentTableState.pedido,
        mesa: tableNumber,
        estado: currentTableState.estado
      }
    : null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.product.precio * item.quantity, 0);

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
