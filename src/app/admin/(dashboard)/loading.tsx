// Skeleton global del admin. Next.js lo muestra al INSTANTE cuando navegás a
// cualquier página del panel, mientras el servidor trae los datos. Reemplaza
// el "congelamiento" de 4-5s por feedback inmediato. Un solo archivo cubre
// todas las páginas del grupo (dashboard).
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Cargando…">
      {/* Título */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-gray-200 dark:bg-neutral-800" />
        <div className="h-4 w-80 rounded bg-gray-100 dark:bg-neutral-900" />
      </div>

      {/* Fila de tarjetas / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-neutral-800" />
            <div className="h-6 w-32 rounded bg-gray-200 dark:bg-neutral-700" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-neutral-900" />
          </div>
        ))}
      </div>

      {/* Bloque tipo tabla/lista */}
      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="h-11 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/40" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-neutral-900/60">
            <div className="size-9 rounded-md bg-gray-200 dark:bg-neutral-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-gray-200 dark:bg-neutral-800" />
              <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-neutral-900" />
            </div>
            <div className="h-5 w-20 rounded bg-gray-100 dark:bg-neutral-800 hidden sm:block" />
            <div className="h-5 w-16 rounded bg-gray-100 dark:bg-neutral-800 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
