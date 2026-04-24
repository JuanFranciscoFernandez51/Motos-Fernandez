import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Términos y condiciones | Motos Fernandez" }

export default function Page() {
  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 min-h-screen">
      <div className="bg-[#1A1A1A] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Términos y condiciones
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <div
            className="prose prose-sm max-w-none text-[#4E4B48] dark:text-gray-200"
            dangerouslySetInnerHTML={{
              __html: `
<h2>Términos y Condiciones</h2>
<p>Última actualización: enero 2025</p>
<h3>Uso del sitio</h3>
<p>Al usar este sitio aceptás estos términos. El contenido es solo para uso personal e informativo.</p>
<h3>Productos y precios</h3>
<p>Los precios pueden cambiar sin previo aviso. Las imágenes son ilustrativas. Nos reservamos el derecho de modificar o descontinuar productos.</p>
<h3>Proceso de compra</h3>
<p>Al realizar una compra confirmás que los datos ingresados son correctos. La venta queda confirmada una vez aprobado el pago.</p>
<h3>Cambios y devoluciones</h3>
<p>Aceptamos cambios y devoluciones dentro de los 30 días de recibido el producto, siempre que esté en las mismas condiciones en que fue entregado y con su packaging original. Para iniciar el proceso, contactanos por WhatsApp.</p>
<h3>Garantía</h3>
<p>Los productos tienen la garantía del fabricante según corresponda.</p>
<h3>Limitación de responsabilidad</h3>
<p>No somos responsables por daños indirectos derivados del uso de nuestros productos o servicios.</p>
<h3>Contacto</h3>
<p>Para consultas sobre estos términos: info@motosfernandez.com.ar | 291 578-8671.</p>
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
