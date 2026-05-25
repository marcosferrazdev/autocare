import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { MaintenanceService } from '@/services/maintenance-service';
import { MaintenanceSchema } from '@/lib/validations';

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
    const maintenance = await MaintenanceService.getById(id, user.id);

    return NextResponse.json(maintenance, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar manutenção:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao carregar manutenção.' }, { status });
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
    const result = MaintenanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const maintenance = await MaintenanceService.update(id, user.id, result.data);
    return NextResponse.json(maintenance, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar manutenção:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar manutenção.' }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await MaintenanceService.delete(id, user.id);
    return NextResponse.json({ message: 'Manutenção excluída com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir manutenção:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir manutenção.' }, { status });
  }
}
