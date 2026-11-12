import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ClientHeader from '../components/client/ClientHeader';
import BottomNav from '../components/client/BottomNav';
import ClientCatalogPage from '../pages/client/ClientCatalogPage';
import ClientOrderStatusPage from '../pages/client/ClientOrderStatusPage';
import ClientCartPage from '../pages/client/ClientCartPage';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { Check, AlertTriangle } from 'lucide-react';
import '../styles/client.css';

export default function ClientLayout() {
  const { numeroMesa } = useParams();
  const [searchParams] = useSearchParams();
  const { updateTable, toastMessage, showToast } = useCart();
  const { validarQrMesa } = useRestaurant();
  const [activeTab, setActiveTab] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrValid, setQrValid] = useState(true);

  // Validación de Token QR al montar la vista de mesa
  useEffect(() => {
    if (numeroMesa) {
      updateTable(numeroMesa);

      const token = searchParams.get('token');
      if (token && validarQrMesa) {
        validarQrMesa(parseInt(numeroMesa, 10), token).then((res) => {
          if (!res.valid) {
            setQrValid(false);
            showToast('⚠️ QR Inválido: El código QR escaneado no coincide con esta mesa.');
          } else {
            setQrValid(true);
          }
        });
      }
    }
  }, [numeroMesa, searchParams, updateTable, validarQrMesa, showToast]);

  return (
    <div className="client-app-wrapper">
      {/* Contenedor EXCLUSIVO de teléfono celular */}
      <div className="mobile-device-shell">
        {/* Banner si el QR no es válido */}
        {!qrValid && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 40
          }}>
            <AlertTriangle size={16} />
            <span>Atención: Código QR de mesa no validado (403).</span>
          </div>
        )}

        {/* Cabecera del teléfono con barra de estado y búsqueda */}
        <ClientHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Vistas según pestaña inferior */}
        {activeTab === 'inicio' && (
          <ClientCatalogPage searchQuery={searchQuery} />
        )}

        {activeTab === 'estado' && (
          <ClientOrderStatusPage onGoToMenu={() => setActiveTab('inicio')} />
        )}

        {activeTab === 'carrito' && (
          <ClientCartPage
            onGoToMenu={() => setActiveTab('inicio')}
            onOrderSuccess={() => setActiveTab('estado')}
          />
        )}

        {/* Barra de navegación inferior móvil: Inicio, Estado, Carrito */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Feedback flotante tipo Toast en el móvil */}
        {toastMessage && (
          <div className="client-toast">
            {toastMessage.includes('⚠️') ? (
              <AlertTriangle size={16} strokeWidth={2.5} color="#FBBF24" />
            ) : (
              <Check size={16} strokeWidth={3} />
            )}
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
