import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

async function crearLead(formData: FormData) {
  "use server"
  const nombre = formData.get("nombre") as string
  const apellido = formData.get("apellido") as string
  const telefono = formData.get("telefono") as string
  const email = formData.get("email") as string
  const ciudad = formData.get("ciudad") as string
  const modeloInteres = formData.get("modeloInteres") as string
  const origen = formData.get("origen") as string
  const temperatura = formData.get("temperatura") as string
  const notas = formData.get("notas") as string

  if (!nombre) return

  const lead = await prisma.lead.create({
    data: {
      nombre,
      apellido: apellido || null,
      telefono: telefono || null,
      email: email || null,
      ciudad: ciudad || null,
      modeloInteres: modeloInteres || null,
      origen: (origen || "PRESENCIAL") as "WEB" | "WHATSAPP" | "INSTAGRAM" | "MARKETPLACE" | "MERCADOLIBRE" | "TELEFONO" | "PRESENCIAL",
      temperatura: (temperatura || "NUEVO") as "NUEVO" | "CALIENTE" | "TIBIO" | "FRIO" | "CLIENTE" | "PERDIDO",
      notas: notas || null,
    },
  })

  redirect(`/admin/crm/${lead.id}`)
}

export default function NuevoLeadPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/crm" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo lead</h1>
          <p className="text-sm text-gray-500">Agregar un contacto manualmente</p>
        </div>
      </div>

      <form action={crearLead} className="bg-white rounded-xl border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre *</label>
            <Input name="nombre" placeholder="Juan" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Apellido</label>
            <Input name="apellido" placeholder="Pérez" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Teléfono</label>
            <Input name="telefono" placeholder="2915000000" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input name="email" type="email" placeholder="juan@email.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Ciudad</label>
            <Input name="ciudad" placeholder="Bahía Blanca" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Modelo de interés</label>
            <Input name="modeloInteres" placeholder="Honda XR 150" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Origen</label>
            <select name="origen" className="w-full h-10 px-3 rounded-lg border text-sm">
              <option value="PRESENCIAL">Presencial</option>
              <option value="TELEFONO">Teléfono</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="WEB">Web</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="MERCADOLIBRE">MercadoLibre</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Temperatura</label>
            <select name="temperatura" className="w-full h-10 px-3 rounded-lg border text-sm">
              <option value="NUEVO">Nuevo</option>
              <option value="CALIENTE">Caliente</option>
              <option value="TIBIO">Tibio</option>
              <option value="FRIO">Frío</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            name="notas"
            rows={3}
            placeholder="Observaciones iniciales..."
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
            Crear lead
          </Button>
          <Link href="/admin/crm" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
