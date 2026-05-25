import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MaintenancePartSchema } from '@/lib/validations';
import { calculatePartTotal } from '@/lib/calculations';
import { MaintenanceService } from '@/services/maintenance-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: maintenanceId } = await params;

    // Verificar se a manutenção existe e pertence ao usuário
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: { car: true },
    });

    if (!maintenance || maintenance.car.userId !== user.id) {
      return NextResponse.json({ error: 'Manutenção não encontrada ou acesso não autorizado.' }, { status: 404 });
    }

    const body = await request.json();
    const result = MaintenancePartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, brand, quantity, unitPrice } = result.data;
    const totalPrice = calculatePartTotal(quantity, unitPrice);

    const part = await prisma.$transaction(async (tx) => {
      // Criar a peça
      const createdPart = await tx.maintenancePart.create({
        data: {
          maintenanceId,
          name,
          brand: brand || null,
          quantity,
          unitPrice,
          totalPrice,
        },
      });

      // Recalcular custos da manutenção
      await MaintenanceService.recalculateCosts(maintenanceId, tx);

      return createdPart;
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar peça:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
