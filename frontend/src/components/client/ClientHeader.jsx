import { useState } from 'react';
import { Search, X, Wifi, BatteryMedium, Signal } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ClientHeader({ searchQuery, setSearchQuery }) {
  const [showSearch, setShowSearch] = useState(false);
  const { tableNumber } = useCart();

  return (
    <header className="client-header">
      {/* Mobile simulated status bar (12:30, signal, wifi, battery) */}
      <div className="mobile-status-bar">
        <span>12:30</span>
        <div className="status-bar-icons">
          <Signal size={13} strokeWidth={2.5} />
          <Wifi size={13} strokeWidth={2.5} />
          <BatteryMedium size={16} strokeWidth={2.5} />
        </div>
      </div>

      {/* Main Bar: Restaurant Name + Search Icon */}
      <div className="client-header-top">
        <div>
          <h1 className="client-brand-title">C'est doux P</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span className="table-pill-indicator">
              Mesa {tableNumber}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>
              Menú Digital
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

      {/* Expandable search bar */}
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
              <X size={15} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
