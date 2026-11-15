import { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  BellRing,
  CreditCard,
  CheckCircle2,
  X,
  Banknote,
  Smartphone,
  Mail,
  Loader2
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/initialProducts';

export default function ClientCartPage({ onGoToMenu, onOrderSuccess }) {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    totalPrice,
    totalItems,
    sendOrder,
    tableNumber,
    sendingOrder,
    solicitarGarzon,
    callingWaiter,
    activeOrder,
    payAndCloseTable
  } = useCart();

  // Estados del modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('tarjeta'); // 'tarjeta', 'efectivo', 'transferencia'
  const [tipPercent, setTipPercent] = useState(10); // 0, 10, 15
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receiptResult, setReceiptResult] = useState(null);

  // ¿Existe un pedido activo enviado a cocina?
  const hasKitchenOrder = Boolean(activeOrder && activeOrder.estado !== 'Libre' && Array.isArray(activeOrder.items) && activeOrder.items.length > 0);
  const kitchenItems = hasKitchenOrder ? activeOrder.items : [];
  const kitchenTotal = hasKitchenOrder ? Number(activeOrder.total || activeOrder.subtotal || 0) : 0;

  // Nuevos platos agregados a la mesa pendientes de enviar
  const hasNewItems = cart.length > 0;
  const newItemsTotal = Number(totalPrice || 0);

  // Total acumulado de la mesa
  const tableTotal = kitchenTotal + newItemsTotal;

  const handleSend = async () => {
    const order = await sendOrder();
    if (order && onOrderSuccess) {
      onOrderSuccess();
    }
  };

  const handleLlamarGarzon = () => {
    solicitarGarzon('Atención requerida en el pedido o cuenta');
  };

  const billableTotal = hasKitchenOrder ? kitchenTotal : tableTotal;
  const tipAmount = Math.round((billableTotal * tipPercent) / 100);
  const finalPaymentTotal = billableTotal + tipAmount;

  const handleConfirmPayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPaymentError('');
    const trimmedEmail = customerEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setPaymentError('Ingresa un correo electrónico válido para enviarte tu comprobante.');
      return;
    }

    setPaying(true);
    try {
      const receipt = await payAndCloseTable({
        correoCliente: trimmedEmail,
        metodoPago: paymentMethod,
        propinaPorcentaje: tipPercent,
      });
      setReceiptResult(receipt);
      setPaymentConfirmed(true);
    } catch (err) {
      setPaymentError(err?.message || 'No se pudo procesar el pago. Intenta nuevamente.');
    } finally {
      setPaying(false);
    }
  };

  const handleFinishAndFreeTable = () => {
    setShowPaymentModal(false);
    setPaymentConfirmed(false);
    setReceiptResult(null);
    setCustomerEmail('');
    setPaymentError('');
    if (onGoToMenu) onGoToMenu();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Vista: Carrito Vacío (solo si NO hay comanda en cocina, NO hay nuevos platos y no está abierto el modal de confirmación)
  // ──────────────────────────────────────────────────────────────────────────
  if (!hasKitchenOrder && !hasNewItems && !showPaymentModal) {
    return (
      <div className="client-scroll-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          backgroundColor: 'var(--c-terracotta-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-terracotta)',
          marginBottom: '16px'
        }}>
          <ShoppingBag size={34} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '6px' }}>
          Tu carrito está vacío
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', maxWidth: '240px', marginBottom: '22px' }}>
          Selecciona deliciosos platos de la carta para tu Mesa {tableNumber}.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '260px' }}>
          <button
            onClick={onGoToMenu}
            className="btn-primary"
            style={{ borderRadius: 'var(--radius-pill)', padding: '11px 22px' }}
          >
            <span>Explorar Catálogo</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleLlamarGarzon}
            disabled={callingWaiter}
            className="btn-secondary"
            style={{ borderRadius: 'var(--radius-pill)', fontSize: '13px' }}
          >
            <BellRing size={15} />
            <span>{callingWaiter ? 'Llamando...' : 'Llamar al Garzón'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Vista Principal: Comanda en Cocina Bloqueada + Nuevos Platos Agregados + Pago
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="client-scroll-area">
      {/* ────────────────────────────────────────────────────────────────────
          SECCIÓN 1: Platos en cocina (si ya se envió comanda)
         ──────────────────────────────────────────────────────────────────── */}
      {hasKitchenOrder && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Platos en Cocina ({kitchenItems.length})</span>
            </h3>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--c-burgundy-800)' }}>
              Subtotal: {formatPrice(kitchenTotal)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {kitchenItems.map((item, idx) => {
              const prodName = item.product?.nombre || item.nombre || 'Platillo';
              const prodPrice = Number(item.product?.precio ?? item.precio_unitario ?? item.precio ?? 0);
              const qty = item.quantity || item.cantidad || 1;
              const note = item.note || item.observaciones || '';

              return (
                <div
                  key={`kitchen-${idx}`}
                  style={{
                    background: '#FAF7F2',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    border: '1px solid #EADBCE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: 'var(--c-burgundy-800)',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}>
                        {qty}x
                      </span>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1F242E', margin: 0 }}>
                        {prodName}
                      </h4>
                    </div>
                    {note && (
                      <p style={{ fontSize: '11px', color: 'var(--c-terracotta)', fontStyle: 'italic', margin: '2px 0 0' }}>
                        "{note}"
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1F242E' }}>
                      {formatPrice(prodPrice * qty)}
                    </div>
                    <div style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, justifyContent: 'flex-end', marginTop: '2px' }}>
                      <CheckCircle2 size={12} />
                      <span>Elaborando</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          SECCIÓN 2: Nuevos platos agregados mas abajo (Editable)
         ──────────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0 }}>
            {hasKitchenOrder ? '🛒 Platos Adicionales Agregados' : 'Resumen del Pedido'}
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-terracotta)' }}>
            {totalItems} {totalItems === 1 ? 'nuevo ítem' : 'nuevos ítems'}
          </span>
        </div>

        {hasNewItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cart.map((item) => {
              const prodId = item.product?.id ?? item.id;
              const prodName = item.product?.nombre || item.nombre || 'Platillo';
              const prodPrice = Number(item.product?.precio ?? item.precio ?? 0);
              const qty = item.quantity || 1;
              const note = item.note || '';

              return (
                <div
                  key={prodId}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1.5px solid var(--c-terracotta-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(216, 107, 82, 0.08)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--c-burgundy-800)', margin: 0 }}>
                      {prodName}
                    </h4>
                    {note && (
                      <p style={{ fontSize: '11px', color: 'var(--c-terracotta)', fontStyle: 'italic', margin: '2px 0 0' }}>
                        "{note}"
                      </p>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--c-text-main)', marginTop: '4px' }}>
                      {formatPrice(prodPrice * qty)}
                    </div>
                  </div>

                  {/* Controles de edición interactivos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--c-cream-bg)', borderRadius: 'var(--radius-pill)', padding: '3px 8px', border: '1px solid var(--c-cream-border)', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(prodId, -1)}
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--c-burgundy-800)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Restar 1"
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 800, minWidth: '14px', textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(prodId, 1)}
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--c-burgundy-800)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Sumar 1"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(prodId)}
                      style={{ color: '#E53E3E', padding: '4px', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Botón para enviar la nueva tanda de platos a cocina */}
            <button
              onClick={handleSend}
              disabled={sendingOrder}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              <span>{sendingOrder ? 'Enviando a cocina...' : (hasKitchenOrder ? `Enviar Platos Adicionales a Cocina • ${formatPrice(newItemsTotal)}` : `Enviar Pedido a Cocina • Mesa ${tableNumber}`)}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Si no hay platos nuevos en el carrito pero sí comanda en cocina */
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '14px',
            border: '1px dashed var(--c-cream-border)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12.5px', color: 'var(--c-text-muted)', margin: '0 0 10px' }}>
              ¿Quieres añadir otra ronda de bebidas, platos principales o postres?
            </p>
            <button
              onClick={onGoToMenu}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={15} />
              <span>+ Agregar más platos a la mesa</span>
            </button>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          SECCIÓN 3: Resumen Total de Cuenta y Botones de Pago
         ──────────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '20px', background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid var(--c-cream-border)' }}>
        {hasKitchenOrder && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '6px' }}>
            <span>Platos en cocina</span>
            <span>{formatPrice(kitchenTotal)}</span>
          </div>
        )}
        {hasNewItems && hasKitchenOrder && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-terracotta)', fontWeight: 700, marginBottom: '6px' }}>
            <span>Nuevos adicionales por enviar</span>
            <span>+{formatPrice(newItemsTotal)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '10px' }}>
          <span>Servicio & Mesa {tableNumber}</span>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>Incluido</span>
        </div>
        <div style={{ height: '1px', background: 'var(--c-cream-border)', marginBottom: '10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
          <span>Total Acumulado Mesa</span>
          <span>{formatPrice(tableTotal)}</span>
        </div>
      </div>

      {/* Acciones principales: Pagar, Llamar Garzón, Liberar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        {/* BOTÓN DESTACADO DE PAGAR (siempre accesible cuando hay comanda o consumo) */}
        {hasKitchenOrder && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              fontSize: '15.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(92, 29, 36, 0.28)'
            }}
          >
            <CreditCard size={19} />
            <span>Pagar Cuenta Total • {formatPrice(tableTotal)}</span>
          </button>
        )}

        {/* Llamar al Garzón */}
        <button
          onClick={handleLlamarGarzon}
          disabled={callingWaiter}
          className="btn-secondary"
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: '14px',
            fontSize: '13.5px'
          }}
        >
          <BellRing size={16} />
          <span>{callingWaiter ? 'Notificando al Garzón...' : `Llamar Garzón a Mesa ${tableNumber}`}</span>
        </button>
      </div>

      {/* ====================================================================
          MODAL DE PAGO (Apertura al pulsar "Pagar Cuenta")
         ==================================================================== */}
      {showPaymentModal && (
        <div
          className="modal-overlay"
          onClick={() => !paymentConfirmed && setShowPaymentModal(false)}
        >
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            {!paymentConfirmed ? (
              <>
                {/* Cabecera del modal */}
                <div className="modal-header">
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--c-terracotta)', textTransform: 'uppercase' }}>
                      Pago en Mesa {tableNumber}
                    </span>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginTop: '2px' }}>
                      Pagar Cuenta
                    </h2>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowPaymentModal(false)}
                    aria-label="Cerrar modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Subtotal del pedido */}
                <div style={{
                  background: 'var(--c-cream-bg)',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid var(--c-cream-border)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)' }}>
                    <span>Consumo confirmado en cocina</span>
                    <span style={{ fontWeight: 700, color: '#1F242E' }}>{formatPrice(billableTotal)}</span>
                  </div>
                </div>

                {/* Correo obligatorio para envío de comprobante al 100% de clientes */}
                <div style={{ marginBottom: '18px' }}>
                  <label
                    htmlFor="client-receipt-email"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-main)', marginBottom: '6px' }}
                  >
                    Correo para tu comprobante electrónico *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail
                      size={16}
                      color="var(--c-text-muted)"
                      style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
                    />
                    <input
                      id="client-receipt-email"
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (paymentError) setPaymentError('');
                      }}
                      placeholder="cliente@correo.com"
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 36px',
                        borderRadius: '12px',
                        border: paymentError ? '1.5px solid #DC2626' : '1px solid var(--c-cream-border)',
                        fontSize: '13.5px',
                        backgroundColor: '#FFFFFF',
                        color: '#1F242E',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '5px' }}>
                    Enviamos el detalle de tu boleta al 100% de las visitas al confirmar el pago.
                  </p>
                  {paymentError && (
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                      {paymentError}
                    </p>
                  )}
                </div>

                {/* Selector de propina sugerida */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-main)', marginBottom: '8px' }}>
                    Propina voluntaria sugerida:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { pct: 0, label: '0%' },
                      { pct: 10, label: '10% (Sugerida)' },
                      { pct: 15, label: '15%' }
                    ].map((opt) => (
                      <button
                        key={opt.pct}
                        type="button"
                        onClick={() => setTipPercent(opt.pct)}
                        style={{
                          padding: '8px',
                          borderRadius: '10px',
                          border: tipPercent === opt.pct ? '1.5px solid var(--c-burgundy-800)' : '1px solid var(--c-cream-border)',
                          backgroundColor: tipPercent === opt.pct ? 'var(--c-burgundy-800)' : '#FFFFFF',
                          color: tipPercent === opt.pct ? '#FFFFFF' : '#4B5563',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de método de pago */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-main)', marginBottom: '8px' }}>
                    Selecciona tu medio de pago:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'tarjeta', label: 'Tarjeta Débito / Crédito (POS en mesa)', icon: CreditCard },
                      { id: 'efectivo', label: 'Efectivo (el personal llevará el vuelto)', icon: Banknote },
                      { id: 'transferencia', label: 'Transferencia electrónica', icon: Smartphone }
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: isSel ? '2px solid var(--c-burgundy-800)' : '1px solid var(--c-cream-border)',
                            backgroundColor: isSel ? 'var(--c-terracotta-light)' : '#FFFFFF',
                            cursor: 'pointer'
                          }}
                        >
                          <Icon size={20} color={isSel ? 'var(--c-burgundy-800)' : '#6B7280'} />
                          <span style={{ fontSize: '13px', fontWeight: isSel ? 800 : 600, color: '#1F242E' }}>
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen Total a Pagar con Propina */}
                <div style={{
                  background: '#FAF5F0',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #EADBCE',
                  marginBottom: '18px'
                }}>
                  {tipPercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '6px' }}>
                      <span>Propina ({tipPercent}%)</span>
                      <span style={{ fontWeight: 600 }}>{formatPrice(tipAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
                    <span>Total a Pagar</span>
                    <span>{formatPrice(finalPaymentTotal)}</span>
                  </div>
                </div>

                {/* Botón de Confirmación */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={paying}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    fontSize: '15px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: paying ? 0.75 : 1
                  }}
                >
                  {paying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Procesando pago y comprobante...</span>
                    </>
                  ) : (
                    <span>Confirmar Pago • {formatPrice(finalPaymentTotal)}</span>
                  )}
                </button>
              </>
            ) : (
              /* Pantalla de Confirmación de Pago Exitoso */
              <div style={{ textAlign: 'center', padding: '16px 8px 10px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <CheckCircle2 size={38} strokeWidth={2.5} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--c-burgundy-800)', marginBottom: '6px' }}>
                  ¡Pago Realizado con Éxito!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', maxWidth: '300px', margin: '0 auto 16px' }}>
                  Tu pago de <strong>{formatPrice(receiptResult?.total_pagado ?? finalPaymentTotal)}</strong> ha sido registrado y la Mesa {tableNumber} quedó liberada.
                </p>

                <div style={{
                  background: 'var(--c-cream-bg)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: 'var(--c-text-main)',
                  marginBottom: '20px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div>
                    <strong>Comprobante:</strong> {receiptResult?.comprobante_codigo || 'Emitido'}
                  </div>
                  <div>
                    <strong>Correo:</strong> {receiptResult?.correo_cliente || customerEmail}
                  </div>
                  <div style={{ color: receiptResult?.comprobante_enviado ? '#15803D' : '#B45309', fontWeight: 700 }}>
                    {receiptResult?.comprobante_enviado
                      ? 'Comprobante enviado por correo electrónico.'
                      : 'Comprobante emitido y respaldado en el sistema (pendiente de servidor SMTP).'}
                  </div>
                </div>

                <button
                  onClick={handleFinishAndFreeTable}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '14px',
                    fontSize: '14.5px',
                    fontWeight: 700
                  }}
                >
                  Finalizar y Volver al Menú
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
