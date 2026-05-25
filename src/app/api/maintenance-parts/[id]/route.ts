import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MaintenancePartSchema } from '@/lib/validations';
import { calculatePartTotal } from '@/lib/calculations';
import { MaintenanceService } from '@/services/maintenance-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Helper para verificar permissão do usuário para acessar uma peça específica.
 */
async function verifyPartAccess(partId: string, userId: string) {
  const part = await prisma.maintenancePart.findUnique({
    where: { id: partId },
    include: {
      maintenance: {
        include: { car: true },
      },
    },
  });

  if (!part || part.maintenance.car.userId !== userId) {
    throw new Error('Peça não encontrada ou acesso não autorizado.');
  }

  return part;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: partId } = await params;

    // Verificar se a peça pertence ao usuário
    let part;
    try {
      part = await verifyPartAccess(partId, user.id);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 403 });
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

    const updatedPart = await prisma.$transaction(async (tx) => {
      // Atualizar a peça
      const updated = await tx.maintenancePart.update({
        where: { id: partId },
        data: {
          name,
          brand: brand || null,
          quantity,
          unitPrice,
          totalPrice,
        },
      });

      // Recalcular custos da manutenção associada
      await MaintenanceService.recalculateCosts(part.maintenanceId, tx);

      return updated;
    });

    return NextResponse.json(updatedPart, { status: 200 });
  } catch (error) {
    console.error('Erro ao editar peça:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: partId } = await params;

    // Verificar se a peça pertence ao usuário
    let part;
    try {
      part = await verifyPartAccess(partId, user.id);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // Excluir a peça
      await tx.maintenancePart.delete({
        where: { id: partId },
      });

      // Recalcular custos da manutenção associada
      await MaintenanceService.recalculateCosts(part.maintenanceId, tx);
    });

    return NextResponse.json({ message: 'Peça removida com sucesso.' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir peça:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
