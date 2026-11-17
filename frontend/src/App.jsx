import { Component, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { CartProvider } from './context/CartContext';
import AdminOrdersPage from './pages/employee/AdminOrdersPage';
import AdminProductsPage from './pages/employee/AdminProductsPage';
import EmployeeQRPage from './pages/employee/EmployeeQRPage';

const EmployeeLayout = lazy(() => import('./layouts/EmployeeLayout'));
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));
const RoleBasedDashboard = lazy(() => import('./pages/employee/RoleBasedDashboard'));

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error al cargar la vista.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '520px', margin: '40px auto' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4A151A', marginBottom: '10px' }}>
            No se pudo cargar esta sección
          </h2>
          <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '18px' }}>
            {this.state.message}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 700 }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
            <RouteErrorBoundary>
              <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Cargando...</div>}>
                <Routes>
                  <Route path="/mesa/:numeroMesa" element={<ClientLayout />} />
                  <Route path="/menu" element={<Navigate to="/mesa/1" replace />} />
                  <Route path="/cliente" element={<Navigate to="/mesa/1" replace />} />

                  <Route path="/" element={<EmployeeLayout />}>
                    <Route index element={<RoleBasedDashboard />} />
                    <Route
                      path="admin/pedidos"
                      element={
                        <AdminOnlyRoute>
                          <AdminOrdersPage />
                        </AdminOnlyRoute>
                      }
                    />
                    <Route
                      path="admin/productos"
                      element={
                        <AdminOnlyRoute>
                          <AdminProductsPage />
                        </AdminOnlyRoute>
                      }
                    />
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
            </RouteErrorBoundary>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
