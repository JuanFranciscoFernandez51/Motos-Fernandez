import Link from "next/link"
import { ArrowLeft, Trash2, Mail, Shield, FileText, Clock } from "lucide-react"
import { BUSINESS } from "@/lib/constants"

export const metadata = {
  title: "Eliminación de datos | Motos Fernandez",
  description:
    "Cómo solicitar la eliminación de tus datos personales del sitio web y los sistemas de Motos Fernandez.",
}

/**
 * Página requerida por Meta (Facebook for Developers) para apps en Live
 * Mode. Indica al usuario cómo pedir la eliminación de sus datos.
 *
 * También sirve como cumplimiento de la Ley 25.326 de Argentina
 * (derecho de supresión).
 */
export default function EliminacionDeDatosPage() {
  const sections: Array<{ icon: React.ElementType; title: string; body: React.ReactNode }> = [
    {
      icon: FileText,
      title: "Qué datos guardamos",
      body: (
        <>
          <p>
            Cuando interactuás con nuestro sitio o nuestra cuenta de Instagram /
            Facebook a través de las funcionalidades de mensajería o publicidad
            de Meta, podemos guardar:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Tu nombre y datos de contacto (teléfono, email) si nos los enviaste.</li>
            <li>Mensajes que iniciaste con nosotros (consultas por modelos).</li>
            <li>Datos de la moto que te interesa o nos consultaste (modelo, marca).</li>
            <li>
              Eventos de visita a la web (modelos que viste, búsquedas) que usamos
              para mostrarte avisos relevantes.
            </li>
          </ul>
          <p className="mt-2">
            <strong>No guardamos</strong> tu contraseña de Facebook/Instagram ni
            datos de pago.
          </p>
        </>
      ),
    },
    {
      icon: Trash2,
      title: "Cómo pedir la eliminación de tus datos",
      body: (
        <>
          <p>
            Tenés derecho a pedir que borremos toda la información personal que
            tenemos sobre vos. Para hacerlo, escribinos a:
          </p>
          <div className="mt-3 rounded-lg bg-[#7C3AED]/5 border border-[#7C3AED]/20 p-4">
            <p className="text-sm">
              <Mail className="inline size-4 mr-1.5 text-[#7C3AED]" />
              <a
                href={`mailto:${BUSINESS.email}?subject=Eliminaci%C3%B3n%20de%20datos%20personales`}
                className="text-[#7C3AED] font-semibold underline"
              >
                {BUSINESS.email}
              </a>
            </p>
            <p className="text-sm mt-2">
              Asunto sugerido: &quot;Eliminación de datos personales&quot;
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Indicá en el mail tu nombre completo, email o teléfono con el que
              te registraste o nos escribiste, y el motivo de la solicitud.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: Clock,
      title: "Plazo de respuesta",
      body: (
        <p>
          Recibida la solicitud, eliminamos tus datos personales de nuestros
          sistemas (sitio web, CRM, base de leads) en un plazo de hasta{" "}
          <strong>30 días</strong>. Te confirmamos por mail cuando esté hecho.
          Conservamos solo los datos que estamos obligados legalmente a guardar
          (ej: información fiscal de operaciones de compraventa, durante el
          plazo que exige AFIP).
        </p>
      ),
    },
    {
      icon: Shield,
      title: "Datos en Meta (Facebook / Instagram)",
      body: (
        <>
          <p>
            Si querés que Meta deje de mostrarte avisos nuestros, o eliminar
            datos que Meta tenga sobre vos (no nosotros), podés hacerlo
            directamente en sus configuraciones:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>
              <a
                href="https://www.facebook.com/ads/preferences"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7C3AED] underline"
              >
                Preferencias de anuncios de Facebook
              </a>
            </li>
            <li>
              <a
                href="https://accountscenter.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7C3AED] underline"
              >
                Centro de cuentas de Instagram
              </a>
            </li>
          </ul>
        </>
      ),
    },
  ]

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#7C3AED] hover:underline mb-6"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <div className="size-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
            <Trash2 className="size-6 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
              Eliminación de datos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tu derecho a pedir que borremos tu información personal.
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          En <strong>{BUSINESS.name}</strong> respetamos tu privacidad y la Ley
          25.326 de Protección de Datos Personales de Argentina. Esta página
          explica qué información tuya podemos tener guardada y cómo pedir que
          la borremos.
        </p>

        <div className="mt-8 space-y-6">
          {sections.map(({ icon: Icon, title, body }) => (
            <section
              key={title}
              className="rounded-xl border border-gray-200 dark:border-neutral-800 p-5"
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                <Icon className="size-5 text-[#7C3AED]" />
                {title}
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {body}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-10 text-center">
          Última actualización: {new Date().toLocaleDateString("es-AR")} ·{" "}
          <Link href="/privacidad" className="underline">
            Ver política de privacidad completa
          </Link>
        </p>
      </div>
    </main>
  )
}
