import prisma from '@/lib/prisma';
import { Car, Prisma } from '@prisma/client';

export class CarService {
  /**
   * Lista todos os carros de um usuário específico.
   */
  static async list(userId: string): Promise<Car[]> {
    return prisma.car.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca os detalhes de um carro do usuário pelo ID, incluindo informações técnicas da web.
   */
  static async getById(id: string, userId: string) {
    return prisma.car.findFirst({
      where: { id, userId },
      include: {
        vehicleWebInfo: true,
      },
    });
  }

  /**
   * Cadastra um novo carro para o usuário.
   */
  static async create(userId: string, data: Omit<Prisma.CarUncheckedCreateInput, 'userId'>): Promise<Car> {
    return prisma.car.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  /**
   * Atualiza as informações de um carro. Garante que pertença ao usuário.
   */
  static async update(id: string, userId: string, data: Partial<Prisma.CarUpdateInput>): Promise<Car> {
    // Verifica primeiro se o carro pertence ao usuário
    const carExists = await prisma.car.findFirst({
      where: { id, userId },
    });

    if (!carExists) {
      throw new Error('Veículo não encontrado ou você não tem permissão para editá-lo.');
    }

    return prisma.car.update({
      where: { id },
      data,
    });
  }

  /**
   * Exclui um carro e todas as suas manutenções/abastecimentos (cascata pelo BD).
   */
  static async delete(id: string, userId: string): Promise<Car> {
    const carExists = await prisma.car.findFirst({
      where: { id, userId },
    });

    if (!carExists) {
      throw new Error('Veículo não encontrado ou você não tem permissão para excluí-lo.');
    }

    return prisma.car.delete({
      where: { id },
    });
  }

  /**
   * Atualiza a quilometragem atual do carro com base no registro mais recente (abastecimento ou manutenção).
   */
  static async updateCarMileage(carId: string, tx: Prisma.TransactionClient = prisma): Promise<void> {
    const latestFuel = await tx.fuelRecord.findFirst({
      where: { carId },
      orderBy: [
        { date: 'desc' },
        { mileage: 'desc' }
      ],
    });

    const latestMaintenance = await tx.maintenance.findFirst({
      where: { carId },
      orderBy: [
        { date: 'desc' },
        { mileage: 'desc' }
      ],
    });

    let newMileage = 0;

    if (latestFuel && latestMaintenance) {
      const fuelDate = new Date(latestFuel.date).getTime();
      const maintDate = new Date(latestMaintenance.date).getTime();
      if (fuelDate > maintDate) {
        newMileage = latestFuel.mileage;
      } else if (maintDate > fuelDate) {
        newMileage = latestMaintenance.mileage;
      } else {
        newMileage = Math.max(latestFuel.mileage, latestMaintenance.mileage);
      }
    } else if (latestFuel) {
      newMileage = latestFuel.mileage;
    } else if (latestMaintenance) {
      newMileage = latestMaintenance.mileage;
    }

    if (newMileage > 0) {
      await tx.car.update({
        where: { id: carId },
        data: { currentMileage: newMileage },
      });
    }
  }
}
