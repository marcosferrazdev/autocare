'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FuelRecordSchema } from '@/lib/validations';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, Loader2, Save, Fuel, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

type FuelFormValues = z.infer<typeof FuelRecordSchema>;

export default function NewFuelRecordPage() {
  const { id: carId } = useParams();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [carName, setCarName] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FuelFormValues>({
    resolver: zodResolver(FuelRecordSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      mileage: 0,
      fuelType: 'Gasolina',
      pricePerLiter: 0,
      liters: 0,
      gasStation: '',
      city: '',
      fullTank: false,
      notes: '',
    },
  });

  // Carregar dados básicos do carro para o cabeçalho
  useEffect(() => {
    const fetchCar = async () => {
      try {
        const res = await fetch(`/api/cars/${carId}`);
        if (res.ok) {
          const car = await res.json();
          setCarName(`${car.brand} ${car.model}`);
          setValue('mileage', car.currentMileage);
          // Set fuel type suggestion based on car default if possible
          if (car.fuelType && car.fuelType !== 'Flex') {
            setValue('fuelType', car.fuelType);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (carId) {
      fetchCar();
    }
  }, [carId, setValue]);

  // Assistir valores para cálculo em tempo real
  const pricePerLiter = watch('pricePerLiter') || 0;
  const liters = watch('liters') || 0;
  const totalPrice = Number(pricePerLiter) * Number(liters);

  const onSubmit = async (data: FuelFormValues) => {
    try {
      setError(null);
      setSubmitting(true);

      const res = await fetch(`/api/cars/${carId}/fuel-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao registrar abastecimento.');
      }

      router.push(`/cars/${carId}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar abastecimento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/cars/${carId}`}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Novo Abastecimento</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Registrar combustível para o veículo: {carName}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Fuel className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold text-slate-800 text-sm">Dados do Abastecimento</h2>
        </div>

        {/* Grid Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Data */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Data do Abastecimento *</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              {...register('date')}
            />
            {errors.date && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.date.message}</p>}
          </div>

          {/* Odômetro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Odômetro Atual (km) *</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('mileage')}
            />
            {errors.mileage && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.mileage.message}</p>}
          </div>

          {/* Combustível */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tipo de Combustível *</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer font-semibold"
              {...register('fuelType')}
            >
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
              <option value="Flex">Flex</option>
              <option value="Outro">Outro</option>
            </select>
            {errors.fuelType && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.fuelType.message}</p>}
          </div>

          {/* Tanque Cheio Checkbox */}
          <div className="flex items-center gap-2 md:pt-8 pl-1">
            <input
              id="fullTank"
              type="checkbox"
              className="h-4.5 w-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              {...register('fullTank')}
            />
            <label htmlFor="fullTank" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              Marcar como Tanque Cheio (essencial para cálculo de consumo km/L)
            </label>
          </div>

          {/* Preço por Litro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Preço por Litro (R$) *</label>
            <input
              type="number"
              step="0.001"
              placeholder="Ex: 5.79"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('pricePerLiter')}
            />
            {errors.pricePerLiter && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.pricePerLiter.message}</p>}
          </div>

          {/* Litros abastecidos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Litros Abastecidos *</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 40.5"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('liters')}
            />
            {errors.liters && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.liters.message}</p>}
          </div>

          {/* Posto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Posto de Combustível</label>
            <input
              type="text"
              placeholder="Ex: Posto Ipiranga"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              {...register('gasStation')}
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Paulo"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              {...register('city')}
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Notas / Observações</label>
          <textarea
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
            placeholder="Notas especiais..."
            {...register('notes')}
          />
        </div>

        {/* Real-time Calculation Indicator banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Custo Total Estimado:</span>
          <span className="font-extrabold text-blue-600 text-base">{formatCurrency(totalPrice)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href={`/cars/${carId}`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:bg-blue-400"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Registrar Abastecimento</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
