import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { MaintenanceScheduleService } from '@/services/maintenance-schedule-service';
import { MaintenanceScheduleSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const schedules = await MaintenanceScheduleService.listWithStatus(carId, user.id);

    return NextResponse.json(schedules, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar lembretes:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar lembretes.' }, { status });
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
    const result = MaintenanceScheduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const schedule = await MaintenanceScheduleService.create(carId, user.id, result.data);
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar lembrete:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar lembrete.' }, { status });
  }
}
