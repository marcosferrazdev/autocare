'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Landmark,
  HandCoins,
  Plus,
  Loader2,
  Edit,
  Trash2,
  X,
  Save,
  CheckCircle2,
  Undo2,
} from 'lucide-react';

interface Financing {
  id: string;
  kind: string;
  institution: string;
  totalAmount: number | null;
  downPayment: number | null;
  installmentCount: number;
  installmentValue: number;
  monthlyDiscount: number;
  netInstallment: number;
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
  paidThisPeriod: boolean;
}

const KINDS = ['Financiamento', 'Empréstimo'] as const;

const emptyForm = {
  kind: 'Financiamento' as (typeof KINDS)[number],
  institution: '',
  totalAmount: '',
  downPayment: '',
  installmentCount: '',
  installmentValue: '',
  monthlyDiscount: '',
  interestRate: '',
  paymentDay: '',
  firstInstallmentDate: '',
  contractNumber: '',
  notes: '',
};

export function FinancingPanel({ carId, fillHeight = false }: { carId: string; fillHeight?: boolean }) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Financing[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Financing | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cars/${carId}/financing`);
      if (!res.ok) throw new Error('Falha ao carregar financiamentos.');
      const data = await res.json();
      setItems(data.financings || []);
    } catch (err) {
      console.error(err);
      toast('Erro ao carregar dados de financiamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const openModal = (item?: Financing) => {
    if (item) {
      setEditing(item);
      setForm({
        kind: item.kind === 'Empréstimo' ? 'Empréstimo' : 'Financiamento',
        institution: item.institution,
        totalAmount: item.totalAmount != null ? String(item.totalAmount) : '',
        downPayment: item.downPayment != null ? String(item.downPayment) : '',
        installmentCount: item.installmentCount ? String(item.installmentCount) : '',
        installmentValue: item.installmentValue ? String(item.installmentValue) : '',
        monthlyDiscount: item.monthlyDiscount ? String(item.monthlyDiscount) : '',
        interestRate: item.interestRate != null ? String(item.interestRate) : '',
        paymentDay: item.paymentDay != null ? String(item.paymentDay) : '',
        firstInstallmentDate: item.firstInstallmentDate
          ? String(item.firstInstallmentDate).slice(0, 10)
          : '',
        contractNumber: item.contractNumber || '',
        notes: item.notes || '',
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setFormError(null);
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institution.trim()) {
      setFormError('Informe o banco/financeira/pessoa.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        kind: form.kind,
        institution: form.institution.trim(),
        totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
        downPayment: form.downPayment ? Number(form.downPayment) : null,
        installmentCount: form.installmentCount ? Number(form.installmentCount) : 0,
        installmentValue: form.installmentValue ? Number(form.installmentValue) : 0,
        monthlyDiscount: form.monthlyDiscount ? Number(form.monthlyDiscount) : 0,
        interestRate: form.interestRate ? Number(form.interestRate) : null,
        paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
        firstInstallmentDate: form.firstInstallmentDate || null,
        contractNumber: form.contractNumber || null,
        notes: form.notes || null,
      };

      const res = editing
        ? await fetch(`/api/financing/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cars/${carId}/financing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar.');
      }
      const saved = await res.json();
      setItems((prev) =>
        editing ? prev.map((i) => (i.id === editing.id ? saved : i)) : [...prev, saved]
      );
      setShowModal(false);
      toast(editing ? 'Registro atualizado.' : 'Registro cadastrado.');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: Financing) => {
    const ok = await confirm({
      title: `Excluir ${item.kind.toLowerCase()}`,
      message: `Tem certeza que deseja excluir "${item.institution}"?`,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/financing/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir.');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast('Registro excluído.');
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  const setPaid = async (item: Financing, paid: boolean) => {
    try {
      const res = await fetch(`/api/financing/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar.');
      const saved = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? saved : i)));
      toast(paid ? 'Parcela marcada como paga.' : 'Marcação de pagamento desfeita.');
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar.', 'error');
    }
  };

  const totalMonthly = items.reduce(
    (sum, i) => sum + (i.remainingInstallments > 0 ? i.installmentValue : 0),
    0
  );

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 ${
        fillHeight ? 'flex flex-col h-full min-h-0 overflow-hidden' : 'space-y-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Financiamentos e Empréstimos</h2>
            {items.length > 0 && totalMonthly > 0 && (
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Parcelas ativas: <span className="text-slate-700 font-bold">{formatCurrency(totalMonthly)}/mês</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1 shrink-0"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {loading ? (
        <div className={`flex justify-center py-12 ${fillHeight ? 'flex-1' : ''}`}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className={`py-12 text-center ${fillHeight ? 'flex-1' : ''}`}>
          <Landmark className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold mb-1">Nenhum financiamento ou empréstimo</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            Cadastre o financiamento do banco e também empréstimos (ex.: dinheiro que pegou para dar
            de entrada). As parcelas pagas entram no relatório de custos.
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${fillHeight ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 mt-4' : ''}`}>
          {items.map((item) => {
            const isLoan = item.kind === 'Empréstimo';
            const Icon = isLoan ? HandCoins : Landmark;
            const progress =
              item.installmentCount > 0
                ? Math.round((item.paidInstallments / item.installmentCount) * 100)
                : 0;
            return (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isLoan ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{item.institution}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                            isLoan
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}
                        >
                          {item.kind}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                        {item.installmentValue > 0 ? formatCurrency(item.installmentValue) : '—'}
                        {item.installmentCount > 0 && ` × ${item.installmentCount}`}
                        {item.paymentDay != null && ` · vence dia ${item.paymentDay}`}
                        {item.interestRate != null && ` · ${item.interestRate}% a.m.`}
                      </p>
                      {item.monthlyDiscount > 0 && (
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                          − {formatCurrency(item.monthlyDiscount)} ajuda · você paga{' '}
                          {formatCurrency(item.netInstallment)}/mês
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.paymentDay != null && item.remainingInstallments > 0 && (
                      item.paidThisPeriod ? (
                        <button
                          onClick={() => setPaid(item, false)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100"
                          title="Desfazer pagamento"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paga
                          <Undo2 className="h-3 w-3 opacity-60" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setPaid(item, true)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200"
                          title="Marcar parcela como paga"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Marcar paga
                        </button>
                      )
                    )}
                    <button
                      onClick={() => openModal(item)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg"
                      title="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(item)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {item.installmentCount > 0 && (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between mb-1.5 text-[11px] font-semibold text-slate-500">
                      <span>
                        {item.paidInstallments}/{item.installmentCount} parcelas
                        {item.remainingInstallments === 0 && (
                          <span className="text-emerald-600 ml-1.5">· quitado</span>
                        )}
                      </span>
                      <span>
                        Pago {formatCurrency(item.paidAmount)} · Falta {formatCurrency(item.remainingAmount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isLoan ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.notes && <p className="text-[11px] text-slate-400 italic mt-2">{item.notes}</p>}
              </div>
            );
          })}
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
                {editing ? 'Editar registro' : 'Adicionar financiamento / empréstimo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Tipo *</label>
                  <select
                    value={form.kind}
                    onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as (typeof KINDS)[number] }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">
                    {form.kind === 'Empréstimo' ? 'Pessoa / credor *' : 'Banco / financeira *'}
                  </label>
                  <input
                    required
                    value={form.institution}
                    onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                    placeholder={form.kind === 'Empréstimo' ? 'Ex: João (entrada)' : 'Ex: Santander'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                    placeholder="Ex: 500.00"
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
                    placeholder="Ex: 24"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Ajuda / desconto mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.monthlyDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyDiscount: e.target.value }))}
                  placeholder="Ex: 500.00 (quanto alguém abate da parcela)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
                {form.installmentValue && form.monthlyDiscount && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Você paga {formatCurrency(Math.max(0, Number(form.installmentValue) - Number(form.monthlyDiscount)))}/mês
                    no relatório.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Valor total (R$)</label>
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
                <label className="block font-bold text-slate-600 mb-1.5">
                  {form.kind === 'Empréstimo' ? 'Referência' : 'Nº do contrato'}
                </label>
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
