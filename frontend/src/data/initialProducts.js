export const DEFAULT_CATEGORIES = [
  { id: 'todos', name: 'Todos' },
  { id: 'entradas', name: 'Entradas' },
  { id: 'sopas', name: 'Sopas' },
  { id: 'platos de fondo', name: 'Platos de Fondo' },
  { id: 'carnes', name: 'Carnes' },
  { id: 'pastas', name: 'Pastas' },
  { id: 'postres', name: 'Postres' },
  { id: 'bebidas', name: 'Bebidas' },
];

export function normalizeCategoryKey(rawCategory) {
  const clean = String(rawCategory || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return 'platos de fondo';
  if (clean === 'postre') return 'postres';
  return clean;
}

export const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  })
    .format(Number(price || 0))
    .replace('CLP', '$')
    .trim();
};
