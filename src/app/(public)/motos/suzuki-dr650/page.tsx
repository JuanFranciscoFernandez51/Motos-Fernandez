import type { Metadata } from "next"
import { Suspense } from "react"
import { LandingMotoAd, type LandingMotoAdData } from "@/components/public/landing-moto-ad"

/**
 * Landing dedicada para la campaña de Meta Ads de la Suzuki DR650.
 * Tono sobrio y premium (audiencia viajera / aventurera).
 *
 * Precios, cuotas y ficha técnica viven acá como constantes —
 * Francisco actualiza acá cuando cambien y se redeploya.
 */

const data: LandingMotoAdData = {
  slug: "dr650",
  marca: "Suzuki",
  modelo: "DR650",
  tituloHero: "Suzuki DR650 — la trail para viajar Argentina",
  subtituloHero:
    "La mono más confiable del segmento. Repuestos en todo el país, mecánica simple y bancada para cruzar el continente. La trail de los que viajan en serio.",
  imagen:
    "https://res.cloudinary.com/motosfernandez/image/upload/v1/productos/og-image.jpg",
  imagenAlt: "Suzuki DR650 disponible en Motos Fernandez Bahía Blanca",
  // PLACEHOLDERS — actualizar antes de pautar
  precio: null,
  cuota: null,
  beneficios: [
    "Financiación propia sin pasar por banco",
    "También con tarjeta de crédito",
    "Mono simple, repuestos en todo el país",
    "Service oficial Suzuki",
    "Stock disponible en Bahía Blanca",
    "Plan canje / permuta",
  ],
  fichaTecnica: [
    { label: "Cilindrada", valor: "644 cc" },
    { label: "Motor", valor: "Monocilíndrico 4T, refrigerado por aire/aceite" },
    { label: "Potencia", valor: "46 HP" },
    { label: "Transmisión", valor: "5 velocidades" },
    { label: "Arranque", valor: "Eléctrico" },
    { label: "Tanque", valor: "13 litros" },
    { label: "Peso seco", valor: "166 kg" },
    { label: "Altura asiento", valor: "885 mm (regulable)" },
  ],
  tonoColor: "suzuki-dr650",
  mensajeWhatsApp:
    "Hola! Vi el anuncio de la Suzuki DR650 y quiero saber precio, disponibilidad y opciones de pago. Mi nombre es: ",
  mensajeWhatsAppPermuta:
    "Hola! Tengo una moto para permutar por la Suzuki DR650. Mi nombre es: ",
}

export const metadata: Metadata = {
  title: "Suzuki DR650 — la trail para viajar Argentina | Motos Fernandez",
  description:
    "Suzuki DR650 disponible en Bahía Blanca. Financiación propia, permuta y service oficial. Consultá precio y cuotas.",
  alternates: { canonical: "/motos/suzuki-dr650" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Suzuki DR650 — Motos Fernandez",
    description:
      "Disponible en Bahía Blanca. Financiación propia + permuta. Consultá por WhatsApp.",
    images: [data.imagen],
  },
}

export default function SuzukiDR650Page() {
  return (
    <Suspense fallback={null}>
      <LandingMotoAd data={data} />
    </Suspense>
  )
}
