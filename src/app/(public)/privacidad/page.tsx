import Link from "next/link"
import { ArrowLeft, Shield, Lock, Eye, Mail, Cookie, FileText } from "lucide-react"
import { BUSINESS } from "@/lib/constants"

export const metadata = {
  title: "Política de privacidad | Motos Fernandez",
  description: "Política de privacidad de Motos Fernandez. Cómo tratamos tus datos personales según la Ley 25.326 de Argentina.",
}

const sections = [
  {
    icon: FileText,
    title: "1. Responsable del tratamiento",
    content: (
      <>
        <p>
          Esta política rige el tratamiento de datos personales en el sitio web de{" "}
          <strong>{BUSINESS.name}</strong>, con domicilio en {BUSINESS.address}. Cumplimos con la{" "}
          <strong>Ley 25.326 de Protección de los Datos Personales</strong> de la República Argentina.
        </p>
        <p className="mt-2">
          Para consultas sobre el tratamiento de tus datos, contactanos a{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-[#6B4F7A] font-semibold underline">
            {BUSINESS.email}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    icon: Eye,
    title: "2. Datos que recopilamos",
    content: (
      <>
        <p>Recopilamos los siguientes datos personales:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>Datos de contacto:</strong> nombre, apellido, email, teléfono, dirección (cuando completás formularios de contacto, consignas o compras).
          </li>
          <li>
            <strong>Datos de compra:</strong> productos comprados, montos, método de pago (procesado por MercadoPago, nunca almacenamos datos de tarjetas).
          </li>
          <li>
            <strong>Datos de navegación:</strong> páginas visitadas, tiempo en el sitio, tipo de dispositivo y navegador, ciudad aproximada (vía IP). Son datos anónimos usados con fines estadísticos.
          </li>
          <li>
            <strong>Cookies:</strong> utilizamos cookies propias y de terceros para mejorar la experiencia del usuario y analizar el tráfico.
          </li>
          <li>
            <strong>Chatbot:</strong> las conversaciones con nuestro asistente virtual pueden quedar registradas en forma anónima para mejorar el servicio.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Shield,
    title: "3. Finalidad del tratamiento",
    content: (
      <>
        <p>Usamos tus datos para:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Procesar compras y coordinar entregas o retiros en el local.</li>
          <li>Coordinar turnos en el taller de servicio técnico.</li>
          <li>Responder consultas enviadas a través del formulario de contacto o del chatbot.</li>
          <li>Enviarte comunicaciones sobre el estado de tu pedido o turno.</li>
          <li>
            Enviarte promociones, novedades y lanzamientos si te suscribís voluntariamente al newsletter (podés darte de baja en cualquier momento).
          </li>
          <li>Generar estadísticas anónimas de uso del sitio para mejorar nuestros servicios.</li>
        </ul>
      </>
    ),
  },
  {
    icon: Lock,
    title: "4. Seguridad y protección",
    content: (
      <>
        <p>Implementamos medidas técnicas y organizativas razonables para proteger tus datos:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Conexión cifrada HTTPS en todo el sitio.</li>
          <li>
            Los pagos se procesan exclusivamente por MercadoPago. <strong>Nunca almacenamos datos de tarjetas de crédito</strong> ni credenciales bancarias.
          </li>
          <li>Headers de seguridad HTTP (HSTS, X-Frame-Options, CSP) para prevenir ataques comunes.</li>
          <li>Acceso al panel administrativo restringido por autenticación.</li>
          <li>Contraseñas almacenadas con hashing seguro (bcrypt).</li>
          <li>Rate limiting en formularios públicos para prevenir abuso.</li>
          <li>Base de datos alojada en infraestructura profesional con backups automáticos.</li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText,
    title: "5. Terceros con los que compartimos datos",
    content: (
      <>
        <p>Compartimos datos mínimos y necesarios con los siguientes proveedores:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>MercadoPago:</strong> para procesar pagos.
          </li>
          <li>
            <strong>Google Analytics:</strong> para análisis de tráfico (datos anónimos, agregados).
          </li>
          <li>
            <strong>Meta (Facebook/Instagram):</strong> para publicidad dirigida si diste consentimiento a cookies.
          </li>
          <li>
            <strong>Cloudinary:</strong> para almacenamiento de imágenes.
          </li>
          <li>
            <strong>Vercel:</strong> proveedor de hosting del sitio.
          </li>
          <li>
            <strong>Resend:</strong> envío de emails transaccionales (confirmación de pedidos, turnos, newsletter).
          </li>
          <li>
            <strong>Anthropic (Claude AI):</strong> motor del chatbot. Las consultas se procesan pero no se usan para entrenar modelos.
          </li>
          <li>
            <strong>Empresas de envío:</strong> cuando hacés una compra con envío, compartimos los datos de entrega necesarios (nombre, dirección, teléfono).
          </li>
        </ul>
        <p className="mt-2">
          <strong>No vendemos ni cedemos tus datos a terceros con fines comerciales ajenos a Motos Fernandez.</strong>
        </p>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "6. Cookies",
    content: (
      <>
        <p>Al ingresar al sitio te pedimos consentimiento para el uso de cookies. Usamos tres tipos:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>Cookies necesarias:</strong> indispensables para el funcionamiento del sitio (carrito, sesión, preferencias).
          </li>
          <li>
            <strong>Cookies analíticas:</strong> nos permiten entender cómo se usa el sitio para mejorarlo (Google Analytics).
          </li>
          <li>
            <strong>Cookies de marketing:</strong> para mostrarte publicidad relevante en otras plataformas (Meta Pixel).
          </li>
        </ul>
        <p className="mt-2">
          Podés rechazar las no necesarias desde el banner de cookies o configurando tu navegador. El rechazo no afecta la funcionalidad básica del sitio.
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    title: "7. Tus derechos (Ley 25.326)",
    content: (
      <>
        <p>Como titular de los datos, tenés derecho a:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>Acceder</strong> gratuitamente a tus datos personales que tengamos registrados.
          </li>
          <li>
            <strong>Rectificar</strong> datos inexactos o desactualizados.
          </li>
          <li>
            <strong>Actualizar</strong> tus datos cuando corresponda.
          </li>
          <li>
            <strong>Solicitar la supresión</strong> (baja) de tus datos de nuestras bases.
          </li>
          <li>
            <strong>Darte de baja del newsletter</strong> en cualquier momento, sin justificación.
          </li>
        </ul>
        <p className="mt-2">
          Para ejercer estos derechos, escribinos a{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-[#6B4F7A] font-semibold underline">
            {BUSINESS.email}
          </a>{" "}
          con una copia de tu DNI. Te responderemos dentro de los 10 días corridos, sin costo.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de la Ley 25.326 y podés presentar reclamos ante ella si considerás que tus derechos han sido vulnerados.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "8. Contacto y actualizaciones",
    content: (
      <>
        <p>
          Nos reservamos el derecho de actualizar esta política. La versión más reciente siempre estará disponible en esta página con la fecha de última modificación.
        </p>
        <p className="mt-2">
          Para cualquier consulta sobre esta política o sobre el tratamiento de tus datos, escribinos a{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-[#6B4F7A] font-semibold underline">
            {BUSINESS.email}
          </a>{" "}
          o por WhatsApp al {BUSINESS.whatsappDisplay}.
        </p>
      </>
    ),
  },
]

export default function Page() {
  const lastUpdate = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  })

  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      <div className="bg-[#1A1A1A] py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-[#9B59B6] uppercase tracking-wider font-semibold mb-2">
            <Shield className="size-4" />
            Legal
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Política de privacidad
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Última actualización: {lastUpdate}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed mb-8">
            En <strong>{BUSINESS.name}</strong> respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política explica cómo recopilamos, usamos y protegemos tu información cuando visitás nuestro sitio web o interactuás con nuestros servicios.
          </p>

          <div className="space-y-8">
            {sections.map((section, i) => {
              const Icon = section.icon
              return (
                <div key={i} className="pb-8 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center">
                      <Icon className="size-4 text-[#6B4F7A]" />
                    </div>
                    <h2 className="text-base font-bold text-[#1A1A1A]">
                      {section.title}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed ml-12">
                    {section.content}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#6B4F7A] hover:text-[#9B59B6]"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
