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
    averageConsumption: number | null;
    costPerKm: number;
  };
  charts: {
    monthlyExpenses: {
      month: string; // "MM/AAAA"
      maintenance: number;
      fuel: number;
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

export class DashboardService {
  static async getDashboardData(carId: string, userId: string): Promise<DashboardData> {
    // 1. Busca o carro e garante permissão
    const car = await prisma.car.findFirst({
      where: { id: carId, userId },
    });

    if (!car) {
      throw new Error('Veículo não encontrado ou acesso não autorizado.');
    }

    // 2. Busca todas as manutenções do carro
    const maintenances = await prisma.maintenance.findMany({
      where: { carId },
      orderBy: { date: 'asc' },
    });

    // 3. Busca todos os abastecimentos do carro
    const fuelRecords = await prisma.fuelRecord.findMany({
      where: { carId },
      orderBy: { date: 'asc' },
    });

    // 4. Calcula métricas básicas
    const totalMaintenanceCost = maintenances.reduce((sum, m) => sum + m.totalCost, 0);
    const totalFuelCost = fuelRecords.reduce((sum, f) => sum + f.totalPrice, 0);
    const totalCarCost = totalMaintenanceCost + totalFuelCost;

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

    // Calcular consumo médio (média de abastecimentos com consumo válido)
    const validConsumptions = fuelRecords
      .map(f => f.consumptionKmPerLiter)
      .filter((c): c is number => c !== null && c > 0);
    
    const averageConsumption = validConsumptions.length > 0
      ? Number((validConsumptions.reduce((sum, val) => sum + val, 0) / validConsumptions.length).toFixed(2))
      : null;

    // Calcular custo por km
    // km rodados: diferença entre a maior quilometragem registrada e a menor quilometragem (inicial do carro)
    const allMileages = [
      car.currentMileage,
      ...maintenances.map(m => m.mileage),
      ...fuelRecords.map(f => f.mileage)
    ].filter(m => m > 0);

    const minMileage = allMileages.length > 0 ? Math.min(...allMileages) : 0;
    const maxMileage = allMileages.length > 0 ? Math.max(...allMileages) : 0;
    
    // Fallback: se não houver registros, km rodado é 0. O minMileage pode ser a quilometragem atual do carro na criação.
    const costPerKm = calculateCostPerKm(totalCarCost, minMileage, maxMileage);

    // 5. Monta dados dos gráficos
    
    // Gráfico de Gastos por Mês (Agrupado por Ano-Mês nos últimos 12 meses)
    const expensesByMonthMap: Record<string, { maintenance: number; fuel: number }> = {};

    // Processa manutenções
    maintenances.forEach(m => {
      const monthYear = `${String(m.date.getUTCMonth() + 1).padStart(2, '0')}/${m.date.getUTCFullYear()}`;
      if (!expensesByMonthMap[monthYear]) {
        expensesByMonthMap[monthYear] = { maintenance: 0, fuel: 0 };
      }
      expensesByMonthMap[monthYear].maintenance += m.totalCost;
    });

    // Processa abastecimentos
    fuelRecords.forEach(f => {
      const monthYear = `${String(f.date.getUTCMonth() + 1).padStart(2, '0')}/${f.date.getUTCFullYear()}`;
      if (!expensesByMonthMap[monthYear]) {
        expensesByMonthMap[monthYear] = { maintenance: 0, fuel: 0 };
      }
      expensesByMonthMap[monthYear].fuel += f.totalPrice;
    });

    const monthlyExpenses = Object.entries(expensesByMonthMap)
      .map(([month, data]) => ({
        month,
        maintenance: Number(data.maintenance.toFixed(2)),
        fuel: Number(data.fuel.toFixed(2)),
        total: Number((data.maintenance + data.fuel).toFixed(2)),
      }))
      // Ordenar por data cronológica (convertendo de volta para data para comparar)
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split('/').map(Number);
        const [monthB, yearB] = b.month.split('/').map(Number);
        return new Date(yearA, monthA - 1).getTime() - new Date(yearB, monthB - 1).getTime();
      });

    // Gráfico de Gastos por Tipo de Manutenção
    const expensesByTypeMap: Record<string, number> = {};
    maintenances.forEach(m => {
      expensesByTypeMap[m.type] = (expensesByTypeMap[m.type] || 0) + m.totalCost;
    });

    const expensesByType = Object.entries(expensesByTypeMap).map(([type, value]) => ({
      type,
      value: Number(value.toFixed(2)),
    }));

    // Histórico de Consumo
    const consumptionHistory = fuelRecords
      .filter(f => f.consumptionKmPerLiter !== null)
      .map(f => {
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
        totalCarCost: Number(totalCarCost.toFixed(2)),
        latestMaintenance,
        latestFuelRecord,
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
