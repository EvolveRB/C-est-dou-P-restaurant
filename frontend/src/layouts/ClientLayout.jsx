import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ClientHeader from '../components/client/ClientHeader';
import BottomNav from '../components/client/BottomNav';
import ClientCatalogPage from '../pages/client/ClientCatalogPage';
import ClientOrderStatusPage from '../pages/client/ClientOrderStatusPage';
import ClientCartPage from '../pages/client/ClientCartPage';
import { useCart } from '../context/CartContext';
import { Check } from 'lucide-react';
import '../styles/client.css';

export default function ClientLayout() {
  const { numeroMesa } = useParams();
  const { updateTable, toastMessage } = useCart();
  const [activeTab, setActiveTab] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (numeroMesa) {
      updateTable(numeroMesa);
    }
  }, [numeroMesa, updateTable]);

  return (
    <div className="client-app-wrapper">
      {/* Contenedor EXCLUSIVO de teléfono celular */}
      <div className="mobile-device-shell">
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
            <Check size={16} strokeWidth={3} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
