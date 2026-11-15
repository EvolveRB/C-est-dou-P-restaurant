import { useState, useMemo } from 'react';
import CategoryPills from '../../components/client/CategoryPills';
import ProductCard from '../../components/client/ProductCard';
import ProductDetailModal from '../../components/client/ProductDetailModal';
import { useRestaurant } from '../../context/RestaurantContext';
import { normalizeCategoryKey } from '../../data/initialProducts';
import { UtensilsCrossed, RotateCcw } from 'lucide-react';

const isGlutenFreeTag = (tag) => {
  if (!tag || typeof tag !== 'string') return false;
  const lower = tag.toLowerCase().trim();
  return (
    lower.includes('gluten') ||
    lower.includes('tacc') ||
    lower.includes('celiac')
  );
};

export default function ClientCatalogPage({ searchQuery = '' }) {
  const { products, catalogFilters, loadingProducts } = useRestaurant();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeTag, setActiveTag] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Categorías dinámicas sincronizadas con los platos reales en MongoDB y la configuración del Admin
  const availableCategories = useMemo(() => {
    const catMap = new Map();
    catMap.set('todos', { id: 'todos', name: 'Todos' });

    const configured = Array.isArray(catalogFilters?.categorias) ? catalogFilters.categorias : [];
    configured.forEach((c) => {
      if (!c?.nombre) return;
      const key = normalizeCategoryKey(c.nombre);
      if (c.count > 0 && !catMap.has(key)) {
        catMap.set(key, { id: key, name: c.nombre });
      }
    });

    products.forEach((p) => {
      const key = normalizeCategoryKey(p.categoriaNombre || p.categoria);
      if (!catMap.has(key)) {
        const displayName = p.categoriaNombre || p.categoria;
        catMap.set(key, {
          id: key,
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        });
      }
    });

    return Array.from(catMap.values());
  }, [products, catalogFilters]);

  // Extracción dinámica de todas las etiquetas disponibles en los productos del catálogo (sin emojis)
  const availableTags = useMemo(() => {
    const tagMap = new Map();

    products.forEach((p) => {
      const tags = Array.isArray(p.etiquetas) ? p.etiquetas : [];
      tags.forEach((rawTag) => {
        if (!rawTag) return;
        const trimmed = rawTag.trim();

        if (isGlutenFreeTag(trimmed)) {
          const current = tagMap.get('Libre de gluten') || {
            tag: 'Libre de gluten',
            label: 'Libre de gluten',
            count: 0,
          };
          current.count += 1;
          tagMap.set('Libre de gluten', current);
        } else {
          const current = tagMap.get(trimmed) || {
            tag: trimmed,
            label: trimmed,
            count: 0,
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
      const prodCatKey = normalizeCategoryKey(product.categoriaNombre || product.categoria);
      const matchesCategory =
        activeCategory === 'todos' || prodCatKey === activeCategory;

      const matchesSearch =
        !searchQuery.trim() ||
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase());

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
      <CategoryPills
        categories={availableCategories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        availableTags={availableTags}
      />

      <div className="client-scroll-area">
        {loadingProducts && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--c-text-muted)' }}>
            <UtensilsCrossed size={34} color="var(--c-terracotta)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#1E242E' }}>
              Cargando carta del restaurante...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
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
            {(activeCategory !== 'todos' || activeTag) && (
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
                  boxShadow: '0 2px 8px rgba(92, 29, 36, 0.2)',
                }}
              >
                <RotateCcw size={14} />
                <span>Restablecer filtros</span>
              </button>
            )}
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

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
