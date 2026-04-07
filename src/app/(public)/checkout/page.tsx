"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, Tag, X, ArrowLeft, CreditCard } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/constants"

interface CuponInfo {
  codigo: string
  porcentaje: number
  montoMaximo?: number | null
  montoMinimo?: number | null
  descripcion?: string | null
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    dni: "",
  })

  const [cuponInput, setCuponInput] = useState("")
  const [cupon, setCupon] = useState<CuponInfo | null>(null)
  const [cuponError, setCuponError] = useState("")
  const [cuponLoading, setCuponLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Calculate discount
  const calcDescuento = () => {
    if (!cupon) return 0
    let descuento = Math.floor((totalPrice * cupon.porcentaje) / 100)
    if (cupon.montoMaximo && descuento > cupon.montoMaximo) {
      descuento = cupon.montoMaximo
    }
    return descuento
  }

  const descuento = calcDescuento()
  const totalFinal = totalPrice - descuento

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAplicarCupon = async () => {
    if (!cuponInput.trim()) return
    setCuponLoading(true)
    setCuponError("")
    try {
      const res = await fetch("/api/public/cupones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cuponInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCuponError(data.error || "Cupón inválido")
        setCupon(null)
      } else {
        if (data.montoMinimo && totalPrice < data.montoMinimo) {
          setCuponError(
            `El pedido mínimo para este cupón es ${formatPrice(data.montoMinimo)}`
          )
          setCupon(null)
        } else {
          setCupon(data)
          setCuponError("")
        }
      }
    } catch {
      setCuponError("Error al verificar el cupón")
    } finally {
      setCuponLoading(false)
    }
  }

  const handleRemoveCupon = () => {
    setCupon(null)
    setCuponInput("")
    setCuponError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items,
          cuponCodigo: cupon?.codigo,
          descuento,
          total: totalFinal,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al procesar el pago")
        return
      }

      // Clear cart before redirecting
      clearCart()

      // Redirect to MercadoPago
      window.location.href = data.initPoint
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#F0F0F0] min-h-screen flex items-center justify-center">
        <div className="text-center py-20">
          <ShoppingBag className="size-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Agregá productos antes de ir al checkout.
          </p>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
          >
            Ir a la tienda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/carrito"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Volver al carrito
          </Link>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Checkout
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal data */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">
                  Datos personales
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="apellido"
                      value={form.apellido}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                      placeholder="García"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                      placeholder="juan@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                      placeholder="291 578-8671"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      DNI <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="dni"
                      value={form.dni}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                      placeholder="30.123.456"
                    />
                  </div>
                </div>
              </div>

              {/* Coupon */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">
                  Cupón de descuento
                </h2>
                {cupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        {cupon.codigo}
                      </span>
                      <span className="text-sm text-green-600">
                        — {cupon.porcentaje}% off
                        {cupon.montoMaximo
                          ? ` (máx. ${formatPrice(cupon.montoMaximo)})`
                          : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCupon}
                      className="rounded-md p-1 text-green-600 hover:bg-green-100 transition-colors"
                      aria-label="Quitar cupón"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cuponInput}
                        onChange={(e) => setCuponInput(e.target.value.toUpperCase())}
                        placeholder="CÓDIGO DE CUPÓN"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 uppercase focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 transition"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAplicarCupon())}
                      />
                      <button
                        type="button"
                        onClick={handleAplicarCupon}
                        disabled={cuponLoading || !cuponInput.trim()}
                        className="rounded-lg bg-[#6B4F7A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] disabled:opacity-50 transition-colors"
                      >
                        {cuponLoading ? "..." : "Aplicar"}
                      </button>
                    </div>
                    {cuponError && (
                      <p className="mt-2 text-sm text-red-500">{cuponError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">
                  Resumen del pedido
                </h2>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {items.map((item) => {
                    const key = `${item.id}-${item.talle ?? "sin-talle"}`
                    return (
                      <div key={key} className="flex gap-3 items-center">
                        <div className="relative size-12 shrink-0 rounded-md overflow-hidden bg-gray-100">
                          {item.foto ? (
                            <Image
                              src={item.foto}
                              alt={item.nombre}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">
                              <ShoppingBag className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1A1A1A] line-clamp-1">
                            {item.nombre}
                            {item.talle && ` (${item.talle})`}
                          </p>
                          <p className="text-xs text-gray-500">
                            x{item.cantidad}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#1A1A1A] shrink-0">
                          {formatPrice((item.precioOferta ?? item.precio) * item.cantidad)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  {descuento > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento ({cupon?.porcentaje}%)</span>
                      <span>-{formatPrice(descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-bold text-[#1A1A1A]">Total</span>
                    <span className="text-xl font-bold text-[#6B4F7A]">
                      {formatPrice(totalFinal)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 flex items-center justify-center gap-2 w-full rounded-lg bg-[#6B4F7A] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#8B6F9A] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-5" />
                      Pagar con MercadoPago
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Pago seguro procesado por MercadoPago
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
