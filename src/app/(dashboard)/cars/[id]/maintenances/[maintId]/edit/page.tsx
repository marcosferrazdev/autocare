'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaintenanceSchema } from '@/lib/validations';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, Loader2, Save, Wrench, Plus, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

interface PartItem {
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
}

type MaintenanceFormValues = z.infer<typeof MaintenanceSchema>;

export default function EditMaintenancePage() {
  const { id: carId, maintId } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [carName, setCarName] = useState('');

  // Lista dinâmica de peças adicionadas à manutenção
  const [parts, setParts] = useState<PartItem[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartBrand, setNewPartBrand] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState(1);
  const [newPartUnitPrice, setNewPartUnitPrice] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(MaintenanceSchema) as any,
    defaultValues: {
      date: '',
      mileage: 0,
      type: 'Preventiva',
      workshop: '',
      description: '',
      laborCost: 0,
      notes: '',
      paymentMethod: 'À vista',
      installmentCount: 1,
      installmentValue: 0,
      discount: 0,
    },
  });

  // Carregar dados básicos do carro e dados da manutenção existente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar carro
        const carRes = await fetch(`/api/cars/${carId}`);
        if (carRes.ok) {
          const car = await carRes.json();
          setCarName(`${car.brand} ${car.model}`);
        }

        // Carregar manutenção
        const maintRes = await fetch(`/api/maintenances/${maintId}`);
        if (!maintRes.ok) {
          throw new Error('Falha ao carregar dados da manutenção.');
        }
        const maint = await maintRes.json();

        // Tratar data para input tipo date (YYYY-MM-DD)
        const formattedDate = new Date(maint.date).toISOString().split('T')[0];

        reset({
          date: formattedDate,
          mileage: maint.mileage,
          type: maint.type as any,
          workshop: maint.workshop || '',
          description: maint.description,
          laborCost: maint.laborCost,
          notes: maint.notes || '',
          paymentMethod: maint.paymentMethod || 'À vista',
          installmentCount: maint.installmentCount || 1,
          installmentValue: maint.installmentValue || 0,
          discount: maint.discount || 0,
        });

        // Set parts list
        if (maint.parts) {
          setParts(maint.parts.map((p: any) => ({
            name: p.name,
            brand: p.brand || '',
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })));
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro ao carregar dados da manutenção.');
      } finally {
        setLoading(false);
      }
    };

    if (carId && maintId) {
      fetchData();
    }
  }, [carId, maintId, reset]);

  // Assistir o valor da mão de obra e pagamentos
  const laborCost = watch('laborCost') || 0;
  const paymentMethod = watch('paymentMethod') || 'À vista';
  const installmentCount = watch('installmentCount') || 1;
  const installmentValue = watch('installmentValue') || 0;
  const discount = watch('discount') || 0;

  // Cálculos em tempo real
  const totalPartsCost = parts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0);
  const baseCost = Number(laborCost) + totalPartsCost;
  const isInstallment = paymentMethod !== 'À vista';
  
  let computedCost = (isInstallment && Number(installmentValue) > 0)
    ? Number(installmentCount) * Number(installmentValue)
    : baseCost;

  const totalCost = Math.max(0, computedCost - Number(discount));

  const handleAddPart = () => {
    if (!newPartName.trim()) {
      alert('O nome da peça é obrigatório.');
      return;
    }
    if (newPartQuantity <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    if (newPartUnitPrice < 0) {
      alert('O valor unitário não pode ser negativo.');
      return;
    }

    const item: PartItem = {
      name: newPartName,
      brand: newPartBrand,
      quantity: Number(newPartQuantity),
      unitPrice: Number(newPartUnitPrice),
    };

    setParts([...parts, item]);
    
    // Resetar campos de inserção de peça
    setNewPartName('');
    setNewPartBrand('');
    setNewPartQuantity(1);
    setNewPartUnitPrice(0);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, idx) => idx !== index));
  };

  const onSubmit = async (data: any) => {
    try {
      setError(null);
      setSubmitting(true);

      const payload = {
        ...data,
        parts, // Envia lista de peças acoplada
      };

      const res = await fetch(`/api/maintenances/${maintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao atualizar manutenção.');
      }

      router.push(`/cars/${carId}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar manutenção.');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/cars/${carId}`}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Editar Manutenção</h1>
          <p className="text-slate-500 text-xs mt-0.5">Modificar serviço feito no veículo: {carName}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3 text-sm animate-shake">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split Form View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Service Fields */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Wrench className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm">Dados da Manutenção</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Descrição do Serviço *</label>
              <input
                type="text"
                placeholder="Ex: Troca do kit de embreagem e óleos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                {...register('description')}
              />
              {errors.description && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.description.message}</p>}
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Data do Serviço *</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                {...register('date')}
              />
              {errors.date && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.date.message}</p>}
            </div>

            {/* Quilometragem */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Odômetro no Serviço (km) *</label>
              <input
                type="number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                {...register('mileage')}
                onFocus={(e) => e.target.select()}
              />
              {errors.mileage && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.mileage.message}</p>}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tipo de Manutenção *</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer font-semibold"
                {...register('type')}
              >
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
              {errors.type && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.type.message}</p>}
            </div>

            {/* Oficina */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Oficina / Estabelecimento</label>
              <input
                type="text"
                placeholder="Ex: Auto Mecânica Silva"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                {...register('workshop')}
              />
            </div>

            {/* Mão de Obra */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider font-bold text-blue-700">Custo Mão de Obra (R$)</label>
              <input
                type="number"
                step="any"
                className="w-full bg-slate-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                {...register('laborCost')}
                onFocus={(e) => e.target.select()}
              />
              {errors.laborCost && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.laborCost.message}</p>}
            </div>

            {/* Desconto */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider font-bold text-emerald-700">Desconto (R$)</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 665.00"
                className="w-full bg-slate-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                {...register('discount')}
                onFocus={(e) => e.target.select()}
              />
              {errors.discount && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.discount.message}</p>}
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider font-bold">Forma de Pagamento</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 cursor-pointer font-semibold"
                {...register('paymentMethod')}
              >
                <option value="À vista">À vista</option>
                <option value="A prazo">A prazo</option>
              </select>
              {errors.paymentMethod && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.paymentMethod.message}</p>}
            </div>

            {/* Parcelamento Condicional */}
            {isInstallment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in md:col-span-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider font-bold">Número de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-bold"
                    {...register('installmentCount')}
                    onFocus={(e) => e.target.select()}
                  />
                  {errors.installmentCount && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.installmentCount.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider font-bold text-blue-700">Valor da Parcela (R$)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-bold"
                    {...register('installmentValue')}
                    onFocus={(e) => e.target.select()}
                  />
                  {errors.installmentValue && <p className="text-red-600 text-xxs mt-1 font-semibold">{errors.installmentValue.message}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Notas / Observações</label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              placeholder="Alguma nota sobre a garantia ou peças trocadas?"
              {...register('notes')}
            />
          </div>
        </div>

        {/* Dynamic Parts List Module */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="h-4.5 w-4.5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-sm">Adicionar Peças</h2>
            </div>

            {/* Simple Inline Fields to Add Part */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Nome da Peça</label>
                <input
                  type="text"
                  placeholder="Ex: Pastilha de freio"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Marca (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Bosch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                  value={newPartBrand}
                  onChange={(e) => setNewPartBrand(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Qtd</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={newPartQuantity}
                    onChange={(e) => setNewPartQuantity(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={newPartUnitPrice}
                    onChange={(e) => setNewPartUnitPrice(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddPart}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Peça na Lista
              </button>
            </div>

            {/* List of Added Parts */}
            <div className="border-t border-slate-100 pt-3">
              <h3 className="font-bold text-slate-500 text-xs mb-2 tracking-wide uppercase">Peças na Lista ({parts.length})</h3>
              {parts.length === 0 ? (
                <p className="text-slate-400 italic text-xs py-2">Nenhuma peça adicionada ainda.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                  {parts.map((p, index) => (
                    <div key={index} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-slate-400">
                          {p.brand ? `${p.brand} • ` : ''}{p.quantity}x {formatCurrency(p.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-800">{formatCurrency(p.quantity * p.unitPrice)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(index)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Running Totals & Save Box */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Mão de Obra:</span>
                <span className="font-semibold">{formatCurrency(Number(laborCost))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total de Peças:</span>
                <span className="font-semibold">{formatCurrency(totalPartsCost)}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-100/70 pt-1.5">
                <span>Custo Base (Mão + Peças):</span>
                <span className="font-semibold">{formatCurrency(baseCost)}</span>
              </div>
              {isInstallment && Number(installmentValue) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Total a Prazo ({installmentCount}x):</span>
                  <span className="font-semibold">{formatCurrency(computedCost)}</span>
                </div>
              )}
              {isInstallment && Number(installmentValue) > 0 && computedCost !== baseCost && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Diferença / Juros:</span>
                  <span>{formatCurrency(computedCost - baseCost)}</span>
                </div>
              )}
              {Number(discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Desconto Aplicado:</span>
                  <span>-{formatCurrency(Number(discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-2">
                <span>Total Geral:</span>
                <span className="text-blue-600">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/cars/${carId}`}
                className="w-1/3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl text-xs transition-all shadow-sm text-center"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                type="button"
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 disabled:bg-blue-400"
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
          </div>
        </div>
      </div>
    </div>
  );
}
