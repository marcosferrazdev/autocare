import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { MaintenanceService } from '@/services/maintenance-service';
import { SELECTED_CAR_COOKIE } from '@/lib/selected-car';
import type { MaintenanceForParts } from '@/lib/parts';
import PartsClient from './parts-client';

/**
 * Server component: o catálogo já chega montado com as manutenções do carro do cookie;
 * ao trocar de carro, o cliente rebusca pela rota de manutenções.
 */
export default async function PartsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const cookieCarId = cookieStore.get(SELECTED_CAR_COOKIE)?.value || null;

  const cars = await CarService.list(user.id);
  if (cars.length === 0) {
    return <PartsClient initialCarId={null} initialMaintenances={[]} />;
  }

  const carId = cars.some((c) => c.id === cookieCarId) ? cookieCarId! : cars[0].id;
  const maintenances = await MaintenanceService.listByCar(carId, user.id).catch(() => []);

  return (
    <PartsClient
      initialCarId={carId}
      initialMaintenances={JSON.parse(JSON.stringify(maintenances)) as MaintenanceForParts[]}
    />
  );
}
