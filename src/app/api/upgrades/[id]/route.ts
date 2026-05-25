import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { UpgradeItemService } from '@/services/upgrade-item-service';
import { UpgradeItemSchema } from '@/lib/validations';

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
    
    // safeParse do Zod (permitindo validação parcial na edição de status apenas, se necessário, ou validação total)
    const result = UpgradeItemSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await UpgradeItemService.update(id, user.id, result.data);
    return NextResponse.json(item, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar melhoria:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar melhoria.' }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await UpgradeItemService.delete(id, user.id);
    return NextResponse.json({ message: 'Melhoria excluída com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir melhoria:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir melhoria.' }, { status });
  }
}
