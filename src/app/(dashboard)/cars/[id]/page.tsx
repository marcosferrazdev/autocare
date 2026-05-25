'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
import {
  Car,
  Wrench,
  Fuel,
  Settings,
  Calendar,
  Milestone,
  Plus,
  Loader2,
  AlertCircle,
  Edit,
  Save,
  BookOpen,
  CreditCard,
  Trash2
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

  const handleDeleteMaintenance = async (maintId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setError(null);
      const res = await fetch(`/api/maintenances/${maintId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir manutenção.');
      }
      setMaintenances(prev => prev.filter(m => m.id !== maintId));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir manutenção.');
    }
  };

  const handleDeleteFuelRecord = async (fuelId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setError(null);
      const res = await fetch(`/api/fuel-records/${fuelId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir abastecimento.');
      }
      setFuelRecords(prev => prev.filter(f => f.id !== fuelId));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir abastecimento.');
    }
  };

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

      {/* Main Grid: Maintenances and Fuel Records Lists side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">{formatCurrency(m.totalCost)}</span>
                      {m.discount && m.discount > 0 ? (
                        <span className="text-xxs text-emerald-600 font-semibold block">
                          -{formatCurrency(m.discount)} desc.
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      <Link
                        href={`/cars/${car.id}/maintenances/${m.id}/edit`}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                        title="Editar manutenção"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteMaintenance(m.id)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                        title="Excluir manutenção"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-bold text-slate-800 block">{formatCurrency(f.totalPrice)}</span>
                    <div className="flex items-center gap-2 print:hidden">
                      <Link
                        href={`/cars/${car.id}/fuel-records/${f.id}/edit`}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded transition-all"
                        title="Editar abastecimento"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteFuelRecord(f.id)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                        title="Excluir abastecimento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
