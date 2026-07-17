import prisma from '@/lib/prisma';
import {
  parseUsefulContacts,
  serializeUsefulContacts,
  nextInsurancePaymentDate,
  daysUntil,
  type UsefulContact,
} from '@/lib/insurance-utils';

export interface InsurancePolicyInput {
  companyName: string;
  policyNumber?: string | null;
  coverageType?: string | null;
  monthlyValue?: number | null;
  paymentDay?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  brokerName?: string | null;
  notes?: string | null;
  usefulContacts?: UsefulContact[];
  syncPaymentReminder?: boolean;
}

export interface InsuranceClaimInput {
  date: string | Date;
  type: string;
  description: string;
  amount?: number | null;
  deductible?: number | null;
  status?: string;
  protocol?: string | null;
  notes?: string | null;
}

function toPolicyClient(policy: {
  id: string;
  carId: string;
  companyName: string;
  policyNumber: string | null;
  coverageType: string | null;
  monthlyValue: number;
  paymentDay: number | null;
  startDate: Date | null;
  endDate: Date | null;
  brokerName: string | null;
  notes: string | null;
  usefulContacts: string | null;
  createdAt: Date;
  updatedAt: Date;
  claims?: unknown[];
}) {
  const contacts = parseUsefulContacts(policy.usefulContacts);
  const nextPayment =
    policy.paymentDay != null ? nextInsurancePaymentDate(policy.paymentDay) : null;
  const daysToPayment = nextPayment ? daysUntil(nextPayment) : null;

  return {
    id: policy.id,
    carId: policy.carId,
    companyName: policy.companyName,
    policyNumber: policy.policyNumber,
    coverageType: policy.coverageType,
    monthlyValue: policy.monthlyValue,
    paymentDay: policy.paymentDay,
    startDate: policy.startDate,
    endDate: policy.endDate,
    brokerName: policy.brokerName,
    notes: policy.notes,
    usefulContacts: contacts,
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
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

export class InsuranceService {
  private static async verifyCarOwner(carId: string, userId: string) {
    const car = await prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) throw new Error('Veículo não encontrado ou acesso não autorizado.');
    return car;
  }

  /** Retorna apólice + claims do carro (ou null se ainda não cadastrou). */
  static async getByCar(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);

    const policy = await prisma.insurancePolicy.findUnique({
      where: { carId },
      include: {
        claims: { orderBy: { date: 'desc' } },
      },
    });

    if (!policy) {
      return { policy: null, claims: [] as Awaited<ReturnType<typeof prisma.insuranceClaim.findMany>> };
    }

    return {
      policy: toPolicyClient(policy),
      claims: policy.claims,
    };
  }

  /** Cria ou atualiza a apólice do carro. */
  static async upsertPolicy(carId: string, userId: string, input: InsurancePolicyInput) {
    await this.verifyCarOwner(carId, userId);

    const data = {
      companyName: input.companyName.trim(),
      policyNumber: input.policyNumber?.trim() || null,
      coverageType: input.coverageType || null,
      monthlyValue: input.monthlyValue ?? 0,
      paymentDay: input.paymentDay ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      brokerName: input.brokerName?.trim() || null,
      notes: input.notes?.trim() || null,
      usefulContacts: serializeUsefulContacts(input.usefulContacts),
    };

    const policy = await prisma.insurancePolicy.upsert({
      where: { carId },
      create: { carId, ...data },
      update: data,
      include: { claims: { orderBy: { date: 'desc' } } },
    });

    if (input.syncPaymentReminder !== false && input.paymentDay) {
      await this.syncSeguroSchedule(carId, input.paymentDay, input.monthlyValue ?? 0);
    }

    return {
      policy: toPolicyClient(policy),
      claims: policy.claims,
    };
  }

  /**
   * Mantém lembrete tipo "Seguro" com intervalo mensal.
   * lastDoneDate = último dia de pagamento já "passado" (mês anterior se o dia deste mês já passou).
   */
  private static async syncSeguroSchedule(carId: string, paymentDay: number, monthlyValue: number) {
    const next = nextInsurancePaymentDate(paymentDay);
    // último pagamento teórico = next - 1 mês
    const last = new Date(next);
    last.setMonth(last.getMonth() - 1);

    const description =
      monthlyValue > 0
        ? `Pagamento mensal do seguro (R$ ${monthlyValue.toFixed(2).replace('.', ',')})`
        : 'Pagamento mensal do seguro';

    await prisma.maintenanceSchedule.upsert({
      where: { carId_type: { carId, type: 'Seguro' } },
      create: {
        carId,
        type: 'Seguro',
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

  static async listClaims(carId: string, userId: string) {
    await this.verifyCarOwner(carId, userId);
    return prisma.insuranceClaim.findMany({
      where: { carId },
      orderBy: { date: 'desc' },
    });
  }

  static async createClaim(carId: string, userId: string, input: InsuranceClaimInput) {
    await this.verifyCarOwner(carId, userId);

    const policy = await prisma.insurancePolicy.findUnique({ where: { carId } });
    if (!policy) {
      throw new Error('Cadastre os dados do seguro antes de registrar uma utilização.');
    }

    return prisma.insuranceClaim.create({
      data: {
        carId,
        policyId: policy.id,
        date: new Date(input.date),
        type: input.type,
        description: input.description.trim(),
        amount: input.amount ?? null,
        deductible: input.deductible ?? null,
        status: input.status || 'Aberto',
        protocol: input.protocol?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
  }

  static async updateClaim(id: string, userId: string, input: InsuranceClaimInput) {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: { car: true },
    });
    if (!claim || claim.car.userId !== userId) {
      throw new Error('Registro não encontrado ou acesso não autorizado.');
    }

    return prisma.insuranceClaim.update({
      where: { id },
      data: {
        date: new Date(input.date),
        type: input.type,
        description: input.description.trim(),
        amount: input.amount ?? null,
        deductible: input.deductible ?? null,
        status: input.status || claim.status,
        protocol: input.protocol?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
  }

  static async deleteClaim(id: string, userId: string) {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: { car: true },
    });
    if (!claim || claim.car.userId !== userId) {
      throw new Error('Registro não encontrado ou acesso não autorizado.');
    }
    return prisma.insuranceClaim.delete({ where: { id } });
  }

  /** Usado no dashboard: apólices com pagamento próximo/atrasado do usuário. */
  static async listPaymentAlerts(userId: string) {
    const policies = await prisma.insurancePolicy.findMany({
      where: { car: { userId }, paymentDay: { not: null } },
      include: { car: { select: { id: true, brand: true, model: true, nickname: true } } },
    });

    return policies
      .map((p) => {
        const client = toPolicyClient(p);
        if (!client.paymentStatus || client.paymentStatus === 'ok') return null;
        return {
          ...client,
          car: p.car,
        };
      })
      .filter(Boolean);
  }
}
