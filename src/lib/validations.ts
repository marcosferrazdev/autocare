import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

// Validação de Carro
export const CarSchema = z.object({
  brand: z.string().min(1, 'A marca é obrigatória'),
  model: z.string().min(1, 'O modelo é obrigatório'),
  yearManufacture: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(1900, 'Ano deve ser maior que 1900')
    .max(new Date().getFullYear() + 2, 'Ano de fabricação inválido'),
  yearModel: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(1900, 'Ano deve ser maior que 1900')
    .max(new Date().getFullYear() + 2, 'Ano do modelo inválido'),
  plate: z.string().max(10, 'A placa não pode ser muito longa').optional().nullable().or(z.literal('')),
  color: z.string().max(30, 'A cor não pode ser muito longa').optional().nullable().or(z.literal('')),
  fuelType: z.enum(['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Flex', 'Outro'], {
    message: 'Tipo de combustível inválido',
  }),
  engine: z.string().max(30, 'O motor não pode ser muito longo').optional().nullable().or(z.literal('')),
  currentMileage: z.coerce
    .number()
    .min(0, 'A quilometragem não pode ser negativa'),
  nickname: z.string().max(50, 'O apelido não pode ser muito longo').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

// Validação de Peça de Manutenção
export const MaintenancePartSchema = z.object({
  name: z.string().min(1, 'O nome da peça é obrigatório'),
  brand: z.string().optional().nullable().or(z.literal('')),
  quantity: z.coerce
    .number()
    .gt(0, 'A quantidade deve ser maior que zero'),
  unitPrice: z.coerce
    .number()
    .min(0, 'O preço unitário não pode ser negativo'),
});

// Validação de Manutenção
export const MaintenanceSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  mileage: z.coerce
    .number()
    .min(0, 'A quilometragem não pode ser negativa'),
  type: z.enum(
    [
      'Preventiva',
      'Corretiva',
      'Troca de óleo',
      'Freios',
      'Suspensão',
      'Motor',
      'Elétrica',
      'Pneus',
      'Arrefecimento',
      'Correia dentada',
      'Bateria',
      'Alinhamento e balanceamento',
      'Calibragem de pneu',
      'Outro',
    ],
    { message: 'Tipo de manutenção inválido' }
  ),
  workshop: z.string().optional().nullable().or(z.literal('')),
  description: z.string().min(1, 'A descrição é obrigatória'),
  laborCost: z.coerce
    .number()
    .min(0, 'O valor da mão de obra não pode ser negativo'),
  notes: z.string().optional().nullable().or(z.literal('')),
  parts: z.array(MaintenancePartSchema).optional().default([]),
  paymentMethod: z.string().optional().nullable().or(z.literal('')),
  installmentCount: z.coerce.number().int().min(1).optional().nullable(),
  installmentValue: z.coerce.number().min(0).optional().nullable(),
  discount: z.coerce.number().min(0).optional().nullable(),
});

// Validação de Abastecimento
export const FuelRecordSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  mileage: z.coerce
    .number()
    .min(0, 'A quilometragem não pode ser negativa'),
  fuelType: z.enum(['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Flex', 'Outro'], {
    message: 'Tipo de combustível inválido',
  }),
  pricePerLiter: z.coerce
    .number()
    .gt(0, 'O preço por litro deve ser maior que zero'),
  liters: z.coerce
    .number()
    .gt(0, 'A quantidade de litros deve ser maior que zero'),
  gasStation: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  fullTank: z.boolean().default(false),
  paymentMethod: z.string().optional().nullable().or(z.literal('')),
  installmentCount: z.coerce.number().int().min(1).optional().nullable(),
  installmentValue: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable().or(z.literal('')),
});

