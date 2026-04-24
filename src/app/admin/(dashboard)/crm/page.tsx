import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { TEMPERATURA_LABELS, ETAPA_LABELS, ORIGEN_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Users, ExternalLink, Phone, Mail, Plus, Download } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; temp?: string; etapa?: string; origen?: string }>
}) {
  const { q, temp, etapa, origen } = await searchParams

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { apellido: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { telefono: { contains: q, mode: "insensitive" } },
    ]
  }
  if (temp) where.temperatura = temp
  if (etapa) where.etapa = etapa
  if (origen) where.origen = origen

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { modelo: true, interacciones: { take: 1, orderBy: { createdAt: "desc" } } },
  })

  const temperaturas = Object.entries(TEMPERATURA_LABELS)
  const etapas = Object.entries(ETAPA_LABELS)
  const origenes = Object.entries(ORIGEN_LABELS)

  function buildUrl(params: Record<string, string | undefined>) {
    const base = "/admin/crm"
    const merged = { q, temp, etapa, origen, ...params }
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) search.set(k, v)
    }
    const str = search.toString()
    return str ? `${base}?${str}` : base
  }

  const exportParams = new URLSearchParams()
  if (q) exportParams.set("q", q)
  if (temp) exportParams.set("temp", temp)
  if (etapa) exportParams.set("etapa", etapa)
  if (origen) exportParams.set("origen", origen)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM / Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{leads.length} lead(s)</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/admin/crm/export?${exportParams.toString()}`}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
          <Link
            href="/admin/crm/nuevo"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#6B4F7A] text-white rounded-lg hover:bg-[#8B6F9A] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo lead
          </Link>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por nombre, email o telefono..."
            className="pl-10"
          />
        </div>
        {temp && <input type="hidden" name="temp" value={temp} />}
        {etapa && <input type="hidden" name="etapa" value={etapa} />}
        {origen && <input type="hidden" name="origen" value={origen} />}
        <button type="submit" className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900">
          Buscar
        </button>
      </form>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Temperatura:</span>
          <div className="flex gap-1 flex-wrap">
            <Link href={buildUrl({ temp: undefined })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${!temp ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>Todas</Link>
            {temperaturas.map(([key, val]) => (
              <Link key={key} href={buildUrl({ temp: key })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${temp === key ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>{val.label}</Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Etapa:</span>
          <div className="flex gap-1 flex-wrap">
            <Link href={buildUrl({ etapa: undefined })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${!etapa ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>Todas</Link>
            {etapas.map(([key, val]) => (
              <Link key={key} href={buildUrl({ etapa: key })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${etapa === key ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>{val.label}</Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">Origen:</span>
          <div className="flex gap-1 flex-wrap">
            <Link href={buildUrl({ origen: undefined })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${!origen ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>Todos</Link>
            {origenes.map(([key, val]) => (
              <Link key={key} href={buildUrl({ origen: key })} className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${origen === key ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}`}>{val.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Modelo interes</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay leads
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const tempInfo = TEMPERATURA_LABELS[lead.temperatura]
                const etapaInfo = ETAPA_LABELS[lead.etapa]
                const origenInfo = ORIGEN_LABELS[lead.origen]
                return (
                  <TableRow key={lead.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900">
                    <TableCell>
                      <p className="font-medium text-sm">{lead.nombre} {lead.apellido || ""}</p>
                      {lead.ciudad && <p className="text-xs text-gray-400">{lead.ciudad}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {lead.telefono && (
                          <a href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6B4F7A] hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" />{lead.telefono}
                          </a>
                        )}
                        {lead.email && (
                          <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Mail className="h-3 w-3" />{lead.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                      {lead.modelo?.nombre || lead.modeloInteres || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {origenInfo?.label || lead.origen}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${tempInfo?.color || ""}`}>
                        {tempInfo?.label || lead.temperatura}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${etapaInfo?.color || ""}`}>
                        {etapaInfo?.label || lead.etapa}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {lead.createdAt.toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/crm/${lead.id}`} className="text-[#6B4F7A] hover:text-[#8B6F9A]">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
