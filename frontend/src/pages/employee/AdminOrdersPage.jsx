import { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  Mail,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  Store,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Send,
  Utensils,
  BellRing,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatPrice } from '../../data/initialProducts';
import CookOrderModal from '../../components/employee/CookOrderModal';

const TABLE_STATUS_META = {
  Libre: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', label: 'Libre' },
  Pendiente: { bg: '#FFF7ED', border: '#FDBA74', text: '#C2410C', label: 'Pendiente' },
  'En preparación': { bg: '#FEF9C3', border: '#FDE047', text: '#A16207', label: 'En preparación' },
  Entregado: { bg: '#ECFDF5', border: '#86EFAC', text: '#15803D', label: 'Entregado' },
  'Llamando Garzón': { bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', label: 'Llamando Garzón' },
};

const DEFAULT_BRANCHES = [
  'Local 1 - Casa Matriz',
  'Local 2 - Sucursal Centro',
  'Local 3 - Sucursal Oriente',
];

export default function AdminOrdersPage() {
  const {
    tables,
    updateTableStatus,
    adminPedidosData,
    adminPedidosError,
    fetchAdminOrdersAndTransactions,
    resendTransactionReceipt,
  } = useRestaurant();

  const [viewMode, setViewMode] = useState('combinada'); // 'combinada' | 'transacciones' | 'mesas'
  const [selectedBranch, setSelectedBranch] = useState('todas');
  const [methodFilter, setMethodFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableModal, setSelectedTableModal] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const resumen = adminPedidosData?.resumen || {};
  const transacciones = useMemo(
    () => (Array.isArray(adminPedidosData?.transacciones) ? adminPedidosData.transacciones : []),
    [adminPedidosData]
  );
  const pedidosHistoricos = useMemo(
    () => (Array.isArray(adminPedidosData?.pedidos) ? adminPedidosData.pedidos : []),
    [adminPedidosData]
  );

  const branches = useMemo(() => {
    const dynamic = Array.isArray(resumen.sucursales) ? resumen.sucursales : [];
    const merged = new Set([...DEFAULT_BRANCHES, ...dynamic]);
    return Array.from(merged);
  }, [resumen.sucursales]);

  const tableStats = useMemo(() => {
    const list = Array.isArray(tables) ? tables : [];
    return {
      total: list.length,
      ocupadas: list.filter((t) => t.estado !== 'Libre').length,
      pendientes: list.filter((t) => t.estado === 'Pendiente').length,
      preparacion: list.filter((t) => t.estado === 'En preparación').length,
      llamando: list.filter((t) => t.estado === 'Llamando Garzón').length,
    };
  }, [tables]);

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return transacciones.filter((tx) => {
      if (selectedBranch !== 'todas' && (tx.sucursal || 'Local 1 - Casa Matriz') !== selectedBranch) {
        return false;
      }
      if (methodFilter !== 'todos' && tx.metodo_pago !== methodFilter) {
        return false;
      }
      if (!q) return true;
      const itemsText = (tx.items || []).map((it) => it.nombre || '').join(' ').toLowerCase();
      return (
        String(tx.comprobante_codigo || '').toLowerCase().includes(q) ||
        String(tx.correo_cliente || '').toLowerCase().includes(q) ||
        String(tx.num_mesa || '').includes(q) ||
        itemsText.includes(q)
      );
    });
  }, [transacciones, selectedBranch, methodFilter, searchTerm]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return pedidosHistoricos
      .filter((ped) => {
        if (selectedBranch !== 'todas' && (ped.sucursal || 'Local 1 - Casa Matriz') !== selectedBranch) {
          return false;
        }
        if (!q) return true;
        const itemsText = (ped.items || []).map((it) => it.nombre || '').join(' ').toLowerCase();
        return (
          String(ped.num_mesa || '').includes(q) ||
          String(ped.estado_pedido || '').toLowerCase().includes(q) ||
          itemsText.includes(q)
        );
      })
      .slice(0, 15);
  }, [pedidosHistoricos, selectedBranch, searchTerm]);

  const handleBranchChange = async (branch) => {
    setSelectedBranch(branch);
    await fetchAdminOrdersAndTransactions(branch);
  };

  const handleResendReceipt = async (txId) => {
    setResendingId(txId);
    setFeedbackMsg(null);
    const res = await resendTransactionReceipt(txId);
    setResendingId(null);
    if (res.success) {
      setFeedbackMsg({
        type: 'ok',
        text: res.sent
          ? 'Comprobante reenviado por correo electrónico correctamente.'
          : `Estado actualizado: ${res.status || 'registrado'} (${res.detail || 'sin SMTP activo'}).`,
      });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'No se pudo reenviar el comprobante.' });
    }
  };

  const totalTx = Number(resumen.cantidad_transacciones || 0);
  const envRate = totalTx > 0 ? Math.round(((resumen.comprobantes_enviados || 0) / totalTx) * 100) : 100;

  return (
    <div style={{ width: '100%', maxWidth: '1260px', margin: '0 auto', padding: '20px 18px 40px', boxSizing: 'border-box' }}>
      {/* Cabecera */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#14171F', margin: 0 }}>
            Pedidos y Transacciones
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #EADBCE', borderRadius: '12px', padding: '6px 12px' }}>
            <Store size={16} color="var(--c-burgundy-800)" />
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#1F242E', outline: 'none', cursor: 'pointer' }}
              aria-label="Filtrar por sucursal"
            >
              <option value="todas">Todos los locales ({branches.length})</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {adminPedidosError && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #FCA5A5',
          background: '#FEF2F2',
          color: '#991B1B',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          No se pudieron cargar los datos de transacciones desde la base de datos: {adminPedidosError}
        </div>
      )}

      {/* Selector de modo de vista */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'combinada', label: 'Vista Combinada (Transacciones + Mesas)', icon: LayoutGrid },
          { id: 'transacciones', label: 'Enfoque Transacciones y Comprobantes', icon: Receipt },
          { id: 'mesas', label: `Vista Rápida de Mesas (${tables.length})`, icon: Utensils },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 15px',
                borderRadius: '12px',
                border: active ? '1.5px solid var(--c-burgundy-800)' : '1px solid #EADBCE',
                background: active ? 'var(--c-burgundy-800)' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {feedbackMsg && (
        <div style={{
          marginBottom: '16px',
          padding: '11px 14px',
          borderRadius: '12px',
          border: `1px solid ${feedbackMsg.type === 'ok' ? '#86EFAC' : '#FCA5A5'}`,
          background: feedbackMsg.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          color: feedbackMsg.type === 'ok' ? '#166534' : '#991B1B',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {feedbackMsg.text}
        </div>
      )}

      {/* KPIs Financieros prioritarios */}
      {viewMode !== 'mesas' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #EADBCE', boxShadow: '0 4px 12px rgba(92,29,36,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>INGRESOS TOTALES</span>
              <DollarSign size={18} color="var(--c-burgundy-800)" />
            </div>
            <div style={{ fontSize: '25px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
              {formatPrice(resumen.total_ingresos || 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Incluye {formatPrice(resumen.total_propinas || 0)} en propinas
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #EADBCE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>TRANSACCIONES PAGADAS</span>
              <Receipt size={18} color="var(--c-terracotta)" />
            </div>
            <div style={{ fontSize: '25px', fontWeight: 800, color: '#14171F' }}>
              {totalTx}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Ticket promedio: <strong>{formatPrice(resumen.ticket_promedio || 0)}</strong>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #EADBCE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>COMPROBANTES EMAIL</span>
              <Mail size={18} color="#15803D" />
            </div>
            <div style={{ fontSize: '25px', fontWeight: 800, color: '#15803D' }}>
              {resumen.comprobantes_enviados || 0} <span style={{ fontSize: '14px', fontWeight: 700 }}>({envRate}% SMTP)</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {resumen.comprobantes_registrados || 0} con correo • {totalTx - (resumen.comprobantes_registrados || 0)} presenciales
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #EADBCE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>MEDIOS DE PAGO</span>
              <CreditCard size={18} color="var(--c-burgundy-800)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: '#1F242E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tarjeta ({resumen.por_metodo?.tarjeta || 0})</span>
                <strong>{formatPrice(resumen.monto_por_metodo?.tarjeta || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Transferencia ({resumen.por_metodo?.transferencia || 0})</span>
                <strong>{formatPrice(resumen.monto_por_metodo?.transferencia || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Efectivo ({resumen.por_metodo?.efectivo || 0})</span>
                <strong>{formatPrice(resumen.monto_por_metodo?.efectivo || 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Mesas en Vivo (siempre visible en vista combinada o mesas) */}
      {viewMode !== 'transacciones' && (
        <section style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #EADBCE',
          padding: '18px',
          marginBottom: '22px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#14171F', margin: 0 }}>
                Vista de Mesas en Tiempo Real ({tableStats.ocupadas}/{tableStats.total} activas)
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 700 }}>
              <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#FFF7ED', color: '#C2410C' }}>
                Pendientes: {tableStats.pendientes}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#FEF9C3', color: '#A16207' }}>
                En cocina: {tableStats.preparacion}
              </span>
              {tableStats.llamando > 0 && (
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#FEF2F2', color: '#B91C1C', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <BellRing size={12} /> Llamando: {tableStats.llamando}
                </span>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: '12px',
          }}>
            {tables.map((table) => {
              const meta = TABLE_STATUS_META[table.estado] || TABLE_STATUS_META.Libre;
              const hasOrder = Boolean(table.pedido);
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => hasOrder && setSelectedTableModal(table)}
                  style={{
                    textAlign: 'left',
                    padding: '13px',
                    borderRadius: '14px',
                    border: `1.5px solid ${meta.border}`,
                    background: meta.bg,
                    cursor: hasOrder ? 'pointer' : 'default',
                    transition: 'transform 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#14171F' }}>
                      Mesa {table.id}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: meta.text,
                      background: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: `1px solid ${meta.border}`,
                    }}>
                      {meta.label}
                    </span>
                  </div>
                  {hasOrder ? (
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      <div style={{ fontWeight: 700, color: 'var(--c-burgundy-800)' }}>
                        {formatPrice(table.pedido.total || table.pedido.subtotal || 0)}
                      </div>
                      <div style={{ color: '#64748B', marginTop: '2px' }}>
                        {(table.pedido.items || []).reduce((acc, i) => acc + (i.cantidad || 1), 0)} platos • {table.pedido.hora || '--:--'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Disponible para clientes
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tabla principal de Transacciones */}
      {viewMode !== 'mesas' && (
        <section style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #EADBCE',
          padding: '18px',
          marginBottom: '22px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#14171F', margin: 0 }}>
                Historial de Transacciones y Boletas ({filteredTransactions.length})
              </h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px' }} />
                <input
                  type="text"
                  aria-label="Buscar transacciones"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 32px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    minWidth: '230px',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#FFFFFF',
                }}
              >
                <option value="todos">Todos los medios</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '13.5px' }}>
              Aún no hay transacciones registradas para este filtro. Cuando un cliente pague su cuenta, aparecerá aquí al instante.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1EAE4', textAlign: 'left', color: '#64748B', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 8px' }}>Comprobante</th>
                    <th style={{ padding: '10px 8px' }}>Mesa / Local</th>
                    <th style={{ padding: '10px 8px' }}>Correo Cliente</th>
                    <th style={{ padding: '10px 8px' }}>Consumo</th>
                    <th style={{ padding: '10px 8px' }}>Método</th>
                    <th style={{ padding: '10px 8px' }}>Total Pagado</th>
                    <th style={{ padding: '10px 8px' }}>Estado Correo</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const MethodIcon = tx.metodo_pago === 'efectivo'
                      ? Banknote
                      : tx.metodo_pago === 'transferencia'
                        ? Smartphone
                        : CreditCard;
                    return (
                      <tr key={tx._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '11px 8px', fontWeight: 700, color: 'var(--c-burgundy-800)' }}>
                          <div>{tx.comprobante_codigo}</div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8' }}>{tx.fecha_legible}</div>
                        </td>
                        <td style={{ padding: '11px 8px' }}>
                          <div style={{ fontWeight: 700 }}>Mesa {tx.num_mesa}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{tx.sucursal || 'Local 1 - Casa Matriz'}</div>
                        </td>
                        <td style={{ padding: '11px 8px', color: '#1F242E' }}>{tx.correo_cliente || 'Presencial'}</td>
                        <td style={{ padding: '11px 8px', color: '#475569', maxWidth: '220px' }}>
                          {(tx.items || []).map((it) => `${it.cantidad || 1}x ${it.nombre}`).join(', ') || 'Consumo en mesa'}
                        </td>
                        <td style={{ padding: '11px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                            <MethodIcon size={14} color="var(--c-terracotta)" />
                            {tx.metodo_pago_label || tx.metodo_pago}
                          </span>
                        </td>
                        <td style={{ padding: '11px 8px', fontWeight: 800, color: '#14171F' }}>
                          <div>{formatPrice(tx.total_pagado)}</div>
                          {tx.propina_monto > 0 && (
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
                              Incl. propina {formatPrice(tx.propina_monto)} ({tx.propina_porcentaje}%)
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 8px' }}>
                          {!tx.correo_cliente ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', background: '#F1F5F9', color: '#475569', fontSize: '11.5px', fontWeight: 700 }}>
                              Presencial
                            </span>
                          ) : tx.comprobante_enviado ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D', fontSize: '11.5px', fontWeight: 700 }}>
                              <CheckCircle2 size={12} /> Enviado
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', background: '#FEF3C7', color: '#B45309', fontSize: '11.5px', fontWeight: 700 }} title={tx.detalle_envio_correo || ''}>
                              <Clock size={12} /> Respaldado ({tx.estado_envio_correo || 'pendiente'})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                          {tx.correo_cliente ? (
                            <button
                              type="button"
                              onClick={() => handleResendReceipt(tx._id)}
                              disabled={resendingId === tx._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                borderRadius: '9px',
                                border: '1px solid #EADBCE',
                                background: '#FAF5F0',
                                color: 'var(--c-burgundy-800)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Send size={12} />
                              <span>{resendingId === tx._id ? 'Enviando...' : 'Reenviar'}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Últimos Pedidos Asociados */}
      {viewMode !== 'mesas' && (
        <section style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #EADBCE',
          padding: '18px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#14171F', margin: '0 0 12px' }}>
            Últimos Pedidos Recibidos ({filteredOrders.length})
          </h2>
          {filteredOrders.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Sin pedidos registrados para este filtro.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '10px' }}>
              {filteredOrders.map((ped) => (
                <div
                  key={ped._id}
                  style={{
                    border: '1px solid #F1EAE4',
                    borderRadius: '12px',
                    padding: '12px',
                    background: '#FCFBF9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#14171F' }}>
                      Mesa {ped.num_mesa} • {ped.hora_pedido || '--:--'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: ped.pagado ? '#DCFCE7' : '#FFF7ED',
                      color: ped.pagado ? '#15803D' : '#C2410C',
                    }}>
                      {ped.pagado ? 'Pagado' : ped.estado_pedido}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                    {(ped.items || []).map((i) => `${i.cantidad || 1}x ${i.nombre}`).join(', ')}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                    <span>{ped.sucursal || 'Local 1 - Casa Matriz'}</span>
                    <strong style={{ color: 'var(--c-burgundy-800)' }}>
                      {formatPrice(ped.total_pagado ?? ped.total ?? ped.subtotal ?? 0)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedTableModal && (
        <CookOrderModal
          table={selectedTableModal}
          onClose={() => setSelectedTableModal(null)}
          onUpdateStatus={async (tableId, nextStatus) => {
            await updateTableStatus(tableId, nextStatus);
            setSelectedTableModal(null);
            await fetchAdminOrdersAndTransactions(selectedBranch);
          }}
        />
      )}
    </div>
  );
}
