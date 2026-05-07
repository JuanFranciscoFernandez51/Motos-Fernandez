import Link from "next/link"
import { Phone, Mail, MessageCircle, MapPin, IdCard, TrendingUp, Clock, Package } from "lucide-react"
import { formatDate, formatMoney } from "@/lib/admin-helpers"

type Cliente = {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  telefono: string | null
  telefonoAlt: string | null
  direccion: string | null
  ciudad: string | null
  ocupacion: string | null
  createdAt: Date
}

type Evento = {
  id: string
  fecha: Date
  tipo: "MANDATO" | "OC" | "MOTO_ENTREGA" | "OT"
  titulo: string
  subtitulo: string | null
  importe: number | null
  moneda: string
  estado: string | null
  href: string
}

/**
 * Normaliza teléfono argentino al formato wa.me (E.164 sin +).
 */
function normalizarParaWhatsApp(tel: string): string {
  let n = tel.replace(/[^\d]/g, "")
  if (n.startsWith("0")) n = n.slice(1)
  let isMobile = false
  if (n.startsWith("15")) {
    n = n.slice(2)
    isMobile = true
  }
  if (!n.startsWith("54")) n = "54" + n
  if (isMobile && n.startsWith("54") && !n.startsWith("549")) {
    n = "549" + n.slice(2)
  }
  return n
}

const TIPO_LABEL = {
  MANDATO: "Mandato de venta",
  OC: "Orden de compra",
  MOTO_ENTREGA: "Entregó moto en parte de pago",
  OT: "Orden de taller",
} as const

const TIPO_COLOR = {
  MANDATO: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  OC: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  MOTO_ENTREGA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  OT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
} as const

const TIPO_DOT = {
  MANDATO: "bg-purple-500",
  OC: "bg-blue-500",
  MOTO_ENTREGA: "bg-emerald-500",
  OT: "bg-orange-500",
} as const

export function ClienteResumen({
  cliente,
  totalCompras,
  totalTaller,
  ultimoEvento,
  eventos,
}: {
  cliente: Cliente
  totalCompras: number
  totalTaller: number
  ultimoEvento: Evento | null
  eventos: Evento[]
}) {
  const diasDesdeUltimo = ultimoEvento
    ? Math.floor((Date.now() - new Date(ultimoEvento.fecha).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-4">
      {/* Header con info clave */}
      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-gradient-to-br from-[#6B4F7A]/5 to-transparent dark:from-[#6B4F7A]/10 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {cliente.apellido}, {cliente.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-300">
              {cliente.dni && (
                <span className="flex items-center gap-1.5">
                  <IdCard className="size-4 text-gray-400" />
                  <span className="font-mono">{cliente.dni}</span>
                </span>
              )}
              {cliente.ciudad && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-gray-400" />
                  {cliente.ciudad}
                </span>
              )}
              {cliente.ocupacion && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {cliente.ocupacion}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Cliente desde {formatDate(cliente.createdAt)}
            </p>
          </div>

          {/* Acciones de contacto */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {cliente.telefono && (
              <a
                href={`https://wa.me/${normalizarParaWhatsApp(cliente.telefono)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-medium transition-colors"
                title={`Abrir WhatsApp con ${cliente.telefono}`}
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            )}
            {cliente.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <Phone className="size-4" />
                {cliente.telefono}
              </a>
            )}
            {cliente.email && (
              <a
                href={`mailto:${cliente.email}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors max-w-[200px] truncate"
              >
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{cliente.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Stat
            icon={<Package className="size-4 text-blue-600" />}
            label="Compras"
            value={String(eventos.filter((e) => e.tipo === "OC").length)}
          />
          <Stat
            icon={<TrendingUp className="size-4 text-emerald-600" />}
            label="Total facturado"
            value={totalCompras > 0 ? formatMoney(totalCompras) : "—"}
          />
          <Stat
            icon={<Clock className="size-4 text-amber-600" />}
            label="Último contacto"
            value={
              diasDesdeUltimo == null
                ? "—"
                : diasDesdeUltimo === 0
                  ? "Hoy"
                  : diasDesdeUltimo === 1
                    ? "Ayer"
                    : diasDesdeUltimo < 30
                      ? `Hace ${diasDesdeUltimo} días`
                      : diasDesdeUltimo < 365
                        ? `Hace ${Math.floor(diasDesdeUltimo / 30)} meses`
                        : `Hace ${Math.floor(diasDesdeUltimo / 365)} años`
            }
          />
          <Stat
            icon={<TrendingUp className="size-4 text-orange-600" />}
            label="Gastado en taller"
            value={totalTaller > 0 ? formatMoney(totalTaller) : "—"}
          />
        </div>
      </div>

      {/* Timeline */}
      {eventos.length > 0 && (
        <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Clock className="size-4 text-gray-400" />
            Historia ({eventos.length} eventos)
          </h2>
          <ol className="relative border-l-2 border-gray-100 dark:border-neutral-800 ml-2 space-y-4">
            {eventos.map((ev) => (
              <li key={`${ev.tipo}-${ev.id}`} className="ml-6 relative">
                {/* Dot */}
                <span
                  className={`absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-white dark:ring-neutral-900 ${TIPO_DOT[ev.tipo]}`}
                />
                <Link
                  href={ev.href}
                  className="block hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-md p-2 -m-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${TIPO_COLOR[ev.tipo]}`}
                        >
                          {TIPO_LABEL[ev.tipo]}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(ev.fecha)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 truncate">
                        {ev.titulo}
                      </p>
                      {ev.subtitulo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {ev.subtitulo}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {ev.importe != null && (
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatMoney(ev.importe, ev.moneda)}
                        </p>
                      )}
                      {ev.estado && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {ev.estado}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {icon}
        <span className="uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">{value}</p>
    </div>
  )
}
