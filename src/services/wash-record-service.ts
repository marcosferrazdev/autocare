import prisma from '@/lib/prisma';
import { WashRecord, Prisma } from '@prisma/client';
import { parseWashPhotos, serializeWashPhotos, MAX_WASH_PHOTOS } from '@/lib/wash-photos';

export interface WashRecordInput {
  date?: string | Date;
  mileage?: number | null;
  selfWash?: boolean;
  carWashName?: string | null;
  price?: number | null;
  washType?: string | null;
  notes?: string | null;
  photos?: string[] | null;
  clearPhoto?: boolean;
}

export type WashRecordWithPhotos = Omit<WashRecord, 'photoData'> & {
  photos: string[];
};

function toClient(record: WashRecord): WashRecordWithPhotos {
  const { photoData, ...rest } = record;
  return {
    ...rest,
    photos: parseWashPhotos(photoData),
  };
}

export class WashRecordService {
  private static async verifyCarOwner(carId: string, userId: string): Promise<void> {
    const car = await prisma.car.findFirst({
      where: { id: carId, userId },
    });
    if (!car) {
      throw new Error('Veículo não encontrado ou acesso não autorizado.');
    }
  }

  static async listByCar(
    carId: string,
    userId: string,
    filters?: {
      washType?: string;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ): Promise<WashRecordWithPhotos[]> {
    await this.verifyCarOwner(carId, userId);

    const where: Prisma.WashRecordWhereInput = { carId };

    if (filters?.washType) {
      where.washType = filters.washType;
    }
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const records = await prisma.washRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return records.map(toClient);
  }

  static async create(carId: string, userId: string, input: WashRecordInput): Promise<WashRecordWithPhotos> {
    await this.verifyCarOwner(carId, userId);

    if (!input.date) {
      throw new Error('A data é obrigatória.');
    }

    const selfWash = Boolean(input.selfWash);
    const photos = (input.photos || []).slice(0, MAX_WASH_PHOTOS);

    const record = await prisma.washRecord.create({
      data: {
        carId,
        date: new Date(input.date),
        mileage: input.mileage ?? null,
        selfWash,
        carWashName: selfWash ? null : (input.carWashName?.trim() || null),
        price: input.price ?? 0,
        washType: input.washType || null,
        notes: input.notes || null,
        photoData: serializeWashPhotos(photos),
      },
    });

    return toClient(record);
  }

  static async update(id: string, userId: string, input: WashRecordInput): Promise<WashRecordWithPhotos> {
    const record = await prisma.washRecord.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!record || record.car.userId !== userId) {
      throw new Error('Lavagem não encontrada ou acesso não autorizado.');
    }

    const selfWash = input.selfWash !== undefined ? Boolean(input.selfWash) : record.selfWash;

    let photoData: string | null | undefined = undefined;
    if (input.clearPhoto) {
      photoData = null;
    } else if (input.photos !== undefined) {
      photoData = serializeWashPhotos(input.photos);
    }

    const updated = await prisma.washRecord.update({
      where: { id },
      data: {
        date: input.date !== undefined ? new Date(input.date) : undefined,
        mileage: input.mileage !== undefined ? input.mileage : undefined,
        selfWash,
        carWashName: selfWash
          ? null
          : input.carWashName !== undefined
            ? input.carWashName?.trim() || null
            : undefined,
        price: input.price !== undefined ? (input.price ?? 0) : undefined,
        washType: input.washType !== undefined ? input.washType || null : undefined,
        notes: input.notes !== undefined ? input.notes || null : undefined,
        ...(photoData !== undefined ? { photoData } : {}),
      },
    });

    return toClient(updated);
  }

  static async delete(id: string, userId: string): Promise<WashRecordWithPhotos> {
    const record = await prisma.washRecord.findUnique({
      where: { id },
      include: { car: true },
    });

    if (!record || record.car.userId !== userId) {
      throw new Error('Lavagem não encontrada ou acesso não autorizado.');
    }

    const deleted = await prisma.washRecord.delete({ where: { id } });
    return toClient(deleted);
  }
}
