import { useAuth } from '../../context/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';
import GarzonTablesPage from './GarzonTablesPage';
import EmployeeDashboardPage from './EmployeeDashboardPage';

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  if (user?.role === 'Administrador') {
    return <AdminDashboardPage />;
  }

  if (user?.role === 'Garzón' || user?.role === 'Mesero') {
    return <GarzonTablesPage />;
  }

  return <EmployeeDashboardPage />;
}

