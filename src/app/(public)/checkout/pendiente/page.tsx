import Link from "next/link"
import { Clock, MessageCircle, ShoppingBag } from "lucide-react"
import { BUSINESS, getWhatsAppUrl, HORARIOS } from "@/lib/constants"

export const metadata = {
  title: "Pago pendiente | Motos Fernandez",
}

export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; external_reference?: string }>
}) {
  const { payment_id, external_reference } = await searchParams

  return (
    <div className="bg-[#F0F0F0] min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center size-20 rounded-full bg-yellow-100">
              <Clock className="size-10 text-yellow-600" />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-[#1A1A1A] mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pago pendiente
          </h1>

          <p className="text-gray-600 mb-2">
            Tu pago está siendo procesado.
          </p>
          <p className="text-gray-600 mb-6">
            Recibirás una confirmación por email cuando se acredite. Este proceso puede
            demorar hasta 2 días hábiles según el método de pago elegido.
          </p>

          {(payment_id || external_reference) && (
            <div className="rounded-lg bg-gray-50 px-4 py-3 mb-6 text-sm text-gray-500 text-left space-y-1">
              {payment_id && (
                <p>
                  <span className="font-medium text-gray-700">N° de pago:</span> {payment_id}
                </p>
              )}
              {external_reference && (
                <p>
                  <span className="font-medium text-gray-700">N° de pedido:</span> {external_reference.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
          )}

          {/* Contact info */}
          <div className="rounded-lg bg-[#6B4F7A]/5 border border-[#6B4F7A]/20 px-4 py-4 mb-6 text-left text-sm">
            <p className="font-semibold text-[#6B4F7A] mb-2">¿Necesitás ayuda?</p>
            <p className="text-gray-600">
              <span className="font-medium">WhatsApp:</span> {BUSINESS.whatsappDisplay}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Email:</span> {BUSINESS.email}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Lunes a Viernes: {HORARIOS.lunesViernes}
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={getWhatsAppUrl(
                `Hola! Tengo un pago pendiente en la web. N° de pago: ${payment_id || "N/D"}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="size-4" />
              Consultar por WhatsApp
            </a>

            <Link
              href="/tienda"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
            >
              <ShoppingBag className="size-4" />
              Volver a la tienda
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            {BUSINESS.name} &bull; {BUSINESS.address}
          </p>
        </div>
      </div>
    </div>
  )
}
