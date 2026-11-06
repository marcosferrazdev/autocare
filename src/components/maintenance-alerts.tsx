'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCar } from '@/components/providers/car-provider';
import { formatDate, formatMileage } from '@/lib/formatters';
import { useDismiss } from '@/lib/use-dismiss';
import { Bell, BellRing, AlertTriangle, Clock, CheckCircle2, HelpCircle, ChevronRight } from 'lucide-react';

export interface ScheduleWithStatus {
  id: string;
  type: string;
  description: string | null;
  intervalKm: number | null;
  intervalDays: number | null;
  intervalMonths: number | null;
  lastDoneMileage: number | null;
  lastDoneDate: string | null;
  photoData: string | null;
  status: 'atrasado' | 'proximo' | 'ok' | 'sem_referencia';
  nextDueMileage: number | null;
  nextDueDate: string | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
}

const statusConfig = {
  atrasado: {
    soft: 'bg-red-100',
    label: 'Atrasada',
    icon: AlertTriangle,
    badge: 'bg-red-100 text-red-700',
    iconColor: 'text-red-600',
  },
  proximo: {
    soft: 'bg-amber-100',
    label: 'Vence em breve',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
  },
  ok: {
    soft: 'bg-emerald-100',
    label: 'Em dia',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  sem_referencia: {
    soft: 'bg-slate-100',
    label: 'Sem referência',
    icon: HelpCircle,
    badge: 'bg-slate-100 text-slate-600',
    iconColor: 'text-slate-400',
  },
} as const;

function dueSummary(s: ScheduleWithStatus): string {
  const parts: string[] = [];
  if (s.kmRemaining !== null) {
    parts.push(
      s.kmRemaining < 0
        ? `passou ${formatMileage(Math.abs(s.kmRemaining))}`
        : `faltam ${formatMileage(s.kmRemaining)}`
    );
  }
  if (s.daysRemaining !== null) {
    parts.push(
      s.daysRemaining < 0
        ? `venceu há ${Math.abs(s.daysRemaining)} dias`
        : `${s.daysRemaining} dias restantes`
    );
  }
  if (parts.length === 0) {
    return 'Registre uma manutenção deste tipo ou informe a última execução.';
  }
  return parts.join(' · ');
}

/** Sino do cabeçalho: lembretes atrasados ou perto de vencer do carro selecionado. */
export function AlertsBell() {
  const { selectedCarId } = useCar();
  const pathname = usePathname();
  const [schedules, setSchedules] = useState<ScheduleWithStatus[] | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  // Rebusca ao trocar de carro e de página (ex.: depois de registrar uma manutenção)
  useEffect(() => {
    if (!selectedCarId) return;
    let active = true;
    fetch(`/api/cars/${selectedCarId}/schedules`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setSchedules(data);
      })
      .catch(() => {
        if (active) setSchedules([]);
      });
    return () => {
      active = false;
    };
  }, [selectedCarId, pathname]);

  const list = selectedCarId ? schedules ?? [] : [];
  const urgent = list
    .filter((s) => s.status === 'atrasado' || s.status === 'proximo')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'atrasado' ? -1 : 1));
  const remindersHref = selectedCarId ? `/cars/${selectedCarId}?tab=lembretes` : '/cars';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={urgent.length > 0 ? `Alertas: ${urgent.length} ${urgent.length === 1 ? 'pendente' : 'pendentes'}` : 'Alertas'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <Bell className="h-[18px] w-[18px]" />
        {urgent.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--bg)] bg-red-600 px-1 text-[10px] font-bold text-white">
            {urgent.length > 9 ? '9+' : urgent.length}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-xl bg-white p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
            <p className="text-sm font-bold text-slate-900">Alertas</p>
            <Link href={remindersHref} onClick={close} className="text-xs font-semibold text-blue-700 hover:underline">
              Ver lembretes
            </Link>
          </div>

          {urgent.length === 0 ? (
            <div className="flex items-start gap-3 rounded-md px-3 py-3">
              {list.length === 0 ? (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-slate-600">
                    <strong className="block text-slate-900">Nenhum lembrete configurado</strong>
                    Cadastre troca de óleo, revisões e mais, por km ou por tempo, e os avisos aparecem aqui.
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-slate-600">
                    <strong className="block text-slate-900">Tudo em dia</strong>
                    Nenhum lembrete vencido ou perto de vencer.
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[min(420px,70vh)] overflow-y-auto">
              {urgent.map((s) => {
                const config = statusConfig[s.status];
                const Icon = config.icon;
                return (
                  <Link
                    key={s.id}
                    href={remindersHref}
                    onClick={close}
                    className="group flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.soft}`}>
                      <Icon className={`h-4 w-4 ${config.iconColor}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{s.type}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.badge}`}>{config.label}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {dueSummary(s)}
                        {s.nextDueDate !== null && ` · até ${formatDate(s.nextDueDate)}`}
                      </span>
                    </span>
                    <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
