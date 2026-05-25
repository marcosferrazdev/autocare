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

    const { id: carId } = await params;
    
    // Ler query params para filtros
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const workshop = searchParams.get('workshop') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const maintenances = await MaintenanceService.listByCar(carId, user.id, {
      type,
      workshop,
      startDate,
      endDate,
    });

    return NextResponse.json(maintenances, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar manutenções:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar manutenções.' }, { status });
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
    const result = MaintenanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const maintenance = await MaintenanceService.create(carId, user.id, result.data);
    return NextResponse.json(maintenance, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar manutenção:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar manutenção.' }, { status });
  }
}
