'use client';

import React, { useEffect, useState } from 'react';
import { useCar } from '@/components/providers/car-provider';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
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
} from 'lucide-react';

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
  totalPrice: number;
  gasStation: string | null;
  consumptionKmPerLiter: number | null;
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

export default function ReportsPage() {
  const { selectedCarId, selectedCar, loading: carLoading } = useCar();
  const [maintenances, setMaintenances] = useState<MaintenanceLog[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelLog[]>([]);
  const [washRecords, setWashRecords] = useState<WashLog[]>([]);
  const [insurancePolicy, setInsurancePolicy] = useState<InsurancePolicyLog | null>(null);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaimLog[]>([]);
  const [financings, setFinancings] = useState<FinancingLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maintTypeFilter, setMaintTypeFilter] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('');
  const [washTypeFilter, setWashTypeFilter] = useState('');

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

  useEffect(() => {
    fetchReportsData();
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
          Cadastre ou selecione um veículo na aba <strong>Meus Veículos</strong> para gerar e exportar relatórios de custos e consumo.
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
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-md text-xs transition-all shadow-sm flex items-center gap-1.5"
        >
          <Printer className="h-4 w-4" /> Imprimir Relatório
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Relatório Consolidado - RodaNexo</h1>
        <p className="text-sm text-slate-600 mt-1">
          Veículo: {selectedCar?.brand} {selectedCar?.model} • Placa: {selectedCar?.plate || 'Não informada'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Filter className="h-4.5 w-4.5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-sm">Filtros Avançados</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs font-semibold text-slate-700">
          {/* Data Inicial */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Data Inicial</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Data Final</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Categoria de Manutenção */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Tipo de Manutenção</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer"
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
              <option value="Calibragem de pneu">Calibragem de pneu</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Tipo de Combustível */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Combustível</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer"
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

          {/* Tipo de Lavagem */}
          <div>
            <label className="block text-slate-500 mb-1.5 uppercase tracking-wider text-xxs font-bold">Lavagem</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer"
              value={washTypeFilter}
              onChange={(e) => setWashTypeFilter(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Completa">Completa</option>
              <option value="Externa">Externa</option>
              <option value="Interna">Interna</option>
              <option value="Motor">Motor</option>
              <option value="Detalhamento">Detalhamento</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {/* Total Gasto */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Gasto Filtrado</p>
          {loading ? (
            <div className="h-6 bg-slate-100 rounded w-2/3 mt-1.5 animate-pulse"></div>
          ) : (
            <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalSpent)}</p>
          )}
          <div className="mt-2 text-slate-400 text-xxs flex flex-wrap gap-x-3 gap-y-0.5">
            {loading ? (
              <>
                <div className="h-3 bg-slate-100 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-1/4 animate-pulse"></div>
              </>
            ) : (
              <>
                <span>Manut: {formatCurrency(totalMaintCost)}</span>
                <span>Comb: {formatCurrency(totalFuelCost)}</span>
                <span>Lav: {formatCurrency(totalWashCost)}</span>
                <span>Seg: {formatCurrency(totalInsuranceCost)}</span>
                <span>Fin: {formatCurrency(totalFinancingCost)}</span>
              </>
            )}
          </div>
        </div>

        {/* Distância */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Distância no Período</p>
          {loading ? (
            <div className="h-6 bg-slate-100 rounded w-1/2 mt-1.5 animate-pulse"></div>
          ) : (
            <p className="text-lg font-bold text-slate-800 mt-1">{kmDriven > 0 ? `${formatMileage(kmDriven)}` : '0 km'}</p>
          )}
          <p className="text-slate-400 text-xxs mt-2">Diferença de km do período</p>
        </div>

        {/* Consumo */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Consumo Médio</p>
          {loading ? (
            <div className="h-6 bg-slate-100 rounded w-1/2 mt-1.5 animate-pulse"></div>
          ) : (
            <p className="text-lg font-bold text-slate-800 mt-1">{avgConsumption ? formatConsumption(avgConsumption) : '-'}</p>
          )}
          <p className="text-slate-400 text-xxs mt-2">Média dos abastecimentos</p>
        </div>

        {/* Custo/KM */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Custo por KM Rodado</p>
          {loading ? (
            <div className="h-6 bg-slate-100 rounded w-1/2 mt-1.5 animate-pulse"></div>
          ) : (
            <p className="text-lg font-bold text-slate-800 mt-1">{costPerKm > 0 ? `${formatCurrency(costPerKm)}/km` : '-'}</p>
          )}
          <p className="text-slate-400 text-xxs mt-2">Total gasto / distância rodada</p>
        </div>
      </div>

      {/* Resumo por tipo de manutenção */}
      {!loading && costByType.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-5">
            Onde o dinheiro foi — por tipo de manutenção
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
            {costByType.map((entry) => (
              <div key={entry.type}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-xs font-medium text-slate-600 truncate">{entry.type}</span>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    {formatCurrency(entry.value)}
                    <span className="text-slate-400 font-medium ml-1.5">
                      {totalMaintCost > 0 ? `${Math.round((entry.value / totalMaintCost) * 100)}%` : ''}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2a78d6]"
                    style={{ width: `${Math.max(2, (entry.value / maxTypeCost) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      <td className="py-3 pr-4 font-bold text-amber-600">{f.consumptionKmPerLiter ? formatConsumption(f.consumptionKmPerLiter) : '-'}</td>
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
