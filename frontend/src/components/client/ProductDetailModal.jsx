import { useState, useEffect } from 'react';
import { X, Clock, Plus, Minus, ChefHat, Ban, Tag, UtensilsCrossed } from 'lucide-react';
import { formatPrice } from '../../data/initialProducts';
import { useCart } from '../../context/CartContext';

function formatDishUrl(src) {
  if (!src) return '/plato_alpha.jpg';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const clean = src.replace(/^\/+/, '');
  return `/${clean}`;
}

export default function ProductDetailModal({ product, onClose }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [imgError, setImgError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => formatDishUrl(product?.imagen));
  const { addToCart } = useCart();

  useEffect(() => {
    setCurrentSrc(formatDishUrl(product?.imagen));
    setImgError(false);
  }, [product?.imagen]);

  const handleImgError = () => {
    if (currentSrc && !currentSrc.startsWith('/Imagenes/')) {
      const clean = currentSrc.replace(/^\/+/, '');
      setCurrentSrc(`/Imagenes/${clean}`);
    } else if (currentSrc !== '/plato_alpha.jpg') {
      setCurrentSrc('/plato_alpha.jpg');
    } else {
      setImgError(true);
    }
  };

  if (!product) return null;

  const isAvailable = product.disponible !== false;
  const etiquetas = Array.isArray(product.etiquetas) ? product.etiquetas : [];

  const handleAdd = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const added = addToCart(product, qty, notes);
    if (added) {
      onClose();
    }
  };

  const itemSubtotal = Number(product.precio ?? 0) * (qty || 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-terracotta)', textTransform: 'uppercase' }}>
                {product.categoria}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginTop: '2px' }}>
              {product.nombre}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* RF-05: Badges visuales de etiquetas (sin emojis) */}
        {etiquetas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {etiquetas.map((tag, idx) => (
              <span key={idx} className="badge-tag" style={{ fontSize: '11px', padding: '3px 8px' }}>
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{
          width: '100%',
          height: '140px',
          backgroundColor: 'var(--c-terracotta-light)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          position: 'relative',
          overflow: 'hidden'
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 3
            }}>
              <Ban size={15} />
              <span>Plato no disponible / Agotado</span>
            </div>
          )}
          {currentSrc && !imgError ? (
            <img
              src={currentSrc}
              alt={product.nombre}
              onError={handleImgError}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--c-terracotta-light)'
            }}>
              <UtensilsCrossed size={42} color="var(--c-terracotta)" />
            </div>
          )}
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

        {/* Botón de acción unificado */}
        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={!isAvailable}
          style={{
            width: '100%',
            marginTop: '16px',
            borderRadius: '14px',
            padding: '13px',
            backgroundColor: isAvailable ? 'var(--c-burgundy-800)' : '#9CA3AF'
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
