'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { CarProvider, useCar } from '@/components/providers/car-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { RodaNexoIcon } from '@/components/logo';
import {
  Car,
  LayoutDashboard,
  BarChart3,
  Map,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronDown,
  BookOpen,
  ListTodo,
  Droplets,
  BellRing,
  Shield,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'rodanexo_sidebar_collapsed';
const SIDEBAR_TRANSITION = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

type CarTab = 'historico' | 'upgrades' | 'lavadas' | 'seguro' | 'financiamento' | 'lembretes';

const CAR_TABS: { id: CarTab; name: string; icon: LucideIcon }[] = [
  { id: 'historico', name: 'Histórico Geral', icon: BookOpen },
  { id: 'upgrades', name: 'Melhorias', icon: ListTodo },
  { id: 'lavadas', name: 'Lavadas', icon: Droplets },
  { id: 'seguro', name: 'Seguro', icon: Shield },
  { id: 'financiamento', name: 'Financiamento', icon: Landmark },
  { id: 'lembretes', name: 'Lembretes', icon: BellRing },
];

function CollapsibleLabel({
  collapsed,
  className = '',
  maxWidth = '160px',
  children,
}: {
  collapsed: boolean;
  className?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block overflow-hidden whitespace-nowrap transition-all ${SIDEBAR_TRANSITION} ${className}`}
      style={{ maxWidth: collapsed ? '0px' : maxWidth, opacity: collapsed ? 0 : 1 }}
    >
      {children}
    </span>
  );
}

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity min-w-0">
      <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0 shadow-sm">
        <RodaNexoIcon size={24} />
      </div>
      <CollapsibleLabel collapsed={collapsed} className="text-base font-bold tracking-tight select-none">
        <span className="text-white">Roda</span>
        <span className="text-blue-400">Nexo</span>
      </CollapsibleLabel>
    </Link>
  );
}

function carLabel(car: { nickname: string | null; brand: string; model: string }) {
  return car.nickname || `${car.brand} ${car.model}`;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth();
  const { cars, selectedCarId, setSelectedCarId } = useCar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [vehiclesOpen, setVehiclesOpen] = useState(true);
  const [openCarIds, setOpenCarIds] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeCarIdFromPath = useMemo(() => {
    const m = pathname.match(/^\/cars\/([^/]+)/);
    if (!m || m[1] === 'new') return null;
    return m[1];
  }, [pathname]);

  const activeTab = (searchParams.get('tab') as CarTab | null) || 'historico';

  // Restaura preferência salva (evita "flash" expandido antes de recolher)
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === '1') setCollapsed(true);
    setHydrated(true);
  }, []);

  // Abre cascata do veículo da rota atual
  useEffect(() => {
    if (pathname.startsWith('/cars')) {
      setVehiclesOpen(true);
    }
    if (activeCarIdFromPath) {
      setOpenCarIds((prev) => ({ ...prev, [activeCarIdFromPath]: true }));
      setSelectedCarId(activeCarIdFromPath);
    }
  }, [pathname, activeCarIdFromPath, setSelectedCarId]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleCarOpen = (carId: string) => {
    setOpenCarIds((prev) => ({ ...prev, [carId]: !prev[carId] }));
  };

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

  const topNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Viagens', href: '/trips', icon: Map },
  ];

  const navLinkClass = (isActive: boolean, depth = 0) =>
    `relative flex items-center gap-2.5 py-2 text-sm font-medium border-l-2 transition-colors ${
      depth === 0 ? 'px-4' : depth === 1 ? 'pl-8 pr-3' : 'pl-11 pr-3'
    } ${
      isActive
        ? 'border-blue-500 bg-white/[0.04] text-white'
        : 'border-transparent text-slate-500 hover:text-slate-200'
    }`;

  const subLinkClass = (isActive: boolean) =>
    `flex items-center gap-2 py-1.5 pl-11 pr-3 text-[12px] font-medium rounded-r-md transition-colors border-l-2 ${
      isActive
        ? 'border-blue-500 text-blue-300 bg-white/[0.03]'
        : 'border-transparent text-slate-500 hover:text-slate-300'
    }`;

  const isCarsSectionActive = pathname === '/cars' || pathname.startsWith('/cars/');

  const renderVehiclesTree = (onNavigate?: () => void) => {
    const showTree = !collapsed;

    return (
      <div className="space-y-0.5">
        {/* Parent: Meus Veículos */}
        <div className="flex items-stretch">
          <Link
            href="/cars"
            title={collapsed ? 'Meus Veículos' : undefined}
            onClick={onNavigate}
            className={`${navLinkClass(isCarsSectionActive && pathname === '/cars')} flex-1 min-w-0`}
          >
            <Car className={`h-5 w-5 shrink-0 ${isCarsSectionActive ? 'text-white' : 'text-slate-500'}`} />
            <CollapsibleLabel collapsed={collapsed}>Meus Veículos</CollapsibleLabel>
          </Link>
          {showTree && (
            <button
              type="button"
              onClick={() => setVehiclesOpen((o) => !o)}
              className="px-2 text-slate-500 hover:text-slate-200 shrink-0"
              title={vehiclesOpen ? 'Recolher veículos' : 'Expandir veículos'}
              aria-expanded={vehiclesOpen}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${SIDEBAR_TRANSITION} ${vehiclesOpen ? '' : '-rotate-90'}`}
              />
            </button>
          )}
        </div>

        {/* Cascata: carros + abas */}
        {showTree && vehiclesOpen && (
          <div className="pb-1 space-y-0.5">
            {cars.length === 0 ? (
              <p className="pl-11 pr-3 py-1.5 text-[11px] text-slate-600 italic">Nenhum veículo</p>
            ) : (
              cars.map((car) => {
                const carPathActive = pathname.startsWith(`/cars/${car.id}`);
                const carOpen = openCarIds[car.id] ?? carPathActive;
                const label = carLabel(car);

                return (
                  <div key={car.id} className="space-y-0.5">
                    <div className="flex items-stretch">
                      <Link
                        href={`/cars/${car.id}`}
                        onClick={() => {
                          setSelectedCarId(car.id);
                          setOpenCarIds((prev) => ({ ...prev, [car.id]: true }));
                          onNavigate?.();
                        }}
                        className={`${navLinkClass(carPathActive, 1)} flex-1 min-w-0`}
                        title={label}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            carPathActive ? 'bg-blue-400' : 'bg-slate-600'
                          }`}
                        />
                        <span className="truncate text-[13px]">{label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCarOpen(car.id)}
                        className="px-2 text-slate-500 hover:text-slate-200 shrink-0"
                        title={carOpen ? 'Recolher abas' : 'Expandir abas'}
                        aria-expanded={carOpen}
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${SIDEBAR_TRANSITION} ${
                            carOpen ? '' : '-rotate-90'
                          }`}
                        />
                      </button>
                    </div>

                    {carOpen && (
                      <div className="space-y-0.5 pb-1">
                        {CAR_TABS.map((tab) => {
                          const href =
                            tab.id === 'historico'
                              ? `/cars/${car.id}`
                              : `/cars/${car.id}?tab=${tab.id}`;
                          const tabActive =
                            carPathActive &&
                            pathname === `/cars/${car.id}` &&
                            (tab.id === 'historico'
                              ? !searchParams.get('tab') || activeTab === 'historico'
                              : activeTab === tab.id);
                          const TabIcon = tab.icon;
                          return (
                            <Link
                              key={tab.id}
                              href={href}
                              onClick={() => {
                                setSelectedCarId(car.id);
                                onNavigate?.();
                              }}
                              className={subLinkClass(!!tabActive)}
                            >
                              <TabIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                              <span className="truncate">{tab.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-slate-950 shrink-0 sticky top-0 h-screen relative ${hydrated ? `transition-[width] ${SIDEBAR_TRANSITION}` : ''
          } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5 shrink-0 overflow-hidden">
          <SidebarLogo collapsed={collapsed} />
        </div>

        {/* Botão recolher/expandir */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={`absolute -right-3 top-[52px] h-6 w-6 rounded-full bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center shadow-md transition-colors z-10`}
        >
          <ChevronsLeft
            className={`h-3.5 w-3.5 transition-transform ${SIDEBAR_TRANSITION} ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <div className="px-4 pb-3 overflow-hidden">
            <CollapsibleLabel
              collapsed={collapsed}
              maxWidth="120px"
              className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-600"
            >
              Menu
            </CollapsibleLabel>
          </div>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            title={collapsed ? 'Dashboard' : undefined}
            className={navLinkClass(pathname === '/dashboard' || pathname.startsWith('/dashboard/'))}
          >
            <LayoutDashboard
              className={`h-5 w-5 shrink-0 ${
                pathname.startsWith('/dashboard') ? 'text-white' : 'text-slate-500'
              }`}
            />
            <CollapsibleLabel collapsed={collapsed}>Dashboard</CollapsibleLabel>
          </Link>

          {/* Meus Veículos + cascata */}
          {renderVehiclesTree()}

          {/* Demais itens */}
          {topNav
            .filter((i) => i.href !== '/dashboard')
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={navLinkClass(isActive)}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <CollapsibleLabel collapsed={collapsed}>{item.name}</CollapsibleLabel>
                </Link>
              );
            })}
        </nav>

        {/* User profile & Logout */}
        <div
          className={`border-t border-white/5 shrink-0 space-y-2 ${
            collapsed ? 'px-2 py-3' : 'p-4'
          }`}
        >
          <div
            className={`flex items-center py-1.5 min-w-0 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-2'
            }`}
          >
            <div
              className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 flex items-center justify-center font-bold text-sm shrink-0"
              title={collapsed ? user?.name : undefined}
            >
              {user ? user.name.charAt(0).toUpperCase() : ''}
            </div>
            <CollapsibleLabel collapsed={collapsed} maxWidth="150px">
              <p className="text-sm font-bold text-white truncate">{user?.name ?? ' '}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ' '}</p>
            </CollapsibleLabel>
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Sair' : undefined}
            className={`w-full flex items-center rounded-md text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <CollapsibleLabel collapsed={collapsed}>Sair</CollapsibleLabel>
          </button>
        </div>
      </aside>

      {/* Mobile Header / Navbar */}
      <header className="md:hidden h-16 bg-slate-950 flex items-center justify-between px-4 sticky top-0 z-40 shrink-0">
        <SidebarLogo collapsed={false} />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-sm z-30 flex flex-col justify-start overflow-y-auto">
          <div className="bg-slate-950 border-b border-white/5 px-2 py-6 space-y-4 shadow-xl">
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass(pathname.startsWith('/dashboard'))}
              >
                <LayoutDashboard className={`h-5 w-5 ${pathname.startsWith('/dashboard') ? 'text-white' : 'text-slate-500'}`} />
                Dashboard
              </Link>

              {renderVehiclesTree(() => setMobileMenuOpen(false))}

              {topNav
                .filter((i) => i.href !== '/dashboard')
                .map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={navLinkClass(isActive)}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {item.name}
                    </Link>
                  );
                })}
            </nav>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 flex items-center justify-center font-bold text-sm">
                  {user ? user.name.charAt(0).toUpperCase() : ''}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{user?.name ?? ' '}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 text-sm font-semibold text-red-400 bg-red-500/10 px-3 py-2 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main
          className={`flex-1 min-h-0 p-6 md:p-8 ${
            /^\/cars\/[^/]+$/.test(pathname)
              ? 'overflow-hidden flex flex-col'
              : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>
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
