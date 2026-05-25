'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
import {
  Car,
  Wrench,
  Fuel,
  Globe,
  Settings,
  Calendar,
  Milestone,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  Edit,
  Save,
  BookOpen,
  Info,
  ExternalLink,
  CreditCard
} from 'lucide-react';

interface WebInfo {
  tankCapacity: number | null;
  cityConsumption: number | null;
  highwayConsumption: number | null;
  recommendedOil: string | null;
  tirePressure: string | null;
  tireSize: string | null;
  engineInfo: string | null;
  fuelType: string | null;
  generalNotes: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

interface CarDetails {
  id: string;
  brand: string;
  model: string;
  yearManufacture: number;
  yearModel: number;
  plate: string | null;
  color: string | null;
  fuelType: string;
  engine: string | null;
  currentMileage: number;
  nickname: string | null;
  notes: string | null;
  vehicleWebInfo: WebInfo | null;
}

export default function CarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [car, setCar] = useState<CarDetails | null>(null);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [editingWebInfo, setEditingWebInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário de informação técnica (sugestões da web)
  const [webInfoForm, setWebInfoForm] = useState<Partial<WebInfo>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar carro
      const carRes = await fetch(`/api/cars/${id}`);
      if (!carRes.ok) throw new Error('Falha ao carregar veículo.');
      const carData = await carRes.json();
      setCar(carData);
      
      if (carData.vehicleWebInfo) {
        setWebInfoForm(carData.vehicleWebInfo);
      }

      // Carregar manutenções
      const maintRes = await fetch(`/api/cars/${id}/maintenances`);
      if (maintRes.ok) {
        const maintData = await maintRes.json();
        setMaintenances(maintData);
      }

      // Carregar abastecimentos
      const fuelRes = await fetch(`/api/cars/${id}/fuel-records`);
      if (fuelRes.ok) {
        const fuelData = await fuelRes.json();
        setFuelRecords(fuelData);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar detalhes do veículo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Função para buscar dados do veículo na web
  const handleWebSearch = async () => {
    try {
      setSearchingWeb(true);
      setError(null);

      const res = await fetch(`/api/cars/${id}/search-web-info`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Não foi possível encontrar informações na web. Tente preencher manualmente.');
      }

      const suggestion = await res.json();
      setWebInfoForm(suggestion);
      setEditingWebInfo(true); // Abre o formulário para confirmação
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar dados na web.');
    } finally {
      setSearchingWeb(false);
    }
  };

  // Função para salvar as informações técnicas (sugestões editadas)
  const handleSaveWebInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/cars/${id}/web-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webInfoForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar informações técnicas.');
      }

      const savedInfo = await res.json();
      setCar(prev => prev ? { ...prev, vehicleWebInfo: savedInfo } : null);
      setEditingWebInfo(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar informações técnicas.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearWebInfo = () => {
    setWebInfoForm(car?.vehicleWebInfo || {});
    setEditingWebInfo(false);
  };

  if (loading && !car) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !car) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className="space-y-6">
      {/* Back & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {car.nickname || `${car.brand} ${car.model}`}
          </h1>
          <p className="text-slate-500 text-sm">
            {car.brand} {car.model} • {car.yearManufacture}/{car.yearModel} {car.plate ? `• Placa: ${car.plate}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/cars/${car.id}/edit`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" /> Editar Cadastro
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Info + Tech Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical Info Web Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Ficha Técnica Web</h2>
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xxs leading-relaxed flex gap-2">
              <Info className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Aviso: Os dados técnicos são sugestões públicas e podem variar conforme versão, motor e configuração do veículo.
              </span>
            </div>

            {/* If has info and NOT editing */}
            {car.vehicleWebInfo && !editingWebInfo && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Tanque</span>
                    <span className="font-semibold text-slate-800">{car.vehicleWebInfo.tankCapacity ? `${car.vehicleWebInfo.tankCapacity} L` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Consumo Urbano</span>
                    <span className="font-semibold text-slate-800">{car.vehicleWebInfo.cityConsumption ? `${car.vehicleWebInfo.cityConsumption} km/L` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Consumo Rodovia</span>
                    <span className="font-semibold text-slate-800">{car.vehicleWebInfo.highwayConsumption ? `${car.vehicleWebInfo.highwayConsumption} km/L` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Pneus</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">{car.vehicleWebInfo.tireSize || '-'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Óleo Recomendado</span>
                    <span className="text-xs font-semibold text-slate-700">{car.vehicleWebInfo.recommendedOil || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Calibragem</span>
                    <span className="text-xs font-semibold text-slate-700">{car.vehicleWebInfo.tirePressure || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Motorização</span>
                    <span className="text-xs font-semibold text-slate-700">{car.vehicleWebInfo.engineInfo || '-'}</span>
                  </div>
                </div>

                {car.vehicleWebInfo.generalNotes && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Notas</span>
                    <p className="text-xxs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {car.vehicleWebInfo.generalNotes}
                    </p>
                  </div>
                )}

                {car.vehicleWebInfo.sourceName && (
                  <div className="flex items-center justify-between text-xxs border-t border-slate-100 pt-3">
                    <span className="text-slate-400 font-medium">Fonte:</span>
                    {car.vehicleWebInfo.sourceUrl ? (
                      <a
                        href={car.vehicleWebInfo.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1.5 font-bold"
                      >
                        {car.vehicleWebInfo.sourceName} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-bold text-slate-600">{car.vehicleWebInfo.sourceName}</span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setEditingWebInfo(true)}
                  className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit className="h-4 w-4" /> Editar Informações
                </button>
              </div>
            )}

            {/* If NO info and NOT editing */}
            {!car.vehicleWebInfo && !editingWebInfo && (
              <div className="space-y-4 py-4 text-center">
                <Globe className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <p className="text-slate-700 font-bold text-sm">Buscar ficha técnica na web?</p>
                  <p className="text-slate-400 text-xs">
                    Busque óleo recomendado, pneus, tanque e calibragem automaticamente.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleWebSearch}
                    disabled={searchingWeb}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:bg-blue-400"
                  >
                    {searchingWeb ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Buscando na Web...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        <span>Buscar Dados Online</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingWebInfo(true)}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-all"
                  >
                    Preencher Manualmente
                  </button>
                </div>
              </div>
            )}

            {/* Form to Edit/Confirm suggestions */}
            {editingWebInfo && (
              <form onSubmit={handleSaveWebInfo} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanque (L)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      value={webInfoForm.tankCapacity || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, tankCapacity: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pneus</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      placeholder="Ex: 175/70 R14"
                      value={webInfoForm.tireSize || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, tireSize: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Km/L Cidade</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      value={webInfoForm.cityConsumption || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, cityConsumption: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Km/L Estrada</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      value={webInfoForm.highwayConsumption || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, highwayConsumption: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Óleo Recomendado</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                    placeholder="Ex: 5W40 VW 508.88"
                    value={webInfoForm.recommendedOil || ''}
                    onChange={(e) => setWebInfoForm(p => ({ ...p, recommendedOil: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Calibragem (psi)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                    placeholder="Ex: 30 psi dianteiro / 30 psi traseiro"
                    value={webInfoForm.tirePressure || ''}
                    onChange={(e) => setWebInfoForm(p => ({ ...p, tirePressure: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motorização</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                    placeholder="Ex: Motor 1.6 Flex"
                    value={webInfoForm.engineInfo || ''}
                    onChange={(e) => setWebInfoForm(p => ({ ...p, engineInfo: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notas Gerais</label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                    placeholder="Ex: Requer óleo sintético..."
                    value={webInfoForm.generalNotes || ''}
                    onChange={(e) => setWebInfoForm(p => ({ ...p, generalNotes: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fonte</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      placeholder="Ex: Manual do Proprietário"
                      value={webInfoForm.sourceName || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, sourceName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">URL Fonte</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                      placeholder="https://..."
                      value={webInfoForm.sourceUrl || ''}
                      onChange={(e) => setWebInfoForm(p => ({ ...p, sourceUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleClearWebInfo}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow flex items-center gap-1"
                  >
                    <Save className="h-3.5 w-3.5" /> Salvar Ficha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Maintenance and Fuel History Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Maintenances List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-sm">Histórico de Manutenções</h2>
              </div>
              <Link
                href={`/cars/${car.id}/maintenances/new`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Link>
            </div>

            {maintenances.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">
                Nenhuma manutenção registrada para este carro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                {maintenances.map((m) => (
                  <div key={m.id} className="py-3 flex justify-between items-start text-xs gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate block">{m.description}</span>
                        <span className="text-xxs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold shrink-0">
                          {m.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(m.date)}</span>
                        <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> {formatMileage(m.mileage)}</span>
                        {m.workshop && <span className="truncate">Oficina: {m.workshop}</span>}
                        <span className="flex items-center gap-1 shrink-0">
                          <CreditCard className="h-3.5 w-3.5" />{' '}
                          {m.paymentMethod === 'À vista' || !m.paymentMethod ? (
                            'À vista'
                          ) : m.installmentCount && m.installmentValue ? (
                            `${m.installmentCount}x de ${formatCurrency(m.installmentValue)}`
                          ) : (
                            m.paymentMethod
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">{formatCurrency(m.totalCost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fuel Records List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-slate-800 text-sm">Histórico de Abastecimentos</h2>
              </div>
              <Link
                href={`/cars/${car.id}/fuel-records/new`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Link>
            </div>

            {fuelRecords.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">
                Nenhum abastecimento registrado para este carro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                {fuelRecords.map((f) => (
                  <div key={f.id} className="py-3 flex justify-between items-start text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {f.liters.toFixed(2)} L de {f.fuelType}
                        </span>
                        {f.fullTank && (
                          <span className="text-xxs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            Tanque Cheio
                          </span>
                        )}
                        {f.consumptionKmPerLiter && (
                          <span className="text-xxs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                            {formatConsumption(f.consumptionKmPerLiter)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(f.date)}</span>
                        <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> {formatMileage(f.mileage)}</span>
                        {f.gasStation && <span className="truncate">{f.gasStation}</span>}
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">{formatCurrency(f.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
