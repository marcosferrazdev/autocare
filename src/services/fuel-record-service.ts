import prisma from '@/lib/prisma';
import { calculateFuelRecordTotal, calculateFuelConsumption } from '@/lib/calculations';
import { FuelRecord, Prisma } from '@prisma/client';

export interface CreateFuelRecordInput {
  date: Date | string;
  mileage: number;
  fuelType: string;
  pricePerLiter: number;
  liters: number;
  gasStation?: string | null;
  city?: string | null;
  fullTank: boolean;
  paymentMethod?: string | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
  notes?: string | null;
}

export class FuelRecordService {
  /**
   * Garante que o carro pertence ao usuário.
   */
  private static async verifyCarOwner(carId: string, userId: string): Promise<void> {
    const car = await prisma.car.findFirst({
      where: { id: carId, userId },
    });
    if (!car) {
      throw new Error('Veículo não encontrado ou acesso não autorizado.');
    }
  }

  /**
   * Recalcula o consumo de todos os abastecimentos de um carro em ordem cronológica de quilometragem.
   * Executado de forma transacional para assegurar integridade completa do banco de dados (self-healing).
   */
  static async recalculateConsumption(carId: string, tx: Prisma.TransactionClient = prisma): Promise<void> {
    const records = await tx.fuelRecord.findMany({
      where: { carId },
      orderBy: { mileage: 'asc' },
    });

    for (let i = 0; i < records.length; i++) {
      const current = records[i];
      const previous = i > 0 ? records[i - 1] : null;

      let consumption: number | null = null;
      if (previous) {
        consumption = calculateFuelConsumption(current.mileage, previous.mileage, current.liters);
      }

      if (current.consumptionKmPerLiter !== consumption) {
        await tx.fuelRecord.update({
          where: { id: current.id },
          data: { consumptionKmPerLiter: consumption },
        });
      }
    }

    // Atualiza a quilometragem do carro com o maior valor encontrado nos abastecimentos
    if (records.length > 0) {
      const maxMileageRecord = records[records.length - 1];
      const car = await tx.car.findUnique({ where: { id: carId } });
      if (car && maxMileageRecord.mileage > car.currentMileage) {
        await tx.car.update({
          where: { id: carId },
          data: { currentMileage: maxMileageRecord.mileage },
        });
      }
    }
  }

  /**
   * Lista abastecimentos de um carro com filtros.
   */
  static async listByCar(
    carId: string,
    userId: string,
    filters?: {
      fuelType?: string;
      gasStation?: string;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    await this.verifyCarOwner(carId, userId);

    const where: Prisma.FuelRecordWhereInput = { carId };

    if (filters?.fuelType) {
      where.fuelType = filters.fuelType;
    }
    if (filters?.gasStation) {
      where.gasStation = { contains: filters.gasStation, mode: 'insensitive' };
    }
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    return prisma.fuelRecord.findMany({
      where,
      orderBy: { mileage: 'desc' },
    });
  }

  /**
   * Busca um abastecimento pelo ID.
   */
  static async getById(id: string, userId: string) {
    const record = await prisma.fuelRecord.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!record || record.car.userId !== userId) {
      throw new Error('Registro de abastecimento não encontrado ou acesso não autorizado.');
    }

    return record;
  }

  /**
   * Cadastra um novo abastecimento.
   */
  static async create(carId: string, userId: string, input: CreateFuelRecordInput) {
    await this.verifyCarOwner(carId, userId);

    const hasInstallmentValue = input.installmentValue !== undefined && input.installmentValue !== null && input.installmentValue > 0;
    const isInstallment = input.paymentMethod && input.paymentMethod !== 'À vista';
    
    const totalPrice = (isInstallment && hasInstallmentValue)
      ? Number(((input.installmentCount || 1) * input.installmentValue!).toFixed(2))
      : calculateFuelRecordTotal(input.pricePerLiter, input.liters);

    return prisma.$transaction(async (tx) => {
      const record = await tx.fuelRecord.create({
        data: {
          carId,
          date: new Date(input.date),
          mileage: input.mileage,
          fuelType: input.fuelType,
          pricePerLiter: input.pricePerLiter,
          liters: input.liters,
          totalPrice,
          gasStation: input.gasStation || null,
          city: input.city || null,
          fullTank: input.fullTank,
          paymentMethod: input.paymentMethod || "À vista",
          installmentCount: input.installmentCount || 1,
          installmentValue: input.installmentValue || null,
          notes: input.notes || null,
        },
      });

      // Recalcular consumo de todos para manter integridade
      await this.recalculateConsumption(carId, tx);

      return record;
    });
  }

  /**
   * Atualiza um abastecimento.
   */
  static async update(id: string, userId: string, input: CreateFuelRecordInput) {
    const record = await prisma.fuelRecord.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!record || record.car.userId !== userId) {
      throw new Error('Registro de abastecimento não encontrado ou acesso não autorizado.');
    }

    const hasInstallmentValue = input.installmentValue !== undefined && input.installmentValue !== null && input.installmentValue > 0;
    const isInstallment = input.paymentMethod && input.paymentMethod !== 'À vista';
    
    const totalPrice = (isInstallment && hasInstallmentValue)
      ? Number(((input.installmentCount || 1) * input.installmentValue!).toFixed(2))
      : calculateFuelRecordTotal(input.pricePerLiter, input.liters);

    return prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.fuelRecord.update({
        where: { id },
        data: {
          date: new Date(input.date),
          mileage: input.mileage,
          fuelType: input.fuelType,
          pricePerLiter: input.pricePerLiter,
          liters: input.liters,
          totalPrice,
          gasStation: input.gasStation || null,
          city: input.city || null,
          fullTank: input.fullTank,
          paymentMethod: input.paymentMethod || "À vista",
          installmentCount: input.installmentCount || 1,
          installmentValue: input.installmentValue || null,
          notes: input.notes || null,
        },
      });

      // Recalcular consumo de todos após a modificação da quilometragem/litragem
      await this.recalculateConsumption(record.carId, tx);

      return updatedRecord;
    });
  }

  /**
   * Exclui um abastecimento.
   */
  static async delete(id: string, userId: string) {
    const record = await prisma.fuelRecord.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!record || record.car.userId !== userId) {
      throw new Error('Registro de abastecimento não encontrado ou acesso não autorizado.');
    }

    return prisma.$transaction(async (tx) => {
      const deletedRecord = await tx.fuelRecord.delete({
        where: { id },
      });

      // Recalcular consumo após remoção
      await this.recalculateConsumption(record.carId, tx);

      return deletedRecord;
    });
  }
}
