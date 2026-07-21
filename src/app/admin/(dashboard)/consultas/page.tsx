import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { Inbox, Mail, MessageCircle, Phone, Check, CheckCheck } from "lucide-react"
import { toggleConsultaLeida, marcarTodasLeidas } from "./actions"

export const dynamic = "force-dynamic"

function formatFecha(d: Date) {
  return new Date(d).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
}

function waLink(telefono: string | null, nombre: string) {
  if (!telefono) return null
  const digits = telefono.replace(/\D/g, "")
  const num = digits.startsWith("54") ? digits : `549${digits}`
  const msg = encodeURIComponent(
    `Hola ${nombre}! Te contacto de Motos Fernández por tu consulta desde la web.`
  )
  return `https://wa.me/${num}?text=${msg}`
}

export default async function ConsultasPage() {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const [consultas, noLeidas] = await Promise.all([
    prisma.contactForm.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.contactForm.count({ where: { leido: false } }),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Inbox className="h-6 w-6 text-[#7C3AED]" />
            Consultas web
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mensajes del formulario de contacto de la web.{" "}
            {noLeidas > 0 ? (
              <span className="font-semibold text-amber-600">{noLeidas} sin leer</span>
            ) : (
              <span className="text-green-600">Todo al día ✓</span>
            )}
          </p>
        </div>
        {noLeidas > 0 && (
          <form action={marcarTodasLeidas}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              <CheckCheck className="h-4 w-4" /> Marcar todas leídas
            </button>
          </form>
        )}
      </div>

      {consultas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 p-12 text-center text-gray-500">
          Todavía no hay consultas del formulario.
        </div>
      ) : (
        <div className="space-y-3">
          {consultas.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 ${
                c.leido
                  ? "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  : "border-amber-300 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!c.leido && (
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    )}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {c.nombre}
                    </span>
                    <span className="text-xs text-gray-400">{formatFecha(c.createdAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-violet-600">
                      <Mail className="w-3.5 h-3.5" /> {c.email}
                    </a>
                    {c.telefono && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {c.telefono}
                      </span>
                    )}
                  </div>
                </div>

                <form action={toggleConsultaLeida}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="leido" value={String(c.leido)} />
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      c.leido
                        ? "bg-gray-100 dark:bg-neutral-800 text-gray-500 hover:bg-gray-200"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                    }`}
                    title={c.leido ? "Marcar como no leída" : "Marcar como leída"}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {c.leido ? "Leída" : "Marcar leída"}
                  </button>
                </form>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 bg-white/60 dark:bg-neutral-950/40 rounded-lg p-3 border border-gray-100 dark:border-neutral-800">
                {c.mensaje}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {waLink(c.telefono, c.nombre) && (
                  <a
                    href={waLink(c.telefono, c.nombre)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${c.email}?subject=${encodeURIComponent("Respuesta a tu consulta - Motos Fernández")}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <Mail className="w-4 h-4" /> Responder por mail
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
