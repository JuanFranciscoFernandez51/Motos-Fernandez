import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Política de privacidad | Motos Fernandez" }

export default function Page() {
  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      <div className="bg-[#1A1A1A] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Política de privacidad
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <div
            className="prose prose-sm max-w-none text-[#4E4B48]"
            dangerouslySetInnerHTML={{
              __html: `
<h2>Política de Privacidad</h2>
<p>Última actualización: enero 2025</p>
<h3>Información que recopilamos</h3>
<p>Recopilamos información que nos proporcionás directamente: nombre, email, teléfono y DNI al realizar una compra o solicitar un turno. También recopilamos información de uso del sitio de forma anónima.</p>
<h3>Uso de la información</h3>
<p>Usamos tu información para procesar pedidos, confirmar turnos, enviarte información sobre tu compra, y mejorar nuestros servicios. No compartimos tu información con terceros salvo para procesar pagos (MercadoPago) o envíos.</p>
<h3>Seguridad</h3>
<p>Los pagos son procesados de forma segura por MercadoPago. No almacenamos datos de tarjetas de crédito.</p>
<h3>Tus derechos</h3>
<p>Podés solicitar acceso, corrección o eliminación de tus datos personales contactándonos a info@motosfernandez.com.ar.</p>
<h3>Cookies</h3>
<p>Usamos cookies de análisis (Google Analytics) y publicidad (Meta Pixel) para entender cómo usás el sitio. Podés desactivarlas desde la configuración de tu navegador.</p>
<h3>Contacto</h3>
<p>Ante cualquier consulta sobre privacidad, escribinos a info@motosfernandez.com.ar.</p>
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
