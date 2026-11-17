import { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, LogOut } from 'lucide-react';

export default function UserProfileMenu({
  displayName,
  roleLabel,
  roleStyle,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="staff-user-actions"
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="staff-user-pill"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <User size={15} color="#94A3B8" />
        <span style={{ fontWeight: 600 }}>{displayName}</span>
        <span className="staff-user-role" style={roleStyle}>
          {roleLabel}
        </span>
        <ChevronDown
          size={15}
          color="#64748B"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '190px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
            padding: '6px',
            zIndex: 80,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '10px 12px',
              borderRadius: '10px',
              border: 'none',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={15} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
