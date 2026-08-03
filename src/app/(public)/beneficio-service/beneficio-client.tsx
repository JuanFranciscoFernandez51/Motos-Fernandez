"use client"

import { useState } from "react"
import { Loader2, Wrench, Check, Copy } from "lucide-react"

export function BeneficioServiceClient() {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<
    { codigo: string; yaLoTenia: boolean } | null
  >(null)
  const [copiado, setCopiado] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/beneficio-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || "No pudimos generar tu código.")
      } else {
        setResultado({ codigo: d.codigo, yaLoTenia: !!d.yaLoTenia })
      }
    } catch {
      setError("Error de conexión. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const copiar = () => {
    if (!resultado) return
    navigator.clipboard?.writeText(resultado.codigo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const inputCls =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"

  if (resultado) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <Check className="h-7 w-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {resultado.yaLoTenia ? "¡Ya tenías tu beneficio!" : "¡Listo! 🎉"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Este es tu código de <strong>10% de descuento</strong> en tu próximo service.
        </p>

        <div className="my-6 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-50 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600">
            Tu código
          </p>
          <p className="my-1 font-mono text-3xl font-bold tracking-widest text-[#3D2649]">
            {resultado.codigo}
          </p>
          <p className="text-xs font-semibold text-violet-600">10% OFF · Válido por 6 meses</p>
        </div>

        <button
          onClick={copiar}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? "¡Copiado!" : "Copiar código"}
        </button>

        <p className="mt-5 text-xs text-gray-500">
          Te lo mandamos también por mail. Mostralo cuando traigas la moto al taller.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm space-y-3">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre"
        className={inputCls}
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email"
        className={inputCls}
        required
      />
      <input
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="Tu teléfono (opcional)"
        className={inputCls}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3D2649] to-[#7C3AED] py-3.5 font-semibold text-white hover:shadow-lg disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wrench className="h-5 w-5" />}
        {loading ? "Generando…" : "Quiero mi 10% de descuento"}
      </button>
      <p className="text-center text-[11px] text-gray-400">
        Te llega el código al instante y también por mail.
      </p>
    </form>
  )
}
