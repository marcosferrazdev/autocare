'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCar } from '@/components/providers/car-provider';
import { formatCurrency, formatMileage, formatConsumption, formatDate } from '@/lib/formatters';
import {
  Car,
  Wrench,
  Fuel,
  TrendingUp,
  Coins,
  Milestone,
  Activity,
  Plus,
  Loader2,
  AlertCircle,
  Droplets,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { CountUp } from '@/components/ui/count-up';
import dynamic from 'next/dynamic';
import { SERIES } from '@/lib/chart-colors';

// recharts pesa ~200 KB comprimidos: sai do bundle da rota e desce depois que
// os cartões de métrica já pintaram.
const chartFallback = () => (
  <div className="h-full w-full rounded-md bg-slate-50 animate-pulse" />
);

const MonthlyExpensesChart = dynamic(
  () => import('@/components/dashboard-charts').then((m) => m.MonthlyExpensesChart),
  { ssr: false, loading: chartFallback }
);

const ConsumptionChart = dynamic(
  () => import('@/components/dashboard-charts').then((m) => m.ConsumptionChart),
  { ssr: false, loading: chartFallback }
);

interface DashboardData {
  car: {
    id: string;
    brand: string;
    model: string;
    nickname: string | null;
    currentMileage: number;
    plate: string | null;
  };
  metrics: {
    totalMaintenanceCost: number;
    totalFuelCost: number;
    totalWashCost: number;
    totalInsuranceCost: number;
    monthlyInsurancePremium: number;
    totalInsuranceClaims: number;
    totalCarCost: number;
    latestMaintenance: {
      date: string;
      description: string;
      totalCost: number;
    } | null;
    latestFuelRecord: {
      date: string;
      liters: number;
      totalPrice: number;
    } | null;
    latestWashRecord: {
      date: string;
      label: string;
      price: number;
      selfWash: boolean;
    } | null;
    averageConsumption: number | null;
    averageConsumptionEstimated: boolean;
    costPerKm: number;
  };
  charts: {
    monthlyExpenses: {
      month: string;
      maintenance: number;
      fuel: number;
      wash: number;
      insurance: number;
      total: number;
    }[];
    expensesByType: {
      type: string;
      value: number;
    }[];
    consumptionHistory: {
      date: string;
      consumption: number;
    }[];
  };
}

export default function DashboardClient({
  initialCarId,
  initialData,
}: {
  initialCarId: string | null;
  initialData: DashboardData | null;
}) {
  const { selectedCarId, loading: carLoading } = useCar();
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (carId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cars/${carId}/dashboard`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao carregar dados do dashboard.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // O servidor já entregou o carro do cookie; só busca ao trocar de veículo
    if (selectedCarId && selectedCarId !== initialCarId) {
      fetchDashboardData(selectedCarId);
    } else if (!selectedCarId && !initialCarId) {
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarId]);

  if (carLoading && !initialData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estado vazio: nenhum carro cadastrado
  // Antes do CarProvider responder, vale o carro que o servidor já usou
  const activeCarId = selectedCarId ?? initialCarId;

  if (!activeCarId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Car className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum veículo cadastrado</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Para ver estatísticas, gráficos e começar a monitorar seus gastos, você precisa cadastrar seu primeiro veículo.
        </p>
        <Link
          href="/cars/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> Cadastrar Meu Primeiro Veículo
        </Link>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-slate-400 text-xs font-semibold">Carregando métricas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, charts } = data;

  const isNewCar =
    charts.monthlyExpenses.length === 0 &&
    charts.expensesByType.length === 0 &&
    !metrics.latestWashRecord;

  // Título vem do carro dos dados exibidos (igual no servidor e no cliente)
  const carName = data.car.nickname || `${data.car.brand} ${data.car.model}`;
  const fuelShare = metrics.totalCarCost > 0 ? Math.round((metrics.totalFuelCost / metrics.totalCarCost) * 100) : 0;
  const carHref = `/cars/${activeCarId}`;

  return (
    <div className="space-y-5">
      {/* Cabeçalho: nome do carro e os três números que importam no dia a dia */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:mr-6 lg:max-w-[32%] lg:shrink">
          <h1 className="truncate text-[34px] font-bold leading-tight tracking-tight text-slate-900">{carName}</h1>
          <p className="truncate text-sm text-slate-500">
            {data.car.brand} {data.car.model}
            {data.car.plate ? ` · ${data.car.plate}` : ''}
          </p>
        </div>

        {/* Os três números sempre numa linha; no celular a linha rola de lado */}
        <div className="-mx-1 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto px-1 py-1 [scrollbar-width:none] lg:flex-1">
          <HeaderStat icon={Coins} value={<CountUp value={metrics.totalCarCost} format={formatCurrency} />} label="Gasto total" />
          <HeaderStat icon={Milestone} value={formatMileage(data.car.currentMileage)} label="Odômetro" />
          <HeaderStat
            icon={Activity}
            solid
            value={metrics.averageConsumption ? formatConsumption(metrics.averageConsumption) : '—'}
            label={
              !metrics.averageConsumption
                ? 'Consumo: sem dados'
                : metrics.averageConsumptionEstimated
                  ? 'Consumo estimado'
                  : 'Consumo médio'
            }
          />
        </div>

        {/* Entre lg e 2xl os botões ficam só com o ícone para caber tudo na linha */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link
            href={`${carHref}/maintenances/new`}
            aria-label="Registrar manutenção"
            title="Registrar manutenção"
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 lg:h-11 lg:w-11 lg:px-0 2xl:h-auto 2xl:w-auto 2xl:px-4"
          >
            <Wrench className="h-4 w-4" />
            <span className="sm:hidden">Manutenção</span>
            <span className="hidden sm:inline lg:hidden 2xl:inline">Registrar manutenção</span>
          </Link>
          <Link
            href={`${carHref}/fuel-records/new`}
            aria-label="Registrar abastecimento"
            title="Registrar abastecimento"
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 lg:h-11 lg:w-11 lg:px-0 2xl:h-auto 2xl:w-auto 2xl:px-4"
          >
            <Fuel className="h-4 w-4" />
            <span className="sm:hidden">Abastecer</span>
            <span className="hidden sm:inline lg:hidden 2xl:inline">Registrar abastecimento</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Gastos por mês: o card principal */}
        <section className="flex min-h-[420px] flex-col rounded-xl bg-white p-6 shadow-sm lg:col-span-7">
          <CardHead title="Gastos por mês" subtitle="Combustível, manutenção, lavagens e seguro" href="/reports" />
          {isNewCar ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <AlertCircle className="mb-3 h-9 w-9 text-slate-300" />
              <p className="font-bold text-slate-800">Ainda não há gastos para mostrar</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Registre um abastecimento ou uma manutenção e o gráfico do mês aparece aqui.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900">
                  <CountUp value={metrics.totalCarCost} format={formatCurrency} />
                </span>
                <span className="text-sm text-slate-500">
                  em {charts.monthlyExpenses.length} {charts.monthlyExpenses.length === 1 ? 'mês' : 'meses'} · {fuelShare}% em combustível
                </span>
              </p>
              {/* Legenda: identidade nunca só pela cor */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                {[
                  ['Combustível', SERIES.fuel],
                  ['Manutenção', SERIES.maintenance],
                  ['Lavagens', SERIES.wash],
                  ['Seguro', SERIES.insurance],
                ].map(([name, color]) => (
                  <span key={name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
                    {name}
                  </span>
                ))}
              </div>
              <div className="mt-3 min-h-0 flex-1">
                <MonthlyExpensesChart data={charts.monthlyExpenses} />
              </div>
            </>
          )}
        </section>

        {/* Últimos registros em blocos coloridos */}
        <section className="flex flex-col rounded-xl bg-white p-6 shadow-sm lg:col-span-5">
          <CardHead title="Últimos registros" subtitle="O que aconteceu por último com o carro" href={carHref} />
          <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <Block
              tone="bg-fuel text-on-fuel"
              label="Abastecimento"
              title={metrics.latestFuelRecord ? `${metrics.latestFuelRecord.liters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L` : 'Nenhum ainda'}
              detail={metrics.latestFuelRecord ? formatDate(metrics.latestFuelRecord.date) : 'Registre o primeiro'}
              value={metrics.latestFuelRecord ? formatCurrency(metrics.latestFuelRecord.totalPrice) : null}
              action={{ label: 'Abastecer', href: `${carHref}/fuel-records/new`, icon: Fuel }}
            />
            <Block
              tone="bg-block-ink text-on-block-ink"
              label="Manutenção"
              title={metrics.latestMaintenance?.description ?? 'Nenhuma ainda'}
              detail={metrics.latestMaintenance ? formatDate(metrics.latestMaintenance.date) : 'Registre a primeira'}
              value={metrics.latestMaintenance ? formatCurrency(metrics.latestMaintenance.totalCost) : null}
              action={{ label: 'Registrar', href: `${carHref}/maintenances/new`, icon: Wrench }}
            />
            <Block
              tone="bg-mist text-on-mist"
              label="Lavagem"
              title={metrics.latestWashRecord?.label ?? 'Nenhuma ainda'}
              detail={metrics.latestWashRecord ? formatDate(metrics.latestWashRecord.date) : 'Registre na aba Lavadas'}
              value={
                metrics.latestWashRecord
                  ? metrics.latestWashRecord.price > 0
                    ? formatCurrency(metrics.latestWashRecord.price)
                    : 'Grátis'
                  : null
              }
              action={{ label: 'Lavadas', href: `${carHref}?tab=lavadas`, icon: Droplets }}
            />
            <Block
              tone="bg-block-accent text-on-block-accent"
              label="Custo por km"
              title={metrics.costPerKm > 0 ? formatCurrency(metrics.costPerKm) : 'R$ 0,00'}
              detail="Pela distância total rodada"
              value={null}
              action={{ label: 'Relatórios', href: '/reports', icon: TrendingUp }}
            />
          </div>
        </section>

        {charts.consumptionHistory.length > 0 && (
          <section className="flex h-[380px] flex-col rounded-xl bg-white p-6 shadow-sm lg:col-span-7">
            <CardHead title="Consumo por abastecimento" subtitle="km/L de cada abastecimento, em ordem de data" />
            <div className="mt-4 min-h-0 flex-1">
              <ConsumptionChart data={charts.consumptionHistory} />
            </div>
          </section>
        )}

        {charts.expensesByType.length > 0 && (
          <section
            className={`flex h-[380px] flex-col rounded-xl bg-white p-6 shadow-sm ${
              charts.consumptionHistory.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'
            }`}
          >
            <CardHead title="Manutenção por tipo" subtitle="Onde o dinheiro da oficina foi parar" />
            {/* Barras horizontais de uma cor: o comprimento carrega o valor */}
            <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {(() => {
                const sorted = [...charts.expensesByType].sort((a, b) => b.value - a.value);
                const max = sorted[0]?.value || 1;
                return sorted.map((entry, i) => (
                  <div key={entry.type}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-700">{entry.type}</span>
                      <span className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(entry.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="grow-x h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (entry.value / max) * 100)}%`,
                          backgroundColor: SERIES.maintenance,
                          animationDelay: `${200 + i * 70}ms`,
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function HeaderStat({
  icon: Icon,
  value,
  label,
  solid = false,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  solid?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          solid ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-xl font-bold tracking-tight text-slate-900">{value}</span>
        <span className="block text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

function CardHead({ title, subtitle, href }: { title: string; subtitle: string; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`Abrir ${title.toLowerCase()}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function Block({
  tone,
  label,
  title,
  detail,
  value,
  action,
}: {
  tone: string;
  label: string;
  title: string;
  detail: string;
  value: string | null;
  action: { label: string; href: string; icon: LucideIcon };
}) {
  const ActionIcon = action.icon;
  return (
    <div className={`flex min-h-[150px] flex-col justify-between rounded-lg p-4 ${tone}`}>
      <div>
        <p className="text-xs font-semibold opacity-70">{label}</p>
        <p className="mt-1 line-clamp-2 text-lg font-bold leading-snug">{title}</p>
        <p className="text-xs opacity-70">{detail}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-xl font-bold tracking-tight">{value}</span>
        <Link
          href={action.href}
          className="flex items-center gap-1.5 rounded-full bg-current/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-current/20 transition-colors hover:bg-current/20"
        >
          <ActionIcon className="h-3.5 w-3.5" /> {action.label}
        </Link>
      </div>
    </div>
  );
}
