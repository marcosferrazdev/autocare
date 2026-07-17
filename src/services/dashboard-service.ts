import prisma from '@/lib/prisma';
import { calculateCostPerKm } from '@/lib/calculations';

export interface DashboardData {
  car: {
    id: string;
    brand: string;
    model: string;
    nickname: string | null;
    currentMileage: number;
    plate: string | null;
  };
  metrics: {
    totalMaintenanceCost: number;
    totalFuelCost: number;
    totalWashCost: number;
    totalCarCost: number;
    latestMaintenance: {
      date: Date;
      description: string;
      totalCost: number;
    } | null;
    latestFuelRecord: {
      date: Date;
      liters: number;
      totalPrice: number;
    } | null;
    latestWashRecord: {
      date: Date;
      label: string;
      price: number;
      selfWash: boolean;
    } | null;
    averageConsumption: number | null;
    costPerKm: number;
  };
  charts: {
    monthlyExpenses: {
      month: string; // "MM/AAAA"
      maintenance: number;
      fuel: number;
      wash: number;
      total: number;
    }[];
    expensesByType: {
      type: string;
      value: number;
    }[];
    consumptionHistory: {
      date: string; // "DD/MM"
      consumption: number;
    }[];
  };
}

type MonthBucket = { maintenance: number; fuel: number; wash: number };

function emptyMonthBucket(): MonthBucket {
  return { maintenance: 0, fuel: 0, wash: 0 };
}

function ensureMonth(map: Record<string, MonthBucket>, monthYear: string): MonthBucket {
  if (!map[monthYear]) {
    map[monthYear] = emptyMonthBucket();
  }
  return map[monthYear];
}

