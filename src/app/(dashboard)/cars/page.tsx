'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCar } from '@/components/providers/car-provider';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatMileage } from '@/lib/formatters';
import {
  Car as CarIcon,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Fuel,
  Calendar,
  Cog,
} from 'lucide-react';

/** Placa estilizada no padrão brasileiro (faixa azul + caracteres em destaque). */
function LicensePlate({ plate }: { plate: string | null }) {
  if (!plate) {
    return (
      <span className="text-[10px] italic text-slate-500">sem placa</span>
    );
  }
  return (
    <span className="inline-flex flex-col overflow-hidden rounded-[3px] border border-slate-400/60 bg-white shadow-sm select-none">
      <span className="bg-[#003399] px-2 py-px text-center text-[6px] font-bold tracking-[0.35em] text-white leading-tight">
        BRASIL
      </span>
      <span className="px-2 py-0.5 text-xs font-bold tracking-[0.18em] text-slate-900 uppercase leading-tight text-center">
        {plate}
      </span>
    </span>
  );
}

export default function CarsPage() {
  const { cars, loading, refreshCars, setSelectedCarId, selectedCarId } = useCar();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (carId: string, label: string) => {
    setSelectedCarId(carId);
    toast(`${label} agora é o veículo ativo.`, 'info');
  };

  const handleDelete = async (carId: string) => {
    const ok = await confirm({
      title: 'Excluir veículo',
      message: 'Deseja realmente excluir este veículo? Todas as manutenções e abastecimentos vinculados serão excluídos permanentemente.',
    });
    if (!ok) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Se o carro excluído era o selecionado, limpa
        if (selectedCarId === carId) {
          setSelectedCarId(null);
        }
        await refreshCars();
        toast('Veículo excluído.');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao excluir veículo.');
      }
    } catch (err) {
      setError('Erro de conexão ao excluir veículo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && cars.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Garagem</h1>
        <p className="text-slate-500 text-sm">
          {cars.length === 0
            ? 'Nenhum veículo por aqui ainda.'
            : cars.length === 1
            ? '1 veículo cadastrado.'
            : `${cars.length} veículos cadastrados.`}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {cars.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center max-w-lg mx-auto">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CarIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Garagem vazia</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Cadastre seu primeiro carro para começar a registrar abastecimentos, manutenções e receber lembretes de revisão.
          </p>
          <Link
            href="/cars/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Cadastrar Meu Primeiro Carro
          </Link>
        </div>
      ) : (
        /* Cars Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cars.map((car) => {
            const isSelected = selectedCarId === car.id;
            const title = car.nickname || `${car.brand} ${car.model}`;
            return (
              <div
                key={car.id}
                className={`group bg-white rounded-lg border overflow-hidden transition-all hover:shadow-md ${
                  isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
                }`}
              >
                {/* Faixa superior escura: identidade do carro */}
                <Link href={`/cars/${car.id}`} className="block bg-slate-950 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">
                        {car.brand}
                      </p>
                      <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-blue-300 transition-colors">
                        {title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">
                        {car.model} • {car.yearManufacture}/{car.yearModel}
                      </p>
                    </div>
                    <LicensePlate plate={car.plate} />
                  </div>
                </Link>

                {/* Corpo: odômetro em destaque + specs */}
                <Link href={`/cars/${car.id}`} className="block px-5 pt-4 pb-3">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-400 mb-0.5">
                        Odômetro
                      </p>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">
                        {formatMileage(car.currentMileage)}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Em uso
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3.5 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="h-3.5 w-3.5 text-slate-400" /> {car.fuelType}
                    </span>
                    {car.engine && (
                      <span className="flex items-center gap-1.5">
                        <Cog className="h-3.5 w-3.5 text-slate-400" /> {car.engine}
                      </span>
                    )}
                    {car.color && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-slate-200" />
                        {car.color}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Rodapé de ações */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  {isSelected ? (
                    <Link
                      href="/dashboard"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      Ver dashboard <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleSelect(car.id, title)}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded transition-all"
                    >
                      Usar este carro
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/cars/${car.id}/edit`}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded transition-all"
                      title="Editar cadastro"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(car.id)}
                      disabled={submitting}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card fantasma: adicionar veículo */}
          <Link
            href="/cars/new"
            className="border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-lg flex flex-col items-center justify-center gap-2 py-10 text-slate-400 hover:text-blue-600 transition-all min-h-[220px]"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-wider">Adicionar veículo</span>
          </Link>
        </div>
      )}
    </div>
  );
}
