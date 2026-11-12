import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

export default function RoleLogsPanel({ roleLabel }) {
  const { roleLogs, fetchRoleLogs } = useRestaurant();
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && fetchRoleLogs) {
      fetchRoleLogs();
    }
  };

  return (
    <div style={{
      marginTop: '20px',
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #EADBCE',
      padding: '14px 18px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
    }}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: '#1F242E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="var(--c-burgundy-800)" />
          <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
            Registros del perfil: {roleLabel}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#F3DBD2',
            color: '#6E262E',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}>
            {roleLogs.length}
          </span>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '210px', overflowY: 'auto' }}>
          {roleLogs.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
              Sin registros recientes para este perfil.
            </div>
          ) : (
            roleLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  backgroundColor: '#FAF5F0',
                  border: '1px solid #EFE3D7',
                  borderRadius: '10px',
                  padding: '8px 10px',
                }}
              >
                <div>
                  <strong style={{ color: '#1F242E' }}>{log.accion}</strong>
                  {log.detalle && <span style={{ color: '#4B5563' }}> — {log.detalle}</span>}
                </div>
                <span style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {log.fecha ? new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

