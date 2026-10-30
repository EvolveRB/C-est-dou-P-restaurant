import { useState } from 'react';
import { X, Clock, Plus, Minus, ChefHat, Ban } from 'lucide-react';
import PlaceholderIcon from './PlaceholderIcon';
import { formatPrice } from '../../data/initialProducts';
import { useCart } from '../../context/CartContext';

export default function ProductDetailModal({ product, onClose }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const { addToCart } = useCart();

  if (!product) return null;

  const isAvailable = product.disponible !== false;

  const handleAdd = () => {
    if (!isAvailable) return;
    addToCart(product, qty, notes);
    onClose();
  };

  const itemSubtotal = product.precio * qty;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-terracotta)', textTransform: 'uppercase' }}>
              {product.categoria}
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginTop: '2px' }}>
              {product.nombre}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div style={{
          width: '100%',
          height: '140px',
          backgroundColor: 'var(--c-cream-placeholder)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          position: 'relative'
        }}>
          {!isAvailable && (
            <div style={{
              position: 'absolute',
              backgroundColor: '#DC2626',
              color: 'white',
              fontSize: '12px',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <Ban size={15} />
              <span>Plato no disponible / Agotado</span>
            </div>
          )}
          <PlaceholderIcon className="placeholder-icon" style={{ width: '56px', height: '56px' }} />
        </div>

        <p style={{ fontSize: '13.5px', color: 'var(--c-text-muted)', lineHeight: '1.45', marginBottom: '16px' }}>
          {product.descripcion}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', color: 'var(--c-burgundy-800)', fontSize: '12.5px', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={16} color="var(--c-terracotta)" />
            <span>~{product.tiempo} min de preparación</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ChefHat size={16} color="var(--c-terracotta)" />
            <span>Elaborado al momento</span>
          </div>
        </div>

        {/* Customization notes */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--c-text-main)', marginBottom: '6px' }}>
            Indicaciones especiales para la cocina (opcional):
          </label>
          <input
            type="text"
            placeholder="Ej: sin sal, término medio, salsa aparte..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isAvailable}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--c-cream-border)',
              backgroundColor: isAvailable ? 'var(--c-cream-bg)' : '#F3F4F6',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Quantity selector & total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--c-cream-bg)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--c-cream-border)',
            opacity: isAvailable ? 1 : 0.5
          }}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1 || !isAvailable}
              style={{ color: qty <= 1 || !isAvailable ? '#CCC' : 'var(--c-burgundy-800)', display: 'flex', alignItems: 'center' }}
            >
              <Minus size={16} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '15px', minWidth: '18px', textAlign: 'center' }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              disabled={!isAvailable}
              style={{ color: !isAvailable ? '#CCC' : 'var(--c-burgundy-800)', display: 'flex', alignItems: 'center' }}
            >
              <Plus size={16} />
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>Subtotal</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
              {formatPrice(itemSubtotal)}
            </div>
          </div>
        </div>

        <button
          className="modal-action-btn"
          onClick={handleAdd}
          disabled={!isAvailable}
          style={{
            backgroundColor: isAvailable ? 'var(--c-burgundy-800)' : '#9CA3AF',
            cursor: isAvailable ? 'pointer' : 'not-allowed'
          }}
        >
          {isAvailable ? (
            <>
              <Plus size={18} />
              <span>Agregar al Pedido • {formatPrice(itemSubtotal)}</span>
            </>
          ) : (
            <span>Plato Agotado en Cocina</span>
          )}
        </button>
      </div>
    </div>
  );
}
