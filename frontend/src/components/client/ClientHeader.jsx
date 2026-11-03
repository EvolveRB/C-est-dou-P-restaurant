import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ClientHeader({ searchQuery, setSearchQuery }) {
  const [showSearch, setShowSearch] = useState(false);
  const { tableNumber } = useCart();

  return (
    <header className="client-header">
      {/* Barra Principal: Nombre del Restaurante + Indicador de Mesa + Buscador */}
      <div className="client-header-top">
        <div>
          <h1 className="client-brand-title">C'est doux P</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span className="table-pill-indicator">
              Mesa {tableNumber}
            </span>
          </div>
        </div>

        <button
          className="client-icon-btn"
          onClick={() => setShowSearch(!showSearch)}
          title="Buscar platos"
          aria-label="Buscar platos"
        >
          {showSearch ? <X size={18} /> : <Search size={19} />}
        </button>
      </div>

      {/* Barra de búsqueda expandible */}
      {showSearch && (
        <div className="client-search-bar">
          <Search size={16} color="var(--c-terracotta)" />
          <input
            type="text"
            placeholder="Buscar por nombre o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--c-text-muted)', display: 'flex' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
