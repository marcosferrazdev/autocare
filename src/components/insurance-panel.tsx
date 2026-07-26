'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Shield,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Phone,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Save,
  FileText,
  Building2,
  Banknote,
} from 'lucide-react';

type UsefulContact = { label: string; phone: string };

interface Policy {
  id: string;
  companyName: string;
  policyNumber: string | null;
  coverageType: string | null;
  monthlyValue: number;
  paymentDay: number | null;
  startDate: string | null;
  endDate: string | null;
  brokerName: string | null;
  notes: string | null;
  usefulContacts: UsefulContact[];
  nextPaymentDate: string | null;
  daysToPayment: number | null;
  paymentStatus: 'atrasado' | 'proximo' | 'ok' | null;
}

interface Claim {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number | null;
  deductible: number | null;
  status: string;
  protocol: string | null;
  notes: string | null;
}

const CLAIM_TYPES = ['Sinistro', 'Assistência 24h', 'Guincho', 'Vidro', 'Colisão', 'Outro'] as const;
const CLAIM_STATUSES = ['Aberto', 'Em análise', 'Concluído', 'Negado'] as const;
const COVERAGE_TYPES = ['Completo', 'Terceiros', 'Compreensivo', 'Outro'] as const;

const emptyPolicyForm = {
  companyName: '',
  policyNumber: '',
  coverageType: 'Completo',
  monthlyValue: '',
  paymentDay: '',
  startDate: '',
  endDate: '',
  brokerName: '',
  notes: '',
  syncPaymentReminder: true,
};

const emptyClaimForm = {
  date: new Date().toISOString().slice(0, 10),
  type: 'Sinistro',
  description: '',
  amount: '',
  deductible: '',
  status: 'Aberto',
  protocol: '',
  notes: '',
};

function paymentBanner(policy: Policy) {
  if (policy.paymentDay == null || policy.daysToPayment == null) return null;
  const dateLabel = policy.nextPaymentDate ? formatDate(policy.nextPaymentDate) : '';
  if (policy.paymentStatus === 'atrasado') {
    return {
      className: 'border-red-200 bg-red-50/80 text-red-800',
      icon: AlertTriangle,
      text: `Pagamento do seguro em atraso (vencimento ${dateLabel}).`,
    };
  }
  if (policy.paymentStatus === 'proximo') {
    return {
      className: 'border-amber-200 bg-amber-50/80 text-amber-900',
      icon: Clock,
      text: `Pagamento em ${policy.daysToPayment} dia${policy.daysToPayment === 1 ? '' : 's'} (${dateLabel})${
        policy.monthlyValue > 0 ? ` · ${formatCurrency(policy.monthlyValue)}` : ''
      }.`,
    };
  }
  return {
    className: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    icon: CheckCircle2,
    text: `Próximo pagamento em ${policy.daysToPayment} dias (${dateLabel})${
      policy.monthlyValue > 0 ? ` · ${formatCurrency(policy.monthlyValue)}` : ''
    }.`,
  };
}

