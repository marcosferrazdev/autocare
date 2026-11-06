/**
 * Calcula o valor total de uma peça
 */
export function calculatePartTotal(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}

/**
 * Calcula o custo total das peças em uma manutenção
 */
export function calculateTotalPartsCost(parts: { totalPrice: number }[]): number {
  return Number(parts.reduce((sum, part) => sum + part.totalPrice, 0).toFixed(2));
}

/**
 * Calcula o custo total da manutenção (mão de obra + peças)
 */
export function calculateMaintenanceTotal(laborCost: number, totalPartsCost: number): number {
  return Number((laborCost + totalPartsCost).toFixed(2));
}

/**
 * Calcula o valor total do abastecimento
 */
export function calculateFuelRecordTotal(pricePerLiter: number, liters: number): number {
  return Number((pricePerLiter * liters).toFixed(2));
}

type FuelFill = { mileage: number; liters: number; fullTank: boolean };
export type Consumption = { value: number; estimated: boolean } | null;

const round2 = (n: number) => Number(n.toFixed(2));

/**
 * Trechos "tanque cheio a tanque cheio": cada trecho vai do abastecimento seguinte a um
 * tanque cheio (start) até o próximo tanque cheio (end) e soma os litros desses abastecimentos.
 * Espera os registros ordenados por quilometragem crescente.
 */
function fullTankIntervals(records: FuelFill[]) {
  const intervals: { start: number; end: number; km: number; liters: number }[] = [];
  let lastFull: number | null = null;
  let liters = 0;
  records.forEach((r, index) => {
    liters += r.liters;
    if (!r.fullTank) return;
    if (lastFull !== null && r.mileage > records[lastFull].mileage && liters > 0) {
      intervals.push({ start: lastFull + 1, end: index, km: r.mileage - records[lastFull].mileage, liters });
    }
    lastFull = index;
    liters = 0;
  });
  return intervals;
}

/**
 * Consumo em km/L de cada abastecimento. Dentro de um trecho entre tanques cheios todos
 * (parciais inclusos) recebem o km/L exato do trecho. Fora dele vira estimativa: supõe que
 * o carro gastou o que foi colocado no abastecimento anterior.
 */
export function calculateFuelConsumptions(records: FuelFill[]): Consumption[] {
  const result: Consumption[] = records.map(() => null);
  for (const t of fullTankIntervals(records)) {
    for (let i = t.start; i <= t.end; i++) result[i] = { value: round2(t.km / t.liters), estimated: false };
  }
  for (let i = 1; i < records.length; i++) {
    const km = records[i].mileage - records[i - 1].mileage;
    if (result[i] === null && km > 0 && records[i - 1].liters > 0) {
      result[i] = { value: round2(km / records[i - 1].liters), estimated: true };
    }
  }
  return result;
}

/**
 * Consumo médio em km/L: km total dos trechos / litros total (não a média das médias).
 * Sem nenhum trecho fechado, estima com km do 1º ao último ÷ litros de todos menos o último.
 */
export function calculateAverageConsumption(records: FuelFill[]): Consumption {
  const sorted = [...records].sort((a, b) => a.mileage - b.mileage);
  const intervals = fullTankIntervals(sorted);
  if (intervals.length > 0) {
    const km = intervals.reduce((sum, t) => sum + t.km, 0);
    const liters = intervals.reduce((sum, t) => sum + t.liters, 0);
    return { value: round2(km / liters), estimated: false };
  }
  if (sorted.length < 2) return null;
  const km = sorted[sorted.length - 1].mileage - sorted[0].mileage;
  const liters = sorted.slice(0, -1).reduce((sum, r) => sum + r.liters, 0);
  return km > 0 && liters > 0 ? { value: round2(km / liters), estimated: true } : null;
}

/**
 * Calcula o custo por quilômetro rodado
 */
export function calculateCostPerKm(
  totalCost: number,
  initialMileage: number,
  currentMileage: number
): number {
  const kmDriven = currentMileage - initialMileage;
  if (kmDriven <= 0) {
    return 0;
  }
  return Number((totalCost / kmDriven).toFixed(2));
}
