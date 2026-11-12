import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { CartProvider } from './context/CartContext';

const EmployeeLayout = lazy(() => import('./layouts/EmployeeLayout'));
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));
const RoleBasedDashboard = lazy(() => import('./pages/employee/RoleBasedDashboard'));
const EmployeeQRPage = lazy(() => import('./pages/employee/EmployeeQRPage'));

function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'Administrador') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Cargando...</div>}>
              <Routes>
                <Route path="/mesa/:numeroMesa" element={<ClientLayout />} />
                <Route path="/menu" element={<Navigate to="/mesa/1" replace />} />
                <Route path="/cliente" element={<Navigate to="/mesa/1" replace />} />

                <Route path="/" element={<EmployeeLayout />}>
                  <Route index element={<RoleBasedDashboard />} />
                  <Route
                    path="staff/qrs"
                    element={
                      <AdminOnlyRoute>
                        <EmployeeQRPage />
                      </AdminOnlyRoute>
                    }
                  />
                  <Route
                    path="admin/qrs"
                    element={
                      <AdminOnlyRoute>
                        <EmployeeQRPage />
                      </AdminOnlyRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
