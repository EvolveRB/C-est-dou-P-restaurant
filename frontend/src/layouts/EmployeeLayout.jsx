import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmployeeLoginPage from '../pages/employee/EmployeeLoginPage';
import StaffNavbar from '../components/employee/StaffNavbar';
import '../styles/employee.css';

const AdminLayout = lazy(() => import('./AdminLayout'));
const GarzonLayout = lazy(() => import('./GarzonLayout'));

export default function EmployeeLayout() {
  const { isAuthenticated, mustChangePassword, user } = useAuth();

  // Si no ha iniciado sesión o debe cambiar su contraseña temporal en primer ingreso,
  // permanece en el mismo layout de login.
  if (!isAuthenticated || mustChangePassword) {
    return <EmployeeLoginPage />;
  }

  if (user?.role === 'Administrador') {
    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando panel...</div>}>
        <AdminLayout />
      </Suspense>
    );
  }

  if (user?.role === 'Garzón' || user?.role === 'Mesero') {
    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando salón...</div>}>
        <GarzonLayout />
      </Suspense>
    );
  }

  return (
    <div className="staff-layout-container">
      <StaffNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
