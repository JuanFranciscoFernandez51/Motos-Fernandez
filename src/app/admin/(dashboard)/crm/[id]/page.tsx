import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TEMPERATURA_LABELS, ETAPA_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Clock,
  Plus,
} from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function updateTemperatura(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const temperatura = formData.get("temperatura") as string
  await prisma.lead.update({
    where: { id },
    data: { temperatura: temperatura as "NUEVO" | "CALIENTE" | "TIBIO" | "FRIO" | "CLIENTE" | "PERDIDO" },
  })
  revalidatePath(`/admin/crm/${id}`)
}

async function updateEtapa(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const etapa = formData.get("etapa") as string
  await prisma.lead.update({
    where: { id },
    data: { etapa: etapa as "NUEVO" | "CONTACTADO" | "PRESUPUESTADO" | "NEGOCIANDO" | "VENDIDO" | "PERDIDO" },
  })
  revalidatePath(`/admin/crm/${id}`)
}

async function addInteraction(formData: FormData) {
  "use server"
  const leadId = formData.get("leadId") as string
  const tipo = formData.get("tipo") as string
  const contenido = formData.get("contenido") as string
  if (!contenido.trim()) return
  await prisma.leadInteraction.create({
    data: { leadId, tipo, contenido },
  })
  revalidatePath(`/admin/crm/${leadId}`)
}

async function updateNotas(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const notas = formData.get("notas") as string
  await prisma.lead.update({
    where: { id },
    data: { notas },
  })
  revalidatePath(`/admin/crm/${id}`)
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      modelo: true,
      interacciones: { orderBy: { createdAt: "desc" } },
      recordatorios: { orderBy: { fecha: "asc" } },
    },
  })

  if (!lead) notFound()

  const tempInfo = TEMPERATURA_LABELS[lead.temperatura]
  const etapaInfo = ETAPA_LABELS[lead.etapa]
  const temperaturas = Object.entries(TEMPERATURA_LABELS)
  const etapas = Object.entries(ETAPA_LABELS)

  const tiposInteraccion = [
    { value: "LLAMADA", label: "Llamada" },
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "EMAIL", label: "Email" },
    { value: "PRESENCIAL", label: "Presencial" },
    { value: "NOTA", label: "Nota interna" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/admin/crm" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.nombre} {lead.apellido || ""}
          </h1>
          <p className="text-sm text-gray-500">
            Lead desde {lead.createdAt.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" "}via {lead.origen}
          </p>
        </div>
        <Badge variant="secondary" className={`text-sm px-3 py-1 ${tempInfo?.color || ""}`}>
          {tempInfo?.label}
        </Badge>
        <Badge variant="secondary" className={`text-sm px-3 py-1 ${etapaInfo?.color || ""}`}>
          {etapaInfo?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timeline + Add interaction */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add interaction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva interaccion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addInteraction} className="space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div className="flex gap-2 flex-wrap">
                  {tiposInteraccion.map((tipo) => (
                    <label key={tipo.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo"
                        value={tipo.value}
                        defaultChecked={tipo.value === "NOTA"}
                        className="accent-[#6B4F7A]"
                      />
                      <span className="text-sm">{tipo.label}</span>
                    </label>
                  ))}
                </div>
                <Textarea
                  name="contenido"
                  placeholder="Escribi el detalle de la interaccion..."
                  rows={3}
                />
                <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
                  Agregar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Historial de interacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.interacciones.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No hay interacciones registradas
                </p>
              ) : (
                <div className="relative space-y-0">
                  {lead.interacciones.map((inter, idx) => (
                    <div key={inter.id} className="relative flex gap-4 pb-6">
                      {/* Timeline line */}
                      {idx < lead.interacciones.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200" />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6B4F7A]/10 text-[#6B4F7A]">
                        <Clock className="h-4 w-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {inter.tipo}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {inter.createdAt.toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {inter.contenido}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Contact info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos de contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a
                    href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B4F7A] hover:underline"
                  >
                    {lead.telefono}
                  </a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="text-[#6B4F7A] hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.ciudad && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{lead.ciudad}</span>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-gray-500 text-xs mb-1">Modelo de interes</p>
                <p className="font-medium">
                  {lead.modelo?.nombre || lead.modeloInteres || "No especificado"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Temperatura</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateTemperatura} className="flex flex-wrap gap-1.5">
                <input type="hidden" name="id" value={lead.id} />
                {temperaturas.map(([key, val]) => (
                  <button
                    key={key}
                    type="submit"
                    name="temperatura"
                    value={key}
                    disabled={lead.temperatura === key}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:ring-2 disabled:ring-[#6B4F7A]/30 ${val.color}`}
                  >
                    {val.label}
                  </button>
                ))}
              </form>
            </CardContent>
          </Card>

          {/* Stage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateEtapa} className="flex flex-wrap gap-1.5">
                <input type="hidden" name="id" value={lead.id} />
                {etapas.map(([key, val]) => (
                  <button
                    key={key}
                    type="submit"
                    name="etapa"
                    value={key}
                    disabled={lead.etapa === key}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:ring-2 disabled:ring-[#6B4F7A]/30 ${val.color}`}
                  >
                    {val.label}
                  </button>
                ))}
              </form>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notas generales</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateNotas} className="space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <Textarea
                  name="notas"
                  defaultValue={lead.notas || ""}
                  placeholder="Notas sobre este lead..."
                  rows={4}
                />
                <Button type="submit" size="sm" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
                  Guardar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Reminders */}
          {lead.recordatorios.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recordatorios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lead.recordatorios.map((rec) => (
                  <div
                    key={rec.id}
                    className={`text-sm p-2 rounded border ${
                      rec.completado ? "bg-gray-50 line-through text-gray-400" : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <p className="font-medium">{rec.titulo}</p>
                    <p className="text-xs text-gray-500">
                      {rec.fecha.toLocaleDateString("es-AR")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
