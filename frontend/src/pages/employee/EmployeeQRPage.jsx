import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ExternalLink, ArrowLeft, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRestaurant } from '../../context/RestaurantContext';

export default function EmployeeQRPage() {
  const { tables, setTableCount } = useRestaurant();
  const [inputValue, setInputValue] = useState(tables.length);
  const baseUrl = window.location.origin;

  useEffect(() => {
    setInputValue(tables.length);
  }, [tables.length]);

  const handlePrint = () => {
    window.print();
  };

  const handleIncrement = () => {
    if (tables.length < 50) {
      setTableCount(tables.length + 1);
    }
  };

  const handleDecrement = () => {
    if (tables.length > 1) {
      setTableCount(tables.length - 1);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      setTableCount(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      setTableCount(1);
      setInputValue(1);
    } else if (parsed > 50) {
      setTableCount(50);
      setInputValue(50);
    } else {
      setTableCount(parsed);
    }
  };

  return (
    <div className="staff-content-area">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link to="/" style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '13px' }}>
              <ArrowLeft size={14} />
              <span>Volver al Salón</span>
            </Link>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E242E' }}>
            Generador de Códigos QR para Mesas
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {/* Selector y botones para aumentar / disminuir mesas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#FFFFFF',
            padding: '4px 10px 4px 14px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            height: '44px',
            boxSizing: 'border-box'
          }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Total Mesas:
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={tables.length <= 1}
                title="Disminuir mesas"
                aria-label="Disminuir mesas"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: tables.length <= 1 ? '#F1F5F9' : '#F8FAFC',
                  color: tables.length <= 1 ? '#94A3B8' : '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: tables.length <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>

              <input
                type="number"
                min="1"
                max="50"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                style={{
                  width: '48px',
                  height: '32px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#1E293B',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  MozAppearance: 'textfield'
                }}
              />

              <button
                type="button"
                onClick={handleIncrement}
                disabled={tables.length >= 50}
                title="Aumentar mesas"
                aria-label="Aumentar mesas"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: tables.length >= 50 ? '#F1F5F9' : '#F8FAFC',
                  color: tables.length >= 50 ? '#94A3B8' : '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: tables.length >= 50 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'var(--c-burgundy-800)',
              color: '#FFFFFF',
              height: '44px',
              padding: '0 20px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(92, 29, 36, 0.25)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Printer size={16} />
            <span>Imprimir Tarjetas QR</span>
          </button>
        </div>
      </div>

      {/* QR Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {tables.map((mesaObj) => {
          const mesa = mesaObj.id;
          const urlMesa = `${baseUrl}/mesa/${mesa}`;

          return (
            <div
              key={mesa}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                color: '#1E293B',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                border: '1px solid #E2E8F0',
                position: 'relative'
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--c-burgundy-800)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '4px'
              }}>
                C'est doux P
              </div>

              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                Mesa {mesa}
              </div>

              <div style={{
                background: '#FAF5F0',
                padding: '12px',
                borderRadius: '14px',
                border: '1px solid #EADBCE',
                marginBottom: '14px'
              }}>
                <QRCodeSVG
                  value={urlMesa}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <p style={{ fontSize: '11px', color: '#64748B', marginBottom: '10px' }}>
                Escanea para ver el menú y ordenar
              </p>

              <a
                href={urlMesa}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--c-terracotta)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none'
                }}
              >
                <span>Abrir enlace</span>
                <ExternalLink size={12} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
