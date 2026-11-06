'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCar } from '@/components/providers/car-provider';
import { formatCurrency, formatDate, formatMileage } from '@/lib/formatters';
import {
  PART_CATEGORIES,
  buildPartGroups,
  partInitials,
  type MaintenanceForParts,
  type PartCategoryId,
  type PartGroup,
  type PartModel,
} from '@/lib/parts';
import {
  Search,
  LayoutGrid,
  List,
  Wrench,
  X,
  Plus,
  Droplet,
  Filter,
  Wind,
  Disc3,
  CircleDot,
  Spline,
  BatteryFull,
  Zap,
  Lightbulb,
  Thermometer,
  RefreshCw,
  Cog,
  Package,
  Coins,
  Repeat,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

// three.js (~600 KB) só desce quando alguém abre uma peça
const PartViewer3D = dynamic(() => import('@/components/part-viewer-3d'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-white/40" />,
});

const MODEL_ICONS: Record<PartModel, LucideIcon> = {
  oil: Droplet,
  filter: Filter,
  airFilter: Wind,
  brake: Disc3,
  tire: CircleDot,
  shock: Spline,
  battery: BatteryFull,
  sparkPlug: Zap,
  bulb: Lightbulb,
  radiator: Thermometer,
  belt: RefreshCw,
  gear: Cog,
};

const categoryOf = (id: PartCategoryId) => PART_CATEGORIES.find((c) => c.id === id) ?? PART_CATEGORIES[PART_CATEGORIES.length - 1];

type Kind = 'todos' | 'peca' | 'servico';

/** Capa da peça: quadrado na cor da categoria com um disco de freio espiando por trás. */
function PartCover({ group, large = false }: { group: PartGroup; large?: boolean }) {
  const cat = categoryOf(group.category);
  const Icon = MODEL_ICONS[group.model];
  return (
    <div className="relative aspect-square w-full">
      <span
        aria-hidden
        className="rotor absolute right-0 top-[9%] aspect-square h-[82%] rounded-full transition-transform duration-700 ease-out group-hover:translate-x-[10%] group-hover:rotate-[120deg]"
      />
      <span
        className="absolute inset-y-0 left-0 flex w-[84%] flex-col justify-between overflow-hidden rounded-lg p-3 text-white shadow-md"
        style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${cat.color} 78%, white) 0%, ${cat.color} 55%, color-mix(in srgb, ${cat.color} 70%, black) 100%)` }}
      >
        <span className="flex items-start justify-between gap-2">
          <Icon className={large ? 'h-7 w-7 opacity-90' : 'h-5 w-5 opacity-90'} />
          {group.kind === 'servico' && (
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold">Serviço</span>
          )}
        </span>
        <span className={`font-bold leading-none tracking-tight ${large ? 'text-6xl' : 'text-4xl'}`}>{partInitials(group.name)}</span>
      </span>
    </div>
  );
}

function sinceLabel(group: PartGroup, currentMileage: number | null): string {
  if (currentMileage === null || currentMileage < group.lastMileage) return `em ${formatDate(group.lastDate)}`;
  const km = currentMileage - group.lastMileage;
  return km === 0 ? 'trocada agora' : `há ${formatMileage(km)}`;
}

export default function PartsClient({
  initialCarId,
  initialMaintenances,
}: {
  initialCarId: string | null;
  initialMaintenances: MaintenanceForParts[];
}) {
  const { selectedCarId, selectedCar } = useCar();
  const [data, setData] = useState({ carId: initialCarId, maintenances: initialMaintenances });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PartCategoryId | 'todas'>('todas');
  const [kind, setKind] = useState<Kind>('todos');
  const [view, setView] = useState<'grade' | 'lista'>('grade');
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Antes do CarProvider responder, vale o carro que o servidor já usou
  const activeCarId = selectedCarId ?? initialCarId;

  useEffect(() => {
    if (!activeCarId || activeCarId === data.carId) return;
    let alive = true;
    fetch(`/api/cars/${activeCarId}/maintenances`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: MaintenanceForParts[]) => alive && setData({ carId: activeCarId, maintenances: list }))
      .catch(() => alive && setData({ carId: activeCarId, maintenances: [] }));
    return () => {
      alive = false;
    };
  }, [activeCarId, data.carId]);

  const loading = !!activeCarId && activeCarId !== data.carId;
  const groups = useMemo(() => buildPartGroups(data.maintenances), [data.maintenances]);
  const currentMileage = selectedCar && selectedCar.id === data.carId ? selectedCar.currentMileage : null;

  const byKind = groups.filter((g) => kind === 'todos' || g.kind === kind);
  const counts = new Map<PartCategoryId, number>();
  byKind.forEach((g) => counts.set(g.category, (counts.get(g.category) ?? 0) + 1));
  const q = query.trim().toLowerCase();
  const visible = byKind.filter(
    (g) =>
      (category === 'todas' || g.category === category) &&
      (!q || `${g.name} ${g.brands.join(' ')} ${g.occurrences.map((o) => o.description).join(' ')}`.toLowerCase().includes(q))
  );

  const totalSpent = groups.reduce((sum, g) => sum + g.totalSpent, 0);
  const mostReplaced = [...groups].sort((a, b) => b.occurrences.length - a.occurrences.length)[0];
  const open = groups.find((g) => g.key === openKey) ?? null;

  if (!activeCarId) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
        <Package className="mb-4 h-14 w-14 text-slate-300" />
        <h1 className="mb-2 text-xl font-bold text-slate-800">Nenhum veículo cadastrado</h1>
        <p className="mb-6 text-sm text-slate-500">Cadastre um veículo e registre manutenções para ver as peças trocadas aqui.</p>
        <Link href="/cars/new" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Adicionar veículo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Título, números e ação */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:mr-4">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight text-slate-900">Peças</h1>
          <p className="text-sm text-slate-500">Tudo o que já foi trocado ou feito no carro</p>
        </div>
        <div className="-mx-1 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto px-1 py-1 [scrollbar-width:none] lg:flex-1">
          <Stat icon={Package} value={String(groups.length)} label={groups.length === 1 ? 'item no histórico' : 'itens no histórico'} />
          <Stat icon={Coins} value={formatCurrency(totalSpent)} label="Gasto em peças e serviços" />
          {mostReplaced && mostReplaced.occurrences.length > 1 && (
            <Stat icon={Repeat} solid value={`${mostReplaced.occurrences.length}x`} label={`Mais trocada: ${mostReplaced.name}`} />
          )}
        </div>
        <Link
          href={`/cars/${activeCarId}/maintenances/new`}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Registrar manutenção
        </Link>
      </div>

      {/* Busca, tipo e modo de exibição */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por peça, marca ou descrição"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              ['todos', 'Tudo'],
              ['peca', 'Peças'],
              ['servico', 'Serviços'],
            ]}
          />
          <Segmented
            value={view}
            onChange={setView}
            options={[
              ['grade', <LayoutGrid key="g" className="h-4 w-4" aria-label="Grade" />],
              ['lista', <List key="l" className="h-4 w-4" aria-label="Lista" />],
            ]}
          />
        </div>
      </div>

      {/* Categorias com contagem */}
      <div className="flex flex-wrap gap-2">
        <Chip active={category === 'todas'} onClick={() => setCategory('todas')} label="Todas" count={byKind.length} />
        {PART_CATEGORIES.filter((c) => counts.has(c.id)).map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.name} count={counts.get(c.id) ?? 0} color={c.color} />
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <Wrench className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="font-bold text-slate-800">Nenhuma peça registrada ainda</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Ao registrar uma manutenção, liste as peças trocadas e elas aparecem aqui, com histórico e visualização em 3D.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Nada encontrado com esses filtros.</p>
      ) : view === 'grade' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {visible.map((g, i) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setOpenKey(g.key)}
              className="rise-in group flex flex-col gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <PartCover group={g} />
              <span className="min-w-0 px-1">
                <span className="block truncate text-sm font-bold text-slate-900">{g.name}</span>
                <span className="block truncate text-xs text-slate-500">{g.brands.join(', ') || categoryOf(g.category).name}</span>
              </span>
              <span className="flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(g.totalSpent)}
                  <span className="ml-1.5 text-xs font-medium text-slate-500">{g.occurrences.length}x</span>
                </span>
                <span className="truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {sinceLabel(g, currentMileage)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {visible.map((g, i) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setOpenKey(g.key)}
              className="rise-in group flex w-full items-center gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
              style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
            >
              <span className="w-14 shrink-0">
                <PartCover group={g} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{g.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {categoryOf(g.category).name}
                  {g.brands.length > 0 ? ` · ${g.brands.join(', ')}` : ''}
                </span>
              </span>
              <span className="hidden w-28 text-xs text-slate-500 sm:block">{g.occurrences.length}x trocada</span>
              <span className="hidden w-32 text-xs text-slate-500 md:block">última {formatDate(g.lastDate)}</span>
              <span className="w-28 text-right text-sm font-bold text-slate-900">{formatCurrency(g.totalSpent)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <PartDrawer group={open} carId={data.carId ?? activeCarId} currentMileage={currentMileage} onClose={() => setOpenKey(null)} />
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, solid = false }: { icon: LucideIcon; value: string; label: string; solid?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          solid ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-xl font-bold tracking-tight text-slate-900">{value}</span>
        <span className="block max-w-[220px] truncate text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, React.ReactNode][];
}) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-300 ${
            value === v ? 'bg-block-ink text-on-block-ink' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Chip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );
}

/** Gaveta da peça: 3D, ficha, gasto em cada troca e as manutenções em que aparece. */
function PartDrawer({
  group,
  carId,
  currentMileage,
  onClose,
}: {
  group: PartGroup;
  carId: string;
  currentMileage: number | null;
  onClose: () => void;
}) {
  const cat = categoryOf(group.category);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const maxPrice = Math.max(1, ...group.occurrences.map((o) => o.totalPrice));
  const avgUnit = group.totalQuantity > 0 ? group.totalSpent / group.totalQuantity : 0;
  const kmSince = currentMileage !== null && currentMileage >= group.lastMileage ? currentMileage - group.lastMileage : null;
  const facts: [string, string][] = [
    ['Categoria', cat.name],
    ['Marcas', group.brands.join(', ') || '—'],
    [group.kind === 'servico' ? 'Vezes feito' : 'Trocas', `${group.occurrences.length}x`],
    ['Quantidade total', String(group.totalQuantity)],
    ['Última vez', `${formatDate(group.lastDate)} · ${formatMileage(group.lastMileage)}`],
    ['Rodado desde então', kmSince !== null ? formatMileage(kmSince) : '—'],
    [group.kind === 'servico' ? 'Valor médio' : 'Preço médio por unidade', formatCurrency(avgUnit)],
    ['Gasto total', formatCurrency(group.totalSpent)],
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={group.name}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/30" />
      <aside className="drawer-in absolute inset-y-2 right-2 flex w-[min(540px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-900">{group.name}</h2>
            <p className="text-sm text-slate-500">
              {group.kind === 'servico' ? 'Serviço' : 'Peça'} · {cat.name}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          {/* Visualizador 3D */}
          <div
            className="relative h-72 overflow-hidden rounded-xl"
            style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${cat.color} 22%, var(--card)) 0%, var(--s50) 70%)` }}
          >
            <PartViewer3D key={group.key} model={group.model} color={cat.color} />
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              Arraste para girar · role para aproximar
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Gasto em cada troca */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Gasto em cada {group.kind === 'servico' ? 'vez' : 'troca'}</h3>
            <div className="flex h-36 items-end gap-2 border-b border-slate-200 pb-1">
              {group.occurrences.map((o, i) => (
                <div key={`${o.maintenanceId}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">{formatCurrency(o.totalPrice)}</span>
                  <span
                    className="grow-y w-full max-w-12 rounded-t-md"
                    style={{ height: `${Math.max(6, (o.totalPrice / maxPrice) * 78)}%`, backgroundColor: cat.color, animationDelay: `${150 + i * 70}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {group.occurrences.map((o, i) => (
                <span key={`${o.maintenanceId}-d${i}`} className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-500">
                  {formatDate(o.date).slice(0, 5)}/{formatDate(o.date).slice(8)}
                </span>
              ))}
            </div>
          </section>

          {/* Manutenções em que aparece */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-900">Nas manutenções</h3>
            <div className="divide-y divide-slate-100">
              {[...group.occurrences].reverse().map((o, i) => (
                <Link
                  key={`${o.maintenanceId}-l${i}`}
                  href={`/cars/${carId}/maintenances/${o.maintenanceId}/edit`}
                  className="group flex items-center gap-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{o.description}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {formatDate(o.date)} · {formatMileage(o.mileage)}
                      {o.workshop ? ` · ${o.workshop}` : ''}
                      {o.quantity > 1 ? ` · ${o.quantity} un.` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(o.totalPrice)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
          <Link
            href={`/cars/${carId}/maintenances/new`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Registrar nova troca
          </Link>
          <Link
            href={`/cars/${carId}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Histórico do carro
          </Link>
        </div>
      </aside>
    </div>
  );
}
