import Link from "next/link"
import { XCircle, RefreshCw, MessageCircle } from "lucide-react"
import { BUSINESS, getWhatsAppUrl } from "@/lib/constants"

export const metadata = {
  title: "Pago fallido | Motos Fernandez",
}

export default async function CheckoutFalloPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string }>
}) {
  await searchParams

  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 p-8 shadow-sm text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center size-20 rounded-full bg-red-100">
              <XCircle className="size-10 text-red-500" />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            El pago no pudo procesarse
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Hubo un problema con tu pago. No se realizó ningún cobro.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Podés intentarlo de nuevo o contactarnos para ayudarte.
          </p>

          <div className="space-y-3">
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#6B4F7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              <RefreshCw className="size-4" />
              Reintentar pago
            </Link>

            <a
              href={getWhatsAppUrl(
                "Hola! Tuve un problema al pagar en la web. ¿Me pueden ayudar?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="size-4" />
              Contactar por WhatsApp
            </a>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            {BUSINESS.name} &bull; {BUSINESS.phone}
          </p>
        </div>
      </div>
    </div>
  )
}
