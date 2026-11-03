import { ShieldCheck, QrCode, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  return (
    <div style={{
      flex: 1,
      minHeight: 'calc(100vh - 67px)',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 28px',
      boxSizing: 'border-box'
    }}>
      {/* Contenedor principal de Administrador (Limpio y espacioso) */}
      <div style={{
        width: '100%',
        flex: 1,
        backgroundColor: '#FFF9F5',
        borderRadius: '24px',
        border: '1px solid #EEDBCE',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Encabezado sin subtítulos grises */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F2E3D8',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#14171F', margin: 0 }}>
            Panel de Administrador
          </h1>

          <Link
            to="/staff/qrs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#4A151A',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(74, 21, 26, 0.2)'
            }}
          >
            <QrCode size={16} />
            <span>Generador de QRs</span>
          </Link>
        </div>

        {/* Área de trabajo por ahora vacía para el Administrador */}
        <div style={{
          flex: 1,
          border: '2px dashed #E2D1C3',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#F7EBE1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4A151A',
            marginBottom: '18px'
          }}>
            <ShieldCheck size={36} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F242E', marginBottom: '8px' }}>
            Módulo de Administración
          </h2>

          <p style={{ maxWidth: '420px', color: '#4B5563', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Espacio reservado para métricas de facturación, gestión de usuarios, auditoría de mesas y reportes del restaurante.
          </p>

          <Link
            to="/staff/qrs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#B94A48',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            <span>Ir a gestión e impresión de códigos QR</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

