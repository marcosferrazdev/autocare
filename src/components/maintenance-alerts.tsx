'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate, formatMileage } from '@/lib/formatters';
import { BellRing, AlertTriangle, Clock, CheckCircle2, HelpCircle, ChevronRight } from 'lucide-react';

export interface ScheduleWithStatus {
  id: string;
  type: string;
  description: string | null;
  intervalKm: number | null;
  intervalDays: number | null;
  intervalMonths: number | null;
  lastDoneMileage: number | null;
  lastDoneDate: string | null;
  status: 'atrasado' | 'proximo' | 'ok' | 'sem_referencia';
  nextDueMileage: number | null;
  nextDueDate: string | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
}

const statusConfig = {
  atrasado: {
    label: 'Atrasada',
    icon: AlertTriangle,
    badge: 'bg-red-100 text-red-700',
    border: 'border-red-200 bg-red-50/60',
    iconColor: 'text-red-600',
  },
  proximo: {
    label: 'Vence em breve',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200 bg-amber-50/60',
    iconColor: 'text-amber-600',
  },
  ok: {
    label: 'Em dia',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-slate-200 bg-white',
    iconColor: 'text-emerald-600',
  },
  sem_referencia: {
    label: 'Sem referência',
    icon: HelpCircle,
    badge: 'bg-slate-100 text-slate-600',
    border: 'border-slate-200 bg-white',
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
  return parts.join(' • ');
}

interface MaintenanceAlertsProps {
  carId: string;
  /** Se true, mostra só atrasadas/próximas (modo dashboard). Se false, mostra tudo. */
  onlyUrgent?: boolean;
}

export function MaintenanceAlerts({ carId, onlyUrgent = true }: MaintenanceAlertsProps) {
  const [schedules, setSchedules] = useState<ScheduleWithStatus[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/cars/${carId}/schedules`)
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
  }, [carId]);

  if (!schedules) return null;

  const visible = onlyUrgent
    ? schedules.filter((s) => s.status === 'atrasado' || s.status === 'proximo')
    : schedules;

  // No dashboard, sem nada urgente e sem lembrete cadastrado: convite discreto
  if (onlyUrgent && visible.length === 0) {
    if (schedules.length === 0) {
      return (
        <Link
          href={`/cars/${carId}?tab=lembretes`}
          className="flex items-center justify-between gap-3 p-4 bg-blue-50/70 border border-blue-100 rounded-lg text-sm text-blue-800 hover:bg-blue-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-blue-600 shrink-0" />
            <span>
              <strong className="font-bold">Configure lembretes de manutenção</strong>{' '}
              <span className="text-blue-700/80 hidden sm:inline">
                — receba avisos de troca de óleo, revisões e mais, por km ou tempo.
              </span>
            </span>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      );
    }
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50/70 border border-emerald-100 rounded-lg text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <span>
          <strong className="font-bold">Manutenções em dia!</strong>{' '}
          Nenhum lembrete vencido ou próximo do vencimento.
        </span>
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {visible.map((s) => {
        const config = statusConfig[s.status];
        const Icon = config.icon;
        return (
          <Link
            key={s.id}
            href={`/cars/${carId}?tab=lembretes`}
            className={`flex items-center gap-3.5 p-4 border rounded-lg transition-all hover:shadow-sm group ${config.border}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-800">{s.type}</p>
                <span className={`text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${config.badge}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {dueSummary(s)}
                {s.nextDueMileage !== null && (
                  <span className="hidden sm:inline"> • próxima em {formatMileage(s.nextDueMileage)}</span>
                )}
                {s.nextDueDate !== null && (
                  <span className="hidden sm:inline"> • até {formatDate(s.nextDueDate)}</span>
                )}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        );
      })}
    </div>
  );
}
