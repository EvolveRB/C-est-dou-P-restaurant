import { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboardPage = lazy(() => import('./AdminDashboardPage'));
const GarzonTablesPage = lazy(() => import('./GarzonTablesPage'));
const EmployeeDashboardPage = lazy(() => import('./EmployeeDashboardPage'));

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Cargando vista del perfil...</div>}>
      {user?.role === 'Administrador' ? (
        <AdminDashboardPage />
      ) : user?.role === 'Garzón' || user?.role === 'Mesero' ? (
        <GarzonTablesPage />
      ) : (
        <EmployeeDashboardPage />
      )}
    </Suspense>
  );
}
