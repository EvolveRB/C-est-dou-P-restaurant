import { X, Clock, ChefHat, CheckCircle2, AlertCircle, Utensils } from 'lucide-react';
import { formatPrice } from '../../data/initialProducts';

export default function CookOrderModal({ table, mesa, onClose, onUpdateStatus }) {
  const activeTable = table || mesa;
  if (!activeTable || !activeTable.pedido) return null;

  const { id, estado, pedido } = activeTable;

  const handleNextStatus = () => {
    if (!onUpdateStatus) return;
    if (estado === 'Esperando') {
      onUpdateStatus(id, 'En preparación');
    } else if (estado === 'En preparación') {
      onUpdateStatus(id, 'Listo para servir');
    } else if (estado === 'Listo para servir' || estado === 'Enviado a mesa') {
      onUpdateStatus(id, 'Libre');
      onClose();
    }
  };

  const handleFreeTable = () => {
    if (!onUpdateStatus) return;
    onUpdateStatus(id, 'Libre');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 17, 23, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #EEDBCE',
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #F0E4D8',
          background: '#FAF5F0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--c-terracotta)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Comanda de Cocina
              </span>
              <span style={{ fontSize: '11px', background: '#EAE1D7', color: '#5A524A', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                {pedido.id}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1F242E', marginTop: '2px' }}>
              Mesa {id}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#EAE1D7',
              color: '#3F3730',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none'
            }}
            aria-label="Cerrar comanda"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Status Badge & Time */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FDF9F5',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1px solid #EEDBCE',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--c-terracotta)" />
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Hora recepción: <strong style={{ color: '#1F242E' }}>{pedido.hora}</strong>
              </span>
            </div>

            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '9999px',
              background: estado === 'Esperando' ? '#FEF3C7' : estado === 'En preparación' ? '#FEE2E2' : '#DCFCE7',
              color: estado === 'Esperando' ? '#B45309' : estado === 'En preparación' ? '#B91C1C' : '#15803D'
            }}>
              {estado === 'Esperando' && 'Esperando en cocina'}
              {estado === 'En preparación' && 'En preparación'}
              {(estado === 'Listo para servir' || estado === 'Enviado a mesa') && 'Listo para servir'}
            </span>
          </div>

          {/* Dishes list */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Platos a Elaborar:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.isArray(pedido.items) && pedido.items.length > 0 ? (
                pedido.items.map((item, idx) => {
                  const name = item.product?.nombre || item.nombre || 'Platillo';
                  const qty = item.quantity || item.cantidad || 1;
                  const price = item.product?.precio ?? item.precio_unitario ?? item.precio ?? 0;
                  const note = item.note || item.observaciones || '';
                  const itemImg = item.product?.imagen || item.imagen;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#FAF5F0',
                        border: '1px solid #EAE1D7',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        {/* Vista Cocina: Renderizado condicional sin placeholders falsos */}
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={name}
                            onError={(e) => {
                              if (itemImg.startsWith('/Imagenes/')) {
                                e.currentTarget.src = itemImg.replace('/Imagenes/', '/');
                              }
                            }}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#F3EAE1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--c-terracotta)',
                            flexShrink: 0
                          }}>
                            <Utensils size={18} />
                          </div>
                        )}

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: 'var(--c-burgundy-800)',
                              color: 'white',
                              fontWeight: 800,
                              fontSize: '12px',
                              padding: '2px 7px',
                              borderRadius: '6px'
                            }}>
                              {qty}x
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#1F242E' }}>
                              {name}
                            </span>
                          </div>

                          {note && (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--c-terracotta)',
                              fontWeight: 600,
                              marginTop: '4px',
                              background: '#FFF5F0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              Nota: "{note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap' }}>
                        {formatPrice(price * qty)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '14px', textAlign: 'center', color: '#6B7280', fontStyle: 'italic', background: '#FAF5F0', borderRadius: '12px' }}>
                  Sin detalle de ítems registrados
                </div>
              )}
            </div>
          </div>

          {pedido.notas && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '12.5px',
              color: '#92400E',
              marginBottom: '16px'
            }}>
              <strong>Indicación general:</strong> {pedido.notas}
            </div>
          )}

          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #EEDBCE' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>Total comanda</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
              {formatPrice(pedido.total || pedido.subtotal || 0)}
            </span>
          </div>
        </div>

        {/* Modal Footer: Botones con estilo y paleta unificada (Borgoña) */}
        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #F0E4D8', background: '#FAF5F0' }}>
          {estado === 'Esperando' && (
            <button
              onClick={handleNextStatus}
              className="btn-primary"
              style={{
                width: '100%',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14.5px'
              }}
            >
              <ChefHat size={18} />
              <span>Pasar a En Preparación</span>
            </button>
          )}

          {estado === 'En preparación' && (
            <button
              onClick={handleNextStatus}
              className="btn-primary"
              style={{
                width: '100%',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14.5px'
              }}
            >
              <Utensils size={18} />
              <span>Marcar como Listo para Servir</span>
            </button>
          )}

          {(estado === 'Listo para servir' || estado === 'Enviado a mesa') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                background: '#DCFCE7',
                color: '#15803D',
                padding: '10px',
                borderRadius: '10px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '13.5px'
              }}>
                🍽️ Pedido listo para llevar a la mesa
              </div>
              <button
                onClick={handleFreeTable}
                className="btn-primary"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px'
                }}
              >
                Completar y liberar mesa
              </button>
            </div>
          )}

          {/* Botón secundario para liberar la mesa */}
          {estado !== 'Listo para servir' && estado !== 'Enviado a mesa' && (
            <button
              onClick={handleFreeTable}
              style={{
                marginTop: '10px',
                width: '100%',
                background: 'transparent',
                color: '#6B7280',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Liberar mesa y cancelar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
