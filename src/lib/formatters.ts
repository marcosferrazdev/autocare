/**
 * Formata um valor numérico como Real Brasileiro (BRL)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data no padrão brasileiro (dd/mm/aaaa)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Ajuste para evitar fuso horário retrocedendo um dia
  return new Intl.NumberFormat('pt-BR', { minimumIntegerDigits: 2 }).format(d.getUTCDate()) + '/' +
    new Intl.NumberFormat('pt-BR', { minimumIntegerDigits: 2 }).format(d.getUTCMonth() + 1) + '/' +
    d.getUTCFullYear();
}

/**
 * Formata quilometragem (ex: 10000 -> 10.000 km)
 */
export function formatMileage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0 km';
  return `${new Intl.NumberFormat('pt-BR').format(value)} km`;
}

/**
 * Formata consumo médio (ex: 12.5 -> 12,5 km/L)
 */
export function formatConsumption(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} km/L`;
}
