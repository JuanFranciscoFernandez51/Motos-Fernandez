"use client"

import { useState } from "react"
import { Copy, Check, Landmark } from "lucide-react"

type Cuenta = {
  banco?: string
  tipo?: string
  numero?: string
  cbu?: string
  alias?: string
  titular?: string
  moneda?: string
}

/**
 * Pequeño chip + botón para copiar todos los datos de una cuenta
 * bancaria al portapapeles, formateados para enviar por WhatsApp/email.
 */
export function CopiarCuentaButton({
  cuenta,
  proveedorNombre,
  proveedorCuit,
}: {
  cuenta: Cuenta
  proveedorNombre?: string
  proveedorCuit?: string | null
}) {
  const [copiado, setCopiado] = useState(false)

  const tipoLabel =
    cuenta.tipo === "CC"
      ? "Cuenta corriente"
      : cuenta.tipo === "VIRTUAL"
        ? "Cuenta virtual"
        : "Caja de ahorro"

  const monedaLabel = cuenta.moneda === "USD" ? "Dólares (USD)" : "Pesos (ARS)"

  const copiar = async () => {
    const lineas: string[] = []
    if (proveedorNombre) lineas.push(`📋 *Datos para transferencia*`)
    lineas.push("")
    if (cuenta.titular || proveedorNombre) {
      lineas.push(`*Titular:* ${cuenta.titular || proveedorNombre}`)
    }
    if (proveedorCuit) lineas.push(`*CUIT:* ${proveedorCuit}`)
    if (cuenta.banco) lineas.push(`*Banco:* ${cuenta.banco}`)
    lineas.push(`*Tipo:* ${tipoLabel}`)
    lineas.push(`*Moneda:* ${monedaLabel}`)
    if (cuenta.numero) lineas.push(`*Nº cuenta:* ${cuenta.numero}`)
    if (cuenta.cbu) lineas.push(`*CBU:* ${cuenta.cbu}`)
    if (cuenta.alias) lineas.push(`*Alias:* ${cuenta.alias}`)

    const texto = lineas.join("\n")
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar todos los datos para transferencia"
      className="group inline-flex items-center gap-1.5 rounded-md border border-[#6B4F7A]/30 bg-[#6B4F7A]/5 hover:bg-[#6B4F7A]/15 px-2 py-1 text-[11px] font-semibold text-[#6B4F7A] dark:text-[#C39BD3] transition-colors max-w-full"
    >
      <Landmark className="size-3 shrink-0" />
      <span className="truncate">
        {cuenta.banco || cuenta.alias || "Cuenta"}
      </span>
      {copiado ? (
        <Check className="size-3 shrink-0 text-green-600" />
      ) : (
        <Copy className="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
      )}
    </button>
  )
}
