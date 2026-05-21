import type { Metadata } from "next"
import { Suspense } from "react"
import { LandingMotoAd, type LandingMotoAdData } from "@/components/public/landing-moto-ad"

/**
 * Landing dedicada para la campaña de Meta Ads de la Honda XR150.
 * Tono urbano/colorida (audiencia más joven, primer moto).
 *
 * Precios, cuotas y ficha técnica viven acá como constantes — son
 * placeholders editables: cuando cambien valores, se modifica este
 * archivo y se redeploya.
 */

const data: LandingMotoAdData = {
  slug: "xr150",
  marca: "Honda",
  modelo: "XR150",
  tituloHero: "Honda XR150 — disponible en Bahía Blanca",
  subtituloHero:
    "Una pick-up de las motos: liviana, fuerte, y la más vendida del rubro. La que te sirve para todo: ir al laburo, salir a la ruta de tierra o arrancar a viajar.",
  imagen:
    "https://res.cloudinary.com/motosfernandez/image/upload/v1/productos/og-image.jpg",
  imagenAlt: "Honda XR150 disponible en Motos Fernandez Bahía Blanca",
  // PLACEHOLDERS — Francisco actualiza con los valores reales antes de pautar
  precio: null,
  cuota: null,
  beneficios: [
    "Financiación propia sin pasar por banco",
    "También con tarjeta de crédito",
    "Patentamiento incluido",
    "Casco de regalo",
    "Service oficial Honda",
    "Atención personalizada en local",
  ],
  fichaTecnica: [
    { label: "Cilindrada", valor: "149 cc" },
    { label: "Motor", valor: "Monocilíndrico 4T, refrigerado por aire" },
    { label: "Potencia", valor: "12,5 HP" },
    { label: "Transmisión", valor: "5 velocidades" },
    { label: "Arranque", valor: "Eléctrico + patada" },
    { label: "Tanque", valor: "12 litros" },
    { label: "Peso seco", valor: "129 kg" },
    { label: "Altura asiento", valor: "825 mm" },
  ],
  tonoColor: "honda-xr150",
  mensajeWhatsApp:
    "Hola! Vi el anuncio de la Honda XR150 y quiero saber precio actualizado y cuotas. Mi nombre es: ",
  mensajeWhatsAppPermuta:
    "Hola! Tengo una moto para permutar por la Honda XR150. Mi nombre es: ",
}

export const metadata: Metadata = {
  title: `${data.marca} ${data.modelo} en ${data.marca === "Honda" ? "stock" : "Bahía Blanca"} | Motos Fernandez`,
  description:
    "Honda XR150 disponible en Bahía Blanca. Financiación propia, permuta y patentamiento incluido. Consultá precio y cuotas.",
  alternates: { canonical: "/motos/honda-xr150" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Honda XR150 — Motos Fernandez",
    description:
      "Disponible en Bahía Blanca. Financiación propia + permuta. Consultá por WhatsApp.",
    images: [data.imagen],
  },
}

export default function HondaXR150Page() {
  return (
    <Suspense fallback={null}>
      <LandingMotoAd data={data} />
    </Suspense>
  )
}
