import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import CookOrderModal from '../../components/employee/CookOrderModal';
import { EyeOff, Eye, Utensils } from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { tables, products, updateTableStatus, toggleProductAvailability } = useRestaurant();
  
  // Tab activa: 'pedidos' o 'inventario'
  const [activeTab, setActiveTab] = useState('pedidos');
  
  // Mesa seleccionada para abrir el popup
  const [selectedTable, setSelectedTable] = useState(null);

  const handleTableClick = (mesa) => {
    // La mesa abre comanda solo si tiene un pedido enviado por el cliente
    if (mesa.pedido && mesa.estado !== 'Libre') {
      setSelectedTable(mesa);
    }
  };

  const currentModalTable = selectedTable ? tables.find((t) => t.id === selectedTable.id) : null;

  return (
    <div style={{
      flex: 1,
      minHeight: 'calc(100vh - 67px)',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Contenedor Exclusivo de PC */}
      <div style={{
        width: '100%',
        flex: 1,
        backgroundColor: '#FFF9F5',
        borderRadius: '24px',
        border: '1px solid #EEDBCE',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Encabezado PC con título y selector de pestañas con paleta unificada */}
        <div style={{
          padding: '28px 36px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #F2E3D8'
        }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#14171F', lineHeight: 1.15 }}>
              {activeTab === 'pedidos' ? 'Pedidos' : 'Inventario'}
            </h1>
          </div>

          {/* Selector de pestañas unificado */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('pedidos')}
              style={{
                backgroundColor: activeTab === 'pedidos' ? 'var(--c-burgundy-800)' : '#FFFFFF',
                color: activeTab === 'pedidos' ? '#FFFFFF' : '#4B5563',
                border: activeTab === 'pedidos' ? '1.5px solid var(--c-burgundy-800)' : '1px solid #E5D8CC',
                padding: '10px 28px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'pedidos' ? '0 4px 14px rgba(92, 29, 36, 0.25)' : 'none'
              }}
            >
              Pedidos
            </button>

            <button
              onClick={() => setActiveTab('inventario')}
              style={{
                backgroundColor: activeTab === 'inventario' ? 'var(--c-burgundy-800)' : '#FFFFFF',
                color: activeTab === 'inventario' ? '#FFFFFF' : '#4B5563',
                border: activeTab === 'inventario' ? '1.5px solid var(--c-burgundy-800)' : '1px solid #E5D8CC',
                padding: '10px 28px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'inventario' ? '0 4px 14px rgba(92, 29, 36, 0.25)' : 'none'
              }}
            >
              Inventario
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: VISTA DE PEDIDOS (PC)
           ======================================================== */}
        {activeTab === 'pedidos' && (
          <div style={{
            padding: '24px 32px 32px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '28px 32px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Cabecera del bloque */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1F242E' }}>
                    Carta de elaboración
                  </h2>
                </div>
                <span style={{
                  backgroundColor: '#F3DBD2',
                  color: '#6E262E',
                  fontSize: '13px',
                  fontWeight: 800,
                  padding: '6px 16px',
                  borderRadius: '9999px'
                }}>
                  {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}
                </span>
              </div>

              {/* Grilla PC de mesas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '18px',
                flex: 1,
                alignContent: 'start'
              }}>
                {tables.map((mesa) => {
                  const hasOrder = mesa.pedido !== null && mesa.estado !== 'Libre';

                  return (
                    <button
                      key={mesa.id}
                      onClick={() => handleTableClick(mesa)}
                      style={{
                        minHeight: '120px',
                        borderRadius: '18px',
                        backgroundColor: hasOrder ? '#EBBFB3' : '#FAF5F0',
                        color: hasOrder ? '#4A151A' : '#736B63',
                        border: hasOrder ? '1.5px solid #DCA99C' : '1px solid #E8DDD2',
                        fontSize: '19px',
                        fontWeight: hasOrder ? 800 : 600,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px',
                        cursor: hasOrder ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        boxShadow: hasOrder ? '0 6px 14px rgba(216, 107, 82, 0.22)' : 'none'
                      }}
                      title={hasOrder ? `Ver comanda de Mesa ${mesa.id}` : `Mesa ${mesa.id} sin pedido`}
                    >
                      <span style={{ fontSize: '20px', fontWeight: 800 }}>Mesa {mesa.id}</span>
                      {hasOrder ? (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: mesa.estado === 'Esperando' ? '#FEF3C7' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? '#DCFCE7' : '#FEE2E2',
                          color: mesa.estado === 'Esperando' ? '#B45309' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? '#15803D' : '#B91C1C',
                          padding: '3px 10px',
                          borderRadius: '8px'
                        }}>
                          {mesa.estado === 'Esperando' ? 'Esperando comanda' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? '🍽️ Listo para servir' : 'En preparación'}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#9CA3AF'
                        }}>
                          Libre
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: VISTA DE INVENTARIO (PC)
           ======================================================== */}
        {activeTab === 'inventario' && (
          <div style={{
            padding: '28px 36px 36px',
            display: 'grid',
            gridTemplateColumns: '1.45fr 1fr',
            gap: '24px'
          }}>
            {/* Columna Izquierda: Inventario */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '24px 28px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E' }}>
                    Inventario
                  </h2>
                </div>
                <span style={{
                  backgroundColor: '#F3DBD2',
                  color: '#6E262E',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '9999px'
                }}>
                  {products.length} elementos
                </span>
              </div>

              {/* Grilla 2 columnas de platillos */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                maxHeight: '480px',
                overflowY: 'auto',
                paddingRight: '6px'
              }}>
                {products.map((prod, index) => {
                  const hasImage = Boolean(prod.imagen);

                  return (
                    <div
                      key={prod.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EEDBCE',
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: prod.disponible ? 1 : 0.65,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Vista Cocina: Renderizado condicional de imagen o icono neutro (sin placeholders falsos ni etiquetas engañosas) */}
                      {hasImage ? (
                        <div style={{
                          width: '100%',
                          height: '90px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '10px'
                        }}>
                          <img
                            src={prod.imagen}
                            alt={prod.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--c-terracotta)',
                          marginBottom: '8px'
                        }}>
                          <Utensils size={16} />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8E5F64' }}>
                            {prod.categoria || 'Cocina'}
                          </span>
                        </div>
                      )}

                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1F242E', marginBottom: '8px' }}>
                        Plato {index + 1}: {prod.nombre}
                      </div>

                      {/* Etiquetas de dieta si existen */}
                      {prod.etiquetas && prod.etiquetas.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                          {prod.etiquetas.map((t, idx) => (
                            <span key={idx} className="badge-tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => toggleProductAvailability(prod.id)}
                        style={{
                          marginTop: 'auto',
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          backgroundColor: prod.disponible ? '#DCFCE7' : '#FEE2E2',
                          color: prod.disponible ? '#15803D' : '#B91C1C',
                          border: prod.disponible ? '1px solid #BBF7D0' : '1px solid #FECACA',
                          transition: 'all 0.15s ease'
                        }}
                        title={prod.disponible ? 'Desactivar de la carta del cliente' : 'Activar en la carta'}
                      >
                        {prod.disponible ? (
                          <>
                            <Eye size={14} />
                            <span>Disponible (En carta)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} />
                            <span>Agotado (Desactivado)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha: Carta de elaboración (Mesas dinámicas) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E' }}>
                    Carta de elaboración
                  </h2>
                </div>
                <span style={{
                  backgroundColor: '#F3DBD2',
                  color: '#6E262E',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '9999px'
                }}>
                  {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}
                </span>
              </div>

              {/* Grilla dinámica de mesas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                flex: 1,
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {tables.map((mesa) => {
                  const hasOrder = mesa.pedido !== null && mesa.estado !== 'Libre';

                  return (
                    <button
                      key={mesa.id}
                      onClick={() => handleTableClick(mesa)}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        backgroundColor: hasOrder ? '#EBBFB3' : '#FAF5F0',
                        color: hasOrder ? '#4A151A' : '#736B63',
                        border: hasOrder ? '1.5px solid #DCA99C' : '1px solid #E8DDD2',
                        fontSize: '15px',
                        fontWeight: hasOrder ? 800 : 600,
                        textAlign: 'center',
                        cursor: hasOrder ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                      title={hasOrder ? `Ver comanda de Mesa ${mesa.id}` : `Mesa ${mesa.id} sin pedido`}
                    >
                      Mesa {mesa.id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL (Comanda y Cambio de Estado) */}
      {currentModalTable && (
        <CookOrderModal
          table={currentModalTable}
          onClose={() => setSelectedTable(null)}
          onUpdateStatus={updateTableStatus}
        />
      )}
    </div>
  );
}
