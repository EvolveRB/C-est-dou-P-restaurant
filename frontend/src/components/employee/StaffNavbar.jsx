import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChefHat } from 'lucide-react';
import UserProfileMenu from './UserProfileMenu';

export default function StaffNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="staff-navbar">
      <div className="staff-brand-section">
        <div className="staff-logo-badge">
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
          <ChefHat size={16} />
          <span>Cocina & Pedidos</span>
        </NavLink>
      </nav>

      <UserProfileMenu
        displayName={user?.displayName || 'Personal'}
        roleLabel={user?.role || 'Cocina'}
        onLogout={logout}
      />
    </header>
  );
}
