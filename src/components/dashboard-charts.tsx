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
        <Bar name="Combustível" dataKey="fuel" fill={SERIES.fuel} radius={[3, 3, 0, 0]} maxBarSize={12} />
        <Bar name="Manutenção" dataKey="maintenance" fill={SERIES.maintenance} radius={[3, 3, 0, 0]} maxBarSize={12} />
        <Bar name="Lavagens" dataKey="wash" fill={SERIES.wash} radius={[3, 3, 0, 0]} maxBarSize={12} />
        <Bar name="Seguro" dataKey="insurance" fill={SERIES.insurance} radius={[3, 3, 0, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConsumptionChart({ data }: { data: { date: string; consumption: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 15, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="consumptionWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.fuel} stopOpacity={0.14} />
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
          strokeWidth={2}
          fill="url(#consumptionWash)"
          dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: SERIES.fuel }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
