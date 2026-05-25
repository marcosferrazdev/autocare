import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { FuelRecordService } from '@/services/fuel-record-service';
import { FuelRecordSchema } from '@/lib/validations';

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

    // Ler query params para filtros
    const { searchParams } = new URL(request.url);
    const fuelType = searchParams.get('fuelType') || undefined;
    const gasStation = searchParams.get('gasStation') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const fuelRecords = await FuelRecordService.listByCar(carId, user.id, {
      fuelType,
      gasStation,
      startDate,
      endDate,
    });

    return NextResponse.json(fuelRecords, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar abastecimentos:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar abastecimentos.' }, { status });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const body = await request.json();
    const result = FuelRecordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const fuelRecord = await FuelRecordService.create(carId, user.id, result.data);
    return NextResponse.json(fuelRecord, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar abastecimento:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar abastecimento.' }, { status });
  }
}
