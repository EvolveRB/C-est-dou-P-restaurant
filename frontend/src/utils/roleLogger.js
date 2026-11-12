/**
 * Logger aislado por perfil de usuario.
 * - No emite logs de módulos operativos cuando el usuario está en login o sin sesión.
 * - En producción oculta logs informativos/debug para no exponer detalles al inspeccionar.
 * - Nunca recibe contraseñas, hashes ni tokens.
 */
export function roleLog(role, level = 'info', message = '') {
  if (!role) return;
  if (import.meta.env.PROD && (level === 'info' || level === 'debug' || level === 'log')) {
    return;
  }

  const prefix = `[${role}]`;
  if (level === 'error') {
    console.error(prefix, message);
  } else if (level === 'warn') {
    console.warn(prefix, message);
  } else {
    console.info(prefix, message);
  }
}

