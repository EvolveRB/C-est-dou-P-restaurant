import { useState, useMemo } from 'react';
import CategoryPills from '../../components/client/CategoryPills';
import ProductCard from '../../components/client/ProductCard';
import ProductDetailModal from '../../components/client/ProductDetailModal';
import { useRestaurant } from '../../context/RestaurantContext';
import { UtensilsCrossed, RotateCcw } from 'lucide-react';

export const isGlutenFreeTag = (tag) => {
  if (!tag || typeof tag !== 'string') return false;
  const lower = tag.toLowerCase().trim();
  return (
    lower.includes('gluten') ||
    lower.includes('tacc') ||
    lower.includes('celiac')
  );
};

export default function ClientCatalogPage({ searchQuery = '' }) {
  const { products } = useRestaurant();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeTag, setActiveTag] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Extracción dinámica de todas las etiquetas disponibles en los productos del catálogo (sin emojis)
  const availableTags = useMemo(() => {
    const tagMap = new Map();

    products.forEach((p) => {
      const tags = Array.isArray(p.etiquetas) ? p.etiquetas : [];
      tags.forEach((rawTag) => {
        if (!rawTag) return;
        const trimmed = rawTag.trim();

        // Agrupación inteligente de todas las variantes libres de gluten (Sin Gluten, Sin TACC, Libre de gluten)
        if (isGlutenFreeTag(trimmed)) {
          const current = tagMap.get('Libre de gluten') || {
            tag: 'Libre de gluten',
            label: 'Libre de gluten',
            count: 0
          };
          current.count += 1;
          tagMap.set('Libre de gluten', current);
        } else {
          const current = tagMap.get(trimmed) || {
            tag: trimmed,
            label: trimmed,
            count: 0
          };
          current.count += 1;
          tagMap.set(trimmed, current);
        }
      });
    });

    const priority = ['Libre de gluten', 'Vegetariano', 'Vegano', 'Chef Choice', 'Especialidad', 'Casero'];
    return Array.from(tagMap.values()).sort((a, b) => {
      const idxA = priority.indexOf(a.tag);
      const idxB = priority.indexOf(b.tag);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.count - a.count;
    });
  }, [products]);

  // Filtrado reactivo por Categoría, Búsqueda de texto y Etiquetas de producto
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'todos' || product.categoria === activeCategory;

      const matchesSearch =
        !searchQuery.trim() ||
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.descripcion.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesTag = true;
      if (activeTag) {
        const productTags = Array.isArray(product.etiquetas) ? product.etiquetas : [];
        if (activeTag === 'Libre de gluten') {
          matchesTag = productTags.some((t) => isGlutenFreeTag(t));
        } else {
          matchesTag = productTags.some(
            (t) => t.toLowerCase().trim() === activeTag.toLowerCase().trim()
          );
        }
      }

      return matchesCategory && matchesSearch && matchesTag;
    });
  }, [products, activeCategory, searchQuery, activeTag]);

  const handleResetFilters = () => {
    setActiveCategory('todos');
    setActiveTag(null);
  };

  return (
    <>
      {/* Selector de Categorías y Etiquetas táctiles y deslizables */}
      <CategoryPills
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        availableTags={availableTags}
      />

      {/* Grid de productos con scroll vertical */}
      <div className="client-scroll-area">
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--c-text-muted)' }}>
            <UtensilsCrossed size={36} color="var(--c-terracotta)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#1E242E' }}>
              No encontramos platos con estos filtros
            </p>
            <p style={{ fontSize: '12px', marginTop: '4px', color: '#6B7280' }}>
              {activeTag
                ? `No hay platos que coincidan con "${activeTag}" en esta sección.`
                : 'Intenta buscando otro término o categoría.'}
            </p>
            <button
              onClick={handleResetFilters}
              style={{
                marginTop: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--c-burgundy-800)',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(92, 29, 36, 0.2)'
              }}
            >
              <RotateCcw size={14} />
              <span>Restablecer filtros</span>
            </button>
          </div>
        ) : (
          <div className="client-products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetail={setSelectedProduct}
                onSelectTag={setActiveTag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle de producto */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
