import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Envío propio a todo el país | Motos Fernandez",
  description: "Hacemos envío propio de accesorios, repuestos y motos a todo el país. Logística directa, sin intermediarios.",
}

export default function Page() {
  return (
    <div className="bg-[#F8F5FA] dark:bg-neutral-950 min-h-screen">
      {/* Hero premium */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] py-14 sm:py-16">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[400px] rounded-full bg-[#7C3AED]/15 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#C8C8D0] mb-3">
            Logística propia
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white leading-tight text-balance">
            Envío propio <span className="text-[#C8C8D0]">a todo el país</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-300 max-w-2xl">
            Sin intermediarios: nosotros nos encargamos de que tu pedido llegue
            en tiempo y forma a cualquier punto del país.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <div
            className="prose prose-sm max-w-none text-[#4E4B48] dark:text-gray-200"
            dangerouslySetInnerHTML={{
              __html: `
<h2>Envío propio a todo el país</h2>
<p>En Motos Fernandez tenemos <strong>logística propia</strong>: no dependemos de servicios de mensajería externos para la mayoría de los destinos. Nosotros mismos coordinamos el despacho, el seguimiento y la entrega de cada pedido — accesorios, repuestos y también motos.</p>
<h3>Envío estándar</h3>
<p>Los pedidos se procesan en 1 a 2 días hábiles una vez confirmado el pago. El tiempo estimado de entrega es de 3 a 7 días hábiles según la zona.</p>
<h3>Retiro en local</h3>
<p>Podés retirar tu pedido en nuestro local de Brown 1052, Bahía Blanca, de lunes a viernes de 8:30 a 19:30 y sábados de 9:00 a 13:00. El retiro no tiene costo adicional.</p>
<h3>Costo de envío</h3>
<p>El costo se calcula según el peso, volumen y destino del paquete. Se informa al confirmar el pedido. Consultá por nuestras <strong>promociones de envío bonificado</strong>.</p>
<h3>Seguimiento</h3>
<p>Una vez despachado tu pedido, te enviamos el número de seguimiento al email registrado y te avisamos por WhatsApp en cada paso.</p>
<h3>Consultas</h3>
<p>Para consultas sobre envíos, contactanos por WhatsApp al 291 578-8671 o por email a info@motosfernandez.com.ar.</p>
`,
            }}
          />
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:text-[#9B59B6]">
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
