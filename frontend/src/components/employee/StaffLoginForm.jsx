import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function StaffLoginForm() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor ingresa un nombre de usuario');
      return;
    }
    setError('');
    const res = await login(username, password);
    if (!res?.success) {
      setError(res?.error || 'Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="employee-login-pc-card">
      {/* Título arriba centrado (sin subtítulos) */}
      <h1 className="login-title-centered">
        Inicio de sesión
      </h1>

      {/* Formulario / Tarjeta de login debajo del título centrado */}
      <div className="login-card-container">
        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label" htmlFor="staff-user">
              Usuario
            </label>
            <div className="login-input-wrapper">
              <input
                id="staff-user"
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label" htmlFor="staff-pass">
              Contraseña
            </label>
            <div className="login-input-wrapper">
              <input
                id="staff-pass"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', fontWeight: 600, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>

          {/* Accesos rápidos de prueba */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #E5D8CC' }}>
            <div style={{ fontSize: '11.5px', color: '#6B7280', marginBottom: '8px', fontWeight: 600, textAlign: 'center' }}>
              Credenciales de acceso rápido (Roles):
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { setUsername('admin@restaurant.cl'); setPassword('admin123'); setError(''); }}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  color: '#334155'
                }}
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => { setUsername('cocinero'); setPassword('cocina123'); setError(''); }}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  color: '#334155'
                }}
              >
                🍳 Cocina
              </button>
              <button
                type="button"
                onClick={() => { setUsername('garzon'); setPassword('garzon123'); setError(''); }}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  color: '#334155'
                }}
              >
                📋 Garzón
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
