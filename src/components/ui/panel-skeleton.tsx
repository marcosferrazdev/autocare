/**
 * Esqueleto dos painéis de aba (lembretes, seguro, financiamento).
 * Aparece enquanto o código do painel desce — eles são carregados sob demanda.
 */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 h-full flex flex-col"
      role="status"
      aria-label="Carregando painel"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-slate-100 animate-pulse" />
      </div>

      <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse mt-4" />

      <div className="space-y-3 mt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 p-4 border border-slate-200 rounded-md"
            style={{ opacity: 1 - i * 0.18 }}
          >
            <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-32 rounded bg-slate-200 animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded bg-slate-100 animate-pulse shrink-0" />
          </div>
        ))}
      </div>

      <span className="sr-only">Carregando...</span>
    </div>
  );
}
