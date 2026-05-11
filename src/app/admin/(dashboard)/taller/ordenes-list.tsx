"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DeleteWithConfirmButton } from "@/components/admin/delete-with-confirm-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, X, Pencil, Download, Wrench, MessageCircle, Loader2 } from "lucide-react"
import {
  formatDate,
  formatMoney,
  formatNumero,
  ESTADO_OT_STYLES,
  ESTADO_OT_LABELS,
} from "@/lib/admin-helpers"

/**
 * Normaliza teléfono argentino al formato wa.me (E.164 sin +).
 */
function normalizarParaWhatsApp(tel: string): string {
  let n = tel.replace(/[^\d]/g, "")
  if (n.startsWith("0")) n = n.slice(1)
  let isMobile = false
  if (n.startsWith("15")) {
    n = n.slice(2)
    isMobile = true
  }
  if (!n.startsWith("54")) n = "54" + n
  if (isMobile && n.startsWith("54") && !n.startsWith("549")) {
    n = "549" + n.slice(2)
  }
  return n
}

type Row = {
  id: string
  numero: number
  estado: string
  motoMarca: string
  motoModelo: string
  motoPatente: string | null
  total: number
  saldo: number
  fechaIngreso: Date
  fechaPrometida: Date | null
  clienteNombre: string
  clienteTelefono: string | null
  tipoServicio: string | null
}

const FILTROS: { id: string; label: string; estado: string | null; color: string }[] = [
  { id: "todas", label: "Todas", estado: null, color: "[#6B4F7A]" },
  { id: "activas", label: "En curso", estado: "ACTIVAS", color: "orange-500" },
  { id: "listas", label: "Listas", estado: "LISTA", color: "emerald-500" },
  { id: "entregadas", label: "Entregadas", estado: "ENTREGADA", color: "gray-400" },
]

export function OrdenesList({
  ordenes,
  updateEstado,
}: {
  ordenes: Row[]
  updateEstado: (id: string, nuevoEstado: string) => Promise<{ error?: string } | void>
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filterId, setFilterId] = useState("todas")
  const [isPending, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleEstadoChange = (id: string, nuevoEstado: string) => {
    setUpdatingId(id)
    startTransition(async () => {
      await updateEstado(id, nuevoEstado)
      setUpdatingId(null)
      router.refresh()
    })
  }

  const counts = useMemo(() => {
    const enCurso = ordenes.filter((o) =>
      ["INGRESADA", "EN_DIAGNOSTICO", "PRESUPUESTADA", "APROBADA", "EN_REPARACION"].includes(o.estado)
    ).length
    return {
      total: ordenes.length,
      activas: enCurso,
      listas: ordenes.filter((o) => o.estado === "LISTA").length,
      entregadas: ordenes.filter((o) => o.estado === "ENTREGADA").length,
    }
  }, [ordenes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ordenes.filter((o) => {
      if (filterId === "activas" && !["INGRESADA", "EN_DIAGNOSTICO", "PRESUPUESTADA", "APROBADA", "EN_REPARACION"].includes(o.estado))
        return false
      if (filterId === "listas" && o.estado !== "LISTA") return false
      if (filterId === "entregadas" && o.estado !== "ENTREGADA") return false
      if (!q) return true
      const hay = [
        formatNumero("OT", o.numero),
        o.motoMarca,
        o.motoModelo,
        o.motoPatente,
        o.clienteNombre,
        o.tipoServicio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [ordenes, query, filterId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterId("todas")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filterId === "todas" ? "border-[#6B4F7A] bg-[#6B4F7A]/5" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</p>
        </button>
        <button
          onClick={() => setFilterId("activas")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filterId === "activas" ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">En curso</p>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{counts.activas}</p>
        </button>
        <button
          onClick={() => setFilterId("listas")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filterId === "listas" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Listas</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{counts.listas}</p>
        </button>
        <button
          onClick={() => setFilterId("entregadas")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filterId === "entregadas" ? "border-gray-400 bg-gray-100 dark:bg-neutral-800" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Entregadas</p>
          <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{counts.entregadas}</p>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, moto, cliente, patente..."
          className="pl-9"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nº</TableHead>
              <TableHead>Moto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {ordenes.length === 0 ? (
                    <div className="space-y-2">
                      <Wrench className="size-10 mx-auto text-gray-300" />
                      <p>Todavía no registraste ninguna orden de trabajo.</p>
                    </div>
                  ) : (
                    "Sin resultados"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-semibold text-[#6B4F7A]">
                    {formatNumero("OT", o.numero)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {o.motoMarca} {o.motoModelo}
                    </p>
                    {o.motoPatente && (
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{o.motoPatente}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{o.clienteNombre}</p>
                    {o.clienteTelefono && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{o.clienteTelefono}</span>
                        <a
                          href={`https://wa.me/${normalizarParaWhatsApp(o.clienteTelefono)}?text=${encodeURIComponent(`Hola, te escribo de Motos Fernández por la OT ${formatNumero("OT", o.numero)} de tu ${o.motoMarca} ${o.motoModelo}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                          title={`Abrir WhatsApp con ${o.clienteTelefono}`}
                          aria-label="Abrir WhatsApp"
                        >
                          <MessageCircle className="size-3" />
                        </a>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{o.tipoServicio || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {formatMoney(o.total)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {o.saldo > 0 ? (
                      <span className="text-orange-600 dark:text-orange-300 font-medium">{formatMoney(o.saldo)}</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-300">Pagado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <select
                        value={o.estado}
                        onChange={(e) => handleEstadoChange(o.id, e.target.value)}
                        disabled={isPending && updatingId === o.id}
                        className={`text-xs font-semibold rounded-md px-2 py-1 pr-7 border-0 cursor-pointer appearance-none ${ESTADO_OT_STYLES[o.estado]} disabled:opacity-50`}
                      >
                        {Object.entries(ESTADO_OT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      {isPending && updatingId === o.id ? (
                        <Loader2 className="size-3 absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
                      ) : (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none opacity-60">▼</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.fechaIngreso)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" render={<Link href={`/admin/taller/${o.id}`} />}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <a
                        href={`/api/pdf/orden-trabajo/${o.id}`}
                        className="inline-flex items-center justify-center rounded-md h-9 px-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800"
                        title="Descargar PDF de la OT"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <DeleteWithConfirmButton
                        deleteUrl={`/api/admin/taller/${o.id}`}
                        label={`${formatNumero("OT", o.numero)} — ${o.motoMarca} ${o.motoModelo}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
