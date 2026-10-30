import { Home, Clock, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function BottomNav({ activeTab, onTabChange }) {
  const { totalItems } = useCart();

  return (
    <nav className="client-bottom-nav" aria-label="Navegación inferior">
      <button
        className={`bottom-nav-item ${activeTab === 'inicio' ? 'active' : ''}`}
        onClick={() => onTabChange('inicio')}
      >
        <Home size={22} strokeWidth={activeTab === 'inicio' ? 2.5 : 2} />
        <span>Inicio</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === 'estado' ? 'active' : ''}`}
        onClick={() => onTabChange('estado')}
      >
        <Clock size={22} strokeWidth={activeTab === 'estado' ? 2.5 : 2} />
        <span>Estado</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === 'carrito' ? 'active' : ''}`}
        onClick={() => onTabChange('carrito')}
      >
        <div style={{ position: 'relative', display: 'flex' }}>
          <ShoppingCart size={22} strokeWidth={activeTab === 'carrito' ? 2.5 : 2} />
          {totalItems > 0 && (
            <span className="bottom-nav-badge">{totalItems}</span>
          )}
        </div>
        <span>Carrito</span>
      </button>
    </nav>
  );
}
