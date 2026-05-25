import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { CarSchema } from '@/lib/validations';

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
    const car = await CarService.getById(id, user.id);

    if (!car) {
      return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(car, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
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
    const result = CarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const car = await CarService.update(id, user.id, result.data);
    return NextResponse.json(car, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar veículo:', error);
    const status = error.message?.includes('permissão') ? 403 : 400;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar veículo.' }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    await CarService.delete(id, user.id);
    return NextResponse.json({ message: 'Veículo excluído com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir veículo:', error);
    const status = error.message?.includes('permissão') ? 403 : 400;
    return NextResponse.json({ error: error.message || 'Erro ao excluir veículo.' }, { status });
  }
}
