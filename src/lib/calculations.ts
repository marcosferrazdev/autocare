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

/**
 * Calcula o consumo médio em km/L
 */
export function calculateFuelConsumption(
  currentMileage: number,
  previousMileage: number | null | undefined,
  liters: number
): number | null {
  if (previousMileage === null || previousMileage === undefined || liters <= 0) {
    return null;
  }
  const diffKm = currentMileage - previousMileage;
  if (diffKm <= 0) {
    return null;
  }
  return Number((diffKm / liters).toFixed(2));
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
