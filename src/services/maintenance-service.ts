import prisma from '@/lib/prisma';
import { calculatePartTotal, calculateTotalPartsCost, calculateMaintenanceTotal } from '@/lib/calculations';
import { Maintenance, MaintenancePart, Prisma } from '@prisma/client';

export interface MaintenancePartInput {
  name: string;
  brand?: string | null;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface CreateMaintenanceInput {
  date: Date | string;
  mileage: number;
  type: string;
  workshop?: string | null;
  description: string;
  laborCost: number;
  notes?: string | null;
  parts?: MaintenancePartInput[];
  paymentMethod?: string | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
}

export class MaintenanceService {
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
   * Lista manutenções de um carro com suporte a filtros (tipo, oficina, período).
   */
  static async listByCar(
    carId: string,
    userId: string,
    filters?: {
      type?: string;
      workshop?: string;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    await this.verifyCarOwner(carId, userId);

    const where: Prisma.MaintenanceWhereInput = { carId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.workshop) {
      where.workshop = { contains: filters.workshop, mode: 'insensitive' };
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

    return prisma.maintenance.findMany({
      where,
      include: {
        parts: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Busca detalhes de uma manutenção. Garante segurança pelo userId do dono do carro.
   */
  static async getById(id: string, userId: string) {
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        car: true,
        parts: true,
      },
    });

    if (!maintenance || maintenance.car.userId !== userId) {
      throw new Error('Manutenção não encontrada ou acesso não autorizado.');
    }

    return maintenance;
  }

  /**
   * Cadastra uma nova manutenção com cálculo automático de custos e peças.
   */
  static async create(carId: string, userId: string, input: CreateMaintenanceInput) {
    await this.verifyCarOwner(carId, userId);

    // Calcular valores das peças
    const partsData = (input.parts || []).map(part => {
      const totalPrice = calculatePartTotal(part.quantity, part.unitPrice);
      return {
        name: part.name,
        brand: part.brand || null,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        totalPrice,
        notes: part.notes || null,
      };
    });

    const totalPartsCost = calculateTotalPartsCost(partsData);
    
    const hasInstallmentValue = input.installmentValue !== undefined && input.installmentValue !== null && input.installmentValue > 0;
    const isInstallment = input.paymentMethod && input.paymentMethod !== 'À vista';
    const totalCost = (isInstallment && hasInstallmentValue)
      ? Number(((input.installmentCount || 1) * input.installmentValue!).toFixed(2))
      : calculateMaintenanceTotal(input.laborCost, totalPartsCost);

    // Atualiza quilometragem atual do carro caso a manutenção tenha quilometragem maior
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (car && input.mileage > car.currentMileage) {
      await prisma.car.update({
        where: { id: carId },
        data: { currentMileage: input.mileage },
      });
    }

    return prisma.maintenance.create({
      data: {
        carId,
        date: new Date(input.date),
        mileage: input.mileage,
        type: input.type,
        workshop: input.workshop || null,
        description: input.description,
        laborCost: input.laborCost,
        totalPartsCost,
        totalCost,
        paymentMethod: input.paymentMethod || "À vista",
        installmentCount: input.installmentCount || 1,
        installmentValue: input.installmentValue || null,
        notes: input.notes || null,
        parts: {
          create: partsData,
        },
      },
      include: {
        parts: true,
      },
    });
  }

  /**
   * Edita uma manutenção recalculando custos e atualizando peças de forma consistente.
   */
  static async update(id: string, userId: string, input: CreateMaintenanceInput) {
    // Busca manutenção para verificar dono e carId
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!maintenance || maintenance.car.userId !== userId) {
      throw new Error('Manutenção não encontrada ou acesso não autorizado.');
    }

    const carId = maintenance.carId;

    // Calcular valores das peças
    const partsData = (input.parts || []).map(part => {
      const totalPrice = calculatePartTotal(part.quantity, part.unitPrice);
      return {
        name: part.name,
        brand: part.brand || null,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        totalPrice,
        notes: part.notes || null,
      };
    });

    const totalPartsCost = calculateTotalPartsCost(partsData);
    
    const hasInstallmentValue = input.installmentValue !== undefined && input.installmentValue !== null && input.installmentValue > 0;
    const isInstallment = input.paymentMethod && input.paymentMethod !== 'À vista';
    const totalCost = (isInstallment && hasInstallmentValue)
      ? Number(((input.installmentCount || 1) * input.installmentValue!).toFixed(2))
      : calculateMaintenanceTotal(input.laborCost, totalPartsCost);

    // Atualiza quilometragem atual do carro caso a manutenção tenha quilometragem maior
    if (input.mileage > maintenance.car.currentMileage) {
      await prisma.car.update({
        where: { id: carId },
        data: { currentMileage: input.mileage },
      });
    }

    // Executa em transação para garantir que peças antigas sejam deletadas e novas criadas
    return prisma.$transaction(async (tx) => {
      // Deletar peças antigas
      await tx.maintenancePart.deleteMany({
        where: { maintenanceId: id },
      });

      // Atualizar manutenção e recriar peças
      return tx.maintenance.update({
        where: { id },
        data: {
          date: new Date(input.date),
          mileage: input.mileage,
          type: input.type,
          workshop: input.workshop || null,
          description: input.description,
          laborCost: input.laborCost,
          totalPartsCost,
          totalCost,
          paymentMethod: input.paymentMethod || "À vista",
          installmentCount: input.installmentCount || 1,
          installmentValue: input.installmentValue || null,
          notes: input.notes || null,
          parts: {
            create: partsData,
          },
        },
        include: {
          parts: true,
        },
      });
    });
  }

  /**
   * Exclui uma manutenção (e suas peças em cascata).
   */
  static async delete(id: string, userId: string) {
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!maintenance || maintenance.car.userId !== userId) {
      throw new Error('Manutenção não encontrada ou acesso não autorizado.');
    }

    return prisma.maintenance.delete({
      where: { id },
    });
  }

  /**
   * Recalcula os custos totalPartsCost e totalCost de uma manutenção após modificações isoladas nas peças.
   */
  static async recalculateCosts(maintenanceId: string, tx: Prisma.TransactionClient = prisma): Promise<void> {
    const parts = await tx.maintenancePart.findMany({
      where: { maintenanceId },
    });
    
    const maintenance = await tx.maintenance.findUnique({
      where: { id: maintenanceId },
    });

    if (!maintenance) return;

    const totalPartsCost = calculateTotalPartsCost(parts);
    const totalCost = calculateMaintenanceTotal(maintenance.laborCost, totalPartsCost);

    await tx.maintenance.update({
      where: { id: maintenanceId },
      data: {
        totalPartsCost,
        totalCost,
      },
    });
  }
}

