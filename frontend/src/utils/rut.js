/**
 * Normaliza un RUT chileno al formato sin puntos y con guión: 12345678-K.
 */
export function normalizeRut(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleaned.length < 2) return cleaned;
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
}

/**
 * Formatea visualmente mientras el usuario escribe (ej: 12.345.678-9).
 */
export function formatRutDisplay(raw) {
  const norm = normalizeRut(raw);
  if (!norm.includes('-')) return norm;
  const [body, dv] = norm.split('-');
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

/**
 * Valida formato básico de RUT chileno (7-8 dígitos + guión + dígito o K).
 */
export function isValidRutFormat(raw) {
  const norm = normalizeRut(raw);
  return /^\d{7,8}-[0-9K]$/.test(norm);
}

