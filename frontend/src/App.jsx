import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { CartProvider } from './context/CartContext';
import EmployeeLayout from './layouts/EmployeeLayout';
import ClientLayout from './layouts/ClientLayout';
import EmployeeDashboardPage from './pages/employee/EmployeeDashboardPage';
import EmployeeQRPage from './pages/employee/EmployeeQRPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <Routes>
              {/* ========================================================
                  1. VISTA DE LOS CLIENTES (Exclusiva por Código QR)
                  Diseñada especialmente para teléfonos móviles.
                  Llega directamente al catálogo de la mesa correspondiente.
                 ======================================================== */}
              <Route path="/mesa/:numeroMesa" element={<ClientLayout />} />
              <Route path="/menu" element={<Navigate to="/mesa/1" replace />} />
              <Route path="/cliente" element={<Navigate to="/mesa/1" replace />} />

              {/* ========================================================
                  2. VISTA PRINCIPAL: EMPLEADOS Y COCINA
                  Ajustada para PC, Tablet y móvil. Siempre inicia solicitando
                  el inicio de sesión centrado al medio si no está autenticado.
                 ======================================================== */}
              <Route path="/" element={<EmployeeLayout />}>
                <Route index element={<EmployeeDashboardPage />} />
                <Route path="staff/qrs" element={<EmployeeQRPage />} />
                <Route path="admin/qrs" element={<EmployeeQRPage />} />
              </Route>

              {/* Redirección por defecto al portal de empleados */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}