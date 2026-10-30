import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmployeeLoginPage from '../pages/employee/EmployeeLoginPage';
import StaffNavbar from '../components/employee/StaffNavbar';
import '../styles/employee.css';

export default function EmployeeLayout() {
  const { isAuthenticated } = useAuth();

  // Si no ha iniciado sesión, la vista principal siempre muestra el inicio de sesión centrado
  if (!isAuthenticated) {
    return <EmployeeLoginPage />;
  }

  // Si ya inició sesión, muestra el panel de trabajo del personal (ajustado a PC/Tablet)
  return (
    <div className="staff-layout-container">
      <StaffNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
