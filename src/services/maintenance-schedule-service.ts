import prisma from '@/lib/prisma';
import { MaintenanceSchedule } from '@prisma/client';
import { serializePhotos } from '@/lib/photos';

export interface CreateScheduleInput {
  type: string;
  description?: string | null;
  intervalKm?: number | null;
  intervalDays?: number | null;
  intervalMonths?: number | null;
  lastDoneMileage?: number | null;
  lastDoneDate?: string | Date | null;
  photos?: string[] | null;
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

/** Aviso em dias: em intervalos curtos (ex.: lavagem 14 dias), usa ~25% do intervalo. */
function daysWarningThreshold(intervalDays: number | null | undefined, intervalMonths: number | null | undefined): number {
  if (intervalDays && intervalDays > 0) {
    return Math.max(2, Math.min(DAYS_WARNING_THRESHOLD, Math.ceil(intervalDays * 0.25)));
  }
  if (intervalMonths && intervalMonths > 0) {
    return DAYS_WARNING_THRESHOLD;
  }
  return DAYS_WARNING_THRESHOLD;
}

function earliestDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

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
   * manutenção mais recente do mesmo tipo (ou lavagem, para tipo "Lavagem").
   */
  static async listWithStatus(carId: string, userId: string): Promise<UpcomingSchedule[]> {
    const car = await this.verifyCarOwner(carId, userId);

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { carId },
      orderBy: { createdAt: 'asc' },
    });

    if (schedules.length === 0) return [];

    const maintenanceTypes = schedules.map((s) => s.type).filter((t) => t !== 'Lavagem');

    // Última manutenção de cada tipo, para usar como baseline automático
    const maintenances =
      maintenanceTypes.length > 0
        ? await prisma.maintenance.findMany({
            where: { carId, type: { in: maintenanceTypes } },
            orderBy: { date: 'desc' },
          })
        : [];

    const latestByType = new Map<string, { mileage: number | null; date: Date }>();
    for (const m of maintenances) {
      if (!latestByType.has(m.type)) {
        latestByType.set(m.type, { mileage: m.mileage, date: m.date });
      }
    }

    // Tipo Lavagem: cruza com o histórico de lavagens
    if (schedules.some((s) => s.type === 'Lavagem')) {
      const lastWash = await prisma.washRecord.findFirst({
        where: { carId },
        orderBy: { date: 'desc' },
      });
      if (lastWash) {
        latestByType.set('Lavagem', {
          mileage: lastWash.mileage ?? null,
          date: lastWash.date,
        });
      }
    }

    const now = new Date();

    const result = schedules.map((schedule) => {
      const latest = latestByType.get(schedule.type);

      // Baseline: o que for mais recente entre o registro manual e o histórico
      let baselineMileage: number | null = schedule.lastDoneMileage;
      let baselineDate: Date | null = schedule.lastDoneDate;

      if (latest) {
        if (latest.mileage !== null && (baselineMileage === null || latest.mileage > baselineMileage)) {
          baselineMileage = latest.mileage;
        }
        if (baselineDate === null || latest.date > baselineDate) {
          baselineDate = latest.date;
        }
      }

      const nextDueMileage =
        schedule.intervalKm && baselineMileage !== null ? baselineMileage + schedule.intervalKm : null;

      const dueDateCandidates: Date[] = [];
      if (baselineDate !== null) {
        if (schedule.intervalMonths) {
          const d = new Date(baselineDate);
          d.setUTCMonth(d.getUTCMonth() + schedule.intervalMonths);
          dueDateCandidates.push(d);
        }
        if (schedule.intervalDays) {
          const d = new Date(baselineDate);
          d.setUTCDate(d.getUTCDate() + schedule.intervalDays);
          dueDateCandidates.push(d);
        }
      }
      const nextDueDate = earliestDate(dueDateCandidates);

      const kmRemaining = nextDueMileage !== null ? Math.round(nextDueMileage - car.currentMileage) : null;
      const daysRemaining =
        nextDueDate !== null ? Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      const dayWarn = daysWarningThreshold(schedule.intervalDays, schedule.intervalMonths);

      let status: ScheduleStatus;
      if (kmRemaining === null && daysRemaining === null) {
        status = 'sem_referencia';
      } else if ((kmRemaining !== null && kmRemaining < 0) || (daysRemaining !== null && daysRemaining < 0)) {
        status = 'atrasado';
      } else if (
        (kmRemaining !== null && kmRemaining <= KM_WARNING_THRESHOLD) ||
        (daysRemaining !== null && daysRemaining <= dayWarn)
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
   * Cria um lembrete. Um carro só pode ter um lembrete por tipo.
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
        intervalDays: input.intervalDays || null,
        intervalMonths: input.intervalMonths || null,
        lastDoneMileage: input.lastDoneMileage ?? null,
        lastDoneDate: input.lastDoneDate ? new Date(input.lastDoneDate) : null,
        photoData: serializePhotos(input.photos),
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
        intervalDays: input.intervalDays || null,
        intervalMonths: input.intervalMonths || null,
        lastDoneMileage: input.lastDoneMileage ?? null,
        lastDoneDate: input.lastDoneDate ? new Date(input.lastDoneDate) : null,
        // undefined = cliente não enviou fotos; mantém as existentes
        ...(input.photos !== undefined ? { photoData: serializePhotos(input.photos) } : {}),
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
