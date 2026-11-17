/**
 * Normaliza un RUT chileno al formato sin puntos y con guión: 12345678-K (máx. 9 dígitos/caracteres).
 */
export function normalizeRut(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (cleaned.length < 2) return cleaned;
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
}

/**
 * Formatea visualmente mientras el usuario escribe (ej: 12.345.678-9), truncado a 9 dígitos útiles.
 */
export function formatRutDisplay(raw) {
  const norm = normalizeRut(raw);
  if (!norm.includes('-')) return norm;
  const [body, dv] = norm.split('-');
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

/**
 * Calcula el dígito verificador chileno (Módulo 11) para 8 dígitos numéricos.
 */
export function computeRutDv(bodyDigits) {
  let sum = 0;
  let multiplier = 2;
  for (let i = bodyDigits.length - 1; i >= 0; i -= 1) {
    sum += Number(bodyDigits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rem = 11 - (sum % 11);
  if (rem === 11) return '0';
  if (rem === 10) return 'K';
  return String(rem);
}

/**
 * Valida estrictamente un RUT chileno de 9 dígitos (8 dígitos + DV) y Módulo 11.
 */
export function isValidRutFormat(raw) {
  const norm = normalizeRut(raw);
  if (!/^\d{8}-[0-9K]$/.test(norm)) return false;
  const [body, dv] = norm.split('-');
  return computeRutDv(body) === dv;
}

/**
 * Capitaliza la primera letra de cada palabra para nombres y apellidos.
 */
export function capitalizePersonName(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
