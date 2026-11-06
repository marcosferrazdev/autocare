'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { SERIES } from '@/lib/chart-colors';

const AXIS_TICK = { fontSize: 11, fill: '#898781' };
const GRID_STROKE = '#eceae4';

/** Tooltip minimalista: cartão branco, borda hairline, valores com swatch. */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2.5 text-xs">
      <p className="font-bold text-slate-900 mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold text-slate-900">{formatter(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface MonthlyExpense {
  month: string;
  maintenance: number;
  fuel: number;
  wash: number;
  insurance: number;
  total: number;
}

export function MonthlyExpensesChart({ data }: { data: MonthlyExpense[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -14, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} />
        <YAxis
          tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
          content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
        />
        <Bar name="Combustível" dataKey="fuel" fill={SERIES.fuel} radius={[6, 6, 2, 2]} maxBarSize={14} />
        <Bar name="Manutenção" dataKey="maintenance" fill={SERIES.maintenance} radius={[6, 6, 2, 2]} maxBarSize={14} />
        <Bar name="Lavagens" dataKey="wash" fill={SERIES.wash} radius={[6, 6, 2, 2]} maxBarSize={14} />
        <Bar name="Seguro" dataKey="insurance" fill={SERIES.insurance} radius={[6, 6, 2, 2]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Evolução de uma métrica (relatórios): área na cor da métrica e a média tracejada.
 * A linha se desenha da esquerda para a direita ao aparecer.
 */
export function TrendChart({
  data,
  name,
  color,
  format,
  tickFormat,
  average,
}: {
  data: { label: string; value: number }[];
  name: string;
  color: string;
  format: (value: number) => string;
  tickFormat: (value: number) => string;
  average?: number;
}) {
  const gradientId = `trend-${React.useId().replace(/:/g, '')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tickFormatter={tickFormat} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<ChartTooltip formatter={format} />} />
        {average !== undefined && average > 0 && (
          <ReferenceLine
            y={average}
            stroke="var(--muted)"
            strokeDasharray="5 5"
            strokeOpacity={0.7}
            label={{ value: 'média', position: 'insideTopRight', fill: 'var(--muted)', fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          name={name}
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: color }}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ConsumptionChart({ data }: { data: { date: string; consumption: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 15, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="consumptionWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.fuel} stopOpacity={0.3} />
            <stop offset="100%" stopColor={SERIES.fuel} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} />
        <YAxis
          domain={['dataMin - 1', 'dataMax + 1']}
          tickFormatter={(val) => Number(val).toFixed(0)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(2)} km/L`} />} />
        <Area
          type="monotone"
          name="Consumo"
          dataKey="consumption"
          stroke={SERIES.fuel}
          strokeWidth={2.5}
          fill="url(#consumptionWash)"
          dot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: SERIES.fuel }}
          activeDot={{ r: 6, stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
