import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, QrCode, LogOut, User, Utensils } from 'lucide-react';

export default function AdminNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="staff-navbar">
      <div className="staff-brand-section">
        <div className="staff-logo-badge" style={{ backgroundColor: '#4A151A' }}>
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
          <ShieldCheck size={16} />
          <span>Panel Admin</span>
        </NavLink>

        <NavLink
          to="/staff/qrs"
          className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
        >
          <QrCode size={16} />
          <span>Generador de QRs</span>
        </NavLink>

        <Link
          to="/mesa/1"
          target="_blank"
          rel="noopener noreferrer"
          className="staff-nav-item"
        >
          <Utensils size={16} color="var(--c-terracotta)" />
          <span>Ver Menú Cliente</span>
        </Link>
      </nav>

      <div className="staff-user-actions">
        <div className="staff-user-pill">
          <User size={15} color="#94A3B8" />
          <span style={{ fontWeight: 600 }}>{user?.displayName || 'Admin'}</span>
          <span className="staff-user-role" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            Administrador
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

