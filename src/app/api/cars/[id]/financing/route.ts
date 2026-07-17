import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { FinancingService } from '@/services/financing-service';
import { FinancingSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const data = await FinancingService.listByCar(carId, user.id);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar financiamentos:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar financiamentos.' }, { status });
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
    const result = FinancingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const financing = await FinancingService.create(carId, user.id, result.data);
    return NextResponse.json(financing, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar financiamento:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao criar financiamento.' }, { status });
  }
}
