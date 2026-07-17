import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { InsuranceService } from '@/services/insurance-service';
import { InsuranceClaimSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = InsuranceClaimSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const claim = await InsuranceService.updateClaim(id, user.id, result.data);
    return NextResponse.json(claim, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar utilização do seguro:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar utilização.' }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await InsuranceService.deleteClaim(id, user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir utilização do seguro:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir utilização.' }, { status });
  }
}
