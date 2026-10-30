import { X, Clock, ChefHat, CheckCircle2, AlertCircle, Utensils } from 'lucide-react';
import { formatPrice } from '../../data/initialProducts';

export default function CookOrderModal({ table, onClose, onUpdateStatus }) {
  if (!table || !table.pedido) return null;

  const { id, estado, pedido } = table;

  const handleNextStatus = () => {
    if (estado === 'Esperando') {
      onUpdateStatus(id, 'En preparación');
    } else if (estado === 'En preparación') {
      onUpdateStatus(id, 'Enviado a mesa');
    }
  };

  const handleFreeTable = () => {
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
              {estado === 'Enviado a mesa' && 'Enviado a mesa'}
            </span>
          </div>

          {/* Dishes list */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Platos a Elaborar:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pedido.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FAF5F0',
                    border: '1px solid #EAE1D7',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
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
                        {item.quantity}x
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#1F242E' }}>
                        {item.product.nombre}
                      </span>
                    </div>

                    {item.note && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--c-terracotta)',
                        fontWeight: 600,
                        marginTop: '4px',
                        marginLeft: '32px',
                        background: '#FFF5F0',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}>
                        Nota: "{item.note}"
                      </p>
                    )}
                  </div>

                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#4B5563' }}>
                    {formatPrice(item.product.precio * item.quantity)}
                  </span>
                </div>
              ))}
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
              {formatPrice(pedido.total)}
            </span>
          </div>
        </div>

        {/* Modal Footer: The requested "Acción principal" buttons */}
        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #F0E4D8', background: '#FAF5F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>
            Acción principal
          </div>

          {estado === 'Esperando' && (
            <button
              onClick={handleNextStatus}
              style={{
                width: '100%',
                background: '#D86B52', // Warm terracotta matching user image
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(216, 107, 82, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <ChefHat size={18} />
              <span>cambio de estado (de esperando a en preparacion)</span>
            </button>
          )}

          {estado === 'En preparación' && (
            <button
              onClick={handleNextStatus}
              style={{
                width: '100%',
                background: '#23272F',
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(35, 39, 47, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Utensils size={18} color="#4ADE80" />
              <span>cambio de estado (de preparación a enviado a mesa)</span>
            </button>
          )}

          {estado === 'Enviado a mesa' && (
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
                Pedido despachado y enviado a la mesa
              </div>
              <button
                onClick={handleFreeTable}
                style={{
                  width: '100%',
                  background: '#EAE1D7',
                  color: '#4A443E',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Completar y liberar mesa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
