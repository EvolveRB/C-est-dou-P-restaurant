import PlaceholderIcon from './PlaceholderIcon';
import { formatPrice } from '../../data/initialProducts';
import { Plus, Ban } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product, onOpenDetail }) {
  const { addToCart } = useCart();
  const isAvailable = product.disponible !== false;

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    addToCart(product, 1);
  };

  return (
    <div
      className="product-card"
      onClick={() => onOpenDetail(product)}
      style={{
        opacity: isAvailable ? 1 : 0.65,
        cursor: isAvailable ? 'pointer' : 'not-allowed'
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
        <PlaceholderIcon />
      </div>

      <div className="product-details">
        <h2 className="product-title" style={{ textDecoration: isAvailable ? 'none' : 'line-through' }}>
          {product.nombre}
        </h2>
        <p className="product-description">{product.descripcion}</p>

        <div className="product-price-row">
          <span className="product-price">{formatPrice(product.precio)}</span>
          <button
            className="product-add-mini-btn"
            onClick={handleQuickAdd}
            disabled={!isAvailable}
            style={{
              backgroundColor: isAvailable ? 'var(--c-terracotta-light)' : '#F3F4F6',
              color: isAvailable ? 'var(--c-terracotta)' : '#9CA3AF',
              cursor: isAvailable ? 'pointer' : 'not-allowed'
            }}
            title={isAvailable ? 'Agregar al pedido' : 'Plato no disponible'}
            aria-label={`Agregar ${product.nombre}`}
          >
            {isAvailable ? <Plus size={15} strokeWidth={3} /> : <Ban size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