function monthYearFromDate(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export class DashboardService {
  static async getDashboardData(carId: string, userId: string): Promise<DashboardData> {
    const car = await prisma.car.findFirst({
      where: { id: carId, userId },
    });

    if (!car) {
      throw new Error('Veículo não encontrado ou acesso não autorizado.');
    }

    const maintenances = await prisma.maintenance.findMany({
      where: { carId },
      orderBy: { date: 'asc' },
    });

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: { carId },
      orderBy: { date: 'asc' },
    });

    const washRecords = await prisma.washRecord.findMany({
      where: { carId },
      orderBy: { date: 'asc' },
    });

    const totalMaintenanceCost = maintenances.reduce((sum, m) => sum + m.totalCost, 0);
    const totalFuelCost = fuelRecords.reduce((sum, f) => sum + f.totalPrice, 0);
    const totalWashCost = washRecords.reduce((sum, w) => sum + (w.price || 0), 0);
    const totalCarCost = totalMaintenanceCost + totalFuelCost + totalWashCost;

    const latestMaintenance = maintenances.length > 0
      ? {
          date: maintenances[maintenances.length - 1].date,
          description: maintenances[maintenances.length - 1].description,
          totalCost: maintenances[maintenances.length - 1].totalCost,
        }
      : null;

    const latestFuelRecord = fuelRecords.length > 0
      ? {
          date: fuelRecords[fuelRecords.length - 1].date,
          liters: fuelRecords[fuelRecords.length - 1].liters,
          totalPrice: fuelRecords[fuelRecords.length - 1].totalPrice,
        }
      : null;

    const lastWash = washRecords.length > 0 ? washRecords[washRecords.length - 1] : null;
    const latestWashRecord = lastWash
      ? {
          date: lastWash.date,
          label: lastWash.selfWash
            ? 'Lavagem própria'
            : lastWash.carWashName || 'Lava-jato',
          price: lastWash.price || 0,
          selfWash: lastWash.selfWash,
        }
      : null;

    const validConsumptions = fuelRecords
      .map((f) => f.consumptionKmPerLiter)
      .filter((c): c is number => c !== null && c > 0);

    const averageConsumption = validConsumptions.length > 0
      ? Number((validConsumptions.reduce((sum, val) => sum + val, 0) / validConsumptions.length).toFixed(2))
      : null;

    const allMileages = [
      car.currentMileage,
      ...maintenances.map((m) => m.mileage),
      ...fuelRecords.map((f) => f.mileage),
      ...washRecords.map((w) => w.mileage).filter((m): m is number => m != null && m > 0),
    ].filter((m) => m > 0);

    const minMileage = allMileages.length > 0 ? Math.min(...allMileages) : 0;
    const maxMileage = allMileages.length > 0 ? Math.max(...allMileages) : 0;
    const costPerKm = calculateCostPerKm(totalCarCost, minMileage, maxMileage);

    const expensesByMonthMap: Record<string, MonthBucket> = {};

    maintenances.forEach((m) => {
      const isInstallment = m.paymentMethod && m.paymentMethod !== 'À vista';
      const count = isInstallment && m.installmentCount && m.installmentCount > 0 ? m.installmentCount : 1;
      const value =
        isInstallment && m.installmentValue && m.installmentValue > 0
          ? m.installmentValue
          : isInstallment
            ? Number((m.totalCost / count).toFixed(2))
            : m.totalCost;

      if (isInstallment && count > 1) {
        for (let i = 0; i < count; i++) {
          const targetDate = new Date(m.date);
          targetDate.setUTCMonth(m.date.getUTCMonth() + i);
          ensureMonth(expensesByMonthMap, monthYearFromDate(targetDate)).maintenance += value;
        }
      } else {
        ensureMonth(expensesByMonthMap, monthYearFromDate(m.date)).maintenance += m.totalCost;
      }
    });

    fuelRecords.forEach((f) => {
      const isInstallment = f.paymentMethod && f.paymentMethod !== 'À vista';
      const count = isInstallment && f.installmentCount && f.installmentCount > 0 ? f.installmentCount : 1;
      const value =
        isInstallment && f.installmentValue && f.installmentValue > 0
          ? f.installmentValue
          : isInstallment
            ? Number((f.totalPrice / count).toFixed(2))
            : f.totalPrice;

      if (isInstallment && count > 1) {
        for (let i = 0; i < count; i++) {
          const targetDate = new Date(f.date);
          targetDate.setUTCMonth(f.date.getUTCMonth() + i);
          ensureMonth(expensesByMonthMap, monthYearFromDate(targetDate)).fuel += value;
        }
      } else {
        ensureMonth(expensesByMonthMap, monthYearFromDate(f.date)).fuel += f.totalPrice;
      }
    });

    washRecords.forEach((w) => {
      if (!w.price || w.price <= 0) return;
      ensureMonth(expensesByMonthMap, monthYearFromDate(w.date)).wash += w.price;
    });

    const monthlyExpenses = Object.entries(expensesByMonthMap)
      .map(([month, data]) => ({
        month,
        maintenance: Number(data.maintenance.toFixed(2)),
        fuel: Number(data.fuel.toFixed(2)),
        wash: Number(data.wash.toFixed(2)),
        total: Number((data.maintenance + data.fuel + data.wash).toFixed(2)),
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split('/').map(Number);
        const [monthB, yearB] = b.month.split('/').map(Number);
        return new Date(yearA, monthA - 1).getTime() - new Date(yearB, monthB - 1).getTime();
      });

    const expensesByTypeMap: Record<string, number> = {};
    maintenances.forEach((m) => {
      expensesByTypeMap[m.type] = (expensesByTypeMap[m.type] || 0) + m.totalCost;
    });

    const expensesByType = Object.entries(expensesByTypeMap).map(([type, value]) => ({
      type,
      value: Number(value.toFixed(2)),
    }));

    const consumptionHistory = fuelRecords
      .filter((f) => f.consumptionKmPerLiter !== null)
      .map((f) => {
        const day = String(f.date.getUTCDate()).padStart(2, '0');
        const month = String(f.date.getUTCMonth() + 1).padStart(2, '0');
        return {
          date: `${day}/${month}`,
          consumption: Number((f.consumptionKmPerLiter ?? 0).toFixed(2)),
        };
      });

    return {
      car: {
        id: car.id,
        brand: car.brand,
        model: car.model,
        nickname: car.nickname,
        currentMileage: car.currentMileage,
        plate: car.plate,
      },
      metrics: {
        totalMaintenanceCost: Number(totalMaintenanceCost.toFixed(2)),
        totalFuelCost: Number(totalFuelCost.toFixed(2)),
        totalWashCost: Number(totalWashCost.toFixed(2)),
        totalCarCost: Number(totalCarCost.toFixed(2)),
        latestMaintenance,
        latestFuelRecord,
        latestWashRecord,
        averageConsumption,
        costPerKm,
      },
      charts: {
        monthlyExpenses,
        expensesByType,
        consumptionHistory,
      },
    };
  }
}
