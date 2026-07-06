'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FuelRecordSchema } from '@/lib/validations';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, Loader2, Save, Fuel, AlertCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

type FuelFormValues = z.infer<typeof FuelRecordSchema>;

export default function NewFuelRecordPage() {
  const { id: carId } = useParams();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [carName, setCarName] = useState('');
  const [totalPaid, setTotalPaid] = useState<number | string>('');

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
      paymentMethod: 'À vista',
      installmentCount: 1,
      installmentValue: 0,
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
  const paymentMethod = watch('paymentMethod') || 'À vista';
  const installmentCount = watch('installmentCount') || 1;
  const installmentValue = watch('installmentValue') || 0;
  const isInstallment = paymentMethod !== 'À vista';

  // Manipuladores de eventos para sincronização explícita e controle preciso
  const handlePaymentMethodChange = (method: string) => {
    const pPerLiter = Number(watch('pricePerLiter') || 0);
    const lts = Number(watch('liters') || 0);
    const count = Number(watch('installmentCount') || 1);
    const baseCost = pPerLiter * lts;

    if (method === 'A prazo') {
      const computedInstallmentValue = Number((baseCost / count).toFixed(2));
      setValue('installmentValue', computedInstallmentValue, { shouldValidate: true });
    } else {
      setTotalPaid(Number(baseCost.toFixed(2)));
    }
  };

  const handleTotalPaidChange = (eVal: string) => {
    setTotalPaid(eVal);
    const val = Number(eVal);
    const lts = Number(watch('liters') || 0);
    if (lts > 0 && val > 0) {
      const computedPrice = Number((val / lts).toFixed(3));
      setValue('pricePerLiter', computedPrice, { shouldValidate: true });
    }
  };

  const handleLitersChange = (eVal: string) => {
    const val = Number(eVal);
    const pPerLiter = Number(watch('pricePerLiter') || 0);
    const count = Number(watch('installmentCount') || 1);
    
    if (paymentMethod === 'À vista') {
      if (Number(totalPaid) > 0 && val > 0) {
        const computedPrice = Number((Number(totalPaid) / val).toFixed(3));
        setValue('pricePerLiter', computedPrice, { shouldValidate: true });
      } else if (pPerLiter > 0 && val > 0) {
        const computedTotal = Number((pPerLiter * val).toFixed(2));
        setTotalPaid(computedTotal);
      }
    } else {
      // A prazo: atualiza o valor da parcela sugerido sem tocar em pricePerLiter
      if (pPerLiter > 0 && val > 0) {
        const computedTotal = pPerLiter * val;
        const computedInstallmentValue = Number((computedTotal / count).toFixed(2));
        setValue('installmentValue', computedInstallmentValue, { shouldValidate: true });
      }
    }
  };

  const handlePricePerLiterChange = (eVal: string) => {
    const val = Number(eVal);
    const lts = Number(watch('liters') || 0);
    const count = Number(watch('installmentCount') || 1);

    if (paymentMethod === 'À vista') {
      if (lts > 0 && val > 0) {
        const computedTotal = Number((val * lts).toFixed(2));
        setTotalPaid(computedTotal);
      }
    } else {
      // A prazo: atualiza o valor da parcela sugerido sem tocar em pricePerLiter
      if (lts > 0 && val > 0) {
        const computedTotal = val * lts;
        const computedInstallmentValue = Number((computedTotal / count).toFixed(2));
        setValue('installmentValue', computedInstallmentValue, { shouldValidate: true });
      }
    }
  };

  const handleInstallmentCountChange = (eVal: string) => {
    const count = Number(eVal) || 1;
    const pPerLiter = Number(watch('pricePerLiter') || 0);
    const lts = Number(watch('liters') || 0);
    const computedTotal = pPerLiter * lts;
    const computedInstallmentValue = Number((computedTotal / count).toFixed(2));
    setValue('installmentValue', computedInstallmentValue, { shouldValidate: true });
  };

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

  // Preço calculado em tempo real para o banner final
  const basePrice = Number(pricePerLiter) * Number(liters);
  const displayTotal = isInstallment && Number(installmentValue) > 0
    ? Number(installmentCount) * Number(installmentValue)
    : (totalPaid ? Number(totalPaid) : basePrice);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/cars/${carId}`}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Novo Abastecimento</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Registrar combustível para o veículo: {carName}</p>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              {...register('date')}
            />
            {errors.date && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.date.message}</p>}
          </div>

          {/* Odômetro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Odômetro Atual (km) *</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('mileage')}
              onFocus={(e) => e.target.select()}
            />
            {errors.mileage && <p className="text-red-600 text-xxs mt-1.5 font-semibold">{errors.mileage.message}</p>}
          </div>

          {/* Combustível */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tipo de Combustível *</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer font-semibold"
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

          {/* Valor Total Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Valor Total Pago (R$) *</label>
            <input
              type="number"
              step="any"
              disabled={isInstallment}
              placeholder="Quanto você pagou? Ex: 200.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold disabled:opacity-75"
              value={totalPaid}
              onChange={(e) => handleTotalPaidChange(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Litros abastecidos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Litros Abastecidos *</label>
            <input
              type="number"
              step="any"
              placeholder="Ex: 40.5"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('liters', {
                onChange: (e) => handleLitersChange(e.target.value)
              })}
              onFocus={(e) => e.target.select()}
            />
            {errors.liters && <p className="text-red-600 text-[9px] mt-1.5 font-semibold">{errors.liters.message}</p>}
          </div>

          {/* Preço por Litro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Preço por Litro (R$) *</label>
            <input
              type="number"
              step="any"
              placeholder="Calculado automaticamente"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
              {...register('pricePerLiter', {
                onChange: (e) => handlePricePerLiterChange(e.target.value)
              })}
              onFocus={(e) => e.target.select()}
            />
            <p className="text-slate-400 text-[9px] mt-1 font-medium">
              Ao preencher a quantidade de litros e o valor pago, o valor por litro é calculado automaticamente (com 3 casas decimais).
            </p>
            {errors.pricePerLiter && <p className="text-red-600 text-[9px] mt-1.5 font-semibold">{errors.pricePerLiter.message}</p>}
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-bold">Forma de Pagamento</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer font-semibold"
              {...register('paymentMethod', {
                onChange: (e) => handlePaymentMethodChange(e.target.value)
              })}
            >
              <option value="À vista">À vista</option>
              <option value="A prazo">A prazo</option>
            </select>
          </div>

          {/* Parcelamento Condicional */}
          {isInstallment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md animate-fade-in md:col-span-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider font-bold">Número de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white border border-slate-200 rounded-md px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-bold"
                  {...register('installmentCount', {
                    onChange: (e) => handleInstallmentCountChange(e.target.value)
                  })}
                  onFocus={(e) => e.target.select()}
                />
                {errors.installmentCount && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.installmentCount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider font-bold text-blue-700">Valor da Parcela (R$)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-white border border-blue-200 rounded-md px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-bold"
                  {...register('installmentValue')}
                  onFocus={(e) => e.target.select()}
                />
                {errors.installmentValue && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.installmentValue.message}</p>}
              </div>
            </div>
          )}

          {/* Posto de Combustível */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Posto de Combustível</label>
            <input
              type="text"
              placeholder="Ex: Posto Ipiranga Centro"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
              {...register('gasStation')}
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Paulo"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
              {...register('city')}
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Observações adicionais</label>
          <textarea
            rows={2}
            placeholder="Alguma nota sobre o abastecimento?"
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 resize-none font-medium"
            {...register('notes')}
          />
        </div>

        {/* Resumo visual do cálculo */}
        <div className="bg-slate-50 rounded-md p-4 border border-slate-100 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-slate-500" />
            Custo Total {isInstallment && '(A prazo)'}:
          </span>
          <span className="text-base font-extrabold text-slate-950">{formatCurrency(displayTotal)}</span>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href={`/cars/${carId}`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-md text-xs transition-all shadow-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Registrar Abastecimento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
