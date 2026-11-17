import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Utensils } from 'lucide-react';
import UserProfileMenu from './UserProfileMenu';

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
      </nav>

      <UserProfileMenu
        displayName={user?.displayName || 'Garzón'}
        roleLabel="Garzón"
        roleStyle={{ backgroundColor: '#F1F5F9', color: '#475569' }}
        onLogout={logout}
      />
    </header>
  );
}
