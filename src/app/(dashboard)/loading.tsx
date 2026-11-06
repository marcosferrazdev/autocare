/**
 * Esqueleto mostrado na hora do clique, enquanto o servidor monta a página:
 * sem ele a tela antiga ficava parada até os dados chegarem.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <div className="h-9 w-56 animate-pulse rounded-md bg-white" />
          <div className="h-4 w-40 animate-pulse rounded-md bg-white/70" />
        </div>
        <div className="flex gap-5 lg:ml-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-white" />
              <div className="space-y-1.5">
                <div className="h-5 w-20 animate-pulse rounded bg-white" />
                <div className="h-3 w-14 animate-pulse rounded bg-white/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-[420px] animate-pulse rounded-xl bg-white lg:col-span-7" />
        <div className="h-[420px] animate-pulse rounded-xl bg-white lg:col-span-5" />
      </div>
    </div>
  );
}
