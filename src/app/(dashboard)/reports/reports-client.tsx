'use client';

import React, { useEffect, useState } from 'react';
import { useCar } from '@/components/providers/car-provider';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
import { calculateAverageConsumption } from '@/lib/calculations';
import {
  BarChart3,
  Filter,
  Wrench,
  Fuel,
  AlertCircle,
  Loader2,
  Printer,
  ChevronRight,
  Droplets,
  User,
  Shield,
  Landmark,
  Coins,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { CountUp } from '@/components/ui/count-up';
import { SERIES } from '@/lib/chart-colors';

// recharts sai do bundle inicial da rota, como no dashboard
const TrendChart = dynamic(() => import('@/components/dashboard-charts').then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-md bg-slate-50" />,
});

interface MaintenancePartLog {
  id: string;
  name: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MaintenanceLog {
  id: string;
  date: string;
  mileage: number;
  type: string;
  workshop: string | null;
  description: string;
  laborCost: number;
  totalPartsCost: number;
  totalCost: number;
  notes?: string | null;
  paymentMethod?: string | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
  discount?: number | null;
  parts?: MaintenancePartLog[];
}

interface FuelLog {
  id: string;
  date: string;
  mileage: number;
  fuelType: string;
  pricePerLiter: number;
  liters: number;
  fullTank: boolean;
  totalPrice: number;
  gasStation: string | null;
  consumptionKmPerLiter: number | null;
  consumptionEstimated: boolean;
  paymentMethod?: string | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
}

interface WashLog {
  id: string;
  date: string;
  mileage: number | null;
  selfWash: boolean;
  carWashName: string | null;
  price: number;
  washType: string | null;
  notes: string | null;
}

interface InsurancePolicyLog {
  companyName: string;
  monthlyValue: number;
  paymentDay: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt?: string;
}

interface InsuranceClaimLog {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number | null;
  deductible: number | null;
  status: string;
  protocol: string | null;
}

interface FinancingLog {
  id: string;
  kind: string;
  institution: string;
  installmentValue: number;
  monthlyDiscount: number;
  netInstallment: number;
  installmentCount: number;
  paymentDay: number | null;
  firstInstallmentDate: string | null;
  totalAmount: number | null;
  downPayment: number | null;
  createdAt?: string;
}

/** Meses civis inclusivos entre start e end (datas como Date). */
function countMonthsInRange(start: Date, end: Date): number {
  if (end < start) return 0;
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function claimCost(c: InsuranceClaimLog): number {
  if (c.amount != null && c.amount > 0) return c.amount;
  if (c.deductible != null && c.deductible > 0) return c.deductible;
  return 0;
}

const MAINTENANCE_TYPES = [
  'Preventiva',
  'Corretiva',
  'Troca de óleo',
  'Freios',
  'Suspensão',
  'Motor',
  'Elétrica',
  'Pneus',
  'Arrefecimento',
  'Correia dentada',
  'Bateria',
  'Alinhamento e balanceamento',
  'Calibragem de pneu',
  'Outro',
];

type PeriodId = '30d' | '90d' | '12m' | 'all' | 'custom';

const PERIODS: { id: Exclude<PeriodId, 'custom'>; label: string; days: number | null }[] = [
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '12m', label: '12M', days: 365 },
  { id: 'all', label: 'Tudo', days: null },
];

type MetricId = 'total' | 'fuel' | 'maintenance' | 'consumption';

interface MetricDef {
  label: string;
  tile: string;
  color: string;
  value: number;
  format: (v: number) => string;
  tickFormat: (v: number) => string;
  series: { label: string; value: number }[];
  /** gastos: cair é bom; consumo (km/L): subir é bom */
  lowerIsBetter: boolean;
  unit: string;
}

interface MonthBucket {
  key: string;
  label: string;
  fuel: number;
  maintenance: number;
  wash: number;
  insurance: number;
  financing: number;
  total: number;
}

/** Data local (AAAA-MM-DD) de N dias atrás, no formato do <input type="date">. */
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${name}/${String(y).slice(2)}`;
}

/** Chaves AAAA-MM de cada mês civil entre start e end, inclusive. */
function monthsBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

/** Rótulo curto de eixo: 1.200 → "1,2 mil", 850 → "850". */
function compactCurrency(v: number): string {
  return v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `${Math.round(v)}`;
}

/**
 * Variação % do último ponto com movimento contra o anterior (null sem base).
 * Meses finais zerados (o mês corrente ainda sem gasto) ficam fora da comparação.
 */
function seriesDelta(series: { value: number }[]): number | null {
  let end = series.length;
  while (end > 0 && series[end - 1].value === 0) end--;
  if (end < 2) return null;
  const prev = series[end - 2].value;
  const last = series[end - 1].value;
  if (prev <= 0) return null;
  return ((last - prev) / prev) * 100;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24 shrink-0" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        className="spark-draw"
      />
    </svg>
  );
}

function HeaderStat({ icon: Icon, value, label }: { icon: LucideIcon; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-xl font-bold tracking-tight text-slate-900">{value}</span>
        <span className="block text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

export interface ReportsInitialData {
  carId: string | null;
  maintenances: MaintenanceLog[];
  fuelRecords: FuelLog[];
  washRecords: WashLog[];
  insurancePolicy: InsurancePolicyLog | null;
  insuranceClaims: InsuranceClaimLog[];
  financings: FinancingLog[];
}

export default function ReportsClient({ initial }: { initial: ReportsInitialData }) {
  const { selectedCarId, selectedCar, loading: carLoading } = useCar();
  const [maintenances, setMaintenances] = useState<MaintenanceLog[]>(initial.maintenances);
  const [fuelRecords, setFuelRecords] = useState<FuelLog[]>(initial.fuelRecords);
  const [washRecords, setWashRecords] = useState<WashLog[]>(initial.washRecords);
  const [insurancePolicy, setInsurancePolicy] = useState<InsurancePolicyLog | null>(initial.insurancePolicy);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaimLog[]>(initial.insuranceClaims);
  const [financings, setFinancings] = useState<FinancingLog[]>(initial.financings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maintTypeFilter, setMaintTypeFilter] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('');
  const [washTypeFilter, setWashTypeFilter] = useState('');
  const [period, setPeriod] = useState<PeriodId>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [metric, setMetric] = useState<MetricId>('total');

  // Linhas de manutenção expandidas (detalhe de peças)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const fetchReportsData = async () => {
    if (!selectedCarId) return;

    try {
      setLoading(true);
      setError(null);

      // Constrói query params para manutenções
      const maintParams = new URLSearchParams();
      if (startDate) maintParams.append('startDate', startDate);
      if (endDate) maintParams.append('endDate', endDate);
      if (maintTypeFilter) maintParams.append('type', maintTypeFilter);

      // Constrói query params para abastecimentos
      const fuelParams = new URLSearchParams();
      if (startDate) fuelParams.append('startDate', startDate);
      if (endDate) fuelParams.append('endDate', endDate);
      if (fuelTypeFilter) fuelParams.append('fuelType', fuelTypeFilter);

      // Constrói query params para lavagens
      const washParams = new URLSearchParams();
      if (startDate) washParams.append('startDate', startDate);
      if (endDate) washParams.append('endDate', endDate);
      if (washTypeFilter) washParams.append('washType', washTypeFilter);

      // Em paralelo: os cinco relatórios são independentes
      const [maintRes, fuelRes, washRes, insRes, finRes] = await Promise.all([
        fetch(`/api/cars/${selectedCarId}/maintenances?${maintParams.toString()}`),
        fetch(`/api/cars/${selectedCarId}/fuel-records?${fuelParams.toString()}`),
        fetch(`/api/cars/${selectedCarId}/wash-records?${washParams.toString()}`),
        fetch(`/api/cars/${selectedCarId}/insurance`),
        fetch(`/api/cars/${selectedCarId}/financing`),
      ]);

      const maintData = maintRes.ok ? await maintRes.json() : [];
      const fuelData = fuelRes.ok ? await fuelRes.json() : [];
      const washData = washRes.ok ? await washRes.json() : [];
      const insData = insRes.ok ? await insRes.json() : { policy: null, claims: [] };
      const finData = finRes.ok ? await finRes.json() : { financings: [] };

      setMaintenances(maintData);
      setFuelRecords(fuelData);
      setWashRecords(washData);
      setInsurancePolicy(insData.policy || null);
      setInsuranceClaims(insData.claims || []);
      setFinancings(finData.financings || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  };

  // O servidor já entregou o carro do cookie sem filtros; só rebusca quando o
  // veículo muda ou algum filtro é aplicado.
  const jaSemeado = React.useRef(true);
  useEffect(() => {
    const semFiltro =
      !startDate && !endDate && !maintTypeFilter && !fuelTypeFilter && !washTypeFilter;
    if (jaSemeado.current && selectedCarId === initial.carId && semFiltro) {
      return;
    }
    jaSemeado.current = false;
    fetchReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarId, startDate, endDate, maintTypeFilter, fuelTypeFilter, washTypeFilter]);

  // Cálculos consolidados para os dados filtrados
  const totalMaintCost = maintenances.reduce((sum, m) => sum + m.totalCost, 0);
  const totalFuelCost = fuelRecords.reduce((sum, f) => sum + f.totalPrice, 0);
  const totalWashCost = washRecords.reduce((sum, w) => sum + (w.price || 0), 0);

  // Seguro no período filtrado (prêmios mensais + utilizações)
  const filterStart = startDate ? new Date(startDate + 'T00:00:00') : null;
  const filterEnd = endDate ? new Date(endDate + 'T23:59:59') : null;

  const filteredClaims = insuranceClaims.filter((c) => {
    const d = new Date(c.date);
    if (filterStart && d < filterStart) return false;
    if (filterEnd && d > filterEnd) return false;
    return true;
  });

  const totalInsuranceClaims = filteredClaims.reduce((sum, c) => sum + claimCost(c), 0);

  let totalInsurancePremiums = 0;
  const monthlyPremium = insurancePolicy?.monthlyValue ?? 0;
  if (insurancePolicy && monthlyPremium > 0) {
    const policyStart = new Date(
      insurancePolicy.startDate || insurancePolicy.createdAt || new Date().toISOString()
    );
    const policyEnd = insurancePolicy.endDate
      ? new Date(insurancePolicy.endDate)
      : new Date();
    const rangeStart = filterStart && filterStart > policyStart ? filterStart : policyStart;
    const rangeEnd = filterEnd && filterEnd < policyEnd ? filterEnd : policyEnd;
    // se não há filtro de data, conta da vigência até hoje
    const endBound = filterEnd ? rangeEnd : new Date(Math.min(policyEnd.getTime(), Date.now()));
    const startBound = filterStart ? rangeStart : policyStart;
    if (endBound >= startBound) {
      totalInsurancePremiums = countMonthsInRange(startBound, endBound) * monthlyPremium;
    }
  }

  const totalInsuranceCost = totalInsurancePremiums + totalInsuranceClaims;

  // Financiamentos/empréstimos no período (parcelas decorridas × valor da parcela)
  const financingBreakdown = financings.map((f) => {
    const net = f.netInstallment ?? Math.max(0, f.installmentValue - (f.monthlyDiscount ?? 0));
    let installmentsInRange = 0;
    if (f.installmentValue > 0 && f.installmentCount > 0) {
      const finStart = new Date(
        f.firstInstallmentDate || f.createdAt || new Date().toISOString()
      );
      // última parcela = 1ª + (nº parcelas - 1) meses
      const finEnd = new Date(finStart);
      finEnd.setMonth(finEnd.getMonth() + f.installmentCount - 1);

      const rangeStart = filterStart && filterStart > finStart ? filterStart : finStart;
      const rangeEnd = filterEnd && filterEnd < finEnd ? filterEnd : finEnd;
      const endBound = filterEnd ? rangeEnd : new Date(Math.min(finEnd.getTime(), Date.now()));
      const startBound = filterStart ? rangeStart : finStart;
      if (endBound >= startBound) {
        installmentsInRange = Math.min(f.installmentCount, countMonthsInRange(startBound, endBound));
      }
    }
    return { ...f, netInstallment: net, installmentsInRange, cost: installmentsInRange * net };
  });

  const totalFinancingCost = financingBreakdown.reduce((sum, f) => sum + f.cost, 0);

  const totalSpent =
    totalMaintCost + totalFuelCost + totalWashCost + totalInsuranceCost + totalFinancingCost;

  const avgConsumption = calculateAverageConsumption(fuelRecords);

  // Custo por KM nos dados filtrados
  const allMileages = [
    ...(selectedCar ? [selectedCar.currentMileage] : []),
    ...maintenances.map(m => m.mileage),
    ...fuelRecords.map(f => f.mileage),
    ...washRecords.map(w => w.mileage).filter((m): m is number => m != null && m > 0),
  ].filter(m => m > 0);

  const minMileage = allMileages.length > 0 ? Math.min(...allMileages) : 0;
  const maxMileage = allMileages.length > 0 ? Math.max(...allMileages) : 0;
  const kmDriven = maxMileage - minMileage;
  const costPerKm = kmDriven > 0 ? Number((totalSpent / kmDriven).toFixed(2)) : 0;

  // Resumo de gastos por tipo de manutenção (dados filtrados)
  const costByType = Object.entries(
    maintenances.reduce<Record<string, number>>((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + m.totalCost;
      return acc;
    }, {})
  )
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);
  const maxTypeCost = costByType[0]?.value || 1;

  // Série mensal por categoria, do início do período (ou do 1º registro) até o fim (ou hoje)
  const now = new Date();
  const recordTimes = [
    ...maintenances.map((m) => m.date),
    ...fuelRecords.map((f) => f.date),
    ...washRecords.map((w) => w.date),
    ...filteredClaims.map((c) => c.date),
  ].map((d) => new Date(d).getTime());
  const seriesStart = filterStart ?? (recordTimes.length > 0 ? new Date(Math.min(...recordTimes)) : null);
  const seriesEnd = filterEnd && filterEnd < now ? filterEnd : now;
  const buckets = new Map<string, MonthBucket>(
    (seriesStart ? monthsBetween(seriesStart, seriesEnd) : []).map((key) => [
      key,
      { key, label: monthLabel(key), fuel: 0, maintenance: 0, wash: 0, insurance: 0, financing: 0, total: 0 },
    ])
  );
  const addTo = (date: string | Date, field: Exclude<keyof MonthBucket, 'key' | 'label' | 'total'>, value: number) => {
    const bucket = buckets.get(monthKey(new Date(date)));
    if (bucket) bucket[field] += value;
  };
  fuelRecords.forEach((f) => addTo(f.date, 'fuel', f.totalPrice));
  maintenances.forEach((m) => addTo(m.date, 'maintenance', m.totalCost));
  washRecords.forEach((w) => addTo(w.date, 'wash', w.price || 0));
  filteredClaims.forEach((c) => addTo(c.date, 'insurance', claimCost(c)));
  if (insurancePolicy && monthlyPremium > 0) {
    const start = new Date(insurancePolicy.startDate || insurancePolicy.createdAt || now);
    const end = insurancePolicy.endDate && new Date(insurancePolicy.endDate) < now ? new Date(insurancePolicy.endDate) : now;
    monthsBetween(start, end).forEach((key) => addTo(`${key}-15T12:00:00`, 'insurance', monthlyPremium));
  }
  financingBreakdown.forEach((f) => {
    if (!(f.installmentValue > 0 && f.installmentCount > 0)) return;
    const start = new Date(f.firstInstallmentDate || f.createdAt || now);
    const last = new Date(start);
    last.setMonth(last.getMonth() + f.installmentCount - 1);
    monthsBetween(start, last < now ? last : now).forEach((key) => addTo(`${key}-15T12:00:00`, 'financing', f.netInstallment));
  });
  const months = [...buckets.values()].map((b) => ({
    ...b,
    total: b.fuel + b.maintenance + b.wash + b.insurance + b.financing,
  }));

  const consumptionSeries = [...fuelRecords]
    .filter((f) => f.consumptionKmPerLiter != null)
    .sort((a, b) => a.mileage - b.mileage)
    .map((f) => ({ label: formatDate(f.date).slice(0, 5), value: f.consumptionKmPerLiter as number }));

  const metrics: Record<MetricId, MetricDef> = {
    total: {
      label: 'Gasto total',
      tile: 'bg-emerald-100',
      color: '#12a06a',
      value: totalSpent,
      format: formatCurrency,
      tickFormat: compactCurrency,
      series: months.map((m) => ({ label: m.label, value: m.total })),
      lowerIsBetter: true,
      unit: 'por mês',
    },
    fuel: {
      label: 'Combustível',
      tile: 'bg-amber-100',
      color: SERIES.fuel,
      value: totalFuelCost,
      format: formatCurrency,
      tickFormat: compactCurrency,
      series: months.map((m) => ({ label: m.label, value: m.fuel })),
      lowerIsBetter: true,
      unit: 'por mês',
    },
    maintenance: {
      label: 'Manutenção',
      tile: 'bg-blue-100',
      color: SERIES.maintenance,
      value: totalMaintCost,
      format: formatCurrency,
      tickFormat: compactCurrency,
      series: months.map((m) => ({ label: m.label, value: m.maintenance })),
      lowerIsBetter: true,
      unit: 'por mês',
    },
    consumption: {
      label: 'Consumo',
      tile: 'bg-tile-teal',
      color: '#14a3a8',
      value: avgConsumption?.value ?? 0,
      format: (v) => formatConsumption(v),
      tickFormat: (v) => `${Math.round(v)}`,
      series: consumptionSeries,
      lowerIsBetter: false,
      unit: 'por abastecimento',
    },
  };
  const active = metrics[metric];
  const activeAverage =
    active.series.length > 0 ? active.series.reduce((sum, p) => sum + p.value, 0) / active.series.length : 0;

  const categories = [
    { name: 'Combustível', value: totalFuelCost, color: SERIES.fuel },
    { name: 'Manutenção', value: totalMaintCost, color: SERIES.maintenance },
    { name: 'Lavagens', value: totalWashCost, color: SERIES.wash },
    { name: 'Seguro', value: totalInsuranceCost, color: SERIES.insurance },
    { name: 'Financiamento', value: totalFinancingCost, color: '#6b737d' },
  ]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxCategory = categories[0]?.value || 1;

  const heatRows = (
    [
      ['fuel', 'Combustível', SERIES.fuel],
      ['maintenance', 'Manutenção', SERIES.maintenance],
      ['wash', 'Lavagens', SERIES.wash],
      ['insurance', 'Seguro', SERIES.insurance],
      ['financing', 'Financiamento', '#6b737d'],
    ] as const
  ).filter(([field]) => months.some((m) => m[field] > 0));
  const heatMonths = months.slice(-12);
  const heatMax = Math.max(1, ...heatMonths.flatMap((m) => heatRows.map(([field]) => m[field])));

  const selectPeriod = (id: PeriodId) => {
    setPeriod(id);
    const preset = PERIODS.find((p) => p.id === id);
    setEndDate('');
    setStartDate(preset?.days ? isoDaysAgo(preset.days) : '');
  };
  const extraFilters = [maintTypeFilter, fuelTypeFilter, washTypeFilter].filter(Boolean).length;

  const handlePrint = () => {
    window.print();
  };

  if (carLoading && !initial.carId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedCarId && !initial.carId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
        <BarChart3 className="h-14 w-14 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum veículo selecionado</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Cadastre ou selecione um veículo na aba <strong>Meus Veículos</strong> para gerar e exportar relatórios de custos e consumo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 print:p-0">
      {/* Título, números do período e ações */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center print:hidden">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight text-slate-900 xl:mr-4">Relatórios</h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 xl:flex-1">
          <HeaderStat icon={Coins} value={<CountUp value={totalSpent} format={formatCurrency} />} label="Gasto no período" />
          <HeaderStat
            icon={TrendingUp}
            value={costPerKm > 0 ? `${formatCurrency(costPerKm)}/km` : '—'}
            label={kmDriven > 0 ? `em ${formatMileage(kmDriven)} rodados` : 'Custo por km'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => selectPeriod(p.id)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-300 ${
                  period === p.id ? 'bg-block-ink text-on-block-ink' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-sm transition-colors ${
              filtersOpen || period === 'custom' || extraFilters > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4" /> Filtros
            {extraFilters > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{extraFilters}</span>}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Relatório Consolidado - RodaNexo</h1>
        <p className="text-sm text-slate-600 mt-1">
          Veículo: {selectedCar?.brand} {selectedCar?.model} • Placa: {selectedCar?.plate || 'Não informada'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Filtros avançados: abrem pelo botão Filtros */}
      {filtersOpen && (
        <div className="animate-pop-in grid grid-cols-1 gap-4 rounded-xl bg-white p-5 text-xs font-semibold text-slate-700 shadow-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 print:hidden">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">De</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('custom');
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Até</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('custom');
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Tipo de manutenção</span>
            <select
              className="w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              value={maintTypeFilter}
              onChange={(e) => setMaintTypeFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Combustível</span>
            <select
              className="w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              value={fuelTypeFilter}
              onChange={(e) => setFuelTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Flex'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Lavagem</span>
            <select
              className="w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              value={washTypeFilter}
              onChange={(e) => setWashTypeFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {['Completa', 'Externa', 'Interna', 'Motor', 'Detalhamento', 'Outro'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards coloridos: clicar escolhe o que o gráfico grande mostra */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        {(Object.keys(metrics) as MetricId[]).map((id) => {
          const m = metrics[id];
          const delta = seriesDelta(m.series);
          const good = delta !== null && (m.lowerIsBetter ? delta < 0 : delta > 0);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={metric === id}
              onClick={() => setMetric(id)}
              className={`flex flex-col gap-3 rounded-xl p-4 text-left text-slate-900 ring-2 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 ${m.tile} ${
                metric === id ? 'ring-slate-900' : 'ring-transparent'
              }`}
            >
              <span className="text-sm font-semibold text-slate-700">{m.label}</span>
              <span className="text-2xl font-bold tracking-tight">
                {loading ? '…' : m.value > 0 ? <CountUp value={m.value} format={m.format} /> : '—'}
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className="flex items-center gap-2 text-xs text-slate-600">
                  {delta !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        good ? 'bg-emerald-600/15 text-emerald-800' : 'bg-red-600/15 text-red-700'
                      }`}
                    >
                      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                    </span>
                  )}
                  {delta !== null ? (id === 'consumption' ? 'vs anterior' : 'vs mês anterior') : m.unit}
                </span>
                <Sparkline values={m.series.map((p) => p.value)} color={m.color} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 print:hidden">
        {/* Gráfico grande da métrica escolhida */}
        <section className="flex min-h-[400px] flex-col rounded-xl bg-white p-6 shadow-sm lg:col-span-8">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900">{active.label}</h2>
            <p className="text-xs text-slate-500">{active.unit}, com a média do período tracejada</p>
          </div>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900">
              {active.value > 0 ? <CountUp key={metric} value={active.value} format={active.format} /> : '—'}
            </span>
            {activeAverage > 0 && (
              <span className="text-sm text-slate-500">média de {active.format(activeAverage)} {active.unit}</span>
            )}
          </p>
          <div className="mt-4 min-h-0 flex-1">
            {active.series.length > 1 ? (
              <TrendChart
                key={metric}
                data={active.series}
                name={active.label}
                color={active.color}
                format={active.format}
                tickFormat={active.tickFormat}
                average={activeAverage}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                Poucos registros neste período para desenhar a evolução.
              </div>
            )}
          </div>
        </section>

        {/* Por categoria: barras grossas, uma cor por categoria */}
        <section className="flex flex-col rounded-xl bg-white p-6 shadow-sm lg:col-span-4">
          <h2 className="text-[17px] font-bold text-slate-900">Por categoria</h2>
          <p className="text-xs text-slate-500">Para onde foi o dinheiro no período</p>
          <div className="mt-5 flex-1 space-y-3.5">
            {categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhum gasto neste período.</p>
            ) : (
              categories.map((c, i) => (
                <div key={c.name} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
                  <span className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="h-7 overflow-hidden rounded-md bg-slate-100">
                    <span
                      className="grow-x block h-full rounded-md"
                      style={{
                        width: `${Math.max(3, (c.value / maxCategory) * 100)}%`,
                        backgroundColor: c.color,
                        animationDelay: `${150 + i * 80}ms`,
                      }}
                    />
                  </span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(c.value)}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3.5">
              <p className="text-xs text-slate-500">Distância</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{kmDriven > 0 ? formatMileage(kmDriven) : '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3.5">
              <p className="text-xs text-slate-500">{avgConsumption?.estimated ? 'Consumo estimado' : 'Consumo médio'}</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {avgConsumption ? formatConsumption(avgConsumption.value) : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Manutenção por tipo */}
        <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-5">
          <h2 className="text-[17px] font-bold text-slate-900">Manutenção por tipo</h2>
          <p className="text-xs text-slate-500">Onde o dinheiro da oficina foi parar</p>
          <div className="mt-5 space-y-4">
            {costByType.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhuma manutenção neste período.</p>
            ) : (
              costByType.map((entry, i) => (
                <div key={entry.type} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-slate-800">{entry.type}</span>
                      <span className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(entry.value)}</span>
                    </span>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="grow-x block h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (entry.value / maxTypeCost) * 100)}%`,
                          backgroundColor: SERIES.maintenance,
                          animationDelay: `${200 + i * 70}ms`,
                        }}
                      />
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Mapa de gastos: categoria × mês, cor mais forte onde se gastou mais */}
        <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-7">
          <h2 className="text-[17px] font-bold text-slate-900">Mapa de gastos</h2>
          <p className="text-xs text-slate-500">Cada quadrado é um mês; quanto mais forte, mais se gastou</p>
          {heatRows.length === 0 || heatMonths.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nenhum gasto neste período.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-separate border-spacing-1.5 text-xs">
                <thead>
                  <tr>
                    <th />
                    {heatMonths.map((m) => (
                      <th key={m.key} scope="col" className="pb-1 text-center font-semibold text-slate-500">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatRows.map(([field, name, color], row) => (
                    <tr key={field}>
                      <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold text-slate-600">
                        {name}
                      </th>
                      {heatMonths.map((m, col) => {
                        const value = m[field];
                        const strength = value > 0 ? 18 + Math.round((value / heatMax) * 82) : 0;
                        return (
                          <td
                            key={m.key}
                            title={`${m.label} · ${name}: ${formatCurrency(value)}`}
                            className="animate-fade-in h-9 min-w-9 rounded-md"
                            style={{
                              backgroundColor: value > 0 ? `color-mix(in srgb, ${color} ${strength}%, var(--card))` : 'var(--s100)',
                              animationDelay: `${(row * heatMonths.length + col) * 12}ms`,
                              animationFillMode: 'both',
                            }}
                          >
                            <span className="sr-only">{formatCurrency(value)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-8">
        {/* Maintenances Extrato */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4.5 w-4.5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Extrato Completo de Manutenções ({maintenances.length})</h2>
            </div>
            <span className="text-xxs text-slate-400 print:hidden">clique na linha para ver as peças</span>
          </div>
          
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 gap-4">
                  <div className="h-4 bg-slate-100 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-16"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-24"></div>
                  <div className="h-4 bg-slate-100 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : maintenances.length === 0 ? (
            <p className="text-slate-400 italic text-xs py-4 text-center">Nenhum registro encontrado para os filtros ativos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
                    <th className="pb-3 w-6" />
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Descrição</th>
                    <th className="pb-3 pr-4">Tipo</th>
                    <th className="pb-3 pr-4">Odômetro</th>
                    <th className="pb-3 pr-4">Oficina</th>
                    <th className="pb-3 pr-4">Pagamento</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {maintenances.map((m) => {
                    const hasDetails = (m.parts && m.parts.length > 0) || m.laborCost > 0 || m.notes;
                    const isExpanded = !!expandedRows[m.id];
                    return (
                      <React.Fragment key={m.id}>
                        <tr
                          onClick={() => hasDetails && toggleRow(m.id)}
                          className={hasDetails ? 'cursor-pointer hover:bg-slate-50/70 transition-colors' : ''}
                        >
                          <td className="py-3 pr-2 w-6">
                            {hasDetails && (
                              <ChevronRight
                                className={`h-3.5 w-3.5 text-slate-400 transition-transform print:hidden ${isExpanded ? 'rotate-90 text-blue-600' : ''}`}
                              />
                            )}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-500">{formatDate(m.date)}</td>
                          <td className="py-3 pr-4 font-bold text-slate-900">{m.description}</td>
                          <td className="py-3 pr-4 font-medium"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase text-xxs">{m.type}</span></td>
                          <td className="py-3 pr-4">{formatMileage(m.mileage)}</td>
                          <td className="py-3 pr-4 text-slate-500">{m.workshop || '-'}</td>
                          <td className="py-3 pr-4 text-slate-500 font-medium">
                            {m.paymentMethod === 'À vista' || !m.paymentMethod ? (
                              <span className="text-slate-600">À vista</span>
                            ) : m.installmentCount && m.installmentValue ? (
                              <span className="text-slate-800 font-semibold">
                                A prazo ({m.installmentCount}x de {formatCurrency(m.installmentValue)})
                              </span>
                            ) : (
                              <span className="text-slate-600">{m.paymentMethod}</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <span className="font-extrabold text-slate-950 block">{formatCurrency(m.totalCost)}</span>
                            {m.discount && m.discount > 0 ? (
                              <span className="text-xxs text-emerald-600 font-semibold block">
                                -{formatCurrency(m.discount)} desc.
                              </span>
                            ) : null}
                          </td>
                        </tr>
                        {isExpanded && hasDetails && (
                          <tr className="bg-slate-50/60">
                            <td />
                            <td colSpan={7} className="py-3 pr-4">
                              <div className="space-y-2.5 text-[11px]">
                                {m.parts && m.parts.length > 0 && (
                                  <div>
                                    <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wider mb-1.5">
                                      Peças ({m.parts.length})
                                    </p>
                                    <div className="space-y-1">
                                      {m.parts.map((p) => (
                                        <div key={p.id} className="flex justify-between items-center text-slate-700 max-w-md">
                                          <span>
                                            <span className="font-bold text-slate-900">{p.quantity}x</span> {p.name}
                                            {p.brand && <span className="text-slate-400"> ({p.brand})</span>}
                                            <span className="text-slate-400"> • {formatCurrency(p.unitPrice)}/un</span>
                                          </span>
                                          <span className="font-semibold text-slate-600">{formatCurrency(p.totalPrice)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-5 text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/60 max-w-md">
                                  <span>Mão de obra: <strong className="text-slate-700">{formatCurrency(m.laborCost)}</strong></span>
                                  <span>Peças: <strong className="text-slate-700">{formatCurrency(m.totalPartsCost)}</strong></span>
                                </div>
                                {m.notes && (
                                  <p className="text-slate-500 italic max-w-md whitespace-pre-wrap">{m.notes}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fuel Records Extrato */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
            <Fuel className="h-4.5 w-4.5 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-sm">Extrato Completo de Abastecimentos ({fuelRecords.length})</h2>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 gap-4">
                  <div className="h-4 bg-slate-100 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : fuelRecords.length === 0 ? (
            <p className="text-slate-400 italic text-xs py-4 text-center">Nenhum registro encontrado para os filtros ativos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Combustível</th>
                    <th className="pb-3 pr-4">Odômetro</th>
                    <th className="pb-3 pr-4">Preço/L</th>
                    <th className="pb-3 pr-4">Litros</th>
                    <th className="pb-3 pr-4">Consumo</th>
                    <th className="pb-3 pr-4">Posto</th>
                    <th className="pb-3 pr-4">Pagamento</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {fuelRecords.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-500">{formatDate(f.date)}</td>
                      <td className="py-3 pr-4 font-bold text-slate-900">{f.fuelType}</td>
                      <td className="py-3 pr-4">{formatMileage(f.mileage)}</td>
                      <td className="py-3 pr-4">{formatCurrency(f.pricePerLiter)}</td>
                      <td className="py-3 pr-4">{f.liters.toFixed(2)} L</td>
                      <td className="py-3 pr-4 font-bold text-amber-600">{f.consumptionKmPerLiter ? `${formatConsumption(f.consumptionKmPerLiter)}${f.consumptionEstimated ? ' (estimado)' : ''}` : '-'}</td>
                      <td className="py-3 pr-4 text-slate-500">{f.gasStation || '-'}</td>
                      <td className="py-3 pr-4 text-slate-500 font-medium">
                        {f.paymentMethod === 'À vista' || !f.paymentMethod ? (
                          <span className="text-slate-600">À vista</span>
                        ) : f.installmentCount && f.installmentValue ? (
                          <span className="text-slate-800 font-semibold">
                            A prazo ({f.installmentCount}x de {formatCurrency(f.installmentValue)})
                          </span>
                        ) : (
                          <span className="text-slate-600">{f.paymentMethod}</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-extrabold text-slate-950">{formatCurrency(f.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Wash Records Extrato */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
            <Droplets className="h-4.5 w-4.5 text-cyan-600" />
            <h2 className="font-bold text-slate-800 text-sm">Extrato Completo de Lavagens ({washRecords.length})</h2>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 gap-4">
                  <div className="h-4 bg-slate-100 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-16"></div>
                  <div className="h-4 bg-slate-100 rounded w-12"></div>
                  <div className="h-4 bg-slate-100 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : washRecords.length === 0 ? (
            <p className="text-slate-400 italic text-xs py-4 text-center">Nenhuma lavagem encontrada para os filtros ativos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Local / Quem</th>
                    <th className="pb-3 pr-4">Tipo</th>
                    <th className="pb-3 pr-4">Odômetro</th>
                    <th className="pb-3 pr-4">Obs.</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {washRecords.map((w) => (
                    <tr key={w.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-500">{formatDate(w.date)}</td>
                      <td className="py-3 pr-4 font-bold text-slate-900">
                        {w.selfWash ? (
                          <span className="inline-flex items-center gap-1 text-violet-700">
                            <User className="h-3.5 w-3.5" /> Eu lavei
                          </span>
                        ) : (
                          w.carWashName || 'Lava-jato'
                        )}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {w.washType ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-100 uppercase text-xxs font-bold">
                            {w.washType}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 pr-4">{w.mileage != null ? formatMileage(w.mileage) : '-'}</td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[200px] truncate" title={w.notes || undefined}>
                        {w.notes || '-'}
                      </td>
                      <td className="py-3 text-right font-extrabold text-slate-950">
                        {w.price > 0 ? formatCurrency(w.price) : 'Grátis'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Seguro */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-indigo-600" />
              <h2 className="font-bold text-slate-800 text-sm">Seguro no período</h2>
            </div>
            {!loading && (
              <div className="text-xxs text-slate-500 font-semibold flex flex-wrap gap-x-3">
                <span>
                  Prêmios:{' '}
                  <strong className="text-slate-800">{formatCurrency(totalInsurancePremiums)}</strong>
                  {monthlyPremium > 0 && (
                    <span className="text-slate-400 font-medium">
                      {' '}
                      ({formatCurrency(monthlyPremium)}/mês)
                    </span>
                  )}
                </span>
                <span>
                  Utilizações:{' '}
                  <strong className="text-slate-800">{formatCurrency(totalInsuranceClaims)}</strong>
                </span>
                <span>
                  Total:{' '}
                  <strong className="text-indigo-700">{formatCurrency(totalInsuranceCost)}</strong>
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-16 bg-slate-50 rounded animate-pulse" />
          ) : !insurancePolicy ? (
            <p className="text-slate-400 italic text-xs py-4 text-center">
              Nenhum seguro cadastrado para este veículo.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                  <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Seguradora</p>
                  <p className="font-bold text-slate-900 mt-1">{insurancePolicy.companyName}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mensalidade</p>
                  <p className="font-bold text-slate-900 mt-1">
                    {monthlyPremium > 0 ? formatCurrency(monthlyPremium) : '—'}
                    {insurancePolicy.paymentDay != null && (
                      <span className="text-slate-400 font-medium text-[11px]"> · dia {insurancePolicy.paymentDay}</span>
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Prêmios no filtro</p>
                  <p className="font-bold text-slate-900 mt-1">{formatCurrency(totalInsurancePremiums)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">
                  Utilizações no período ({filteredClaims.length})
                </h3>
                {filteredClaims.length === 0 ? (
                  <p className="text-slate-400 italic text-xs py-3 text-center border border-dashed border-slate-200 rounded-lg">
                    Nenhuma utilização no período filtrado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
                          <th className="pb-3 pr-4">Data</th>
                          <th className="pb-3 pr-4">Tipo</th>
                          <th className="pb-3 pr-4">Descrição</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Protocolo</th>
                          <th className="pb-3 text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredClaims.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 pr-4 font-semibold text-slate-500">{formatDate(c.date)}</td>
                            <td className="py-3 pr-4 font-bold text-slate-900">{c.type}</td>
                            <td className="py-3 pr-4 text-slate-600 max-w-[220px] truncate">{c.description}</td>
                            <td className="py-3 pr-4">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase text-xxs font-bold">
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-500">{c.protocol || '—'}</td>
                            <td className="py-3 text-right font-extrabold text-slate-950">
                              {claimCost(c) > 0 ? formatCurrency(claimCost(c)) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Financiamentos e empréstimos */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-sm">Financiamentos e empréstimos no período</h2>
            </div>
            {!loading && financingBreakdown.length > 0 && (
              <div className="text-xxs text-slate-500 font-semibold">
                Total:{' '}
                <strong className="text-emerald-700">{formatCurrency(totalFinancingCost)}</strong>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-16 bg-slate-50 rounded animate-pulse" />
          ) : financingBreakdown.length === 0 ? (
            <p className="text-slate-400 italic text-xs py-4 text-center">
              Nenhum financiamento ou empréstimo cadastrado para este veículo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
                    <th className="pb-3 pr-4">Tipo</th>
                    <th className="pb-3 pr-4">Credor</th>
                    <th className="pb-3 pr-4">Parcela</th>
                    <th className="pb-3 pr-4">Parcelas no filtro</th>
                    <th className="pb-3 text-right">Total no filtro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {financingBreakdown.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase text-xxs font-bold">
                          {f.kind}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-900">{f.institution}</td>
                      <td className="py-3 pr-4">
                        {f.installmentValue > 0 ? formatCurrency(f.netInstallment) : '—'}
                        {f.monthlyDiscount > 0 && (
                          <span className="text-emerald-600 text-xxs font-semibold">
                            {' '}(−{formatCurrency(f.monthlyDiscount)} ajuda)
                          </span>
                        )}
                        {f.paymentDay != null && (
                          <span className="text-slate-400"> · dia {f.paymentDay}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {f.installmentsInRange} {f.installmentCount > 0 ? `de ${f.installmentCount}` : ''}
                      </td>
                      <td className="py-3 text-right font-extrabold text-slate-950">{formatCurrency(f.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
