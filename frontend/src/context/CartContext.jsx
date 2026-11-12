import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useRestaurant } from './RestaurantContext';
import { roleLog } from '../utils/roleLogger';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const location = useLocation();
  const isClientRoute = /^\/(mesa|menu|cliente)(\/|$)/.test(location.pathname);

  const { tables, submitOrderForTable, resetTable, llamarGarzon } = useRestaurant();

  // Solo el navegador del comensal (cliente) usa localStorage para conservar su pedido
  const [tableNumber, setTableNumber] = useState(() => {
    if (!isClientRoute) return '1';
    try {
      return localStorage.getItem('cest_doux_mesa_activa') || '1';
    } catch {
      return '1';
    }
  });

  const [cart, setCart] = useState(() => {
    if (!isClientRoute) return [];
    try {
      const saved = localStorage.getItem('carrito_cest_dou_p');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState(null);
  const [callingWaiter, setCallingWaiter] = useState(false);

  // Persistir carrito SOLO en rutas de cliente para no perder su progreso si recarga o sale
  useEffect(() => {
    if (!isClientRoute) return;
    try {
      localStorage.setItem('carrito_cest_dou_p', JSON.stringify(cart));
      if (tableNumber) {
        localStorage.setItem(`carrito_cest_dou_p_mesa_${tableNumber}`, JSON.stringify(cart));
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [cart, tableNumber, isClientRoute]);

  useEffect(() => {
    if (!isClientRoute) return;

    const syncFromStorage = () => {
      try {
        const saved = localStorage.getItem('carrito_cest_dou_p');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch {
        // Ignorar errores de parseo en localStorage
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'carrito_cest_dou_p' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCart(parsed);
        } catch {
          // Ignorar errores de parseo en evento storage
        }
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
  }, [isClientRoute]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const updateTable = useCallback((num) => {
    if (!num) return;
    const strNum = String(num);
    setTableNumber(strNum);
    try {
      localStorage.setItem('cest_doux_mesa_activa', strNum);
      const tableCart = localStorage.getItem(`carrito_cest_dou_p_mesa_${strNum}`);
      const generalCart = localStorage.getItem('carrito_cest_dou_p');
      const cartToRestore = tableCart || generalCart;
      if (cartToRestore) {
        const parsed = JSON.parse(cartToRestore);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {
      // Ignorar errores de lectura en localStorage
    }
  }, []);

  const addToCart = (product, qty = 1, note = '') => {
    if (!product) return false;

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
          note: note || next[index].note,
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
      } catch {
        // Ignorar errores de almacenamiento
      }
      if (resetTable) {
        await resetTable(tableNumber);
      }
    }
    showToast(`Mesa ${tableNumber} liberada y limpia`);
  };

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
      clearCart();
      try {
        localStorage.removeItem('carrito_cest_dou_p');
        if (tableNumber) {
          localStorage.removeItem(`carrito_cest_dou_p_mesa_${tableNumber}`);
        }
      } catch {
        // Ignorar errores de almacenamiento
      }
      showToast('✅ Pedido enviado a cocina con éxito');
      return newOrder;
    } catch (err) {
      roleLog('Cliente', 'error', `Error enviando pedido: ${err.message}`);
      showToast('❌ Error al enviar el pedido. Intenta de nuevo.');
      return null;
    } finally {
      setSendingOrder(false);
    }
  };

  const solicitarGarzon = async (motivo = 'Atención solicitada en mesa') => {
    if (callingWaiter) return;
    setCallingWaiter(true);
    try {
      if (llamarGarzon) {
        await llamarGarzon(tableNumber, motivo);
      }
      showToast(`🔔 Garzón llamado: Un mesero se acerca a la Mesa ${tableNumber}.`);
    } catch (err) {
      roleLog('Cliente', 'warn', `Error llamando garzón: ${err.message}`);
      showToast(`🔔 Solicitud enviada al personal de sala (Mesa ${tableNumber}).`);
    } finally {
      setCallingWaiter(false);
    }
  };

  const currentTableState = tables.find((t) => String(t.id) === String(tableNumber));
  const activeOrder =
    currentTableState && currentTableState.pedido && currentTableState.estado !== 'Libre'
      ? {
          ...currentTableState.pedido,
          mesa: tableNumber,
          estado: currentTableState.estado,
        }
      : !currentTableState && lastSubmittedOrder && String(lastSubmittedOrder.num_mesa) === String(tableNumber)
        ? {
            ...lastSubmittedOrder,
            mesa: tableNumber,
            estado: 'Esperando',
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
        sendOrder,
        solicitarGarzon,
        callingWaiter,
        activeOrder,
        totalItems,
        totalPrice,
        toastMessage,
        showToast,
        sendingOrder,
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
