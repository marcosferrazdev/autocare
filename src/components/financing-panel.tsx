'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Landmark,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Save,
  FileText,
  Building2,
  Banknote,
  Percent,
} from 'lucide-react';

interface Financing {
  id: string;
  institution: string;
  totalAmount: number | null;
  downPayment: number | null;
  installmentCount: number;
  installmentValue: number;
  interestRate: number | null;
  paymentDay: number | null;
  firstInstallmentDate: string | null;
  contractNumber: string | null;
  notes: string | null;
  paidInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  nextPaymentDate: string | null;
  daysToPayment: number | null;
  paymentStatus: 'atrasado' | 'proximo' | 'ok' | null;
}

const emptyForm = {
  institution: '',
  totalAmount: '',
  downPayment: '',
  installmentCount: '',
  installmentValue: '',
  interestRate: '',
  paymentDay: '',
  firstInstallmentDate: '',
  contractNumber: '',
  notes: '',
  syncPaymentReminder: true,
};

function paymentBanner(f: Financing) {
  if (f.remainingInstallments <= 0) {
    return {
      className: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
      icon: CheckCircle2,
      text: 'Financiamento quitado. Todas as parcelas foram pagas.',
    };
  }
  if (f.paymentDay == null || f.daysToPayment == null) return null;
  const dateLabel = f.nextPaymentDate ? formatDate(f.nextPaymentDate) : '';
  const valueLabel = f.installmentValue > 0 ? ` · ${formatCurrency(f.installmentValue)}` : '';
  if (f.paymentStatus === 'atrasado') {
    return {
      className: 'border-red-200 bg-red-50/80 text-red-800',
      icon: AlertTriangle,
      text: `Parcela em atraso (vencimento ${dateLabel})${valueLabel}.`,
    };
  }
  if (f.paymentStatus === 'proximo') {
    return {
      className: 'border-amber-200 bg-amber-50/80 text-amber-900',
      icon: Clock,
      text: `Parcela em ${f.daysToPayment} dia${f.daysToPayment === 1 ? '' : 's'} (${dateLabel})${valueLabel}.`,
    };
  }
  return {
    className: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    icon: CheckCircle2,
    text: `Próxima parcela em ${f.daysToPayment} dias (${dateLabel})${valueLabel}.`,
  };
}

