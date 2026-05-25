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
  ArrowUpRight,
  Activity,
  Plus,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

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
    averageConsumption: number | null;
    costPerKm: number;
  };
  charts: {
    monthlyExpenses: {
      month: string;
      maintenance: number;
      fuel: number;
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

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function DashboardPage() {
  const { selectedCarId, selectedCar, loading: carLoading } = useCar();
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
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
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
      <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, charts } = data;

  const isNewCar = charts.monthlyExpenses.length === 0 && charts.expensesByType.length === 0;

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
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/cars/${selectedCarId}/maintenances/new`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm hover:shadow flex items-center gap-1.5"
          >
            <Wrench className="h-4 w-4" /> Registrar Manutenção
          </Link>
          <Link
            href={`/cars/${selectedCarId}/fuel-records/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
          >
            <Fuel className="h-4 w-4" /> Registrar Abastecimento
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Custo Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo Total</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{formatCurrency(metrics.totalCarCost)}</p>
            <p className="text-xxs text-slate-400 mt-0.5">Manutenções + Combustível</p>
          </div>
        </div>

        {/* Card 2: Quilometragem */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Milestone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Odômetro Atual</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{formatMileage(data.car.currentMileage)}</p>
            <p className="text-xxs text-slate-400 mt-0.5">Quilometragem do veículo</p>
          </div>
        </div>

        {/* Card 3: Consumo Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consumo Médio</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {metrics.averageConsumption ? formatConsumption(metrics.averageConsumption) : '-'}
            </p>
            <p className="text-xxs text-slate-400 mt-0.5">
              {metrics.averageConsumption ? 'Média geral calculada' : 'Aguardando abastecimentos'}
            </p>
          </div>
        </div>

        {/* Card 4: Custo por KM */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo por KM</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {metrics.costPerKm > 0 ? `${formatCurrency(metrics.costPerKm)}/km` : 'R$ 0,00/km'}
            </p>
            <p className="text-xxs text-slate-400 mt-0.5">Baseado na distância total rodada</p>
          </div>
        </div>
      </div>

      {/* Sub-Metrics Row: Last Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Last Maintenance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm">Última Manutenção</h3>
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">Último Abastecimento</h3>
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
      </div>

      {/* Empty Charts State */}
      {isNewCar ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto shadow-sm">
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Evolução Mensal de Gastos</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <YAxis tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar name="Combustível" dataKey="fuel" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar name="Manutenção" dataKey="maintenance" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Gastos por Categoria de Manutenção */}
          {charts.expensesByType.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Gastos por Tipo de Manutenção</h3>
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="w-full h-full flex flex-col md:flex-row items-center">
                  <div className="flex-1 h-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.expensesByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="type"
                        >
                          {charts.expensesByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-full overflow-y-auto px-4 py-2 space-y-1 text-xs w-full md:w-48 shrink-0">
                    {charts.expensesByType.map((entry, index) => (
                      <div key={entry.type} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-600 truncate">{entry.type}</span>
                        </div>
                        <span className="font-bold text-slate-800 shrink-0">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart 3: Histórico de Consumo */}
          {charts.consumptionHistory.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96 lg:col-span-2">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Histórico de Consumo de Combustível (km/L)</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.consumptionHistory} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <YAxis tickFormatter={(val) => `${val}`} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <Tooltip formatter={(value) => [`${value} km/L`, 'Consumo']} />
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#F59E0B', strokeWidth: 2, fill: '#FFF' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
