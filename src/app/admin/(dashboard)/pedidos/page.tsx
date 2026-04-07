import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatPrice, ESTADO_PEDIDO_LABELS, ESTADO_PAGO_LABELS } from "@/lib/constants"
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
import { Search, Package, ExternalLink, Download } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; desde?: string; hasta?: string }>
}) {
  const { q, estado, desde, hasta } = await searchParams

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { apellido: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }
  if (estado) where.estado = estado
  if (desde || hasta) {
    where.createdAt = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59`) } : {}),
    }
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { producto: true } } },
  })

  const totalVentas = pedidos
    .filter(p => p.estadoPago === "APROBADO")
    .reduce((sum, p) => sum + p.total, 0)

  const estados = Object.entries(ESTADO_PEDIDO_LABELS)

  // Build export URL with current filters
  const exportParams = new URLSearchParams()
  if (q) exportParams.set("q", q)
  if (estado) exportParams.set("estado", estado)
  if (desde) exportParams.set("desde", desde)
  if (hasta) exportParams.set("hasta", hasta)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pedidos.length} pedido(s) · Total pagado:{" "}
            <span className="font-semibold text-gray-700">{formatPrice(totalVentas)}</span>
          </p>
        </div>
        <a
          href={`/api/admin/pedidos/export?${exportParams.toString()}`}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <form className="flex gap-2 flex-wrap items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              name="q"
              defaultValue={q || ""}
              placeholder="Buscar cliente..."
              className="pl-10 w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Desde</label>
            <Input type="date" name="desde" defaultValue={desde || ""} className="w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Hasta</label>
            <Input type="date" name="hasta" defaultValue={hasta || ""} className="w-36" />
          </div>
          {estado && <input type="hidden" name="estado" value={estado} />}
          <button type="submit" className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Filtrar
          </button>
          {(q || desde || hasta) && (
            <a href={`/admin/pedidos${estado ? `?estado=${estado}` : ""}`} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
              Limpiar
            </a>
          )}
        </form>
      </div>

      {/* Estado pills */}
      <div className="flex gap-1 flex-wrap">
        <Link
          href={`/admin/pedidos${q || desde || hasta ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) })}` : ""}`}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            !estado ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50"
          }`}
        >
          Todos
        </Link>
        {estados.map(([key, val]) => {
          const params = new URLSearchParams({ estado: key, ...(q ? { q } : {}), ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) })
          return (
            <Link
              key={key}
              href={`/admin/pedidos?${params}`}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                estado === key ? "bg-[#6B4F7A] text-white border-[#6B4F7A]" : "hover:bg-gray-50"
              }`}
            >
              {val.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay pedidos
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((pedido) => {
                const estadoInfo = ESTADO_PEDIDO_LABELS[pedido.estado]
                const pagoInfo = ESTADO_PAGO_LABELS[pedido.estadoPago]
                return (
                  <TableRow key={pedido.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">
                      #{pedido.numero}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {pedido.nombre} {pedido.apellido}
                        </p>
                        <p className="text-xs text-gray-500">{pedido.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {pedido.items.length} item(s)
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(pedido.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${estadoInfo?.color || ""}`}>
                        {estadoInfo?.label || pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${pagoInfo?.color || ""}`}>
                        {pagoInfo?.label || pedido.estadoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {pedido.createdAt.toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        className="text-[#6B4F7A] hover:text-[#8B6F9A]"
                      >
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
