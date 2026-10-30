import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const RestaurantContext = createContext(null);

const DEFAULT_TABLES = [
  {
    id: 1,
    estado: 'Esperando', // Pedido realizado por cliente
    pedido: {
      id: 'PED-1021',
      hora: '12:32',
      items: [
        { product: INITIAL_PRODUCTS[0], quantity: 2, note: 'Término 3/4' },
        { product: INITIAL_PRODUCTS[1], quantity: 1, note: '' }
      ],
      total: 33000,
      notas: 'Servir entrada primero'
    }
  },
  { id: 2, estado: 'Libre', pedido: null },
  {
    id: 3,
    estado: 'En preparación',
    pedido: {
      id: 'PED-1018',
      hora: '12:25',
      items: [
        { product: INITIAL_PRODUCTS[4], quantity: 2, note: 'Extra queso' },
        { product: INITIAL_PRODUCTS[2], quantity: 1, note: '' }
      ],
      total: 37500,
      notas: ''
    }
  },
  { id: 4, estado: 'Libre', pedido: null },
  { id: 5, estado: 'Libre', pedido: null },
  { id: 6, estado: 'Libre', pedido: null },
  { id: 7, estado: 'Libre', pedido: null },
  { id: 8, estado: 'Libre', pedido: null },
];

export function RestaurantProvider({ children }) {
  // 1. Estado de las 8 mesas y sus pedidos
  const [tables, setTables] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_tables_state');
      return saved ? JSON.parse(saved) : DEFAULT_TABLES;
    } catch {
      return DEFAULT_TABLES;
    }
  });

  // 2. Estado de disponibilidad de platillos (controlado exclusivamente por el cocinero)
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_products_catalog');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Persistir mesas y sincronizar en tiempo real entre pestañas
  useEffect(() => {
    localStorage.setItem('cest_doux_tables_state', JSON.stringify(tables));
  }, [tables]);

  // Persistir inventario de platillos
  useEffect(() => {
    localStorage.setItem('cest_doux_products_catalog', JSON.stringify(products));
  }, [products]);

  // Escuchar cambios de localStorage en otras ventanas/pestañas para sincronización en vivo
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cest_doux_tables_state' && e.newValue) {
        setTables(JSON.parse(e.newValue));
      }
      if (e.key === 'cest_doux_products_catalog' && e.newValue) {
        setProducts(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Función para que el cliente envíe un pedido a una mesa
  const submitOrderForTable = (tableNumber, cartItems, customerNotes = '') => {
    const tableId = parseInt(tableNumber, 10);
    const newOrder = {
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...cartItems],
      total: cartItems.reduce((acc, item) => acc + item.product.precio * item.quantity, 0),
      notas: customerNotes
    };

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          return {
            ...t,
            estado: 'Esperando', // Cambia a esperando para que el cocinero lo vea
            pedido: newOrder
          };
        }
        return t;
      })
    );

    return newOrder;
  };

  // Función para que el cocinero cambie el estado de la comanda
  const updateTableStatus = (tableId, newStatus) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          if (newStatus === 'Libre') {
            return { ...t, estado: 'Libre', pedido: null };
          }
          return { ...t, estado: newStatus };
        }
        return t;
      })
    );
  };

  // Función exclusiva del cocinero para activar/desactivar un plato del menú
  const toggleProductAvailability = (productId) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, disponible: !p.disponible };
        }
        return p;
      })
    );
  };

  // Modificar cantidad total de mesas (sincronizada en vivo desde el Generador de QRs)
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
      } else {
        return prev.slice(0, targetCount);
      }
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
        toggleProductAvailability
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
