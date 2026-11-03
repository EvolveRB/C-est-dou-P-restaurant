import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import CookOrderModal from '../../components/employee/CookOrderModal';
import { EyeOff, Eye, Utensils, RotateCcw } from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { tables, products, updateTableStatus, toggleProductAvailability, reiniciarEstadoPruebas } = useRestaurant();
  
  // Tab activa: 'pedidos' o 'inventario'
  const [activeTab, setActiveTab] = useState('pedidos');
  const [resetting, setResetting] = useState(false);
  
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
          padding: '24px 32px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #F2E3D8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#14171F', lineHeight: 1.15, margin: 0 }}>
              {activeTab === 'pedidos' ? 'Pedidos' : 'Inventario'}
            </h1>
            <button
              onClick={async () => {
                setResetting(true);
                await reiniciarEstadoPruebas();
                setResetting(false);
              }}
              disabled={resetting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--c-terracotta)',
                color: 'var(--c-terracotta)',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Limpia mesas y prepara el entorno: Mesa 2 esperando a elaboración y Mesa 1 libre para pedidos en tiempo real"
            >
              <RotateCcw size={13} style={{ transform: resetting ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }} />
              <span>{resetting ? 'Reiniciando...' : 'Reiniciar Pruebas (Mesa 2 en espera / Mesa 1 libre)'}</span>
            </button>
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
            TAB 1: VISTA DE PEDIDOS (Mesas con tamaños estáticos y simétricos)
           ======================================================== */}
        {activeTab === 'pedidos' && (
          <div style={{
            padding: '24px 32px 32px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '24px 28px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              {/* Cabecera del bloque */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1F242E', margin: 0 }}>
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

              {/* Grilla PC de mesas con tarjetas de tamaño estático y 100% simétricas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '18px',
                flex: 1,
                overflowY: 'auto',
                alignContent: 'start',
                paddingRight: '6px'
              }}>
                {tables.map((mesa) => {
                  const hasOrder = mesa.pedido !== null && mesa.estado !== 'Libre';
                  const orderItems = hasOrder && Array.isArray(mesa.pedido.items) ? mesa.pedido.items : [];
                  const maxItemsToShow = 2;
                  const displayedItems = orderItems.slice(0, maxItemsToShow);
                  const remainingCount = orderItems.length - maxItemsToShow;

                  return (
                    <div
                      key={mesa.id}
                      onClick={() => handleTableClick(mesa)}
                      style={{
                        height: '220px', // Tamaño estático para simetría absoluta
                        borderRadius: '20px',
                        backgroundColor: hasOrder ? '#FFF9F6' : '#FAF5F0',
                        color: '#1F242E',
                        border: hasOrder ? '2px solid #DCA99C' : '1px solid #E8DDD2',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px 18px',
                        cursor: hasOrder ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: hasOrder ? '0 6px 18px rgba(216, 107, 82, 0.14)' : 'none',
                        textAlign: 'left',
                        boxSizing: 'border-box'
                      }}
                      title={hasOrder ? `Ver comanda de Mesa ${mesa.id}` : `Mesa ${mesa.id} sin pedido`}
                    >
                      <div>
                        {/* Cabecera de la mesa y estado */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E' }}>
                            Mesa {mesa.id}
                          </span>
                          {hasOrder ? (
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: mesa.estado === 'Esperando' ? '#FEF3C7' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? '#DCFCE7' : '#FEE2E2',
                              color: mesa.estado === 'Esperando' ? '#B45309' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? '#15803D' : '#B91C1C',
                              padding: '3px 10px',
                              borderRadius: '8px'
                            }}>
                              {mesa.estado === 'Esperando' ? 'Esperando comanda' : (mesa.estado === 'Listo para servir' || mesa.estado === 'Listo') ? 'Listo para servir' : 'En preparación'}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#059669',
                              backgroundColor: '#D1FAE5',
                              padding: '3px 10px',
                              borderRadius: '8px'
                            }}>
                              Libre
                            </span>
                          )}
                        </div>

                        {/* Detalle de platos a elaborar si hay pedido */}
                        {hasOrder ? (
                          <div style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--c-terracotta)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                              Platos a elaborar ({orderItems.length}):
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {displayedItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    background: '#FFFFFF',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid #F0E4D8',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: '#1F242E', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.quantity || item.cantidad || 1}x {item.product?.nombre || item.nombre || 'Platillo'}
                                  </span>
                                  {item.note && (
                                    <span style={{
                                      fontSize: '10.5px',
                                      color: 'var(--c-terracotta)',
                                      fontStyle: 'italic',
                                      marginLeft: '6px',
                                      maxWidth: '80px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      "{item.note}"
                                    </span>
                                  )}
                                </div>
                              ))}

                              {/* Indicador cuando hay más platos: el cocinero hace clic en la comanda para ver todo */}
                              {remainingCount > 0 && (
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--c-terracotta)',
                                  textAlign: 'center',
                                  padding: '4px',
                                  background: '#FDF4EF',
                                  borderRadius: '6px',
                                  border: '1px dashed #EEDBCE'
                                }}>
                                  +{remainingCount} {remainingCount === 1 ? 'plato más' : 'platos más'} (clic para ver todo)
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Estado simétrico cuando la mesa está libre */
                          <div style={{
                            height: '95px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            color: '#9CA3AF'
                          }}>
                            <Utensils size={24} strokeWidth={1.5} color="#CBD5E1" />
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Mesa disponible</span>
                            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>Sin comanda activa</span>
                          </div>
                        )}
                      </div>

                      {hasOrder ? (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #F2E3D8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>
                            Hora: <strong>{mesa.pedido?.hora || '--:--'}</strong>
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
                            Ver Comanda Completa →
                          </span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #E8DDD2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                            ● Lista para ocupar
                          </span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            Salón
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: VISTA DE INVENTARIO (Abarca todo el espacio vacío)
           ======================================================== */}
        {activeTab === 'inventario' && (
          <div style={{
            padding: '24px 32px 32px',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1.25fr 1fr',
            gap: '24px',
            minHeight: 0,
            boxSizing: 'border-box'
          }}>
            {/* Columna Izquierda: Inventario (Abarca todo el alto disponible) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '24px 28px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E', margin: 0 }}>
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

              {/* Grilla de platillos que abarca todo el espacio disponible sin cortes vacíos */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                flex: 1,
                overflowY: 'auto',
                paddingRight: '6px',
                alignContent: 'start'
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
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Vista Cocina: Renderizado de imagen o icono neutro */}
                      {hasImage ? (
                        <div style={{
                          width: '100%',
                          height: '95px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '10px'
                        }}>
                          <img
                            src={prod.imagen}
                            alt={prod.nombre}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1F242E', marginBottom: '6px' }}>
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

            {/* Columna Derecha: Carta de elaboración (Abarca todo el alto disponible) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EEDBCE',
              borderRadius: '22px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
              height: '100%',
              minHeight: 0,
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E', margin: 0 }}>
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

              {/* Grilla dinámica de mesas que abarca todo el espacio */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                flex: 1,
                overflowY: 'auto',
                paddingRight: '6px',
                alignContent: 'start'
              }}>
                {tables.map((mesa) => {
                  const hasOrder = mesa.pedido !== null && mesa.estado !== 'Libre';

                  return (
                    <button
                      key={mesa.id}
                      onClick={() => handleTableClick(mesa)}
                      style={{
                        height: '76px', // Tamaño estático para simetría
                        borderRadius: '16px',
                        backgroundColor: hasOrder ? '#EBBFB3' : '#FAF5F0',
                        color: hasOrder ? '#4A151A' : '#736B63',
                        border: hasOrder ? '1.5px solid #DCA99C' : '1px solid #E8DDD2',
                        fontSize: '15px',
                        fontWeight: hasOrder ? 800 : 600,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: hasOrder ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box'
                      }}
                      title={hasOrder ? `Ver comanda de Mesa ${mesa.id}` : `Mesa ${mesa.id} sin pedido`}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 800 }}>Mesa {mesa.id}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: hasOrder ? 'var(--c-burgundy-800)' : '#9CA3AF'
                      }}>
                        {hasOrder ? (mesa.estado || 'En preparación') : 'Libre'}
                      </span>
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
