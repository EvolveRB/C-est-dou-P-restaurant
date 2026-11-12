import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeRut } from '../utils/rut';
import { roleLog } from '../utils/roleLogger';

// ──────────────────────────────────────────────────────────────────────────────
// Variable global del backend. Sobreponible vía .env (VITE_API_URL).
// En producción (Railway / Docker SPA), usa ruta relativa ('')
// ──────────────────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const AuthContext = createContext(null);

function isClientRoute() {
  if (typeof window === 'undefined') return false;
  return /^\/(mesa|menu|cliente)(\/|$)/.test(window.location.pathname);
}

export function AuthProvider({ children }) {
  // Estado estrictamente en memoria (NO se guarda en localStorage por seguridad)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(() => !isClientRoute());
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [requiresSetupCode, setRequiresSetupCode] = useState(false);

  // Limpiar cualquier rastro legado inseguro en localStorage de versiones anteriores
  useEffect(() => {
    try {
      localStorage.removeItem('cest_doux_staff_user');
      localStorage.removeItem('cest_doux_empleados_cache');
      localStorage.removeItem('cest_doux_llamadas_garzon');
      localStorage.removeItem('cest_doux_total_mesas');
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, []);

  const refreshAuthSession = useCallback(async () => {
    if (isClientRoute()) {
      setInitializing(false);
      return;
    }

    try {
      const statusRes = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include',
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setNeedsAdminSetup(Boolean(statusData.needs_admin_setup));
        setRequiresSetupCode(Boolean(statusData.requires_setup_code));

        if (statusData.needs_admin_setup) {
          setUser(null);
          setInitializing(false);
          return;
        }
      }

      const meRes = await fetch(`${API_URL}/empleados/me`, {
        credentials: 'include',
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const normalized = normalizeEmpleado(meData);
        setUser(normalized);
        roleLog(normalized.role, 'info', 'Sesión verificada correctamente');
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAuthSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshAuthSession]);

  const setupInitialAdmin = async ({ rut, nombre, apellido, correo, telefono, password, confirmPassword, setupCode }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/setup-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rut: normalizeRut(rut),
          nombre: nombre?.trim(),
          apellido: apellido?.trim() || '',
          correo: correo?.trim() || null,
          telefono: telefono?.trim() || null,
          password,
          confirm_password: confirmPassword,
          setup_code: setupCode?.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        const msg =
          body?.detail === 'INVALID_SETUP_CODE'
            ? 'El código de activación es incorrecto.'
            : body?.detail === 'SETUP_ALREADY_COMPLETED'
              ? 'El administrador inicial ya fue configurado.'
              : body?.detail || 'No se pudo configurar el administrador inicial.';
        return { success: false, error: msg };
      }

      const userData = normalizeEmpleado(body.user);
      setNeedsAdminSetup(false);
      setUser(userData);
      roleLog(userData.role, 'info', 'Administrador inicial activado');
      setLoading(false);
      return { success: true, user: userData };
    } catch {
      setLoading(false);
      return {
        success: false,
        error: `No se pudo conectar con el servidor (${API_URL || 'local'}).`,
      };
    }
  };

  const login = async (rutOrUser, password) => {
    setLoading(true);
    try {
      const trimmed = (rutOrUser || '').trim();
      const res = await fetch(`${API_URL}/empleados/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rut: normalizeRut(trimmed),
          username: trimmed,
          password,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errCode = errBody?.detail ?? '';

        let errorType = 'generic';
        let message = `Error ${res.status} al autenticar`;

        if (res.status === 401) {
          errorType = 'invalid_credentials';
          message = 'RUT o contraseña incorrectos.';
        } else if (res.status === 503) {
          errorType = 'database_error';
          message = 'No se pudo conectar con la base de datos.';
        } else if (res.status >= 500) {
          errorType = 'backend_error';
          message = 'Hubo un error en el backend.';
        }

        if (errCode && res.status !== 401 && res.status < 500) {
          message = errCode;
        }
        setLoading(false);
        return { success: false, error: message, errorType };
      }

      const data = await res.json();
      const userData = normalizeEmpleado(data);
      setUser(userData);
      roleLog(
        userData.role,
        'info',
        userData.mustChangePassword
          ? 'Primer ingreso: requiere cambio de contraseña'
          : 'Inicio de sesión exitoso'
      );
      setLoading(false);
      return { success: true, user: userData };
    } catch {
      setLoading(false);
      return {
        success: false,
        error: `El backend no está levantado o no responde (${API_URL || 'local'}).`,
        errorType: 'backend_down',
      };
    }
  };

  const changePassword = async ({ newPassword, confirmPassword, currentPassword = '' }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/empleados/cambiar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
          current_password: currentPassword || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: body?.detail || 'No se pudo actualizar la contraseña.' };
      }

      const updatedUser = normalizeEmpleado(body.user);
      setUser(updatedUser);
      roleLog(updatedUser.role, 'info', 'Contraseña definitiva activada');
      setLoading(false);
      return { success: true, user: updatedUser };
    } catch {
      setLoading(false);
      return { success: false, error: 'Error de conexión al actualizar la contraseña.' };
    }
  };

  const logout = async () => {
    const activeRole = user?.role;
    try {
      await fetch(`${API_URL}/empleados/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignorar fallo de red en cierre de sesión
    }
    setUser(null);
    if (activeRole) {
      roleLog(activeRole, 'info', 'Sesión cerrada');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        mustChangePassword: Boolean(user?.mustChangePassword),
        initializing,
        needsAdminSetup,
        requiresSetupCode,
        setupInitialAdmin,
        login,
        changePassword,
        logout,
        refreshAuthSession,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function normalizeEmpleado(data) {
  const rawCargo = data?.cargo ?? data?.rol ?? data?.role ?? '';
  const role = mapCargoToRole(rawCargo);
  const displayName =
    data?.nombre && data?.apellido
      ? `${data.nombre} ${data.apellido}`.trim()
      : data?.nombre ?? data?.displayName ?? 'Personal de Turno';

  return {
    id: data?.id ?? data?._id,
    rut: data?.rut ?? '',
    username: data?.username ?? data?.rut ?? 'empleado',
    displayName,
    role,
    mustChangePassword: Boolean(data?.must_change_password),
    loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function mapCargoToRole(cargo) {
  const c = (cargo ?? '').toLowerCase();
  if (c.includes('admin') || c.includes('gerente')) {
    return 'Administrador';
  }
  if (c.includes('cocin') || c.includes('chef')) {
    return 'Cocina';
  }
  return 'Garzón';
}
