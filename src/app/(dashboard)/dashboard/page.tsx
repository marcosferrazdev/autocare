'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCar } from '@/components/providers/car-provider';
import { MaintenanceAlerts } from '@/components/maintenance-alerts';
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
  Calendar,
  AlertCircle,
  Droplets,
} from 'lucide-react';
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

export default function DashboardPage() {
  const { selectedCarId, selectedCar, cars, loading: carLoading } = useCar();
  const [data, setData] = useState<DashboardData | null>(null);
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
    if (selectedCarId) {
      fetchDashboardData(selectedCarId);
    } else {
      setData(null);
    }
  }, [selectedCarId]);

  if (carLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estado vazio: nenhum carro cadastrado
  if (!selectedCarId) {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {selectedCar?.nickname || `${selectedCar?.brand} ${selectedCar?.model}`}
          </h1>
          <p className="text-slate-500 text-sm">
            Ano: {selectedCar?.yearManufacture}/{selectedCar?.yearModel} {selectedCar?.plate ? `• Placa: ${selectedCar?.plate}` : ''}
            {cars.length > 1 && (
              <>
                {' • '}
                <Link href="/cars" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  trocar veículo
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/cars/${selectedCarId}/maintenances/new`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-md text-xs transition-all shadow-sm hover:shadow flex items-center gap-1.5"
          >
            <Wrench className="h-4 w-4" /> Registrar Manutenção
          </Link>
          <Link
            href={`/cars/${selectedCarId}/fuel-records/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-md text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
          >
            <Fuel className="h-4 w-4" /> Registrar Abastecimento
          </Link>
        </div>
      </div>

      {/* Alertas de Manutenção Preventiva */}
      <MaintenanceAlerts carId={selectedCarId} />

      {/* Metrics Cards Grid — estilo painel de instrumentos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-x divide-y lg:divide-y-0 divide-slate-100 overflow-hidden">
        {/* Card 1: Custo Total */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Custo Total</p>
            <Coins className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(metrics.totalCarCost)}</p>
          <p className="text-xxs text-slate-400 mt-1.5 leading-relaxed">
            manut. {formatCurrency(metrics.totalMaintenanceCost)} · comb. {formatCurrency(metrics.totalFuelCost)} · lav.{' '}
            {formatCurrency(metrics.totalWashCost ?? 0)} · seg. {formatCurrency(metrics.totalInsuranceCost ?? 0)}
          </p>
          {(metrics.monthlyInsurancePremium ?? 0) > 0 && (
            <p className="text-[10px] text-indigo-600/80 font-semibold mt-1">
              prêmio mensal {formatCurrency(metrics.monthlyInsurancePremium)}
            </p>
          )}
        </div>

        {/* Card 2: Quilometragem */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Odômetro</p>
            <Milestone className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatMileage(data.car.currentMileage)}</p>
          <p className="text-xxs text-slate-400 mt-1.5">quilometragem atual</p>
        </div>

        {/* Card 3: Consumo Médio */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Consumo Médio</p>
            <Activity className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.averageConsumption ? formatConsumption(metrics.averageConsumption) : '—'}
          </p>
          <p className="text-xxs text-slate-400 mt-1.5">
            {metrics.averageConsumption ? 'média dos abastecimentos' : 'aguardando abastecimentos'}
          </p>
        </div>

        {/* Card 4: Custo por KM */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Custo / KM</p>
            <TrendingUp className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.costPerKm > 0 ? formatCurrency(metrics.costPerKm) : 'R$ 0,00'}
          </p>
          <p className="text-xxs text-slate-400 mt-1.5">pela distância total rodada</p>
        </div>
      </div>

      {/* Sub-Metrics Row: Last Activities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Last Maintenance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Última Manutenção</h3>
            </div>
            {metrics.latestMaintenance && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {formatCurrency(metrics.latestMaintenance.totalCost)}
              </span>
            )}
          </div>
          {metrics.latestMaintenance ? (
            <div className="space-y-1">
              <p className="text-slate-800 text-sm font-bold truncate">{metrics.latestMaintenance.description}</p>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(metrics.latestMaintenance.date)}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-slate-400 text-xs italic">Nenhuma manutenção registrada para este carro.</div>
          )}
        </div>

        {/* Last Fuel Record */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Último Abastecimento</h3>
            </div>
            {metrics.latestFuelRecord && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {formatCurrency(metrics.latestFuelRecord.totalPrice)}
              </span>
            )}
          </div>
          {metrics.latestFuelRecord ? (
            <div className="space-y-1">
              <p className="text-slate-800 text-sm font-bold">
                Abastecidos {metrics.latestFuelRecord.liters.toFixed(2)} Litros
              </p>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(metrics.latestFuelRecord.date)}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-slate-400 text-xs italic">Nenhum abastecimento registrado para este carro.</div>
          )}
        </div>

        {/* Last Wash */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="h-4.5 w-4.5 text-cyan-600" />
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Última Lavagem</h3>
            </div>
            {metrics.latestWashRecord && (
              <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                {metrics.latestWashRecord.price > 0
                  ? formatCurrency(metrics.latestWashRecord.price)
                  : 'Grátis'}
              </span>
            )}
          </div>
          {metrics.latestWashRecord ? (
            <div className="space-y-1">
              <p className="text-slate-800 text-sm font-bold truncate">{metrics.latestWashRecord.label}</p>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(metrics.latestWashRecord.date)}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-slate-400 text-xs italic">Nenhuma lavagem registrada para este carro.</div>
          )}
        </div>
      </div>

      {/* Empty Charts State */}
      {isNewCar ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center max-w-xl mx-auto shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-800 text-base mb-1">Ainda não há dados suficientes para gráficos</h3>
          <p className="text-slate-500 text-xs leading-relaxed max-w-md mx-auto">
            Assim que você registrar as primeiras manutenções e abastecimentos, esta seção exibirá gráficos mensais e relatórios interativos de custos e consumo.
          </p>
        </div>
      ) : (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Gastos Mensais */}
          {charts.monthlyExpenses.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col h-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Gastos por Mês</h3>
                {/* Legenda: 2 séries, identidade nunca só pela cor */}
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap justify-end">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES.fuel }} />
                    Combustível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES.maintenance }} />
                    Manutenção
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES.wash }} />
                    Lavagens
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES.insurance }} />
                    Seguro
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <MonthlyExpensesChart data={charts.monthlyExpenses} />
              </div>
            </div>
          )}

          {/* Chart 2: Gastos por Tipo de Manutenção — barras horizontais, uma cor (o comprimento carrega o valor) */}
          {charts.expensesByType.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col h-96">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Gastos por Tipo de Manutenção</h3>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5">
                {(() => {
                  const sorted = [...charts.expensesByType].sort((a, b) => b.value - a.value);
                  const max = sorted[0]?.value || 1;
                  return sorted.map((entry) => (
                    <div key={entry.type}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="text-xs font-medium text-slate-600 truncate">{entry.type}</span>
                        <span className="text-xs font-bold text-slate-900 shrink-0">{formatCurrency(entry.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(2, (entry.value / max) * 100)}%`, backgroundColor: SERIES.maintenance }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Chart 3: Histórico de Consumo — série única: sem legenda, o título nomeia */}
          {charts.consumptionHistory.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col h-96 lg:col-span-2">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Consumo por Abastecimento (km/L)</h3>
              <div className="flex-1 min-h-0">
                <ConsumptionChart data={charts.consumptionHistory} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
