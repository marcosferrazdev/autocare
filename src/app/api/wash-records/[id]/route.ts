import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { WashRecordService } from '@/services/wash-record-service';
import { WashRecordUpdateSchema } from '@/lib/validations';

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
    const result = WashRecordUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const record = await WashRecordService.update(id, user.id, result.data);
    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar lavagem:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar lavagem.' }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await WashRecordService.delete(id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir lavagem:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir lavagem.' }, { status });
  }
}
