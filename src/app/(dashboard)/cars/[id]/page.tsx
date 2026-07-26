import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { MaintenanceService } from '@/services/maintenance-service';
import { FuelRecordService } from '@/services/fuel-record-service';
import { UpgradeItemService } from '@/services/upgrade-item-service';
import { WashRecordService } from '@/services/wash-record-service';
import CarDetailClient, { CarDetailInitialData } from './car-detail-client';

/**
 * Server component: consulta o banco direto (sem passar pelas rotas HTTP) e
 * entrega a tela já com dados. Antes o navegador precisava baixar o JS,
 * hidratar e só então disparar cinco requisições.
 */
export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const [car, maintenances, fuelRecords, upgrades, washRecords] = await Promise.all([
    CarService.getById(id, user.id),
    MaintenanceService.listByCar(id, user.id).catch(() => []),
    FuelRecordService.listByCar(id, user.id).catch(() => []),
    UpgradeItemService.listByCar(id, user.id).catch(() => []),
    WashRecordService.listByCar(id, user.id).catch(() => []),
  ]);

  // Mesma forma que o cliente receberia via fetch (datas viram string)
  const initial = JSON.parse(
    JSON.stringify({ car, maintenances, fuelRecords, upgrades, washRecords })
  ) as CarDetailInitialData;

  return <CarDetailClient initial={initial} />;
}