export function InsurancePanel({ carId, fillHeight = false }: { carId: string; fillHeight?: boolean }) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);

  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
  const [contacts, setContacts] = useState<UsefulContact[]>([{ label: '', phone: '' }]);
  const [claimForm, setClaimForm] = useState(emptyClaimForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cars/${carId}/insurance`);
      if (!res.ok) throw new Error('Falha ao carregar seguro.');
      const data = await res.json();
      setPolicy(data.policy);
      setClaims(data.claims || []);
    } catch (err) {
      console.error(err);
      toast('Erro ao carregar dados do seguro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const openPolicyModal = () => {
    if (policy) {
      setPolicyForm({
        companyName: policy.companyName,
        policyNumber: policy.policyNumber || '',
        coverageType: policy.coverageType || 'Completo',
        monthlyValue: policy.monthlyValue != null ? String(policy.monthlyValue) : '',
        paymentDay: policy.paymentDay != null ? String(policy.paymentDay) : '',
        startDate: policy.startDate ? String(policy.startDate).slice(0, 10) : '',
        endDate: policy.endDate ? String(policy.endDate).slice(0, 10) : '',
        brokerName: policy.brokerName || '',
        notes: policy.notes || '',
        syncPaymentReminder: true,
      });
      setContacts(
        policy.usefulContacts.length > 0
          ? policy.usefulContacts
          : [{ label: '', phone: '' }]
      );
    } else {
      setPolicyForm(emptyPolicyForm);
      setContacts([
        { label: 'Sinistros / 24h', phone: '' },
        { label: 'Corretor', phone: '' },
      ]);
    }
    setFormError(null);
    setShowPolicyModal(true);
  };

  const openClaimModal = (claim?: Claim) => {
    if (claim) {
      setEditingClaim(claim);
      setClaimForm({
        date: claim.date ? String(claim.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        type: claim.type || 'Sinistro',
        description: claim.description || '',
        amount: claim.amount != null ? String(claim.amount) : '',
        deductible: claim.deductible != null ? String(claim.deductible) : '',
        status: claim.status || 'Aberto',
        protocol: claim.protocol || '',
        notes: claim.notes || '',
      });
    } else {
      setEditingClaim(null);
      setClaimForm(emptyClaimForm);
    }
    setFormError(null);
    setShowClaimModal(true);
  };

  const savePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.companyName.trim()) {
      setFormError('Informe a seguradora.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const usefulContacts = contacts
        .map((c) => ({ label: c.label.trim(), phone: c.phone.trim() }))
        .filter((c) => c.label && c.phone);

      const res = await fetch(`/api/cars/${carId}/insurance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: policyForm.companyName.trim(),
          policyNumber: policyForm.policyNumber || null,
          coverageType: policyForm.coverageType || null,
          monthlyValue: policyForm.monthlyValue ? Number(policyForm.monthlyValue) : 0,
          paymentDay: policyForm.paymentDay ? Number(policyForm.paymentDay) : null,
          startDate: policyForm.startDate || null,
          endDate: policyForm.endDate || null,
          brokerName: policyForm.brokerName || null,
          notes: policyForm.notes || null,
          usefulContacts,
          syncPaymentReminder: policyForm.syncPaymentReminder,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar seguro.');
      }
      const data = await res.json();
      setPolicy(data.policy);
      setClaims(data.claims || []);
      setShowPolicyModal(false);
      toast(
        policyForm.syncPaymentReminder && policyForm.paymentDay
          ? 'Seguro salvo e lembrete de pagamento atualizado.'
          : 'Seguro salvo.'
      );
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.description.trim()) {
      setFormError('Informe a descrição.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        date: claimForm.date,
        type: claimForm.type,
        description: claimForm.description.trim(),
        amount: claimForm.amount ? Number(claimForm.amount) : null,
        deductible: claimForm.deductible ? Number(claimForm.deductible) : null,
        status: claimForm.status,
        protocol: claimForm.protocol || null,
        notes: claimForm.notes || null,
      };

      const res = editingClaim
        ? await fetch(`/api/insurance-claims/${editingClaim.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cars/${carId}/insurance/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar utilização.');
      }
      const saved = await res.json();
      if (editingClaim) {
        setClaims((prev) => prev.map((c) => (c.id === editingClaim.id ? saved : c)));
      } else {
        setClaims((prev) => [saved, ...prev]);
      }
      setShowClaimModal(false);
      toast(editingClaim ? 'Utilização atualizada.' : 'Utilização registrada.');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClaim = async (claim: Claim) => {
    const ok = await confirm({
      title: 'Excluir utilização',
      message: 'Tem certeza que deseja excluir este registro de utilização do seguro?',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/insurance-claims/${claim.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir.');
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
      toast('Utilização excluída.');
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  const banner = policy ? paymentBanner(policy) : null;
  const BannerIcon = banner?.icon;

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 ${
        fillHeight ? 'lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden' : 'space-y-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-slate-800 text-sm">Seguro do Veículo</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {policy && (
            <button
              onClick={() => openClaimModal()}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg text-[12px] transition-all shadow-sm flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Registrar utilização
            </button>
          )}
          <button
            onClick={openPolicyModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1"
          >
            {policy ? (
              <>
                <Edit className="h-4 w-4" /> Editar apólice
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Cadastrar seguro
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`flex justify-center py-12 ${fillHeight ? 'lg:flex-1' : ''}`}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : !policy ? (
        <div className={`py-12 text-center ${fillHeight ? 'lg:flex-1' : ''}`}>
          <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold mb-1">Nenhum seguro cadastrado</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            Cadastre a seguradora, valor mensal, dia de pagamento e telefones úteis. Depois registre
            sinistros e assistências e receba lembretes de pagamento.
          </p>
        </div>
      ) : (
        <div className={`space-y-5 ${fillHeight ? 'mt-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1' : ''}`}>
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

          {/* Dados da apólice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Seguradora
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">{policy.companyName}</p>
              {policy.coverageType && (
                <p className="text-[11px] text-slate-500 mt-0.5">{policy.coverageType}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Apólice
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {policy.policyNumber || '—'}
              </p>
              {policy.brokerName && (
                <p className="text-[11px] text-slate-500 mt-0.5">Corretor: {policy.brokerName}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Mensal
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {policy.monthlyValue > 0 ? formatCurrency(policy.monthlyValue) : '—'}
              </p>
              {policy.paymentDay != null && (
                <p className="text-[11px] text-slate-500 mt-0.5">Todo dia {policy.paymentDay}</p>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Vigência
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {policy.startDate || policy.endDate
                  ? `${policy.startDate ? formatDate(policy.startDate) : '?'} → ${
                      policy.endDate ? formatDate(policy.endDate) : '?'
                    }`
                  : '—'}
              </p>
            </div>
          </div>

          {policy.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed">
              {policy.notes}
            </p>
          )}

          {/* Telefones úteis */}
          <div>
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Telefones úteis
            </h3>
            {policy.usefulContacts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum telefone cadastrado. Edite a apólice para adicionar.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {policy.usefulContacts.map((c, i) => (
                  <a
                    key={`${c.label}-${i}`}
                    href={`tel:${c.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
                  >
                    <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.label}</p>
                      <p className="text-sm font-semibold text-indigo-700 tabular-nums">{c.phone}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Utilizações */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">
                Utilizações / sinistros ({claims.length})
              </h3>
            </div>
            {claims.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
                Nenhuma utilização registrada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {claims.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-md hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">{c.type}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                            c.status === 'Concluído'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : c.status === 'Negado'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : c.status === 'Em análise'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-600 font-medium">{c.description}</p>
                      <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(c.date)}
                        </span>
                        {c.protocol && <span>Protocolo: {c.protocol}</span>}
                        {c.amount != null && c.amount > 0 && (
                          <span className="text-slate-600">Valor: {formatCurrency(c.amount)}</span>
                        )}
                        {c.deductible != null && c.deductible > 0 && (
                          <span>Franquia: {formatCurrency(c.deductible)}</span>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-[11px] text-slate-400 italic">{c.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openClaimModal(c)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteClaim(c)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Excluir"
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
      )}

      {/* Modal apólice */}
      {showPolicyModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowPolicyModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {policy ? 'Editar seguro' : 'Cadastrar seguro'}
              </h3>
              <button onClick={() => setShowPolicyModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={savePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Seguradora *</label>
                <input
                  required
                  value={policyForm.companyName}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Ex: Porto Seguro, Allianz..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Nº da apólice</label>
                  <input
                    value={policyForm.policyNumber}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, policyNumber: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Cobertura</label>
                  <select
                    value={policyForm.coverageType}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, coverageType: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {COVERAGE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Valor mensal (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={policyForm.monthlyValue}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, monthlyValue: e.target.value }))}
                    placeholder="Ex: 189.90"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Dia do pagamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={policyForm.paymentDay}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, paymentDay: e.target.value }))}
                    placeholder="Ex: 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Início da vigência</label>
                  <input
                    type="date"
                    value={policyForm.startDate}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Fim da vigência</label>
                  <input
                    type="date"
                    value={policyForm.endDate}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Corretor</label>
                <input
                  value={policyForm.brokerName}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, brokerName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-600">Telefones úteis</label>
                  <button
                    type="button"
                    onClick={() => setContacts((c) => [...c, { label: '', phone: '' }].slice(0, 10))}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    + Contato
                  </button>
                </div>
                <div className="space-y-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={c.label}
                        onChange={(e) =>
                          setContacts((list) =>
                            list.map((item, idx) => (idx === i ? { ...item, label: e.target.value } : item))
                          )
                        }
                        placeholder="Ex: Sinistros 24h"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        value={c.phone}
                        onChange={(e) =>
                          setContacts((list) =>
                            list.map((item, idx) => (idx === i ? { ...item, phone: e.target.value } : item))
                          )
                        }
                        placeholder="0800..."
                        className="w-[40%] bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setContacts((list) => list.filter((_, idx) => idx !== i))}
                        className="p-2 text-slate-400 hover:text-red-600"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={policyForm.notes}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-md border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  checked={policyForm.syncPaymentReminder}
                  onChange={(e) =>
                    setPolicyForm((f) => ({ ...f, syncPaymentReminder: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-bold text-slate-800 block">Criar lembrete de pagamento</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Atualiza o lembrete mensal &quot;Seguro&quot; na aba Lembretes (usa o dia de pagamento).
                  </span>
                </span>
              </label>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
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

      {/* Modal utilização */}
      {showClaimModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowClaimModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {editingClaim ? 'Editar utilização' : 'Registrar utilização'}
              </h3>
              <button onClick={() => setShowClaimModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveClaim} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={claimForm.date}
                    onChange={(e) => setClaimForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Tipo *</label>
                  <select
                    value={claimForm.type}
                    onChange={(e) => setClaimForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {CLAIM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Descrição *</label>
                <input
                  required
                  value={claimForm.description}
                  onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Colisão traseira no estacionamento"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Status</label>
                  <select
                    value={claimForm.status}
                    onChange={(e) => setClaimForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-1.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {CLAIM_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1.5">Franquia</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={claimForm.deductible}
                    onChange={(e) => setClaimForm((f) => ({ ...f, deductible: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Protocolo</label>
                <input
                  value={claimForm.protocol}
                  onChange={(e) => setClaimForm((f) => ({ ...f, protocol: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={claimForm.notes}
                  onChange={(e) => setClaimForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
