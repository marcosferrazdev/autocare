import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { DashboardService } from '@/services/dashboard-service';

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
    const dashboardData = await DashboardService.getDashboardData(carId, user.id);
    
    return NextResponse.json(dashboardData, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar dados do dashboard:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 400;
    return NextResponse.json({ error: error.message || 'Erro ao carregar dashboard.' }, { status });
  }
}
