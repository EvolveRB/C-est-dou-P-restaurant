import { useState, useEffect } from 'react';
import PlaceholderIcon from './PlaceholderIcon';
import { formatPrice } from '../../data/initialProducts';
import { Plus, Ban } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product, onOpenDetail }) {
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(product.imagen);

  useEffect(() => {
    setCurrentSrc(product.imagen);
    setImgError(false);
  }, [product.imagen]);

  const handleImgError = () => {
    if (currentSrc && currentSrc.startsWith('/Imagenes/')) {
      setCurrentSrc(currentSrc.replace('/Imagenes/', '/'));
    } else if (currentSrc && !currentSrc.startsWith('http') && !currentSrc.includes('localhost:8000')) {
      setCurrentSrc(`http://localhost:8000${currentSrc.startsWith('/') ? '' : '/'}${currentSrc}`);
    } else {
      setImgError(true);
    }
  };

  const isAvailable = product.disponible !== false;
  const etiquetas = Array.isArray(product.etiquetas) ? product.etiquetas : [];

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <div
      className="product-card"
      onClick={() => onOpenDetail(product)}
      style={{
        opacity: isAvailable ? 1 : 0.65,
        cursor: 'pointer'
      }}
    >
      <div className="product-image-container">
        {isAvailable && product.destacado && (
          <span className="product-badge-destacado">Recomendado</span>
        )}
        {!isAvailable && (
          <span style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            backgroundColor: '#DC2626',
            color: 'white',
            fontSize: '9px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            zIndex: 2
          }}>
            Agotado
          </span>
        )}
        {currentSrc && !imgError ? (
          <img
            src={currentSrc}
            alt={product.nombre}
            onError={handleImgError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PlaceholderIcon />
        )}
      </div>

      <div className="product-details">
        <h2 className="product-title" style={{ textDecoration: isAvailable ? 'none' : 'line-through' }}>
          {product.nombre}
        </h2>
        <p className="product-description">{product.descripcion}</p>

        {/* RF-05: Badges visuales de etiquetas (ej. 'Vegetariano', 'Sin Gluten') */}
        {etiquetas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0 2px' }}>
            {etiquetas.slice(0, 2).map((tag, idx) => (
              <span key={idx} className="badge-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="product-price-row">
          <span className="product-price">{formatPrice(product.precio)}</span>
          <button
            className="product-add-mini-btn"
            onClick={handleQuickAdd}
            style={{
              backgroundColor: isAvailable ? 'var(--c-terracotta-light)' : '#FEE2E2',
              color: isAvailable ? 'var(--c-terracotta)' : '#DC2626',
              cursor: 'pointer'
            }}
            title={isAvailable ? 'Agregar al pedido' : 'Plato agotado'}
            aria-label={`Agregar ${product.nombre}`}
          >
            {isAvailable ? <Plus size={15} strokeWidth={3} /> : <Ban size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
