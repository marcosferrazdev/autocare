import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { VehicleWebInfoSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    
    // Verificar se o veículo pertence ao usuário
    const car = await prisma.car.findFirst({
      where: { id: carId, userId: user.id },
    });

    if (!car) {
      return NextResponse.json({ error: 'Veículo não encontrado ou acesso não autorizado.' }, { status: 404 });
    }

    const webInfo = await prisma.vehicleWebInfo.findUnique({
      where: { carId },
    });

    return NextResponse.json(webInfo, { status: 200 });
  } catch (error) {
    console.error('Erro ao carregar info técnica:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    
    // Verificar se o veículo pertence ao usuário
    const car = await prisma.car.findFirst({
      where: { id: carId, userId: user.id },
    });

    if (!car) {
      return NextResponse.json({ error: 'Veículo não encontrado ou acesso não autorizado.' }, { status: 404 });
    }

    const body = await request.json();
    const result = VehicleWebInfoSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Upsert: atualiza se já existir, senão cria
    const webInfo = await prisma.vehicleWebInfo.upsert({
      where: { carId },
      update: {
        ...result.data,
        searchedAt: new Date(),
      },
      create: {
        carId,
        ...result.data,
        searchedAt: new Date(),
      },
    });

    return NextResponse.json(webInfo, { status: 200 });
  } catch (error) {
    console.error('Erro ao salvar info técnica:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
