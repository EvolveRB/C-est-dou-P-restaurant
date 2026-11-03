import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmployeeLoginPage from '../pages/employee/EmployeeLoginPage';
import StaffNavbar from '../components/employee/StaffNavbar';
import AdminLayout from './AdminLayout';
import GarzonLayout from './GarzonLayout';
import '../styles/employee.css';

export default function EmployeeLayout() {
  const { isAuthenticated, user } = useAuth();

  // Si no ha iniciado sesión, la vista principal siempre muestra el inicio de sesión centrado
  if (!isAuthenticated) {
    return <EmployeeLoginPage />;
  }

  // Layout especializado para el Administrador
  if (user?.role === 'Administrador') {
    return <AdminLayout />;
  }

  // Layout especializado para el Garzón (solo mesas)
  if (user?.role === 'Garzón' || user?.role === 'Mesero') {
    return <GarzonLayout />;
  }

  // Layout para Cocina / Personal general
  return (
    <div className="staff-layout-container">
      <StaffNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
