import type { Metadata } from "next"
import { BeneficioServiceClient } from "./beneficio-client"
import { BUSINESS } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Tu 10% en el service | Motos Fernández",
  description:
    "Gracias por comprar en Motos Fernández. Obtené tu 10% de descuento en el próximo service de tu moto.",
  robots: { index: false, follow: false },
}

export default function BeneficioServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] py-14 px-4">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8C8D0]">
            Gracias por elegirnos
          </p>
          <h1 className="mt-3 font-heading text-4xl sm:text-5xl text-white leading-tight text-balance">
            10% en tu <span className="text-[#C8C8D0]">próximo service</span>
          </h1>
          <p className="mt-4 text-gray-300 text-[15px] leading-relaxed">
            Comprar en {BUSINESS.name} no termina con la entrega. Dejanos tus datos
            y te damos un <strong className="text-white">10% de descuento</strong> para
            el próximo service de tu moto en nuestro taller.
          </p>
        </div>

        <BeneficioServiceClient />

        <p className="mt-6 text-center text-xs text-gray-400">
          {BUSINESS.name} · {BUSINESS.address}
        </p>
      </div>
    </div>
  )
}
