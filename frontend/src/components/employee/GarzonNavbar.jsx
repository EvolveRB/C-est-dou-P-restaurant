import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Utensils, LogOut, User } from 'lucide-react';

export default function GarzonNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="staff-navbar">
      <div className="staff-brand-section">
        <div className="staff-logo-badge" style={{ backgroundColor: '#B94A48' }}>
          CP
        </div>
        <div className="staff-brand-text">
          <span className="staff-brand-name">C'est doux P</span>
        </div>
      </div>

      <nav className="staff-nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
        >
          <Utensils size={16} />
          <span>Salón de Mesas</span>
        </NavLink>

        <Link
          to="/mesa/1"
          target="_blank"
          rel="noopener noreferrer"
          className="staff-nav-item"
        >
          <Utensils size={16} color="var(--c-terracotta)" />
          <span>Ver Menú Cliente (Mesa 1)</span>
        </Link>
      </nav>

      <div className="staff-user-actions">
        <div className="staff-user-pill">
          <User size={15} color="#94A3B8" />
          <span style={{ fontWeight: 600 }}>{user?.displayName || 'Garzón'}</span>
          <span className="staff-user-role" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            Garzón
          </span>
        </div>

        <button
          className="staff-logout-btn"
          onClick={logout}
          title="Cerrar sesión"
        >
          <LogOut size={15} />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}

