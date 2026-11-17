export const DEFAULT_CATEGORIES = [
  { id: 'todos', name: 'Todos' },
  { id: 'desayunos', name: 'Desayunos' },
  { id: 'entradas', name: 'Entradas' },
  { id: 'almuerzos', name: 'Almuerzos' },
  { id: 'postres', name: 'Postres' },
  { id: 'bebestibles', name: 'Bebestibles' },
  { id: 'alimentos para alergicos', name: 'Alimentos para Alérgicos' },
  { id: 'cafe', name: 'Café' },
  { id: 'combos', name: 'Combos' },
];

export function normalizeCategoryKey(rawCategory) {
  const clean = String(rawCategory || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return 'almuerzos';
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
