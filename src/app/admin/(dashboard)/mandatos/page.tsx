import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, FileText } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDate,
  formatMoney,
  formatNumero,
  nombreCompleto,
  ESTADO_MANDATO_STYLES,
  ESTADO_MANDATO_LABELS,
} from "@/lib/admin-helpers"
import { MandatosListFilters } from "./mandatos-filters"

export const dynamic = "force-dynamic"

export default async function MandatosPage() {
  const mandatos = await prisma.mandatoVenta.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      cliente: { select: { nombre: true, apellido: true, dni: true } },
      modelo_: { select: { slug: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mandatos de venta</h1>
          <p className="text-sm text-gray-500 mt-1">
            Consignaciones de motos que el cliente dejó para vender.
          </p>
        </div>
        <Button
          render={<Link href="/admin/mandatos/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo mandato
        </Button>
      </div>

      <MandatosListFilters
        mandatos={mandatos.map((m) => ({
          id: m.id,
          numero: m.numero,
          estado: m.estado,
          marca: m.marca,
          modelo: m.modelo,
          anio: m.anio,
          precioVenta: m.precioVenta,
          moneda: m.moneda,
          fechaFirma: m.fechaFirma,
          createdAt: m.createdAt,
          clienteNombre: nombreCompleto(m.cliente),
          clienteDni: m.cliente.dni,
          publicado: !!m.modelo_,
        }))}
      />
    </div>
  )
}
