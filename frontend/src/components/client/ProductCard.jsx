import { useState } from 'react';
import { formatPrice } from '../../data/initialProducts';
import { Plus, Ban, UtensilsCrossed } from 'lucide-react';
import { useCart } from '../../context/CartContext';

function formatDishUrl(src) {
  if (!src) return '/plato_alpha.jpg';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const clean = src.replace(/^\/+/, '');
  return `/${clean}`;
}

export default function ProductCard({ product, onOpenDetail, onSelectTag }) {
  const { addToCart } = useCart();
  const [prevImagen, setPrevImagen] = useState(product.imagen);
  const [imgError, setImgError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => formatDishUrl(product.imagen));

  if (prevImagen !== product.imagen) {
    setPrevImagen(product.imagen);
    setCurrentSrc(formatDishUrl(product.imagen));
    setImgError(false);
  }

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
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--c-terracotta-light)'
          }}>
            <UtensilsCrossed size={28} color="var(--c-terracotta)" />
          </div>
        )}
      </div>

      <div className="product-details">
        <h2 className="product-title" style={{ textDecoration: isAvailable ? 'none' : 'line-through' }}>
          {product.nombre}
        </h2>
        <p className="product-description">{product.descripcion}</p>

        {/* RF-05: Badges visuales de etiquetas (sin emojis) */}
        {etiquetas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0 2px' }}>
            {etiquetas.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="badge-tag"
                onClick={(e) => {
                  if (onSelectTag) {
                    e.stopPropagation();
                    const isGluten = tag.toLowerCase().includes('gluten') || tag.toLowerCase().includes('tacc');
                    onSelectTag(isGluten ? 'Libre de gluten' : tag);
                  }
                }}
                title={`Filtrar por ${tag}`}
              >
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
