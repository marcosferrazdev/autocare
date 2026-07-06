import prisma from '@/lib/prisma';
import { MaintenanceSchedule } from '@prisma/client';

export interface CreateScheduleInput {
  type: string;
  description?: string | null;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastDoneMileage?: number | null;
  lastDoneDate?: string | Date | null;
}

export type ScheduleStatus = 'atrasado' | 'proximo' | 'ok' | 'sem_referencia';

export interface UpcomingSchedule extends MaintenanceSchedule {
  status: ScheduleStatus;
  nextDueMileage: number | null;
  nextDueDate: Date | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
}

// Limiares para considerar uma manutenção "próxima" do vencimento
const KM_WARNING_THRESHOLD = 500;
const DAYS_WARNING_THRESHOLD = 15;

export class MaintenanceScheduleService {
  /**
   * Garante que o carro pertence ao usuário.
   */
  private static async verifyCarOwner(carId: string, userId: string) {
    const car = await prisma.car.findFirst({
      where: { id: carId, userId },
    });
    if (!car) {
      throw new Error('Veículo não encontrado ou acesso não autorizado.');
    }
    return car;
  }

  /**
   * Lista lembretes de um carro com status calculado (atrasado, próximo, ok).
   * A referência de "última execução" combina o campo manual do lembrete com a
   * manutenção mais recente do mesmo tipo registrada no histórico.
   */
  static async listWithStatus(carId: string, userId: string): Promise<UpcomingSchedule[]> {
    const car = await this.verifyCarOwner(carId, userId);

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { carId },
      orderBy: { createdAt: 'asc' },
    });

    if (schedules.length === 0) return [];

    // Última manutenção de cada tipo, para usar como baseline automático
    const maintenances = await prisma.maintenance.findMany({
      where: { carId, type: { in: schedules.map((s) => s.type) } },
      orderBy: { date: 'desc' },
    });

    const latestByType = new Map<string, { mileage: number; date: Date }>();
    for (const m of maintenances) {
      if (!latestByType.has(m.type)) {
        latestByType.set(m.type, { mileage: m.mileage, date: m.date });
      }
    }

    const now = new Date();

    const result = schedules.map((schedule) => {
      const latest = latestByType.get(schedule.type);

      // Baseline: o que for mais recente entre o registro manual e o histórico
      let baselineMileage: number | null = schedule.lastDoneMileage;
      let baselineDate: Date | null = schedule.lastDoneDate;

      if (latest) {
        if (baselineMileage === null || latest.mileage > baselineMileage) {
          baselineMileage = latest.mileage;
        }
        if (baselineDate === null || latest.date > baselineDate) {
          baselineDate = latest.date;
        }
      }

      const nextDueMileage =
        schedule.intervalKm && baselineMileage !== null ? baselineMileage + schedule.intervalKm : null;

      let nextDueDate: Date | null = null;
      if (schedule.intervalMonths && baselineDate !== null) {
        nextDueDate = new Date(baselineDate);
        nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + schedule.intervalMonths);
      }

      const kmRemaining = nextDueMileage !== null ? Math.round(nextDueMileage - car.currentMileage) : null;
      const daysRemaining =
        nextDueDate !== null ? Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let status: ScheduleStatus;
      if (kmRemaining === null && daysRemaining === null) {
        status = 'sem_referencia';
      } else if ((kmRemaining !== null && kmRemaining < 0) || (daysRemaining !== null && daysRemaining < 0)) {
        status = 'atrasado';
      } else if (
        (kmRemaining !== null && kmRemaining <= KM_WARNING_THRESHOLD) ||
        (daysRemaining !== null && daysRemaining <= DAYS_WARNING_THRESHOLD)
      ) {
        status = 'proximo';
      } else {
        status = 'ok';
      }

      return {
        ...schedule,
        status,
        nextDueMileage,
        nextDueDate,
        kmRemaining,
        daysRemaining,
      };
    });

    // Mais urgentes primeiro
    const order: Record<ScheduleStatus, number> = { atrasado: 0, proximo: 1, ok: 2, sem_referencia: 3 };
    return result.sort((a, b) => order[a.status] - order[b.status]);
  }

  /**
   * Cria um lembrete. Um carro só pode ter um lembrete por tipo de manutenção.
   */
  static async create(carId: string, userId: string, input: CreateScheduleInput) {
    await this.verifyCarOwner(carId, userId);

    const existing = await prisma.maintenanceSchedule.findUnique({
      where: { carId_type: { carId, type: input.type } },
    });
    if (existing) {
      throw new Error(`Já existe um lembrete de "${input.type}" para este veículo.`);
    }

    return prisma.maintenanceSchedule.create({
      data: {
        carId,
        type: input.type,
        description: input.description || null,
        intervalKm: input.intervalKm || null,
        intervalMonths: input.intervalMonths || null,
        lastDoneMileage: input.lastDoneMileage ?? null,
        lastDoneDate: input.lastDoneDate ? new Date(input.lastDoneDate) : null,
      },
    });
  }

  /**
   * Atualiza um lembrete. Garante segurança pelo userId do dono do carro.
   */
  static async update(id: string, userId: string, input: CreateScheduleInput) {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!schedule || schedule.car.userId !== userId) {
      throw new Error('Lembrete não encontrado ou acesso não autorizado.');
    }

    if (input.type !== schedule.type) {
      const conflict = await prisma.maintenanceSchedule.findUnique({
        where: { carId_type: { carId: schedule.carId, type: input.type } },
      });
      if (conflict) {
        throw new Error(`Já existe um lembrete de "${input.type}" para este veículo.`);
      }
    }

    return prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        type: input.type,
        description: input.description || null,
        intervalKm: input.intervalKm || null,
        intervalMonths: input.intervalMonths || null,
        lastDoneMileage: input.lastDoneMileage ?? null,
        lastDoneDate: input.lastDoneDate ? new Date(input.lastDoneDate) : null,
      },
    });
  }

  /**
   * Exclui um lembrete.
   */
  static async delete(id: string, userId: string) {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!schedule || schedule.car.userId !== userId) {
      throw new Error('Lembrete não encontrado ou acesso não autorizado.');
    }

    return prisma.maintenanceSchedule.delete({ where: { id } });
  }
}
