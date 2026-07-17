import prisma from '@/lib/prisma';
import { nextInsurancePaymentDate, daysUntil } from '@/lib/insurance-utils';

export interface FinancingInput {
  institution: string;
  totalAmount?: number | null;
  downPayment?: number | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
  interestRate?: number | null;
  paymentDay?: number | null;
  firstInstallmentDate?: string | Date | null;
  contractNumber?: string | null;
  notes?: string | null;
  syncPaymentReminder?: boolean;
}

/** Meses civis já decorridos desde a 1ª parcela até hoje (inclusivo), limitado ao total. */
function paidInstallments(
  firstDate: Date | null,
  installmentCount: number,
  now: Date = new Date()
): number {
  if (!firstDate || installmentCount <= 0 || firstDate > now) return 0;
  const months =
    (now.getFullYear() - firstDate.getFullYear()) * 12 +
    (now.getMonth() - firstDate.getMonth()) +
    1;
  return Math.max(0, Math.min(installmentCount, months));
}

function toClient(f: {
  id: string;
  carId: string;
  institution: string;
  totalAmount: number | null;
  downPayment: number | null;
  installmentCount: number;
  installmentValue: number;
  interestRate: number | null;
  paymentDay: number | null;
  firstInstallmentDate: Date | null;
  contractNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const paid = paidInstallments(f.firstInstallmentDate, f.installmentCount);
  const remaining = Math.max(0, f.installmentCount - paid);
  const nextPayment =
    remaining > 0 && f.paymentDay != null ? nextInsurancePaymentDate(f.paymentDay) : null;
  const daysToPayment = nextPayment ? daysUntil(nextPayment) : null;

  return {
    id: f.id,
    carId: f.carId,
    institution: f.institution,
    totalAmount: f.totalAmount,
    downPayment: f.downPayment,
    installmentCount: f.installmentCount,
    installmentValue: f.installmentValue,
    interestRate: f.interestRate,
    paymentDay: f.paymentDay,
    firstInstallmentDate: f.firstInstallmentDate,
    contractNumber: f.contractNumber,
    notes: f.notes,
    paidInstallments: paid,
    remainingInstallments: remaining,
    paidAmount: paid * f.installmentValue,
    remainingAmount: remaining * f.installmentValue,
    nextPaymentDate: nextPayment,
    daysToPayment,
    paymentStatus:
      daysToPayment == null
        ? null
        : daysToPayment < 0
          ? 'atrasado'
          : daysToPayment <= 5
            ? 'proximo'
            : 'ok',
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export class FinancingService {
  private static async verifyCarOwner(carId: string, userId: string) {
    const car = await prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) throw new Error('Veículo não encontrado ou acesso não autorizado.');
    return car;
  }

  /** Retorna o financiamento do carro (ou null se não cadastrado). */
  static async getByCar(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);
    const financing = await prisma.financing.findUnique({ where: { carId } });
    return { financing: financing ? toClient(financing) : null };
  }

  /** Cria ou atualiza o financiamento do carro. */
  static async upsert(carId: string, userId: string, input: FinancingInput) {
    await this.verifyCarOwner(carId, userId);

    const data = {
      institution: input.institution.trim(),
      totalAmount: input.totalAmount ?? null,
      downPayment: input.downPayment ?? null,
      installmentCount: input.installmentCount ?? 0,
      installmentValue: input.installmentValue ?? 0,
      interestRate: input.interestRate ?? null,
      paymentDay: input.paymentDay ?? null,
      firstInstallmentDate: input.firstInstallmentDate ? new Date(input.firstInstallmentDate) : null,
      contractNumber: input.contractNumber?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    const financing = await prisma.financing.upsert({
      where: { carId },
      create: { carId, ...data },
      update: data,
    });

    if (input.syncPaymentReminder !== false && input.paymentDay) {
      await this.syncSchedule(carId, input.paymentDay, input.installmentValue ?? 0);
    }

    return { financing: toClient(financing) };
  }

  static async delete(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);
    await prisma.financing.deleteMany({ where: { carId } });
    await prisma.maintenanceSchedule.deleteMany({ where: { carId, type: 'Financiamento' } });
    return { ok: true };
  }

  /** Mantém lembrete tipo "Financiamento" com intervalo mensal. */
  private static async syncSchedule(carId: string, paymentDay: number, installmentValue: number) {
    const next = nextInsurancePaymentDate(paymentDay);
    const last = new Date(next);
    last.setMonth(last.getMonth() - 1);

    const description =
      installmentValue > 0
        ? `Parcela mensal do financiamento (R$ ${installmentValue.toFixed(2).replace('.', ',')})`
        : 'Parcela mensal do financiamento';

    await prisma.maintenanceSchedule.upsert({
      where: { carId_type: { carId, type: 'Financiamento' } },
      create: {
        carId,
        type: 'Financiamento',
        description,
        intervalMonths: 1,
        intervalDays: null,
        intervalKm: null,
        lastDoneDate: last,
        lastDoneMileage: null,
      },
      update: {
        description,
        intervalMonths: 1,
        intervalDays: null,
        lastDoneDate: last,
      },
    });
  }
}
