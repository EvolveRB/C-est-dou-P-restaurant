import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import CookOrderModal from '../../components/employee/CookOrderModal';
import RoleLogsPanel from '../../components/employee/RoleLogsPanel';
import { Utensils, BellRing } from 'lucide-react';

export default function GarzonTablesPage() {
  const { tables, llamadasGarzon, atenderLlamada, updateTableStatus } = useRestaurant();
  const [selectedTable, setSelectedTable] = useState(null);
  const [filter, setFilter] = useState('todas'); // 'todas', 'ocupadas', 'libres'

  const handleTableClick = (mesa) => {
    // Si la mesa tenía una llamada de garzón activa, se atiende y se apaga el destello luminoso
    if (llamadasGarzon && llamadasGarzon[mesa.id]) {
      atenderLlamada(mesa.id);
    }
    // Si la mesa tiene un pedido activo o está ocupada, abre la comanda detallada
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
  const totalLlamadas = Object.keys(llamadasGarzon || {}).length;

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
      {/* Estilos embebidos para el destello luminoso exclusivo del Garzón */}
      <style>{`
        @keyframes destelloLlamadaGarzon {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.75), 0 0 12px rgba(245, 158, 11, 0.45);
            border-color: #EF4444;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 32px 10px rgba(239, 68, 68, 0.85), 0 0 54px 18px rgba(245, 158, 11, 0.65);
            border-color: #F59E0B;
            background-color: #FEF2F2 !important;
            transform: scale(1.025);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.75), 0 0 12px rgba(245, 158, 11, 0.45);
            border-color: #EF4444;
            transform: scale(1);
          }
        }
      `}</style>

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
        {/* Encabezado con contador y avisos de atención */}
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

            {totalLlamadas > 0 && (
              <span style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
                animation: 'pulse 1.2s infinite'
              }}>
                <BellRing size={14} />
                <span>{totalLlamadas} {totalLlamadas === 1 ? 'mesa solicita atención' : 'mesas solicitan atención'}</span>
              </span>
            )}
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

        {/* Grilla exclusiva de mesas con destello reactivo para el Garzón */}
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
            const hasLlamada = Boolean(llamadasGarzon && llamadasGarzon[mesa.id]);

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
                  height: '145px',
                  boxSizing: 'border-box',
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
                  cursor: (hasOrder || hasLlamada) ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  animation: hasLlamada ? 'destelloLlamadaGarzon 1.2s infinite ease-in-out' : 'none',
                  boxShadow: hasLlamada
                    ? '0 0 24px rgba(220, 38, 38, 0.6)'
                    : hasOrder
                      ? '0 6px 16px rgba(216, 107, 82, 0.18)'
                      : 'none'
                }}
                title={
                  hasLlamada
                    ? `¡Mesa ${mesa.id} solicitó garzón! Clic para atender`
                    : hasOrder
                      ? `Ver comanda de Mesa ${mesa.id}`
                      : `Mesa ${mesa.id} disponible`
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils size={18} />
                  <span style={{ fontSize: '21px', fontWeight: 800 }}>Mesa {mesa.id}</span>
                  {hasLlamada && <BellRing size={18} color="#DC2626" />}
                </div>

                {hasLlamada ? (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(220, 38, 38, 0.45)',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    <BellRing size={13} strokeWidth={2.8} />
                    <span>¡Atención solicitada!</span>
                  </span>
                ) : hasOrder ? (
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: isReady ? '#D1FAE5' : isWaiting ? '#FEF3C7' : '#FEE2E2',
                    color: isReady ? '#065F46' : isWaiting ? '#B45309' : '#B91C1C'
                  }}>
                    {isReady ? 'Listo para servir' : isWaiting ? 'Esperando comanda' : 'En preparación'}
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

        <RoleLogsPanel roleLabel="Garzón" />
      </div>

      {/* Modal de Comanda al pulsar una mesa con pedido */}
      {currentModalTable && (
        <CookOrderModal
          table={currentModalTable}
          mesa={currentModalTable}
          onClose={() => setSelectedTable(null)}
          onUpdateStatus={updateTableStatus}
        />
      )}
    </div>
  );
}
