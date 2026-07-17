import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { FinancingService } from '@/services/financing-service';
import { FinancingSchema } from '@/lib/validations';

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
    const result = FinancingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const financing = await FinancingService.update(id, user.id, result.data);
    return NextResponse.json(financing, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar financiamento:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar financiamento.' }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const financing = await FinancingService.setPaid(id, user.id, body.paid === true);
    return NextResponse.json(financing, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao marcar parcela:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao marcar parcela.' }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await FinancingService.delete(id, user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir financiamento:', error);
    const status = error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir financiamento.' }, { status });
  }
}
