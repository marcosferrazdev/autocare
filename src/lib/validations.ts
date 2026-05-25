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
