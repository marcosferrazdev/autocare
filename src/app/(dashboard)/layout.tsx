'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { CarProvider, useCar } from '@/components/providers/car-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { RodaNexoIcon } from '@/components/logo';
import { useMounted, useTheme, type ThemeMode } from '@/lib/theme';
import { useDismiss } from '@/lib/use-dismiss';
import { AlertsBell } from '@/components/maintenance-alerts';
import { formatMileage } from '@/lib/formatters';
import {
  ChevronDown,
  Check,
  Fuel,
  Wrench,
  Droplets,
  BellRing,
  Plus,
  Moon,
  Sun,
  LogOut,
  Car,
  BarChart3,
  Monitor,
  type LucideIcon,
} from 'lucide-react';

const NAV = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Veículos', href: '/cars' },
  { name: 'Relatórios', href: '/reports' },
  { name: 'Viagens', href: '/trips' },
];

function carLabel(car: { nickname: string | null; brand: string; model: string }) {
  return car.nickname || `${car.brand} ${car.model}`;
}

/** Navegação em pílula: o fundo escuro desliza até a aba ativa. */
function PillNav({ pathname }: { pathname: string }) {
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const activeIndex = NAV.findIndex((i) => pathname === i.href || pathname.startsWith(i.href + '/'));

  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelectorAll<HTMLElement>('[data-nav-item]')[activeIndex];
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIndex]);

  return (
    <nav
      ref={navRef}
      aria-label="Principal"
      className="relative flex items-center gap-0.5 rounded-full bg-white p-1 shadow-sm overflow-x-auto [scrollbar-width:none]"
    >
      {indicator && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full bg-block-ink transition-[left,width] duration-500 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {NAV.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          data-nav-item
          aria-current={i === activeIndex ? 'page' : undefined}
          className={`relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors duration-300 ${
            i === activeIndex ? 'text-on-block-ink' : 'text-slate-600 hover:text-slate-900'
          } ${i === activeIndex && !indicator ? 'bg-block-ink' : ''}`}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

function CarSwitcher() {
  const { cars, selectedCar: carFromStore, setSelectedCarId } = useCar();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  // A lista de carros vem do navegador; até montar, o HTML do servidor não a conhece
  const mounted = useMounted();
  const selectedCar = mounted ? carFromStore : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-3 pr-2.5 shadow-sm hover:bg-slate-50 transition-colors max-w-[170px] sm:max-w-[240px]"
      >
        <span className={`live-dot h-2 w-2 shrink-0 rounded-full ${selectedCar ? 'bg-emerald-500 text-emerald-500' : 'bg-slate-300 text-slate-300'}`} />
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-[13px] font-bold text-slate-900">
            {selectedCar ? carLabel(selectedCar) : 'Nenhum veículo'}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {selectedCar ? formatMileage(selectedCar.currentMileage) : 'Adicione o primeiro'}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-white p-1.5 shadow-lg" role="listbox">
          {cars.map((car) => (
            <button
              key={car.id}
              type="button"
              role="option"
              aria-selected={car.id === selectedCar?.id}
              onClick={() => {
                setSelectedCarId(car.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{carLabel(car)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {car.plate || `${car.brand} ${car.model}`} · {formatMileage(car.currentMileage)}
                </span>
              </span>
              {car.id === selectedCar?.id && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/cars/new');
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> Adicionar veículo
          </button>
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'dark', label: 'Escuro', icon: Moon },
  { mode: 'system', label: 'Seguir o sistema', icon: Monitor },
];

function MenuDivider() {
  return <div className="mx-2 my-1 h-px bg-slate-100" />;
}

function MenuLink({ href, icon: Icon, label, onSelect }: { href: string; icon: LucideIcon; label: string; onSelect: () => void }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-500" />
      {label}
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);
  // O usuário vem do navegador; até montar, o HTML do servidor não o conhece
  const mounted = useMounted();
  const initials = ((mounted && user?.name) || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Conta"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[13px] font-bold text-blue-800 shadow-sm"
      >
        {initials}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg)] bg-emerald-500" />
      </button>
      {open && (
        <div role="menu" className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-white p-1.5 shadow-lg">
          <div className="px-3 pb-2 pt-2.5">
            <p className="truncate text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>

          <MenuDivider />
          <MenuLink href="/cars" icon={Car} label="Minha garagem" onSelect={close} />
          <MenuLink href="/cars/new" icon={Plus} label="Adicionar veículo" onSelect={close} />
          <MenuLink href="/reports" icon={BarChart3} label="Relatórios" onSelect={close} />

          <MenuDivider />
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-slate-500">Tema</p>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              role="menuitemradio"
              aria-checked={mode === opt.mode}
              onClick={(e) => setMode(opt.mode, e)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <opt.icon className="h-4 w-4 text-slate-500" />
              <span className="flex-1 text-left">{opt.label}</span>
              {mode === opt.mode && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}

          <MenuDivider />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function DockButton({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  const className =
    'group relative flex h-10 w-10 items-center justify-center rounded-full text-on-block-accent transition-colors hover:bg-white/15 aria-disabled:opacity-40 aria-disabled:pointer-events-none';
  const tip = (
    <span className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-block-ink px-2.5 py-1 text-xs font-semibold text-on-block-ink opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:bottom-full max-md:mb-2 md:left-full md:ml-3">
      {label}
    </span>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} className={className}>
        <Icon className="h-[18px] w-[18px]" />
        {tip}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      <Icon className="h-[18px] w-[18px]" />
      {tip}
    </button>
  );
}

/** Dock de ações rápidas do carro selecionado: lateral no desktop, barra inferior no celular. */
function Dock() {
  const { selectedCarId } = useCar();
  const { theme, toggle } = useTheme();
  const car = selectedCarId ? `/cars/${selectedCarId}` : '';

  return (
    <div className="fixed z-40 flex items-center gap-1 rounded-full bg-block-accent p-1.5 shadow-lg max-md:bottom-3 max-md:left-1/2 max-md:-translate-x-1/2 md:left-5 md:top-1/2 md:-translate-y-1/2 md:flex-col">
      <DockButton icon={Fuel} label="Novo abastecimento" href={`${car}/fuel-records/new`} disabled={!car} />
      <DockButton icon={Wrench} label="Nova manutenção" href={`${car}/maintenances/new`} disabled={!car} />
      <DockButton icon={Droplets} label="Lavadas" href={`${car}?tab=lavadas`} disabled={!car} />
      <DockButton icon={BellRing} label="Lembretes" href={`${car}?tab=lembretes`} disabled={!car} />
      <span className="mx-1 h-6 w-px bg-white/25 md:mx-0 md:my-1 md:h-px md:w-6" aria-hidden />
      <DockButton icon={Plus} label="Adicionar veículo" href="/cars/new" />
      <DockButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={(e) => toggle(e)} />
    </div>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { setSelectedCarId } = useCar();
  const pathname = usePathname();
  const router = useRouter();

  const activeCarIdFromPath = useMemo(() => {
    const m = pathname.match(/^\/cars\/([^/]+)/);
    if (!m || m[1] === 'new') return null;
    return m[1];
  }, [pathname]);

  // Abrir um carro pela URL também o seleciona no seletor do topo
  useEffect(() => {
    if (activeCarIdFromPath) setSelectedCarId(activeCarIdFromPath);
  }, [activeCarIdFromPath, setSelectedCarId]);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Não bloqueia a tela esperando /api/auth/me: o layout renderiza já e a página
  // filha começa a buscar os dados dela em paralelo com a checagem de sessão.
  // Sem sessão, o effect acima já mandou para /login.
  if (!authLoading && !user) return null;

  // /cars/<id> tem layout de altura fixa; /cars/new é um formulário comum, que rola
  const isCarDetail = /^\/cars\/(?!new$)[^/]+$/.test(pathname);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 px-4 pt-3 md:pl-24 md:pr-8 md:pt-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#fcfdfd] shadow-sm">
              <RodaNexoIcon size={26} />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-slate-900 sm:inline">RodaNexo</span>
          </Link>

          <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:flex md:justify-center">
            <PillNav pathname={pathname} />
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <CarSwitcher />
            <AlertsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        className={`flex-1 min-h-0 px-4 pt-6 pb-24 md:pl-24 md:pr-8 md:pb-8 ${
          isCarDetail ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}
      >
        {/* key por rota: a entrada escalonada roda a cada troca de página */}
        <div
          key={pathname}
          className={`page-enter mx-auto w-full max-w-[1600px] ${isCarDetail ? 'flex-1 min-h-0 flex flex-col' : ''}`}
        >
          {children}
        </div>
      </main>

      <Dock />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <CarProvider>
          <React.Suspense fallback={null}>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
          </React.Suspense>
        </CarProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
