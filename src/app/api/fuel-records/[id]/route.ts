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

    const { id } = await params;
    const record = await FuelRecordService.getById(id, user.id);

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar abastecimento:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao carregar abastecimento.' }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = FuelRecordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const record = await FuelRecordService.update(id, user.id, result.data);
    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar abastecimento:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar abastecimento.' }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await FuelRecordService.delete(id, user.id);
    return NextResponse.json({ message: 'Abastecimento excluído com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir abastecimento:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir abastecimento.' }, { status });
  }
}
