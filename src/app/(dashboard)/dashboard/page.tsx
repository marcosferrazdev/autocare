import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { DashboardService } from '@/services/dashboard-service';
import { SELECTED_CAR_COOKIE } from '@/components/providers/car-provider';
import DashboardClient from './dashboard-client';

/**
 * Server component: o carro selecionado vem do cookie que o CarProvider grava,
 * então dá para montar o dashboard já com os números — sem esperar o JS baixar,
 * hidratar e só então pedir /api/cars/[id]/dashboard.
 */
export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const cookieCarId = cookieStore.get(SELECTED_CAR_COOKIE)?.value || null;

  const cars = await CarService.list(user.id);
  if (cars.length === 0) {
    return <DashboardClient initialCarId={null} initialData={null} />;
  }

  // Cookie ausente ou apontando para carro removido: cai no primeiro,
  // o mesmo critério que o CarProvider usa no cliente.
  const carId = cars.some((c) => c.id === cookieCarId) ? cookieCarId! : cars[0].id;

  const data = await DashboardService.getDashboardData(carId, user.id).catch(() => null);

  return (
    <DashboardClient
      initialCarId={carId}
      initialData={data ? JSON.parse(JSON.stringify(data)) : null}
    />
  );
}
