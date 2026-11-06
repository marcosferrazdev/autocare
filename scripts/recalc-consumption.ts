/**
 * Recalcula o km/L salvo de todos os abastecimentos com a regra atual.
 * Uso: node --env-file=.env --experimental-strip-types scripts/recalc-consumption.ts
 */
import prismaPkg from '@prisma/client';
import { calculateFuelConsumptions } from '../src/lib/calculations.ts';

const prisma = new prismaPkg.PrismaClient();

const cars = await prisma.car.findMany({ select: { id: true } });
let changed = 0;

for (const car of cars) {
  const records = await prisma.fuelRecord.findMany({
    where: { carId: car.id },
    orderBy: { mileage: 'asc' },
    select: { id: true, mileage: true, liters: true, fullTank: true, consumptionKmPerLiter: true, consumptionEstimated: true },
  });
  const consumptions = calculateFuelConsumptions(records);
  const updates = records.flatMap((r, i) => {
    const value = consumptions[i]?.value ?? null;
    const estimated = consumptions[i]?.estimated ?? false;
    if (r.consumptionKmPerLiter === value && r.consumptionEstimated === estimated) return [];
    return [prisma.fuelRecord.update({ where: { id: r.id }, data: { consumptionKmPerLiter: value, consumptionEstimated: estimated } })];
  });
  changed += updates.length;
  await prisma.$transaction(updates);
}

console.log(`${cars.length} carros, ${changed} abastecimentos atualizados`);
await prisma.$disconnect();
