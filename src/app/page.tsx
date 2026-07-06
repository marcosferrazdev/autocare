'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { RodaNexoIcon } from '@/components/logo';
import {
  Wrench,
  Fuel,
  BarChart3,
  BellRing,
  ListTodo,
  ChevronRight,
  Loader2,
  Clock,
  Gauge,
  Coins,
  ArrowRight,
} from 'lucide-react';

function LandingLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
        <RodaNexoIcon size={24} />
      </div>
      <span className="text-lg font-bold tracking-tight select-none">
        <span className="text-white">Roda</span>
        <span className="text-blue-400">Nexo</span>
      </span>
    </div>
  );
}

/**
 * Prévia do painel desenhada em HTML puro — números fictícios,
 * mas com a mesma cara do dashboard real.
 */
function DashboardPreview() {
  const bars = [35, 55, 40, 70, 52, 85, 60];
  return (
    <div className="relative">
      {/* Brilho de fundo */}
      <div className="absolute -inset-6 bg-blue-600/20 blur-3xl rounded-full" aria-hidden />

      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Barra de janela */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[10px] text-slate-500 font-medium">rodanexo — Meu Gol 1.0</span>
        </div>

        <div className="p-4 space-y-3">
          {/* Alerta de manutenção */}
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-300">Troca de óleo vence em breve</p>
              <p className="text-[10px] text-amber-200/60">faltam 320 km • próxima em 49.000 km</p>
            </div>
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Coins className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Este mês</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">R$ 486,20</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Gauge className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Consumo</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">11,8 km/L</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <BarChart3 className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Custo/km</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">R$ 0,52</p>
            </div>
          </div>

          {/* Gráfico de barras fake */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Gastos por mês
            </p>
            <div className="flex items-end gap-2 h-16">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                  <div
                    className={`rounded-sm ${i === bars.length - 2 ? 'bg-blue-500' : 'bg-blue-500/30'}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[8px] text-slate-600 font-medium">
              <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
            </div>
          </div>

          {/* Último registro */}
          <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Fuel className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-300 font-medium">38,4 L de Gasolina • Posto Ipiranga</span>
            </div>
            <span className="text-[11px] font-bold text-white">R$ 230,40</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    number: '01',
    title: 'Cadastre o carro',
    text: 'Marca, modelo, ano e quilometragem atual. Leva menos de um minuto e você pode ter quantos carros quiser.',
  },
  {
    number: '02',
    title: 'Registre no dia a dia',
    text: 'Abasteceu? Trocou uma peça? Anota ali na hora, do celular mesmo. Valor, litros, oficina, o que importar.',
  },
  {
    number: '03',
    title: 'Deixe o resto com a gente',
    text: 'Consumo real, custo por km, gráficos por mês e aviso quando a próxima revisão estiver chegando.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <LandingLogo />

          <nav className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-1"
              >
                Abrir painel <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-400 hover:text-white font-medium text-sm transition-all px-3 py-2"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
                Tire o histórico do seu carro do
                <span className="text-blue-400"> porta-luvas</span>.
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
                Notinha de oficina some, planilha ninguém atualiza. No RodaNexo você registra
                abastecimentos e manutenções em segundos — e ele devolve consumo real,
                custo por km e um aviso antes da próxima troca de óleo vencer.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                  >
                    Ir para o meu painel <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                    >
                      Começar agora, é grátis <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/login"
                      className="border border-white/10 hover:border-white/25 hover:bg-white/5 text-slate-300 font-semibold px-7 py-3.5 rounded-xl transition-all text-center"
                    >
                      Já tenho conta
                    </Link>
                  </>
                )}
              </div>

              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-400" />
                  Sem cartão de crédito, sem pegadinha
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-400" />
                  Quantos veículos você quiser, na mesma conta
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-400" />
                  Funciona no celular, sem instalar nada
                </li>
              </ul>
            </div>

            <DashboardPreview />
          </div>
        </section>

        {/* Como funciona */}
        <section className="bg-slate-50 text-slate-900 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                Três passos. Sem manual de instruções.
              </h2>
              <p className="text-slate-500">
                A parte difícil — as contas, os avisos, os gráficos — quem faz é o sistema.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {steps.map((step, i) => (
                <div key={step.number} className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl font-extrabold text-blue-600/15 select-none">{step.number}</span>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block flex-1 border-t border-dashed border-slate-300" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features em grid assimétrico */}
        <section className="bg-white text-slate-900 py-20 border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                Feito para quem cuida do próprio carro
              </h2>
              <p className="text-slate-500">
                Cada registro que você faz vira informação útil — não uma linha perdida numa planilha.
              </p>
            </div>

            <div className="grid md:grid-cols-6 gap-5">
              {/* Card grande: lembretes */}
              <div className="md:col-span-3 bg-slate-950 text-white rounded-2xl p-7 flex flex-col justify-between min-h-[240px]">
                <div>
                  <BellRing className="h-6 w-6 text-amber-400 mb-4" />
                  <h3 className="font-bold text-xl mb-2">Ele lembra, você não precisa</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                    Configure a cada quantos km ou meses cada serviço vence — óleo, correia,
                    pneus, revisão. O painel avisa quando estiver chegando a hora, cruzando
                    com a quilometragem real do carro.
                  </p>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs font-semibold text-amber-300 self-start">
                  <Clock className="h-3.5 w-3.5" /> Troca de óleo: faltam 320 km
                </div>
              </div>

              {/* Card grande: consumo */}
              <div className="md:col-span-3 bg-blue-600 text-white rounded-2xl p-7 flex flex-col justify-between min-h-[240px]">
                <div>
                  <Fuel className="h-6 w-6 text-blue-200 mb-4" />
                  <h3 className="font-bold text-xl mb-2">Consumo de verdade, não o do manual</h3>
                  <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm">
                    A cada abastecimento com tanque cheio, o km/L real é calculado sozinho.
                    Dá para ver se o carro está bebendo mais que o normal — antes de virar
                    problema caro.
                  </p>
                </div>
                <p className="mt-5 text-3xl font-extrabold tracking-tight">
                  11,8 <span className="text-base font-bold text-blue-200">km/L</span>
                </p>
              </div>

              {/* Cards menores */}
              <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-6">
                <Wrench className="h-5 w-5 text-blue-600 mb-3" />
                <h3 className="font-bold mb-1.5">Manutenções com peças</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Registre serviço, oficina, mão de obra e cada peça trocada. Total calculado
                  na hora, com desconto e parcelamento.
                </p>
              </div>

              <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-6">
                <BarChart3 className="h-5 w-5 text-blue-600 mb-3" />
                <h3 className="font-bold mb-1.5">Gastos mês a mês</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Combustível e manutenção separados por mês, custo por km rodado e gastos
                  por tipo de serviço.
                </p>
              </div>

              <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-6">
                <ListTodo className="h-5 w-5 text-blue-600 mb-3" />
                <h3 className="font-bold mb-1.5">Lista de melhorias</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Aquela roda, o som novo, a pintura: organize os planos do carro com
                  prioridade, valor estimado e link de compra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-slate-950 py-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Seu carro tem história.
              <br />
              <span className="text-blue-400">Comece a registrá-la hoje.</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Crie a conta, cadastre o carro e faça o primeiro registro ainda hoje.
            </p>
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40"
              >
                Abrir meu painel <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40"
              >
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <LandingLogo />
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} RodaNexo — controle de manutenção veicular.
          </p>
        </div>
      </footer>
    </div>
  );
}
