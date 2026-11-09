import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRestaurant } from './RestaurantContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { tables, submitOrderForTable, resetTable, llamarGarzon, reiniciarEstadoPruebas } = useRestaurant();

  // ──────────────────────────────────────────────────────────────────────────
  // Estado: número de mesa activa (leído del QR)
  // ──────────────────────────────────────────────────────────────────────────
  const [tableNumber, setTableNumber] = useState(() => {
    return localStorage.getItem('cest_doux_mesa_activa') || '1';
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Estado: items del carrito
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
  const [sendingOrder, setSendingOrder] = useState(false);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState(null);
  const [callingWaiter, setCallingWaiter] = useState(false);

  useEffect(() => {
    localStorage.setItem('carrito_cest_dou_p', JSON.stringify(cart));
    if (tableNumber) {
      localStorage.setItem(`carrito_cest_dou_p_mesa_${tableNumber}`, JSON.stringify(cart));
    }
  }, [cart, tableNumber]);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

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
  // Operaciones del carrito con validación de "Producto agotado"
  // ──────────────────────────────────────────────────────────────────────────
  const addToCart = (product, qty = 1, note = '') => {
    if (!product) return false;

    // Validación UX: Producto agotado
    if (product.disponible === false) {
      showToast('⚠️ Producto agotado: Este plato no se encuentra disponible.');
      return false;
    }

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
    return true;
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
    showToast(`Mesa ${tableNumber} liberada y limpia`);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // sendOrder con validación de "Carrito vacío"
  // ──────────────────────────────────────────────────────────────────────────
  const sendOrder = async (customNotes = '') => {
    if (cart.length === 0) {
      showToast('⚠️ Carrito vacío: Agrega platos antes de enviar el pedido.');
      return null;
    }
    if (sendingOrder) return null;

    setSendingOrder(true);
    try {
      const newOrder = await submitOrderForTable(tableNumber, cart, customNotes);
      setLastSubmittedOrder(newOrder);
      // Limpiar el carrito local para que los nuevos platos agregados
      // aparezcan en una nueva sección editable más abajo
      clearCart();
      try {
        localStorage.removeItem('carrito_cest_dou_p');
        if (tableNumber) {
          localStorage.removeItem(`carrito_cest_dou_p_mesa_${tableNumber}`);
        }
      } catch {}
      showToast('✅ Pedido enviado a cocina con éxito');
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
  // llamarGarzonCliente — RF-08: Llamar al Garzón desde la vista del cliente
  // ──────────────────────────────────────────────────────────────────────────
  const solicitarGarzon = async (motivo = 'Atención solicitada en mesa') => {
    if (callingWaiter) return;
    setCallingWaiter(true);
    try {
      // Buscar visita activa de la mesa actual si existe
      const currentTable = tables.find((t) => String(t.id) === String(tableNumber));
      const targetId = currentTable?.visita_activa_id || tableNumber;

      if (llamarGarzon) {
        await llamarGarzon(tableNumber, motivo);
      }
      showToast(`🔔 Garzón llamado: Un mesero se acerca a la Mesa ${tableNumber}.`);
    } catch (err) {
      console.warn('[CartContext] Error llamando garzón:', err);
      showToast(`🔔 Solicitud enviada al personal de sala (Mesa ${tableNumber}).`);
    } finally {
      setCallingWaiter(false);
    }
  };

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
        reiniciarEstadoPruebas,
        sendOrder,
        solicitarGarzon,
        callingWaiter,
        activeOrder,
        totalItems,
        totalPrice,
        toastMessage,
        showToast,
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
