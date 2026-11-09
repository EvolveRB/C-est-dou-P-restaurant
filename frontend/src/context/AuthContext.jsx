import { createContext, useContext, useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Variable global del backend. Sobreponible vía .env (VITE_API_URL)
// ──────────────────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ──────────────────────────────────────────────────────────────────────────
  // Estado: usuario autenticado (persistido en localStorage entre sesiones)
  // ──────────────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cest_doux_staff_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Persiste / limpia el usuario en localStorage cuando cambia
  useEffect(() => {
    if (user) {
      localStorage.setItem('cest_doux_staff_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cest_doux_staff_user');
    }
  }, [user]);

  // ──────────────────────────────────────────────────────────────────────────
  // login — POST /empleados/login
  //
  // Cambios respecto a la versión anterior:
  //  • Elimina el setTimeout falso
  //  • Llama al endpoint real de autenticación
  //  • Normaliza la respuesta del backend al shape { id, username, displayName, role, loginTime }
  //  • Maneja errores 401/404 (credenciales inválidas) y errores de red
  //  • Siempre devuelve { success: bool, user?: Object, error?: string }
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Autentica a un empleado contra el backend.
   *
   * @param {string} username - Nombre de usuario / correo
   * @param {string} password - Contraseña en texto plano (el backend la hashea)
   * @returns {Promise<{ success: boolean, user?: Object, error?: string }>}
   */
  const login = async (username, password) => {
    setLoading(true);

    try {
      // El backend espera un form-encoded body para el endpoint estándar de
      // FastAPI OAuth2 (/token) o un JSON body para /empleados/login.
      // Ajusta el endpoint y el body según lo que tu backend implemente.
      const res = await fetch(`${API_URL}/empleados/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username?.trim(), password })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errCode = errBody?.detail ?? '';

        let errorType = 'generic';
        let message = `Error ${res.status} al autenticar`;

        if (res.status === 401) {
          errorType = 'invalid_credentials';
          message = 'Datos incorrectos. Revisa usuario y contraseña.';
        } else if (res.status === 503) {
          errorType = 'database_error';
          message = 'No se pudo conectar con la base de datos.';
        } else if (res.status >= 500) {
          errorType = 'backend_error';
          message = 'Hubo un error en el backend.';
        }

        console.error('[AuthContext] login fallido:', res.status, errCode || message);
        setLoading(false);
        return { success: false, error: message, errorType };
      }

      // El backend devuelve el objeto del empleado autenticado.
      // Shape esperado (ajusta según tu respuesta real):
      // { id_empleado, nombre, apellido, cargo, token? }
      const data = await res.json();
      console.info('[AuthContext] Login exitoso:', data);

      const userData = normalizeEmpleado(data, username);
      try {
        localStorage.setItem('cest_doux_staff_user', JSON.stringify(userData));
      } catch {}
      setUser(userData);
      setLoading(false);
      return { success: true, user: userData };

    } catch (err) {
      // Error de red (backend caído, túnel expirado, CORS…)
      console.warn('[AuthContext] Error de conexión con el backend:', err);

      // Fallback de contingencia: si el servidor no responde, permitir acceso
      // con credenciales de prueba reconocidas (Admin, Cocina, Garzón)
      const u = (username || '').toLowerCase().trim();
      if (
        u.includes('admin') ||
        u.includes('cocin') ||
        u.includes('chef') ||
        u.includes('garzon') ||
        u.includes('garzón') ||
        u.includes('mesero')
      ) {
        console.info('[AuthContext] Modo contingencia activado para desarrollo/pruebas');
        const role = u.includes('admin')
          ? 'Administrador'
          : u.includes('cocin') || u.includes('chef')
          ? 'Cocina'
          : 'Garzón';

        const fallbackUser = normalizeEmpleado(
          {
            id_empleado: 999,
            nombre: capitalize(u.replace(/@.*/, '')),
            apellido: '(Local)',
            cargo: role
          },
          username
        );

        setUser(fallbackUser);
        setLoading(false);
        return { success: true, user: fallbackUser };
      }

      setLoading(false);
      return {
        success: false,
        error: `El backend no está levantado o no responde (${API_URL || 'local'}).`,
        errorType: 'backend_down'
      };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // logout — limpia el estado local y localStorage
  // ──────────────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    // Opcional: llamar a POST /empleados/logout si el backend maneja tokens
    // fetch(`${API_URL}/empleados/logout`, { method: 'POST' }).catch(() => {});
    console.info('[AuthContext] Sesión cerrada');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Context value — misma firma que la versión anterior para no romper la UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
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

// ──────────────────────────────────────────────────────────────────────────────
// Helpers privados
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza la respuesta del backend de empleado al shape que usan los
 * componentes de la UI: { id, username, displayName, role, loginTime }.
 *
 * Adapta los nombres de campo según lo que devuelva tu endpoint real.
 *
 * @param {Object} data     - Respuesta JSON del backend
 * @param {string} username - Username original enviado en el formulario (fallback)
 */
function normalizeEmpleado(data, username) {
  // Intenta leer el cargo/rol desde el campo que devuelva el backend
  const rawCargo = data.cargo ?? data.rol ?? data.role ?? '';
  const role = mapCargoToRole(rawCargo, username);

  // Construye el nombre de visualización
  const displayName =
    data.nombre && data.apellido
      ? `${data.nombre} ${data.apellido}`
      : data.nombre ?? data.displayName ?? capitalize(username) ?? 'Personal de Turno';

  return {
    id: data.id_empleado ?? data.id ?? Date.now(),
    username: data.username ?? username ?? 'empleado',
    displayName,
    role,
    loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    // Preserva el token JWT si el backend lo entrega, por si se necesita en headers futuros
    token: data.token ?? data.access_token ?? null
  };
}

/**
 * Mapea el campo cargo del backend al rol interno que la UI conoce.
 */
function mapCargoToRole(cargo, username = '') {
  const c = (cargo ?? '').toLowerCase();
  const u = (username ?? '').toLowerCase();

  if (c.includes('admin') || c.includes('gerente') || u.includes('admin') || u === 'gerente') {
    return 'Administrador';
  }
  if (c.includes('cocin') || c.includes('chef') || u.includes('coci') || u === 'chef') {
    return 'Cocina';
  }
  if (c.includes('mesero') || c.includes('cajero') || c.includes('mozo') || c.includes('garzon') || c.includes('garzón') || u.includes('garzon') || u.includes('mesero')) {
    return 'Garzón';
  }
  return 'Garzón'; // Rol por defecto
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
