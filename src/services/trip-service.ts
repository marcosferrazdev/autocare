import prisma from '@/lib/prisma';

export interface TripInput {
  title: string;
  originCity: string;
  destinationCity: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  startMileage?: number | null;
  endMileage?: number | null;
  notes?: string | null;
}

export class TripService {
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
   * Lista viagens de um carro, mais recentes primeiro.
   */
  static async listByCar(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);
    return prisma.trip.findMany({
      where: { carId },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Registra uma viagem.
   */
  static async create(carId: string, userId: string, input: TripInput) {
    await this.verifyCarOwner(carId, userId);
    return prisma.trip.create({
      data: {
        carId,
        title: input.title,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        startMileage: input.startMileage ?? null,
        endMileage: input.endMileage ?? null,
        notes: input.notes || null,
      },
    });
  }

  /**
   * Atualiza uma viagem. Segurança pelo userId do dono do carro.
   */
  static async update(id: string, userId: string, input: TripInput) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!trip || trip.car.userId !== userId) {
      throw new Error('Viagem não encontrada ou acesso não autorizado.');
    }

    return prisma.trip.update({
      where: { id },
      data: {
        title: input.title,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        startMileage: input.startMileage ?? null,
        endMileage: input.endMileage ?? null,
        notes: input.notes || null,
      },
    });
  }

  /**
   * Exclui uma viagem.
   */
  static async delete(id: string, userId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!trip || trip.car.userId !== userId) {
      throw new Error('Viagem não encontrada ou acesso não autorizado.');
    }

    return prisma.trip.delete({ where: { id } });
  }
}
