'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { CarProvider } from '@/components/providers/car-provider';
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
  Loader2
} from 'lucide-react';

function SidebarLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
      <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0 shadow-sm">
        <RodaNexoIcon size={24} />
      </div>
      <span className="text-base font-bold tracking-tight select-none">
        <span className="text-white">Roda</span>
        <span className="text-blue-400">Nexo</span>
      </span>
    </Link>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-slate-500 text-sm font-medium">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Meus Veículos', href: '/cars', icon: Car },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Viagens', href: '/trips', icon: Map },
  ];

  const navLinkClass = (isActive: boolean) =>
    `relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2 ${isActive
      ? 'border-blue-500 bg-white/[0.04] text-white'
      : 'border-transparent text-slate-500 hover:text-slate-200'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5 shrink-0">
          <SidebarLogo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-0.5 overflow-y-auto">
          <p className="px-4 pb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-600">
            Menu
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.name} href={item.href} className={navLinkClass(isActive)}>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-white/5 shrink-0 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 flex items-center justify-center font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header / Navbar */}
      <header className="md:hidden h-16 bg-slate-950 flex items-center justify-between px-4 sticky top-0 z-40 shrink-0">
        <SidebarLogo />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-sm z-30 flex flex-col justify-start">
          <div className="bg-slate-950 border-b border-white/5 px-4 py-6 space-y-4 shadow-xl">
            <nav className="space-y-1">
              {navigation.map((item) => {
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
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{user.name}</p>
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-6 md:p-8">
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
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </CarProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