export function FinancingPanel({ carId, fillHeight = false }: { carId: string; fillHeight?: boolean }) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [financing, setFinancing] = useState<Financing | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cars/${carId}/financing`);
      if (!res.ok) throw new Error('Falha ao carregar financiamento.');
      const data = await res.json();
      setFinancing(data.financing);
    } catch (err) {
      console.error(err);
      toast('Erro ao carregar dados do financiamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const openModal = () => {
    if (financing) {
      setForm({
        institution: financing.institution,
        totalAmount: financing.totalAmount != null ? String(financing.totalAmount) : '',
        downPayment: financing.downPayment != null ? String(financing.downPayment) : '',
        installmentCount: financing.installmentCount ? String(financing.installmentCount) : '',
        installmentValue: financing.installmentValue ? String(financing.installmentValue) : '',
        interestRate: financing.interestRate != null ? String(financing.interestRate) : '',
        paymentDay: financing.paymentDay != null ? String(financing.paymentDay) : '',
        firstInstallmentDate: financing.firstInstallmentDate
          ? String(financing.firstInstallmentDate).slice(0, 10)
          : '',
        contractNumber: financing.contractNumber || '',
        notes: financing.notes || '',
        syncPaymentReminder: true,
      });
    } else {
      setForm(emptyForm);
    }
    setFormError(null);
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institution.trim()) {
      setFormError('Informe o banco/financeira.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const res = await fetch(`/api/cars/${carId}/financing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: form.institution.trim(),
          totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
          downPayment: form.downPayment ? Number(form.downPayment) : null,
          installmentCount: form.installmentCount ? Number(form.installmentCount) : 0,
          installmentValue: form.installmentValue ? Number(form.installmentValue) : 0,
          interestRate: form.interestRate ? Number(form.interestRate) : null,
          paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
          firstInstallmentDate: form.firstInstallmentDate || null,
          contractNumber: form.contractNumber || null,
          notes: form.notes || null,
          syncPaymentReminder: form.syncPaymentReminder,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar financiamento.');
      }
      const data = await res.json();
      setFinancing(data.financing);
      setShowModal(false);
      toast(
        form.syncPaymentReminder && form.paymentDay
          ? 'Financiamento salvo e lembrete de pagamento atualizado.'
          : 'Financiamento salvo.'
      );
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir financiamento',
      message: 'Tem certeza que deseja excluir os dados do financiamento deste veículo?',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/cars/${carId}/financing`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir.');
      setFinancing(null);
      toast('Financiamento excluído.');
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  const banner = financing ? paymentBanner(financing) : null;
  const BannerIcon = banner?.icon;
  const progress =
    financing && financing.installmentCount > 0
      ? Math.round((financing.paidInstallments / financing.installmentCount) * 100)
      : 0;

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 ${
        fillHeight ? 'flex flex-col h-full min-h-0 overflow-hidden' : 'space-y-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold text-slate-800 text-sm">Financiamento do Veículo</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {financing && (
            <button
              onClick={remove}
              className="bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold px-3 py-2 rounded-lg text-[12px] transition-all shadow-sm flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          )}
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1"
          >
            {financing ? (
              <>
                <Edit className="h-4 w-4" /> Editar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Cadastrar financiamento
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`flex justify-center py-12 ${fillHeight ? 'flex-1' : ''}`}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : !financing ? (
        <div className={`py-12 text-center ${fillHeight ? 'flex-1' : ''}`}>
          <Landmark className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold mb-1">Nenhum financiamento cadastrado</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            Cadastre banco, valor da parcela, nº de parcelas e data da 1ª parcela. As parcelas pagas
            entram no relatório de custos e você recebe lembrete de vencimento.
          </p>
        </div>
      ) : (
        <div className={`space-y-5 ${fillHeight ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 mt-4' : ''}`}>
          {banner && BannerIcon && (
            <div className={`flex items-start gap-3 p-3.5 border rounded-lg text-sm ${banner.className}`}>
              <BannerIcon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-xs uppercase tracking-wide opacity-80 mb-0.5">Lembrete de pagamento</p>
                <p className="text-xs font-medium leading-relaxed">{banner.text}</p>
                <Link
                  href={`/cars/${carId}?tab=lembretes`}
                  className="text-[11px] font-bold underline underline-offset-2 mt-1 inline-block opacity-90 hover:opacity-100"
                >
                  Ver na aba Lembretes
                </Link>
              </div>
            </div>
          )}

          {/* Dados do financiamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Instituição
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">{financing.institution}</p>
              {financing.contractNumber && (
                <p className="text-[11px] text-slate-500 mt-0.5">Contrato: {financing.contractNumber}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Parcela
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {financing.installmentValue > 0 ? formatCurrency(financing.installmentValue) : '—'}
              </p>
              {financing.paymentDay != null && (
                <p className="text-[11px] text-slate-500 mt-0.5">Todo dia {financing.paymentDay}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Valor financiado
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {financing.totalAmount != null ? formatCurrency(financing.totalAmount) : '—'}
              </p>
              {financing.downPayment != null && (
                <p className="text-[11px] text-slate-500 mt-0.5">Entrada: {formatCurrency(financing.downPayment)}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Percent className="h-3 w-3" /> Taxa de juros
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {financing.interestRate != null ? `${financing.interestRate}% a.m.` : '—'}
              </p>
              {financing.firstInstallmentDate && (
                <p className="text-[11px] text-slate-500 mt-0.5">1ª: {formatDate(financing.firstInstallmentDate)}</p>
              )}
            </div>
          </div>

          {/* Progresso das parcelas */}
          <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">
                Progresso — {financing.paidInstallments}/{financing.installmentCount} parcelas
              </h3>
              <span className="text-xs font-bold text-emerald-700">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs">
              <span className="text-slate-500">
                Pago: <strong className="text-slate-800">{formatCurrency(financing.paidAmount)}</strong>
              </span>
              <span className="text-slate-500">
                Restante:{' '}
                <strong className="text-slate-800">
                  {formatCurrency(financing.remainingAmount)} ({financing.remainingInstallments}x)
                </strong>
              </span>
            </div>
          </div>

          {financing.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed">
              {financing.notes}
            </p>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {financing ? 'Editar financiamento' : 'Cadastrar financiamento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Banco / Financeira *</label>
                <input
                  required
                  value={form.institution}
                  onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                  placeholder="Ex: Banco do Brasil, Santander..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Valor da parcela (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.installmentValue}
                    onChange={(e) => setForm((f) => ({ ...f, installmentValue: e.target.value }))}
                    placeholder="Ex: 1250.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Nº de parcelas</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={form.installmentCount}
                    onChange={(e) => setForm((f) => ({ ...f, installmentCount: e.target.value }))}
                    placeholder="Ex: 48"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Valor financiado (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.totalAmount}
                    onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    placeholder="Ex: 45000.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Entrada (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.downPayment}
                    onChange={(e) => setForm((f) => ({ ...f, downPayment: e.target.value }))}
                    placeholder="Ex: 10000.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Taxa (% a.m.)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={form.interestRate}
                    onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))}
                    placeholder="Ex: 1.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Dia venc.</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.paymentDay}
                    onChange={(e) => setForm((f) => ({ ...f, paymentDay: e.target.value }))}
                    placeholder="Ex: 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">1ª parcela</label>
                  <input
                    type="date"
                    value={form.firstInstallmentDate}
                    onChange={(e) => setForm((f) => ({ ...f, firstInstallmentDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Nº do contrato</label>
                <input
                  value={form.contractNumber}
                  onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-md border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  checked={form.syncPaymentReminder}
                  onChange={(e) => setForm((f) => ({ ...f, syncPaymentReminder: e.target.checked }))}
                />
                <span>
                  <span className="font-bold text-slate-800 block">Criar lembrete de pagamento</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Atualiza o lembrete mensal &quot;Financiamento&quot; na aba Lembretes (usa o dia de vencimento).
                  </span>
                </span>
              </label>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
