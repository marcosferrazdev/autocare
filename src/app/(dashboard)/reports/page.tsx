'use client';

import React, { useEffect, useState } from 'react';
import { useCar } from '@/components/providers/car-provider';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
import {
  BarChart3,
  Calendar,
  Filter,
  Wrench,
  Fuel,
  TrendingUp,
  Download,
  AlertCircle,
  Loader2,
  Printer,
  ChevronRight,
  Calculator
} from 'lucide-react';

interface MaintenanceLog {
  id: string;
  date: string;
  mileage: number;
  type: string;
  workshop: string | null;
  description: string;
  totalCost: number;
  paymentMethod?: string | null;
  installmentCount?: number | null;
  installmentValue?: number | null;
  discount?: number | null;
}

interface FuelLog {
  id: string;
  date: string;
  mileage: number;
  fuelType: string;
  pricePerLiter: number;
  liters: number;
  totalPrice: number;
  gasStation: string | null;
  consumptionKmPerLiter: number | null;
}

export default function ReportsPage() {
  const { selectedCarId, selectedCar, loading: carLoading } = useCar();
  const [maintenances, setMaintenances] = useState<MaintenanceLog[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maintTypeFilter, setMaintTypeFilter] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('');

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

      const maintRes = await fetch(`/api/cars/${selectedCarId}/maintenances?${maintParams.toString()}`);
      const maintData = maintRes.ok ? await maintRes.json() : [];

      // Constrói query params para abastecimentos
      const fuelParams = new URLSearchParams();
      if (startDate) fuelParams.append('startDate', startDate);
      if (endDate) fuelParams.append('endDate', endDate);
      if (fuelTypeFilter) fuelParams.append('fuelType', fuelTypeFilter);

      const fuelRes = await fetch(`/api/cars/${selectedCarId}/fuel-records?${fuelParams.toString()}`);
      const fuelData = fuelRes.ok ? await fuelRes.json() : [];

      setMaintenances(maintData);
      setFuelRecords(fuelData);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [selectedCarId, startDate, endDate, maintTypeFilter, fuelTypeFilter]);

  // Cálculos consolidados para os dados filtrados
  const totalMaintCost = maintenances.reduce((sum, m) => sum + m.totalCost, 0);
  const totalFuelCost = fuelRecords.reduce((sum, f) => sum + f.totalPrice, 0);
  const totalSpent = totalMaintCost + totalFuelCost;

  const validConsumptions = fuelRecords
    .map(f => f.consumptionKmPerLiter)
    .filter((c): c is number => c !== null && c > 0);
  
  const avgConsumption = validConsumptions.length > 0
    ? Number((validConsumptions.reduce((sum, c) => sum + c, 0) / validConsumptions.length).toFixed(2))
    : null;

  // Custo por KM nos dados filtrados
  const allMileages = [
    ...(selectedCar ? [selectedCar.currentMileage] : []),
    ...maintenances.map(m => m.mileage),
    ...fuelRecords.map(f => f.mileage)
  ].filter(m => m > 0);

  const minMileage = allMileages.length > 0 ? Math.min(...allMileages) : 0;
  const maxMileage = allMileages.length > 0 ? Math.max(...allMileages) : 0;
  const kmDriven = maxMileage - minMileage;
  const costPerKm = kmDriven > 0 ? Number((totalSpent / kmDriven).toFixed(2)) : 0;

  const handlePrint = () => {
    window.print();
  };

  if (carLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedCarId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
        <BarChart3 className="h-14 w-14 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum veículo selecionado</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Cadastre ou selecione um veículo no cabeçalho superior para gerar e exportar relatórios de custos e consumo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-0">
      {/* Title & Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Relatórios de Custos</h1>
          <p className="text-slate-500 text-sm">Filtre, analise e imprima o extrato do seu veículo.</p>
        </div>

        <button
          onClick={handlePrint}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
        >
          <Printer className="h-4 w-4" /> Imprimir Relatório
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Relatório Consolidado - AutoCare Manager</h1>
        <p className="text-sm text-slate-600 mt-1">
          Veículo: {selectedCar?.brand} {selectedCar?.model} • Placa: {selectedCar?.plate || 'Não informada'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Filter className="h-4.5 w-4.5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-sm">Filtros Avançados</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
          {/* Data Inicial */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Data Inicial</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Data Final</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Categoria de Manutenção */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Tipo de Manutenção</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer"
              value={maintTypeFilter}
              onChange={(e) => setMaintTypeFilter(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Preventiva">Preventiva</option>
              <option value="Corretiva">Corretiva</option>
              <option value="Troca de óleo">Troca de óleo</option>
              <option value="Freios">Freios</option>
              <option value="Suspensão">Suspensão</option>
              <option value="Motor">Motor</option>
              <option value="Elétrica">Elétrica</option>
              <option value="Pneus">Pneus</option>
              <option value="Arrefecimento">Arrefecimento</option>
              <option value="Correia dentada">Correia dentada</option>
              <option value="Bateria">Bateria</option>
              <option value="Alinhamento e balanceamento">Alinhamento e balanceamento</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Tipo de Combustível */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Combustível</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer"
              value={fuelTypeFilter}
              onChange={(e) => setFuelTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
              <option value="Flex">Flex</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {/* Total Gasto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Gasto Filtrado</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalSpent)}</p>
          <div className="mt-2 text-slate-400 text-xxs flex justify-between">
            <span>Manut: {formatCurrency(totalMaintCost)}</span>
            <span>Comb: {formatCurrency(totalFuelCost)}</span>
          </div>
        </div>

        {/* Distância */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Distância no Período</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{kmDriven > 0 ? `${formatMileage(kmDriven)}` : '0 km'}</p>
          <p className="text-slate-400 text-xxs mt-2">Diferença de km do período</p>
        </div>

        {/* Consumo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Consumo Médio</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{avgConsumption ? formatConsumption(avgConsumption) : '-'}</p>
          <p className="text-slate-400 text-xxs mt-2">Média dos abastecimentos</p>
        </div>

        {/* Custo/KM */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Custo por KM Rodado</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{costPerKm > 0 ? `${formatCurrency(costPerKm)}/km` : '-'}</p>
          <p className="text-slate-400 text-xxs mt-2">Total gasto / distância rodada</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Maintenances Extrato */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
              <Wrench className="h-4.5 w-4.5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Extrato Completo de Manutenções ({maintenances.length})</h2>
            </div>
            
            {maintenances.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-4 text-center">Nenhum registro encontrado para os filtros ativos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xxs tracking-wider">
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
                    {maintenances.map((m) => (
                      <tr key={m.id}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fuel Records Extrato */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
              <Fuel className="h-4.5 w-4.5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-sm">Extrato Completo de Abastecimentos ({fuelRecords.length})</h2>
            </div>

            {fuelRecords.length === 0 ? (
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
                        <td className="py-3 pr-4 font-bold text-amber-600">{f.consumptionKmPerLiter ? formatConsumption(f.consumptionKmPerLiter) : '-'}</td>
                        <td className="py-3 pr-4 text-slate-500">{f.gasStation || '-'}</td>
                        <td className="py-3 text-right font-extrabold text-slate-950">{formatCurrency(f.totalPrice)}</td>
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
  );
}
