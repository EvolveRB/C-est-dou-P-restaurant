import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import CookOrderModal from '../../components/employee/CookOrderModal';
import { Utensils, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function GarzonTablesPage() {
  const { tables } = useRestaurant();
  const [selectedTable, setSelectedTable] = useState(null);
  const [filter, setFilter] = useState('todas'); // 'todas', 'ocupadas', 'libres'

  const handleTableClick = (mesa) => {
    // Si la mesa tiene un pedido activo o está ocupada, abre la comanda
    if (mesa.pedido && mesa.estado !== 'Libre') {
      setSelectedTable(mesa);
    }
  };

  const currentModalTable = selectedTable ? tables.find((t) => t.id === selectedTable.id) : null;

  const filteredTables = tables.filter((t) => {
    if (filter === 'ocupadas') return t.estado !== 'Libre';
    if (filter === 'libres') return t.estado === 'Libre';
    return true;
  });

  const totalOcupadas = tables.filter((t) => t.estado !== 'Libre').length;
  const totalLibres = tables.filter((t) => t.estado === 'Libre').length;

  return (
    <div style={{
      flex: 1,
      minHeight: 'calc(100vh - 67px)',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 28px',
      boxSizing: 'border-box'
    }}>
      {/* Contenedor Exclusivo de Mesas para el Garzón */}
      <div style={{
        width: '100%',
        flex: 1,
        backgroundColor: '#FFF9F5',
        borderRadius: '24px',
        border: '1px solid #EEDBCE',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Encabezado sin subtítulos grises */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #F2E3D8',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#14171F', margin: 0 }}>
              Mesas del Salón
            </h1>
            <span style={{
              backgroundColor: '#F3DBD2',
              color: '#6E262E',
              fontSize: '13px',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '9999px'
            }}>
              {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}
            </span>
          </div>

          {/* Filtros rápidos de estado de mesa */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilter('todas')}
              style={{
                backgroundColor: filter === 'todas' ? '#4A151A' : '#FFFFFF',
                color: filter === 'todas' ? '#FFFFFF' : '#4B5563',
                border: filter === 'todas' ? '1px solid #4A151A' : '1px solid #E5D8CC',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Todas ({tables.length})
            </button>
            <button
              onClick={() => setFilter('ocupadas')}
              style={{
                backgroundColor: filter === 'ocupadas' ? '#EBBFB3' : '#FFFFFF',
                color: filter === 'ocupadas' ? '#4A151A' : '#4B5563',
                border: filter === 'ocupadas' ? '1.5px solid #DCA99C' : '1px solid #E5D8CC',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Con pedido ({totalOcupadas})
            </button>
            <button
              onClick={() => setFilter('libres')}
              style={{
                backgroundColor: filter === 'libres' ? '#D1FAE5' : '#FFFFFF',
                color: filter === 'libres' ? '#065F46' : '#4B5563',
                border: filter === 'libres' ? '1.5px solid #10B981' : '1px solid #E5D8CC',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Libres ({totalLibres})
            </button>
          </div>
        </div>

        {/* Grilla exclusiva de mesas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px',
          flex: 1,
          alignContent: 'start'
        }}>
          {filteredTables.map((mesa) => {
            const hasOrder = mesa.pedido !== null && mesa.estado !== 'Libre';
            const isReady = mesa.estado === 'Listo para servir';
            const isWaiting = mesa.estado === 'Esperando';

            let cardBg = '#FAF5F0';
            let cardBorder = '1px solid #E8DDD2';
            let cardColor = '#736B63';

            if (isReady) {
              cardBg = '#ECFDF5';
              cardBorder = '1.5px solid #10B981';
              cardColor = '#065F46';
            } else if (hasOrder) {
              cardBg = '#EBBFB3';
              cardBorder = '1.5px solid #DCA99C';
              cardColor = '#4A151A';
            }

            return (
              <button
                key={mesa.id}
                onClick={() => handleTableClick(mesa)}
                style={{
                  minHeight: '130px',
                  borderRadius: '18px',
                  backgroundColor: cardBg,
                  color: cardColor,
                  border: cardBorder,
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: hasOrder ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  boxShadow: hasOrder ? '0 6px 16px rgba(216, 107, 82, 0.18)' : 'none'
                }}
                title={hasOrder ? `Ver comanda de Mesa ${mesa.id}` : `Mesa ${mesa.id} disponible`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils size={18} />
                  <span style={{ fontSize: '21px', fontWeight: 800 }}>Mesa {mesa.id}</span>
                </div>

                {hasOrder ? (
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: isReady ? '#D1FAE5' : isWaiting ? '#FEF3C7' : '#FEE2E2',
                    color: isReady ? '#065F46' : isWaiting ? '#B45309' : '#B91C1C'
                  }}>
                    {isReady ? '🍽️ Listo para servir' : isWaiting ? 'Esperando comanda' : 'En preparación'}
                  </span>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>
                    Libre
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Comanda al pulsar una mesa con pedido */}
      {currentModalTable && (
        <CookOrderModal
          table={currentModalTable}
          mesa={currentModalTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}

