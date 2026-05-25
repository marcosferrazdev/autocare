'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Car, Wrench, Fuel, BarChart3, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-600">
            <Car className="h-6 w-6" />
            <span>AutoCare<span className="text-slate-800 font-medium">Manager</span></span>
          </div>

          <nav className="flex items-center gap-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all shadow-sm hover:shadow flex items-center gap-1"
              >
                Painel Geral <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-slate-950 font-medium text-sm transition-all"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all shadow-sm hover:shadow"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-32 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="h-3.5 w-3.5" /> 100% Seguro & Privado
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight md:leading-none mb-6">
            O cuidado que o seu veículo merece, de forma <span className="text-blue-600">inteligente</span>.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
            Acompanhe manutenções, organize trocas de peças, controle abastecimentos, calcule consumo real e tenha relatórios detalhados com design limpo e minimalista.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center gap-2"
              >
                Acessar meu Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-center"
                >
                  Começar Grátis
                </Link>
                <Link
                  href="/login"
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-8 py-4 rounded-xl shadow-sm hover:shadow transition-all text-center"
                >
                  Fazer Login
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-20 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Tudo o que você precisa para cuidar do seu veículo</h2>
              <p className="text-slate-500">Desenvolvido com foco na simplicidade, rapidez e utilidade diária.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Car className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Cadastro de Carros</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Cadastre múltiplos veículos com apelido, marca, modelo, ano, placa e quilometragem de forma simplificada.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Wrench className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Registro de Manutenções</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Controle preventivas, corretivas, trocas de óleo e peças com cálculo automático de valores totais.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Fuel className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Controle de Abastecimento</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Monitore a eficiência e consumo do motor. Veja a quilometragem por litro (km/L) automaticamente.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Relatórios e Gráficos</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Gráficos mensais de despesas, custos por km rodado e comparações detalhadas do histórico de gastos.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 text-slate-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} AutoCare Manager. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
