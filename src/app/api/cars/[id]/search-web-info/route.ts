import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { VehicleWebSearchService } from '@/services/vehicle-web-search-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    
    // Buscar o veículo e verificar se pertence ao usuário
    const car = await prisma.car.findFirst({
      where: { id: carId, userId: user.id },
    });

    if (!car) {
      return NextResponse.json({ error: 'Veículo não encontrado ou acesso não autorizado.' }, { status: 404 });
    }

    // Executar busca web baseada nos dados do carro
    const searchResult = await VehicleWebSearchService.search({
      brand: car.brand,
      model: car.model,
      yearManufacture: car.yearManufacture,
      yearModel: car.yearModel,
      engine: car.engine,
    });

    return NextResponse.json(searchResult, { status: 200 });
  } catch (error: any) {
    console.error('Erro na busca web do veículo:', error);
    return NextResponse.json({ error: error.message || 'Erro na busca web.' }, { status: 500 });
  }
}