// Validação de Informações da Web (Edição Manual)
export const VehicleWebInfoSchema = z.object({
  tankCapacity: z.coerce.number().min(0).optional().nullable(),
  cityConsumption: z.coerce.number().min(0).optional().nullable(),
  highwayConsumption: z.coerce.number().min(0).optional().nullable(),
  recommendedOil: z.string().optional().nullable(),
  tirePressure: z.string().optional().nullable(),
  tireSize: z.string().optional().nullable(),
  engineInfo: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  generalNotes: z.string().optional().nullable(),
  sourceName: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
});

// Validação de Lembrete de Manutenção Preventiva / Lavagem
export const MaintenanceScheduleSchema = z
  .object({
    type: z.enum(
      [
        'Preventiva',
        'Corretiva',
        'Troca de óleo',
        'Freios',
        'Suspensão',
        'Motor',
        'Elétrica',
        'Pneus',
        'Arrefecimento',
        'Correia dentada',
        'Bateria',
        'Alinhamento e balanceamento',
        'Calibragem de pneu',
        'Lavagem',
        'Seguro',
        'Outro',
      ],
      { message: 'Tipo de lembrete inválido' }
    ),
    description: z.string().max(200, 'A descrição não pode ser muito longa').optional().nullable().or(z.literal('')),
    intervalKm: z.coerce.number().gt(0, 'O intervalo em km deve ser maior que zero').optional().nullable(),
    intervalDays: z.coerce.number().int().gt(0, 'O intervalo em dias deve ser maior que zero').optional().nullable(),
    intervalMonths: z.coerce.number().int().gt(0, 'O intervalo em meses deve ser maior que zero').optional().nullable(),
    lastDoneMileage: z.coerce.number().min(0, 'A quilometragem não pode ser negativa').optional().nullable(),
    lastDoneDate: z.string().optional().nullable().or(z.literal('')),
  })
  .refine((data) => data.intervalKm || data.intervalDays || data.intervalMonths, {
    message: 'Informe pelo menos um intervalo (km, dias ou meses)',
    path: ['intervalKm'],
  });

// Validação de Viagem
export const TripSchema = z
  .object({
    title: z.string().min(1, 'Dê um nome para a viagem').max(100, 'O nome é muito longo'),
    originCity: z.string().min(1, 'A cidade de origem é obrigatória').max(100),
    destinationCity: z.string().min(1, 'A cidade de destino é obrigatória').max(100),
    startDate: z.string().min(1, 'A data de início é obrigatória'),
    endDate: z.string().optional().nullable().or(z.literal('')),
    startMileage: z.coerce.number().min(0, 'A quilometragem não pode ser negativa').optional().nullable(),
    endMileage: z.coerce.number().min(0, 'A quilometragem não pode ser negativa').optional().nullable(),
    notes: z.string().optional().nullable().or(z.literal('')),
  })
  .refine(
    (data) => !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    { message: 'A data de fim não pode ser antes do início', path: ['endDate'] }
  )
  .refine(
    (data) =>
      data.startMileage == null || data.endMileage == null || data.endMileage >= data.startMileage,
    { message: 'O km final não pode ser menor que o inicial', path: ['endMileage'] }
  );

// Validação de Item de Melhoria / Reforma
export const UpgradeItemSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  description: z.string().optional().nullable().or(z.literal('')),
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  purchaseLink: z.string().optional().nullable().or(z.literal('')),
  status: z.enum(['Pendente', 'Concluido']).default('Pendente'),
  priority: z.enum(['Baixa', 'Média', 'Alta']).default('Média'),
});

// Validação de Lavagem
export const WashRecordBaseSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  mileage: z.coerce.number().min(0, 'A quilometragem não pode ser negativa').optional().nullable(),
  selfWash: z.boolean().default(false),
  carWashName: z.string().max(120, 'Nome do lava-jato muito longo').optional().nullable().or(z.literal('')),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo').optional().nullable(),
  washType: z
    .enum(['Completa', 'Externa', 'Interna', 'Motor', 'Detalhamento', 'Outro'])
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z.string().max(1000, 'Observações muito longas').optional().nullable().or(z.literal('')),
  // Até 3 data URLs JPEG comprimidos no cliente
  photos: z
    .array(
      z
        .string()
        .max(400_000, 'Uma das fotos é muito grande. Escolha uma imagem menor.')
        .refine((s) => s.startsWith('data:image/'), 'Formato de imagem inválido')
    )
    .max(3, 'Máximo de 3 fotos por lavagem')
    .optional()
    .nullable(),
  clearPhoto: z.boolean().optional(),
});

