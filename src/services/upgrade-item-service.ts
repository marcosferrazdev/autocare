import prisma from '@/lib/prisma';
import { UpgradeItem, Prisma } from '@prisma/client';

export interface CreateUpgradeItemInput {
  name: string;
  description?: string | null;
  estimatedValue?: number | null;
  purchaseLink?: string | null;
  status?: string;
  priority?: string;
}

export class UpgradeItemService {
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
   * Lista itens de melhoria/reforma de um carro.
   */
  static async listByCar(carId: string, userId: string): Promise<UpgradeItem[]> {
    await this.verifyCarOwner(carId, userId);
    return prisma.upgradeItem.findMany({
      where: { carId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cadastra uma nova melhoria/reforma.
   */
  static async create(carId: string, userId: string, input: CreateUpgradeItemInput): Promise<UpgradeItem> {
    await this.verifyCarOwner(carId, userId);
    return prisma.upgradeItem.create({
      data: {
        carId,
        name: input.name,
        description: input.description || null,
        estimatedValue: input.estimatedValue || null,
        purchaseLink: input.purchaseLink || null,
        status: input.status || 'Pendente',
        priority: input.priority || 'Média',
      },
    });
  }

  /**
   * Atualiza uma melhoria/reforma.
   */
  static async update(id: string, userId: string, input: Partial<CreateUpgradeItemInput>): Promise<UpgradeItem> {
    const item = await prisma.upgradeItem.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!item || item.car.userId !== userId) {
      throw new Error('Item não encontrado ou acesso não autorizado.');
    }

    return prisma.upgradeItem.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? input.description : undefined,
        estimatedValue: input.estimatedValue !== undefined ? input.estimatedValue : undefined,
        purchaseLink: input.purchaseLink !== undefined ? input.purchaseLink : undefined,
        status: input.status !== undefined ? input.status : undefined,
        priority: input.priority !== undefined ? input.priority : undefined,
      },
    });
  }

  /**
   * Exclui uma melhoria/reforma.
   */
  static async delete(id: string, userId: string): Promise<UpgradeItem> {
    const item = await prisma.upgradeItem.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!item || item.car.userId !== userId) {
      throw new Error('Item não encontrado ou acesso não autorizado.');
    }

    return prisma.upgradeItem.delete({
      where: { id },
    });
  }
}
