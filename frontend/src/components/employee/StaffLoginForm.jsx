import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatRutDisplay, isValidRutFormat } from '../../utils/rut';

export default function StaffLoginForm() {
  const {
    user,
    mustChangePassword,
    initializing,
    needsAdminSetup,
    requiresSetupCode,
    setupInitialAdmin,
    login,
    changePassword,
    logout,
    loading,
  } = useAuth();
  const navigate = useNavigate();

  // Estados de login normal
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');

  // Estados de activación inicial de Administrador
  const [setupNombre, setSetupNombre] = useState('');
  const [setupApellido, setSetupApellido] = useState('');
  const [setupCorreo, setSetupCorreo] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');

  // Estados de cambio obligatorio de contraseña (primer ingreso)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [error, setError] = useState('');

  if (initializing) {
    return (
      <div className="employee-login-pc-card">
        <h1 className="login-title-centered">C&apos;est doux P</h1>
        <div className="login-card-container" style={{ textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
          Verificando estado del sistema...
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MODO 1: CAMBIO OBLIGATORIO DE CONTRASEÑA EN PRIMER INGRESO
  // ──────────────────────────────────────────────────────────────────────────
  if (user && mustChangePassword) {
    const handlePasswordChangeSubmit = async (e) => {
      e.preventDefault();
      setError('');
      if (newPassword.length < 8) {
        setError('La nueva contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      const res = await changePassword({
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      if (!res?.success) {
        setError(res?.error || 'No se pudo actualizar la contraseña.');
        return;
      }

      setNewPassword('');
      setConfirmNewPassword('');
      navigate('/', { replace: true });
    };

    return (
      <div className="employee-login-pc-card">
        <h1 className="login-title-centered">Cambiar contraseña</h1>

        <div className="login-card-container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#9A3412',
            padding: '10px 12px',
            borderRadius: '12px',
            fontSize: '12.5px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            <KeyRound size={18} style={{ flexShrink: 0 }} />
            <span>
              Hola <strong>{user.displayName}</strong> ({user.role}). Por seguridad, debes definir tu contraseña personal antes de continuar.
            </span>
          </div>

          <form onSubmit={handlePasswordChangeSubmit}>
            <div className="login-form-group">
              <label className="login-label" htmlFor="new-pass">
                Nueva contraseña (mín. 8 caracteres)
              </label>
              <div className="login-input-wrapper">
                <input
                  id="new-pass"
                  type="password"
                  className="login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="confirm-new-pass">
                Confirmar nueva contraseña
              </label>
              <div className="login-input-wrapper">
                <input
                  id="confirm-new-pass"
                  type="password"
                  className="login-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', fontWeight: 600, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña e ingresar'}
              </button>

              <button
                type="button"
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px',
                }}
              >
                <LogOut size={14} />
                <span>Volver / Usar otro usuario</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MODO 2: ASISTENTE DE ACTIVACIÓN INICIAL (Primera instalación sin Admins)
  // ──────────────────────────────────────────────────────────────────────────
  if (needsAdminSetup) {
    const handleSetupSubmit = async (e) => {
      e.preventDefault();
      setError('');

      if (!isValidRutFormat(rut)) {
        setError('Ingresa un RUT válido (ej: 12.345.678-9).');
        return;
      }
      if (!setupNombre.trim()) {
        setError('Ingresa el nombre del Administrador.');
        return;
      }
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== setupConfirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      const res = await setupInitialAdmin({
        rut,
        nombre: setupNombre,
        apellido: setupApellido,
        correo: setupCorreo,
        password,
        confirmPassword: setupConfirmPassword,
        setupCode,
      });

      if (!res?.success) {
        setError(res?.error || 'No se pudo activar el Administrador inicial.');
        return;
      }

      navigate('/', { replace: true });
    };

    return (
      <div className="employee-login-pc-card">
        <h1 className="login-title-centered">Activación Inicial</h1>

        <div className="login-card-container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '10px 12px',
            borderRadius: '12px',
            fontSize: '12.5px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>
              Configura la cuenta del <strong>Administrador principal</strong>. Este asistente se bloqueará automáticamente al finalizar.
            </span>
          </div>

          <form onSubmit={handleSetupSubmit}>
            <div className="login-form-group">
              <label className="login-label" htmlFor="setup-rut">
                RUT del Administrador *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="setup-rut"
                  type="text"
                  className="login-input"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={(e) => setRut(formatRutDisplay(e.target.value))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="login-form-group">
                <label className="login-label" htmlFor="setup-nombre">
                  Nombre *
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="setup-nombre"
                    type="text"
                    className="login-input"
                    value={setupNombre}
                    onChange={(e) => setSetupNombre(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label" htmlFor="setup-apellido">
                  Apellido
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="setup-apellido"
                    type="text"
                    className="login-input"
                    value={setupApellido}
                    onChange={(e) => setSetupApellido(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="setup-correo">
                Correo electrónico (opcional)
              </label>
              <div className="login-input-wrapper">
                <input
                  id="setup-correo"
                  type="email"
                  className="login-input"
                  placeholder="admin@restaurante.cl"
                  value={setupCorreo}
                  onChange={(e) => setSetupCorreo(e.target.value)}
                />
              </div>
            </div>

            {requiresSetupCode && (
              <div className="login-form-group">
                <label className="login-label" htmlFor="setup-code">
                  Código de activación *
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="setup-code"
                    type="password"
                    className="login-input"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="login-form-group">
              <label className="login-label" htmlFor="setup-pass">
                Contraseña (mín. 8 caracteres) *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="setup-pass"
                  type="password"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="setup-confirm-pass">
                Confirmar contraseña *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="setup-confirm-pass"
                  type="password"
                  className="login-input"
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', fontWeight: 600, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Configurando...' : 'Crear Administrador y Comenzar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MODO 3: LOGIN NORMAL CON RUT Y CONTRASEÑA (Sin botones ni bypass)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rut.trim()) {
      setError('Por favor ingresa tu RUT.');
      return;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }
    setError('');
    const res = await login(rut, password);
    if (!res?.success) {
      const type = res?.errorType;
      const friendlyMessage =
        type === 'database_error'
          ? 'No se pudo iniciar sesión porque hubo un error en la base de datos.'
          : type === 'backend_down'
            ? 'No se pudo iniciar sesión porque el backend no está levantado o no responde.'
            : type === 'backend_error'
              ? 'No se pudo iniciar sesión por un error del backend.'
              : 'RUT o contraseña incorrectos.';

      setError(res?.error || friendlyMessage);
      return;
    }

    if (!res.user?.mustChangePassword) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="employee-login-pc-card">
      <h1 className="login-title-centered">Inicio de sesión</h1>

      <div className="login-card-container">
        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label" htmlFor="staff-rut">
              RUT
            </label>
            <div className="login-input-wrapper">
              <input
                id="staff-rut"
                type="text"
                className="login-input"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(formatRutDisplay(e.target.value))}
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
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', fontWeight: 600, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