export const WashRecordSchema = WashRecordBaseSchema.refine(
  (data) => data.selfWash || (data.carWashName && data.carWashName.trim().length > 0),
  { message: 'Informe o lava-jato quando não for lavagem própria', path: ['carWashName'] }
);

export const WashRecordUpdateSchema = WashRecordBaseSchema.partial().refine(
  (data) => {
    if (data.selfWash === true) return true;
    if (data.selfWash === false) {
      return Boolean(data.carWashName && data.carWashName.trim().length > 0);
    }
    return true;
  },
  { message: 'Informe o lava-jato quando não for lavagem própria', path: ['carWashName'] }
);

const InsuranceContactSchema = z.object({
  label: z.string().min(1, 'Informe o nome do contato').max(80),
  phone: z.string().min(1, 'Informe o telefone').max(40),
});

// Apólice / dados do seguro
export const InsurancePolicySchema = z.object({
  companyName: z.string().min(1, 'Informe a seguradora').max(120),
  policyNumber: z.string().max(60).optional().nullable().or(z.literal('')),
  coverageType: z
    .enum(['Completo', 'Terceiros', 'Compreensivo', 'Outro'])
    .optional()
    .nullable()
    .or(z.literal('')),
  monthlyValue: z.coerce.number().min(0, 'O valor mensal não pode ser negativo').optional().nullable(),
  paymentDay: z.coerce
    .number()
    .int()
    .min(1, 'Dia inválido')
    .max(31, 'Dia inválido')
    .optional()
    .nullable(),
  startDate: z.string().optional().nullable().or(z.literal('')),
  endDate: z.string().optional().nullable().or(z.literal('')),
  brokerName: z.string().max(120).optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable().or(z.literal('')),
  usefulContacts: z.array(InsuranceContactSchema).max(10).optional().default([]),
  // se true, cria/atualiza lembrete mensal "Seguro" na aba Lembretes
  syncPaymentReminder: z.boolean().optional().default(true),
});

// Financiamento / empréstimo do veículo
export const FinancingSchema = z.object({
  kind: z.enum(['Financiamento', 'Empréstimo']).optional().default('Financiamento'),
  institution: z.string().min(1, 'Informe o banco/financeira/pessoa').max(120),
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  downPayment: z.coerce.number().min(0).optional().nullable(),
  installmentCount: z.coerce.number().int().min(0, 'Nº de parcelas inválido').max(600).optional().nullable(),
  installmentValue: z.coerce.number().min(0, 'O valor da parcela não pode ser negativo').optional().nullable(),
  monthlyDiscount: z.coerce.number().min(0, 'O desconto não pode ser negativo').optional().nullable(),
  interestRate: z.coerce.number().min(0).max(100).optional().nullable(),
  paymentDay: z.coerce.number().int().min(1, 'Dia inválido').max(31, 'Dia inválido').optional().nullable(),
  firstInstallmentDate: z.string().optional().nullable().or(z.literal('')),
  contractNumber: z.string().max(60).optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable().or(z.literal('')),
});

// Utilização do seguro
export const InsuranceClaimSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  type: z.enum(['Sinistro', 'Assistência 24h', 'Guincho', 'Vidro', 'Colisão', 'Outro'], {
    message: 'Tipo inválido',
  }),
  description: z.string().min(1, 'A descrição é obrigatória').max(500),
  amount: z.coerce.number().min(0).optional().nullable(),
  deductible: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['Aberto', 'Em análise', 'Concluído', 'Negado']).default('Aberto'),
  protocol: z.string().max(80).optional().nullable().or(z.literal('')),
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
});
