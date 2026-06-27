"use client"

import { useState } from "react"
import { Loader2, Tag, X, CheckCircle2 } from "lucide-react"
import { useCart } from "@/lib/cart-context"

/**
 * Input de cupón reutilizable. Funciona tanto en /carrito como en /checkout.
 * Lee/escribe el cupón en el CartContext (persiste en localStorage).
 */
export function CuponInput({
  contexto = "TIENDA",
}: {
  contexto?: "TIENDA" | "SERVICIOS"
}) {
  const { cupon, aplicarCupon, quitarCupon, totalPrice, descuento } = useCart()
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)

  const handleAplicar = async () => {
    if (!codigo.trim()) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/public/cupones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigo.trim().toUpperCase(),
          contexto,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setError(data?.error || "Cupón inválido")
        setLoading(false)
        return
      }
      // Validar monto mínimo
      if (data.montoMinimo && totalPrice < data.montoMinimo) {
        setError(
          `Este cupón requiere una compra mínima de $${data.montoMinimo.toLocaleString("es-AR")}`
        )
        setLoading(false)
        return
      }
      aplicarCupon({
        codigo: data.codigo,
        porcentaje: data.porcentaje,
        montoMaximo: data.montoMaximo,
        montoMinimo: data.montoMinimo,
        descripcion: data.descripcion,
        aplicaA: data.aplicaA || [contexto],
      })
      setCodigo("")
      setOpen(false)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  // Si ya hay un cupón aplicado, mostramos solo el chip de cupón aplicado
  if (cupon) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
          <CheckCircle2 className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300">
            Cupón aplicado
          </p>
          <p className="font-mono font-bold text-sm text-[#1A1A1A] dark:text-white truncate">
            {cupon.codigo}
            <span className="ml-2 font-sans font-normal text-xs text-gray-500 dark:text-gray-400">
              -{cupon.porcentaje}%
              {descuento > 0 && (
                <> · ahorraste ${descuento.toLocaleString("es-AR")}</>
              )}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={quitarCupon}
          className="shrink-0 size-8 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-950/30 transition-colors"
          aria-label="Quitar cupón"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  // Si no hay cupón, mostramos el toggle / input
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-900/50 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-[#7C3AED] hover:text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors"
      >
        <Tag className="size-4" />
        ¿Tenés un cupón de descuento?
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código del cupón"
          disabled={loading}
          className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm font-mono uppercase text-[#1A1A1A] dark:text-white placeholder:text-gray-400 placeholder:font-sans focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAplicar()
            }
          }}
        />
        <button
          type="button"
          onClick={handleAplicar}
          disabled={loading || !codigo.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9D5CF0] transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError("")
            setCodigo("")
          }}
          disabled={loading}
          className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
          aria-label="Cancelar"
        >
          <X className="size-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
