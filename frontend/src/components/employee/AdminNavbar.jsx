import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, QrCode, Receipt, BookOpen } from 'lucide-react';
import UserProfileMenu from './UserProfileMenu';

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
          <span>Personal</span>
        </NavLink>

        <NavLink
          to="/admin/pedidos"
          className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
        >
          <Receipt size={16} />
          <span>Pedidos y Transacciones</span>
        </NavLink>

        <NavLink
          to="/admin/productos"
          className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
        >
          <BookOpen size={16} />
          <span>Carta y Filtros</span>
        </NavLink>

        <NavLink
          to="/staff/qrs"
          className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
        >
          <QrCode size={16} />
          <span>Generador de QRs</span>
        </NavLink>
      </nav>

      <UserProfileMenu
        displayName={user?.displayName || 'Administrador'}
        roleLabel="Administrador"
        roleStyle={{ backgroundColor: '#F1F5F9', color: '#475569' }}
        onLogout={logout}
      />
    </header>
  );
}
