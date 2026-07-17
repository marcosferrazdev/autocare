import prisma from '@/lib/prisma';
import { nextInsurancePaymentDate, daysUntil } from '@/lib/insurance-utils';

export interface FinancingInput {
  kind?: string | null;
  institution: string;
  totalAmount?: number | null;
  downPayment?: number | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
  monthlyDiscount?: number | null;
  interestRate?: number | null;
  paymentDay?: number | null;
  firstInstallmentDate?: string | Date | null;
  contractNumber?: string | null;
  notes?: string | null;
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
  kind: string;
  institution: string;
  totalAmount: number | null;
  downPayment: number | null;
  installmentCount: number;
  installmentValue: number;
  monthlyDiscount: number | null;
  interestRate: number | null;
  paymentDay: number | null;
  firstInstallmentDate: Date | null;
  lastPaidDate: Date | null;
  contractNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const paid = paidInstallments(f.firstInstallmentDate, f.installmentCount);
  const remaining = Math.max(0, f.installmentCount - paid);
  // parcela líquida (o que você paga do bolso após a ajuda/desconto)
  const netInstallment = Math.max(0, f.installmentValue - (f.monthlyDiscount ?? 0));
  const upcoming = f.paymentDay != null ? nextInsurancePaymentDate(f.paymentDay) : null;
  // parcela do ciclo atual já quitada? (lastPaidDate cobre o vencimento em aberto)
  const paidThisPeriod =
    !!(upcoming && f.lastPaidDate && f.lastPaidDate.getTime() >= upcoming.getTime());
  const nextPayment = remaining > 0 && !paidThisPeriod ? upcoming : null;
  const daysToPayment = nextPayment ? daysUntil(nextPayment) : null;

