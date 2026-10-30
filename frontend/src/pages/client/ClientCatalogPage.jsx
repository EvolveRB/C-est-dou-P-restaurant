import { useState, useMemo } from 'react';
import CategoryPills from '../../components/client/CategoryPills';
import ProductCard from '../../components/client/ProductCard';
import ProductDetailModal from '../../components/client/ProductDetailModal';
import { useRestaurant } from '../../context/RestaurantContext';
import { UtensilsCrossed } from 'lucide-react';

export default function ClientCatalogPage({ searchQuery = '' }) {
  const { products } = useRestaurant();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'todos' || product.categoria === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.descripcion.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <>
      {/* Category Pills horizontal scroll */}
      <CategoryPills
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Product List Grid (2 columns matching Image 1) */}
      <div className="client-scroll-area">
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--c-text-muted)' }}>
            <UtensilsCrossed size={36} color="var(--c-terracotta)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, fontSize: '15px' }}>No encontramos platos con esa búsqueda</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Intenta buscando otro término o categoría</p>
          </div>
        ) : (
          <div className="client-products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetail={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal detail */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
