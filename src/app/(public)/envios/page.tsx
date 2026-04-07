import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Envíos y entregas | Motos Fernandez" }

export default function Page() {
  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      <div className="bg-[#1A1A1A] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Envíos y entregas
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <div
            className="prose prose-sm max-w-none text-[#4E4B48]"
            dangerouslySetInnerHTML={{
              __html: `
<h2>Política de envíos</h2>
<p>En Motos Fernandez realizamos envíos de accesorios y repuestos a todo el país a través de servicios de mensajería.</p>
<h3>Envío estándar</h3>
<p>Los pedidos se procesan en 1 a 2 días hábiles una vez confirmado el pago. El tiempo estimado de entrega es de 3 a 7 días hábiles según la zona.</p>
<h3>Retiro en local</h3>
<p>Podés retirar tu pedido en nuestro local de Brown 1052, Bahia Blanca, de lunes a viernes de 8:30 a 19:30 y sábados de 9:00 a 13:00. El retiro no tiene costo adicional.</p>
<h3>Costo de envío</h3>
<p>El costo de envío se calcula según el peso, volumen y destino del paquete. Se informa al confirmar el pedido.</p>
<h3>Seguimiento</h3>
<p>Una vez despachado tu pedido, te enviamos el número de seguimiento al email registrado.</p>
<h3>Consultas</h3>
<p>Para consultas sobre envíos, contactanos por WhatsApp al 291 578-8671 o por email a info@motosfernandez.com.ar.</p>
`,
            }}
          />
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6B4F7A] hover:text-[#9B59B6]">
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
