import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { MaintenanceService } from '@/services/maintenance-service';
import { FuelRecordService } from '@/services/fuel-record-service';
import { WashRecordService } from '@/services/wash-record-service';
import { InsuranceService } from '@/services/insurance-service';
import { FinancingService } from '@/services/financing-service';
import { SELECTED_CAR_COOKIE } from '@/components/providers/car-provider';
import ReportsClient, { ReportsInitialData } from './reports-client';

const VAZIO: ReportsInitialData = {
  carId: null,
  maintenances: [],
  fuelRecords: [],
  washRecords: [],
  insurancePolicy: null,
  insuranceClaims: [],
  financings: [],
};

/**
 * Server component: monta o relatório sem filtros já no HTML, usando o carro do
 * cookie. Ao mexer nos filtros, o cliente rebusca pelas rotas de sempre.
 */
export default async function ReportsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const cookieCarId = cookieStore.get(SELECTED_CAR_COOKIE)?.value || null;

  const cars = await CarService.list(user.id);
  if (cars.length === 0) {
    return <ReportsClient initial={VAZIO} />;
  }

  const carId = cars.some((c) => c.id === cookieCarId) ? cookieCarId! : cars[0].id;

  const [maintenances, fuelRecords, washRecords, insurance, financing] = await Promise.all([
    MaintenanceService.listByCar(carId, user.id).catch(() => []),
    FuelRecordService.listByCar(carId, user.id).catch(() => []),
    WashRecordService.listByCar(carId, user.id).catch(() => []),
    InsuranceService.getByCar(carId, user.id).catch(() => ({ policy: null, claims: [] })),
    FinancingService.listByCar(carId, user.id).catch(() => ({ financings: [] })),
  ]);

  const initial = JSON.parse(
    JSON.stringify({
      carId,
      maintenances,
      fuelRecords,
      washRecords,
      insurancePolicy: insurance.policy,
      insuranceClaims: insurance.claims,
      financings: financing.financings,
    })
  ) as ReportsInitialData;

  return <ReportsClient initial={initial} />;
}
