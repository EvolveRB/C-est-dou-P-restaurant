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
    await login(username, password);
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

          <div style={{ marginTop: '12px' }}>
            <div className="login-action-caption">
              Acción principal
            </div>
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
