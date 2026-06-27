"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HandCoins, MessageCircle, ExternalLink, Loader2 } from "lucide-react"

type Cuenta = { id: string; nombre: string; moneda: string }
type Credito = {
  id: string
  cliente: string
  telefono: string | null
  moneda: string
  saldo: number
  proxFecha: string | null
  proxMonto: number | null
  vencido: boolean
  cuotasPend: number
}

const fmt = (n: number, m: string) => `${m === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`
const fmtFecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—"

export function CreditosClientesCard({
  creditos,
  totalArs,
  vencidoArs,
  cuentas,
}: {
  creditos: Credito[]
  totalArs: number
  vencidoArs: number
  cuentas: Cuenta[]
}) {
  const router = useRouter()
  const [cobrandoId, setCobrandoId] = useState<string | null>(null)
  const [cuentaSel, setCuentaSel] = useState(cuentas[0]?.id || "")
  const [busy, setBusy] = useState(false)

  const cobrar = async (id: string, registrar: boolean) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/finanzas/creditos/${id}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrar ? { crearMovimiento: true, cuentaId: cuentaSel } : {}),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d.error || "Error al cobrar"); return }
      toast.success(registrar ? "Cuota cobrada y registrada en caja" : "Cuota cobrada")
      router.refresh()
    } finally {
      setBusy(false)
      setCobrandoId(null)
    }
  }

  const wa = (c: Credito): string | null => {
    if (!c.telefono) return null
    const tel = c.telefono.replace(/\D/g, "")
    if (!tel) return null
    const nombre = c.cliente.split(",")[1]?.trim() || c.cliente
    const monto = c.proxMonto ? ` de ${fmt(c.proxMonto, c.moneda)}` : ""
    const fecha = c.proxFecha ? ` con vencimiento el ${new Date(c.proxFecha).toLocaleDateString("es-AR")}` : ""
    const msg = `Hola ${nombre}! Te escribimos de Motos Fernández para recordarte tu próxima cuota${monto}${fecha}. Cualquier consulta quedamos a disposición. ¡Gracias!`
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <h3 className="font-medium flex items-center gap-2">
          <HandCoins className="size-4 text-[#7C3AED]" /> Créditos de clientes (cuotas)
        </h3>
        <div className="text-right text-sm">
          <span className="font-bold">{fmt(totalArs, "ARS")}</span>
          {vencidoArs > 0 && <span className="text-red-600 dark:text-red-300 ml-2">· {fmt(vencidoArs, "ARS")} vencido</span>}
        </div>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-neutral-900">
        {creditos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No hay créditos pendientes.</p>
        ) : (
          creditos.map((c) => (
            <div key={c.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.cliente}</p>
                  <p className="text-xs text-gray-500">
                    Saldo {fmt(c.saldo, c.moneda)} · {c.cuotasPend} cuota{c.cuotasPend === 1 ? "" : "s"} ·{" "}
                    próx {fmtFecha(c.proxFecha)}
                    {c.vencido && <span className="text-red-600 dark:text-red-300 font-semibold"> · vencida</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.proxMonto != null && (
                    <span className="text-sm font-bold">{fmt(c.proxMonto, c.moneda)}</span>
                  )}
                  <button onClick={() => setCobrandoId(cobrandoId === c.id ? null : c.id)} disabled={busy} className="rounded bg-green-600 text-white px-2 py-1 text-xs hover:bg-green-700 disabled:opacity-50">
                    Cobré
                  </button>
                  {wa(c) && (
                    <a href={wa(c)!} target="_blank" rel="noopener noreferrer" title="Avisar por WhatsApp" className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded">
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                  <Link href={`/admin/tesoreria/financiaciones/${c.id}`} title="Ver crédito" className="p-1 text-gray-400 hover:text-[#7C3AED]">
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </div>
              {cobrandoId === c.id && (
                <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded bg-green-50 dark:bg-green-950/30">
                  <span className="text-xs text-gray-600 dark:text-gray-300">¿Registrar el ingreso en qué cuenta?</span>
                  <select value={cuentaSel} onChange={(e) => setCuentaSel(e.target.value)} className="rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm">
                    {cuentas.map((cu) => <option key={cu.id} value={cu.id}>{cu.nombre}</option>)}
                  </select>
                  <button onClick={() => cobrar(c.id, true)} disabled={busy} className="rounded bg-green-600 text-white px-2 py-1 text-xs font-medium hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1">
                    {busy && <Loader2 className="size-3 animate-spin" />} Registrar en caja
                  </button>
                  <button onClick={() => cobrar(c.id, false)} disabled={busy} className="rounded border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs">Solo marcar</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