  return {
    id: f.id,
    carId: f.carId,
    kind: f.kind,
    institution: f.institution,
    totalAmount: f.totalAmount,
    downPayment: f.downPayment,
    installmentCount: f.installmentCount,
    installmentValue: f.installmentValue,
    monthlyDiscount: f.monthlyDiscount ?? 0,
    netInstallment,
    interestRate: f.interestRate,
    paymentDay: f.paymentDay,
    firstInstallmentDate: f.firstInstallmentDate,
    lastPaidDate: f.lastPaidDate,
    paidThisPeriod,
    contractNumber: f.contractNumber,
    notes: f.notes,
    paidInstallments: paid,
    remainingInstallments: remaining,
    paidAmount: paid * netInstallment,
    remainingAmount: remaining * netInstallment,
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

function toData(input: FinancingInput) {
  return {
    kind: input.kind === 'Empréstimo' ? 'Empréstimo' : 'Financiamento',
    institution: input.institution.trim(),
    totalAmount: input.totalAmount ?? null,
    downPayment: input.downPayment ?? null,
    installmentCount: input.installmentCount ?? 0,
    installmentValue: input.installmentValue ?? 0,
    monthlyDiscount: input.monthlyDiscount ?? 0,
    interestRate: input.interestRate ?? null,
    paymentDay: input.paymentDay ?? null,
    firstInstallmentDate: input.firstInstallmentDate ? new Date(input.firstInstallmentDate) : null,
    contractNumber: input.contractNumber?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

type FinancingRecord = {
  kind: string;
  institution: string;
  installmentValue: number;
  monthlyDiscount: number | null;
  installmentCount: number;
  paymentDay: number | null;
  firstInstallmentDate: Date | null;
  lastPaidDate: Date | null;
};

/** Tipo do lembrete: único por dívida (evita colisão da chave carId+type). */
function scheduleType(f: { kind: string; institution: string }) {
  return `${f.kind}: ${f.institution}`.slice(0, 190);
}

export class FinancingService {
  private static async verifyCarOwner(carId: string, userId: string) {
    const car = await prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) throw new Error('Veículo não encontrado ou acesso não autorizado.');
    return car;
  }

  /** Cria/atualiza (ou remove) o lembrete mensal de pagamento da dívida. */
  private static async syncSchedule(carId: string, f: FinancingRecord) {
    // limpa lembrete genérico legado do v1 (type exato "Financiamento")
    await prisma.maintenanceSchedule.deleteMany({ where: { carId, type: 'Financiamento' } });

    const type = scheduleType(f);
    const paid = paidInstallments(f.firstInstallmentDate, f.installmentCount);
    const remaining = Math.max(0, f.installmentCount - paid);
    const active = f.paymentDay != null && f.installmentValue > 0 && remaining > 0;

    if (!active) {
      await prisma.maintenanceSchedule.deleteMany({ where: { carId, type } });
      return;
    }

    const upcoming = nextInsurancePaymentDate(f.paymentDay!);
    const paidThisPeriod = !!(f.lastPaidDate && f.lastPaidDate.getTime() >= upcoming.getTime());
    // Se a parcela do ciclo já foi paga, a referência é o próprio pagamento
    // (próximo vencimento = +1 mês → lembrete fica "ok"). Senão, vence agora.
    const baseline = paidThisPeriod ? f.lastPaidDate! : (() => {
      const d = new Date(upcoming);
      d.setMonth(d.getMonth() - 1);
      return d;
    })();

    const net = Math.max(0, f.installmentValue - (f.monthlyDiscount ?? 0));
    const description = `Parcela mensal (R$ ${net.toFixed(2).replace('.', ',')}) · ${remaining} restantes`;

    await prisma.maintenanceSchedule.upsert({
      where: { carId_type: { carId, type } },
      create: {
        carId,
        type,
        description,
        intervalMonths: 1,
        intervalDays: null,
        intervalKm: null,
        lastDoneDate: baseline,
        lastDoneMileage: null,
      },
      update: { description, intervalMonths: 1, intervalDays: null, lastDoneDate: baseline },
    });
  }

  /** Lista financiamentos/empréstimos do carro. Sincroniza lembretes (auto-cura dados legados). */
  static async listByCar(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);
    const items = await prisma.financing.findMany({
      where: { carId },
      orderBy: { createdAt: 'asc' },
    });
    for (const f of items) {
      await this.syncSchedule(carId, f);
    }
    return { financings: items.map(toClient) };
  }

  static async create(carId: string, userId: string, input: FinancingInput) {
    await this.verifyCarOwner(carId, userId);
    const financing = await prisma.financing.create({ data: { carId, ...toData(input) } });
    await this.syncSchedule(carId, financing);
    return toClient(financing);
  }

  static async update(id: string, userId: string, input: FinancingInput) {
    const existing = await prisma.financing.findUnique({ where: { id }, include: { car: true } });
    if (!existing || existing.car.userId !== userId) {
      throw new Error('Registro não encontrado ou acesso não autorizado.');
    }
    const financing = await prisma.financing.update({ where: { id }, data: toData(input) });
    // se o nome/tipo mudou, remove o lembrete antigo para não virar órfão
    const oldType = scheduleType(existing);
    if (oldType !== scheduleType(financing)) {
      await prisma.maintenanceSchedule.deleteMany({ where: { carId: existing.carId, type: oldType } });
    }
    await this.syncSchedule(existing.carId, financing);
    return toClient(financing);
  }

  /** Marca (ou desmarca) a parcela do vencimento atual como paga → lembrete some/volta. */
  static async setPaid(id: string, userId: string, paid: boolean) {
    const existing = await prisma.financing.findUnique({ where: { id }, include: { car: true } });
    if (!existing || existing.car.userId !== userId) {
      throw new Error('Registro não encontrado ou acesso não autorizado.');
    }
    // pago → registra o vencimento atual como quitado; desfazer → limpa
    const lastPaidDate =
      paid && existing.paymentDay != null ? nextInsurancePaymentDate(existing.paymentDay) : null;
    const financing = await prisma.financing.update({ where: { id }, data: { lastPaidDate } });
    await this.syncSchedule(existing.carId, financing);
    return toClient(financing);
  }

  static async delete(id: string, userId: string) {
    const existing = await prisma.financing.findUnique({ where: { id }, include: { car: true } });
    if (!existing || existing.car.userId !== userId) {
      throw new Error('Registro não encontrado ou acesso não autorizado.');
    }
    await prisma.maintenanceSchedule.deleteMany({
      where: { carId: existing.carId, type: scheduleType(existing) },
    });
    return prisma.financing.delete({ where: { id } });
  }
}
