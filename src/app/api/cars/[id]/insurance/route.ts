import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { InsuranceService } from '@/services/insurance-service';
import { InsurancePolicySchema } from '@/lib/validations';

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
    const data = await InsuranceService.getByCar(carId, user.id);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar seguro:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar seguro.' }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const body = await request.json();
    const result = InsurancePolicySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = await InsuranceService.upsertPolicy(carId, user.id, result.data);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao salvar seguro:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar seguro.' }, { status });
  }
}
