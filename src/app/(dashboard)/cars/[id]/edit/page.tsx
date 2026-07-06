'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CarSchema } from '@/lib/validations';
import { useCar } from '@/components/providers/car-provider';
import { ArrowLeft, Loader2, Save, Car as CarIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

type CarFormValues = z.infer<typeof CarSchema>;

export default function EditCarPage() {
  const router = useRouter();
  const { id } = useParams();
  const { refreshCars } = useCar();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CarFormValues>({
    resolver: zodResolver(CarSchema) as any,
  });

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cars/${id}`);
        if (!res.ok) {
          throw new Error('Não foi possível carregar os dados do veículo.');
        }
        const data = await res.json();
        reset({
          brand: data.brand,
          model: data.model,
          yearManufacture: data.yearManufacture,
          yearModel: data.yearModel,
          plate: data.plate || '',
          color: data.color || '',
          fuelType: data.fuelType as any,
          engine: data.engine || '',
          currentMileage: data.currentMileage,
          nickname: data.nickname || '',
          notes: data.notes || '',
        });
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar veículo.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCar();
    }
  }, [id, reset]);

  const onSubmit = async (data: CarFormValues) => {
    try {
      setError(null);
      setSubmitting(true);

      const res = await fetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar alterações.');
      }

      await refreshCars();
      router.push('/cars');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações do carro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/cars"
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Editar Veículo</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Modifique os dados do seu veículo.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CarIcon className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-sm">Dados Principais</h2>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Marca */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Marca <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('brand')}
            />
            {errors.brand && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.brand.message}</p>
            )}
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Modelo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('model')}
            />
            {errors.model && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.model.message}</p>
            )}
          </div>

          {/* Ano de Fabricação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Ano de Fabricação <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('yearManufacture')}
            />
            {errors.yearManufacture && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.yearManufacture.message}</p>
            )}
          </div>

          {/* Ano do Modelo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Ano do Modelo <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('yearModel')}
            />
            {errors.yearModel && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.yearModel.message}</p>
            )}
          </div>

          {/* Combustível */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Combustível <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 cursor-pointer"
              {...register('fuelType')}
            >
              <option value="Flex">Flex</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
              <option value="Outro">Outro</option>
            </select>
            {errors.fuelType && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.fuelType.message}</p>
            )}
          </div>

          {/* Odômetro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Odômetro Atual (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('currentMileage')}
            />
            {errors.currentMileage && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.currentMileage.message}</p>
            )}
          </div>

          {/* Placa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Placa
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 uppercase placeholder:text-slate-400"
              {...register('plate')}
            />
            {errors.plate && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.plate.message}</p>
            )}
          </div>

          {/* Motor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Motor
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('engine')}
            />
            {errors.engine && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.engine.message}</p>
            )}
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Cor
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('color')}
            />
            {errors.color && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.color.message}</p>
            )}
          </div>

          {/* Apelido do Veículo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Apelido do Carro
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              {...register('nickname')}
            />
            {errors.nickname && (
              <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.nickname.message}</p>
            )}
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Observações
          </label>
          <textarea
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/cars"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-md text-xs transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:bg-blue-400"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
