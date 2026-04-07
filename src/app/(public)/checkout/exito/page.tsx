import Link from "next/link"
import { CheckCircle, ShoppingBag, MessageCircle } from "lucide-react"
import { BUSINESS, getWhatsAppUrl } from "@/lib/constants"
import { ClearCart } from "./clear-cart"
import { TrackPurchase } from "./track-purchase"

export const metadata = {
  title: "Pago exitoso | Motos Fernandez",
}

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; external_reference?: string }>
}) {
  const { payment_id, external_reference } = await searchParams

  return (
    <div className="bg-[#F0F0F0] min-h-screen flex items-center justify-center px-4">
      {/* Clear cart on mount */}
      <ClearCart />
      <TrackPurchase paymentId={payment_id} orderId={external_reference} />

      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center size-20 rounded-full bg-green-100">
              <CheckCircle className="size-10 text-green-600" />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-[#1A1A1A] mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ¡Pago exitoso!
          </h1>

          <p className="text-gray-600 mb-2">
            Tu pedido fue confirmado correctamente.
          </p>
          <p className="text-gray-600 mb-6">
            Te contactaremos pronto por WhatsApp o email con los detalles de tu compra.
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

          <div className="space-y-3">
            <a
              href={getWhatsAppUrl(
                `Hola! Acabo de realizar una compra en la web. N° de pago: ${payment_id || "N/D"}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="size-4" />
              Contactar por WhatsApp
            </a>

            <Link
              href="/tienda"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
            >
              <ShoppingBag className="size-4" />
              Seguir comprando
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            {BUSINESS.name} &bull; {BUSINESS.phone}
          </p>
        </div>
      </div>
    </div>
  )
}
