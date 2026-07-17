'use client';

import React, { useEffect, useState } from 'react';
import { formatDate, formatMileage } from '@/lib/formatters';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ScheduleWithStatus } from '@/components/maintenance-alerts';
import {
  BellRing,
  Plus,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';

const SCHEDULE_TYPES = [
  'Troca de óleo',
  'Preventiva',
  'Freios',
  'Suspensão',
  'Motor',
  'Elétrica',
  'Pneus',
  'Arrefecimento',
  'Correia dentada',
  'Bateria',
  'Alinhamento e balanceamento',
  'Calibragem de pneu',
  'Lavagem',
  'Seguro',
  'Corretiva',
  'Outro',
];

const statusConfig = {
  atrasado: { label: 'Atrasada', icon: AlertTriangle, badge: 'bg-red-100 text-red-700', iconColor: 'text-red-600' },
  proximo: { label: 'Vence em breve', icon: Clock, badge: 'bg-amber-100 text-amber-700', iconColor: 'text-amber-600' },
  ok: { label: 'Em dia', icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-700', iconColor: 'text-emerald-600' },
  sem_referencia: { label: 'Sem referência', icon: HelpCircle, badge: 'bg-slate-100 text-slate-600', iconColor: 'text-slate-400' },
} as const;

interface ScheduleFormState {
  type: string;
  description: string;
  intervalKm: string;
  intervalDays: string;
  intervalMonths: string;
  lastDoneMileage: string;
  lastDoneDate: string;
}

const emptyForm: ScheduleFormState = {
  type: 'Troca de óleo',
  description: '',
  intervalKm: '',
  intervalDays: '',
  intervalMonths: '',
  lastDoneMileage: '',
  lastDoneDate: '',
};

export function SchedulesPanel({ carId, fillHeight = false }: { carId: string; fillHeight?: boolean }) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [schedules, setSchedules] = useState<ScheduleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ScheduleWithStatus | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cars/${carId}/schedules`);
      if (res.ok) {
        setSchedules(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (schedule: ScheduleWithStatus) => {
    setEditing(schedule);
    setForm({
      type: schedule.type,
      description: schedule.description || '',
      intervalKm: schedule.intervalKm !== null ? String(schedule.intervalKm) : '',
      intervalDays: schedule.intervalDays != null ? String(schedule.intervalDays) : '',
      intervalMonths: schedule.intervalMonths !== null ? String(schedule.intervalMonths) : '',
      lastDoneMileage: schedule.lastDoneMileage !== null ? String(schedule.lastDoneMileage) : '',
      lastDoneDate: schedule.lastDoneDate ? schedule.lastDoneDate.slice(0, 10) : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.intervalKm && !form.intervalDays && !form.intervalMonths) {
      setFormError('Informe pelo menos um intervalo: km, dias ou meses.');
      return;
    }

    const payload = {
      type: form.type,
      description: form.description || null,
      intervalKm: form.intervalKm ? Number(form.intervalKm) : null,
      intervalDays: form.intervalDays ? Number(form.intervalDays) : null,
      intervalMonths: form.intervalMonths ? Number(form.intervalMonths) : null,
      lastDoneMileage: form.lastDoneMileage ? Number(form.lastDoneMileage) : null,
      lastDoneDate: form.lastDoneDate || null,
    };

    try {
      setSubmitting(true);
      const res = editing
        ? await fetch(`/api/schedules/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cars/${carId}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar lembrete.');
      }

      toast(editing ? 'Lembrete atualizado com sucesso!' : 'Lembrete criado com sucesso!');
      setShowModal(false);
      fetchSchedules();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar lembrete.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (schedule: ScheduleWithStatus) => {
    const ok = await confirm({
      title: 'Excluir lembrete',
      message: `Deseja excluir o lembrete de "${schedule.type}"? Você não receberá mais avisos deste tipo de manutenção.`,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir lembrete.');
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      toast('Lembrete excluído.');
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir lembrete.', 'error');
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 ${
        fillHeight ? 'flex flex-col h-full min-h-0 overflow-hidden' : 'space-y-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-sm">Lembretes de Manutenção Preventiva</h2>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1 hover:shadow-md shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Novo Lembrete
        </button>
      </div>

      <p className={`text-xs text-slate-500 leading-relaxed shrink-0 ${fillHeight ? 'mt-3 mb-3' : '-mt-1'}`}>
        Defina intervalos por quilometragem e/ou tempo (dias ou meses). O sistema cruza com o histórico
        de manutenções e lavagens e a quilometragem atual do veículo para avisar quando algo estiver vencendo.
      </p>

      {loading ? (
        <div className={`flex justify-center py-8 ${fillHeight ? 'flex-1' : ''}`}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : schedules.length === 0 ? (
        <div className={`py-10 text-center ${fillHeight ? 'flex-1' : ''}`}>
          <BellRing className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold mb-1">Nenhum lembrete configurado</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
            Exemplo: troca de óleo a cada 10.000 km ou 12 meses; lavagem a cada 14 dias.
            Assim que configurar, os avisos aparecerão aqui e no dashboard.
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${fillHeight ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1' : ''}`}>
          {schedules.map((s) => {
            const config = statusConfig[s.status];
            const Icon = config.icon;
            return (
              <div
                key={s.id}
                className="flex items-start gap-3.5 p-4 border border-slate-200 rounded-md hover:shadow-sm transition-all"
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800">{s.type}</p>
                    <span className={`text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 mt-1.5">
                    {s.intervalKm != null && s.intervalKm > 0 && (
                      <span>A cada {formatMileage(s.intervalKm)}</span>
                    )}
                    {s.intervalDays != null && s.intervalDays > 0 && (
                      <span>
                        A cada {s.intervalDays} dia{s.intervalDays !== 1 ? 's' : ''}
                      </span>
                    )}
                    {s.intervalMonths != null && s.intervalMonths > 0 && (
                      <span>
                        A cada {s.intervalMonths} {s.intervalMonths === 1 ? 'mês' : 'meses'}
                      </span>
                    )}
                    {s.nextDueMileage !== null && (
                      <span className="font-semibold text-slate-600">Próxima: {formatMileage(s.nextDueMileage)}</span>
                    )}
                    {s.nextDueDate !== null && (
                      <span className="font-semibold text-slate-600">Até: {formatDate(s.nextDueDate)}</span>
                    )}
                    {s.status === 'sem_referencia' && (
                      <span className="italic">
                        {s.type === 'Lavagem'
                          ? 'Registre uma lavagem ou informe a última execução ao editar.'
                          : 'Registre uma manutenção deste tipo ou informe a última execução ao editar.'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                    title="Editar lembrete"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                    title="Excluir lembrete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de criação/edição */}
      {showModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {editing ? 'Editar Lembrete' : 'Novo Lembrete'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {SCHEDULE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Descrição (opcional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={form.type === 'Lavagem' ? 'Ex: Completa no lava-jato' : 'Ex: Óleo 5W30 sintético + filtro'}
                  maxLength={200}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Intervalo (km)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.intervalKm}
                    onChange={(e) => setForm((f) => ({ ...f, intervalKm: e.target.value }))}
                    placeholder="Ex: 10000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Intervalo (dias)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.intervalDays}
                    onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
                    placeholder="Ex: 14"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Intervalo (meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.intervalMonths}
                    onChange={(e) => setForm((f) => ({ ...f, intervalMonths: e.target.value }))}
                    placeholder="Ex: 12"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 -mt-2">
                Preencha ao menos um. Se preencher mais de um, vale o que vencer primeiro.
                {form.type === 'Lavagem' && ' Para lavagem, o usual é só dias (ex.: 14).'}
              </p>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-1">Última execução (opcional)</p>
                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {form.type === 'Lavagem'
                    ? 'Se ainda não registrou lavagens na aba Lavadas, informe a última vez aqui para calcular o próximo vencimento.'
                    : 'Se este serviço nunca foi registrado no histórico do app, informe quando foi feito pela última vez para o cálculo do próximo vencimento.'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Km na última vez</label>
                    <input
                      type="number"
                      min="0"
                      value={form.lastDoneMileage}
                      onChange={(e) => setForm((f) => ({ ...f, lastDoneMileage: e.target.value }))}
                      placeholder="Ex: 42000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Data da última vez</label>
                    <input
                      type="date"
                      value={form.lastDoneDate}
                      onChange={(e) => setForm((f) => ({ ...f, lastDoneDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Salvar Alterações' : 'Criar Lembrete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
