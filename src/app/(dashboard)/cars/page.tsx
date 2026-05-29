'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCar } from '@/components/providers/car-provider';
import { formatMileage } from '@/lib/formatters';
import {
  Car as CarIcon,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Milestone,
  Calendar,
  Settings,
  AlertCircle,
  Activity
} from 'lucide-react';

export default function CarsPage() {
  const { cars, loading, refreshCars, setSelectedCarId, selectedCarId } = useCar();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (carId: string) => {
    if (!confirm('Deseja realmente excluir este veículo? Todas as manutenções e abastecimentos vinculados serão excluídos permanentemente.')) {
      return;
    }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Meus Veículos</h1>
          <p className="text-slate-500 text-sm">Gerencie os carros cadastrados na sua conta.</p>
        </div>

        <Link
          href="/cars/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Cadastrar Veículo
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {cars.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto shadow-sm">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CarIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2 font-sans">Nenhum carro cadastrado</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Você ainda não possui veículos cadastrados no sistema. Cadastre seu primeiro carro para começar a registrar abastecimentos e manutenções.
          </p>
          <Link
            href="/cars/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Cadastrar Meu Primeiro Carro
          </Link>
        </div>
      ) : (
        /* Cars Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => {
            const isSelected = selectedCarId === car.id;
            return (
              <div
                key={car.id}
                className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between h-64 shadow-sm hover:shadow-md ${
                  isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-slate-200'
                }`}
              >
                <Link
                  href={`/cars/${car.id}`}
                  className="cursor-pointer group block"
                >
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors">
                        {car.nickname || `${car.brand} ${car.model}`}
                      </h3>
                      <p className="text-slate-400 text-xs mt-0.5 font-medium">
                        {car.brand} {car.model}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-xxs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shrink-0">
                        Ativo
                      </span>
                    )}
                  </div>

                  {/* Car Metadata */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-5 text-slate-500 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">Ano: {car.yearManufacture}/{car.yearModel}</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Milestone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">{formatMileage(car.currentMileage)}</span>
                    </div>

                    {car.plate && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Settings className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="uppercase tracking-wider truncate">Placa: {car.plate}</span>
                      </div>
                    )}

                    {car.engine && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Activity className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">Motor: {car.engine}</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCarId(car.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border ${
                        isSelected
                          ? 'bg-slate-50 border-slate-200 text-slate-500 pointer-events-none'
                          : 'bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-700'
                      }`}
                    >
                      {isSelected ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/cars/${car.id}`}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4.5 w-4.5" />
                    </Link>
                    <Link
                      href={`/cars/${car.id}/edit`}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(car.id)}
                      disabled={submitting}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
