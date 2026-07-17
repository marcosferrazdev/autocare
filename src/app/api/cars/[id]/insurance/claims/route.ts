import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { InsuranceService } from '@/services/insurance-service';
import { InsuranceClaimSchema } from '@/lib/validations';

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
    const claims = await InsuranceService.listClaims(carId, user.id);
    return NextResponse.json(claims, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar utilizações do seguro:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao listar utilizações.' }, { status });
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
    const result = InsuranceClaimSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const claim = await InsuranceService.createClaim(carId, user.id, result.data);
    return NextResponse.json(claim, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar utilização do seguro:', error);
    const status =
      error.message?.includes('autorizado') ? 403
        : error.message?.includes('Cadastre os dados') ? 400
          : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar utilização.' }, { status });
  }
}
