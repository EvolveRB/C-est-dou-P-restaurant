import { Clock, ChefHat, CheckCircle2, Utensils, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/initialProducts';

export default function ClientOrderStatusPage({ onGoToMenu }) {
  const { activeOrder, tableNumber } = useCart();

  if (!activeOrder) {
    return (
      <div className="client-scroll-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          backgroundColor: 'var(--c-cream-placeholder)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-burgundy-800)',
          marginBottom: '16px'
        }}>
          <Clock size={32} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '6px' }}>
          No hay pedidos activos
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', maxWidth: '240px', marginBottom: '22px' }}>
          Aún no has solicitado platos para la Mesa {tableNumber}. Tu comanda aparecerá aquí una vez enviada.
        </p>
        <button
          onClick={onGoToMenu}
          style={{
            background: 'var(--c-burgundy-800)',
            color: 'white',
            padding: '11px 22px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: '13.5px'
          }}
        >
          Ver Menú
        </button>
      </div>
    );
  }

  const steps = [
    { label: 'Pedido recibido', desc: 'Comanda confirmada en cocina', done: true, icon: CheckCircle2 },
    { label: 'En preparación', desc: 'El chef está elaborando tus platos', done: true, current: true, icon: ChefHat },
    { label: 'Listo para servir', desc: 'El mesero llevará el pedido a tu mesa', done: false, icon: Utensils }
  ];

  return (
    <div className="client-scroll-area">
      {/* Order Status Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--c-burgundy-900), var(--c-burgundy-800))',
        color: 'white',
        borderRadius: '20px',
        padding: '18px',
        marginBottom: '18px',
        boxShadow: '0 8px 20px rgba(92, 29, 36, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#FCD9BD', fontWeight: 700 }}>
              Estado en tiempo real
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: '#FFF' }}>
              Mesa {tableNumber}
            </h2>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px 10px', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 700 }}>
            {activeOrder.id}
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#FCD9BD" />
          <span style={{ fontSize: '13px', color: '#FFF3EB' }}>
            Tiempo estimado restante: <strong>~12 - 15 min</strong>
          </span>
        </div>
      </div>

      {/* Progress Stepper */}
      <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid var(--c-cream-border)', marginBottom: '18px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '14px' }}>
          Progreso en Cocina
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: st.current ? 'var(--c-terracotta)' : st.done ? 'var(--c-burgundy-800)' : 'var(--c-cream-placeholder)',
                  color: st.done || st.current ? 'white' : 'var(--c-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: st.current ? 'var(--c-terracotta)' : 'var(--c-burgundy-800)' }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--c-text-muted)' }}>
                    {st.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dishes in this order */}
      <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '16px', border: '1px solid var(--c-cream-border)' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '10px' }}>
          Platos solicitados:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeOrder.items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>{it.quantity}x {it.product.nombre}</span>
              <span style={{ fontWeight: 700, color: 'var(--c-burgundy-800)' }}>
                {formatPrice(it.product.precio * it.quantity)}
              </span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--c-cream-border)', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
            <span>Total comanda:</span>
            <span>{formatPrice(activeOrder.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
