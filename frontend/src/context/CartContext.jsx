import { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { tables, submitOrderForTable } = useRestaurant();

  const [tableNumber, setTableNumber] = useState(() => {
    return localStorage.getItem('cest_doux_mesa_activa') || '1';
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('carrito_cest_dou_p');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState(null);

  // Persistir en localStorage tanto a nivel general como por mesa
  useEffect(() => {
    localStorage.setItem('carrito_cest_dou_p', JSON.stringify(cart));
    if (tableNumber) {
      localStorage.setItem(`carrito_cest_dou_p_mesa_${tableNumber}`, JSON.stringify(cart));
    }
  }, [cart, tableNumber]);

  // Escuchar cuando el cliente vuelve a entrar al navegador o desbloquea el teléfono
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
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('pageshow', syncFromStorage);
    window.addEventListener('storage', handleStorageChange);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorage();
      }
    };
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
    }, 2400);
  };

  // Al escanear un QR (/mesa/:num), actualiza la mesa y toma el carrito de localStorage
  const updateTable = (num) => {
    if (num) {
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
    }
  };

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
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Enviar pedido que conecta directamente con la cocina
  // El progreso (carrito) se conserva en localStorage hasta el proceso de pago
  const sendOrder = (customNotes = '') => {
    if (cart.length === 0) return null;
    const newOrder = submitOrderForTable(tableNumber, cart, customNotes);
    // IMPORTANTE: No vaciar el carrito en localStorage, se preserva hasta finalizar el pago
    showToast('Pedido enviado a cocina con éxito');
    return newOrder;
  };

  // Obtener la comanda en vivo de la mesa actual para el cliente
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
        showToast
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
