import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { TripService } from '@/services/trip-service';
import { TripSchema } from '@/lib/validations';

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
    const trips = await TripService.listByCar(carId, user.id);

    return NextResponse.json(trips, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar viagens:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar viagens.' }, { status });
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
    const result = TripSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const trip = await TripService.create(carId, user.id, result.data);
    return NextResponse.json(trip, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar viagem:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar viagem.' }, { status });
  }
}
