import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/initialProducts';

export default function ClientCartPage({ onGoToMenu, onOrderSuccess }) {
  const { cart, updateQuantity, removeFromCart, totalPrice, totalItems, sendOrder, tableNumber } = useCart();

  const handleSend = () => {
    const order = sendOrder();
    if (order) {
      onOrderSuccess();
    }
  };

  if (cart.length === 0) {
    return (
      <div className="client-scroll-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          backgroundColor: 'var(--c-terracotta-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-terracotta)',
          marginBottom: '16px'
        }}>
          <ShoppingBag size={34} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '6px' }}>
          Tu carrito está vacío
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', maxWidth: '240px', marginBottom: '22px' }}>
          Selecciona deliciosos platos de la carta para tu Mesa {tableNumber}.
        </p>
        <button
          onClick={onGoToMenu}
          style={{
            background: 'var(--c-burgundy-800)',
            color: 'white',
            padding: '11px 22px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Explorar Catálogo</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="client-scroll-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
          Resumen del Pedido
        </h2>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-terracotta)' }}>
          {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
        </span>
      </div>

      {/* Cart item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cart.map((item) => (
          <div
            key={item.product.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1px solid var(--c-cream-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--c-burgundy-800)' }}>
                {item.product.nombre}
              </h3>
              {item.note && (
                <p style={{ fontSize: '11px', color: 'var(--c-terracotta)', fontStyle: 'italic', marginTop: '2px' }}>
                  "{item.note}"
                </p>
              )}
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--c-text-main)', marginTop: '4px' }}>
                {formatPrice(item.product.precio * item.quantity)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--c-cream-bg)', borderRadius: 'var(--radius-pill)', padding: '3px 8px', border: '1px solid var(--c-cream-border)', gap: '8px' }}>
                <button
                  onClick={() => updateQuantity(item.product.id, -1)}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--c-burgundy-800)' }}
                  aria-label="Restar 1"
                >
                  <Minus size={13} />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 800, minWidth: '14px', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product.id, 1)}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--c-burgundy-800)' }}
                  aria-label="Sumar 1"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.product.id)}
                style={{ color: '#E53E3E', padding: '4px', display: 'flex' }}
                aria-label="Eliminar producto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bill summary card */}
      <div style={{ marginTop: '20px', background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid var(--c-cream-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>
          <span>Subtotal</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '12px' }}>
          <span>Servicio & Mesa {tableNumber}</span>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>Incluido</span>
        </div>
        <div style={{ height: '1px', background: 'var(--c-cream-border)', marginBottom: '12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
          <span>Total a Pagar</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSend}
        style={{
          width: '100%',
          background: 'var(--c-burgundy-800)',
          color: 'white',
          padding: '14px',
          borderRadius: '16px',
          fontWeight: 800,
          fontSize: '15px',
          marginTop: '16px',
          boxShadow: '0 6px 16px rgba(92, 29, 36, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <span>Enviar Pedido a Cocina • Mesa {tableNumber}</span>
      </button>
    </div>
  );
}
