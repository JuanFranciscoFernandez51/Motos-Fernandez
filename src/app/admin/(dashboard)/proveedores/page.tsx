import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Phone, Mail, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { modelos: true, productos: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">
            De quién compramos motos 0km, accesorios, repuestos, etc.
          </p>
        </div>
        <Button
          render={<Link href="/admin/proveedores/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Usado en</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-gray-500"
                >
                  Todavía no cargaste proveedores. Agregá el primero con el
                  botón de arriba.
                </TableCell>
              </TableRow>
            ) : (
              proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{p.nombre}</p>
                      {p.contacto && (
                        <p className="text-xs text-gray-500">{p.contacto}</p>
                      )}
                      {p.cuit && (
                        <p className="text-xs font-mono text-gray-400">
                          CUIT {p.cuit}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.rubro || <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {p.telefono && (
                        <p className="flex items-center gap-1 text-gray-600">
                          <Phone className="size-3" /> {p.telefono}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1 text-gray-600">
                          <Mail className="size-3" /> {p.email}
                        </p>
                      )}
                      {p.sitio && (
                        <a
                          href={p.sitio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#6B4F7A] hover:underline"
                        >
                          <ExternalLink className="size-3" /> Sitio
                        </a>
                      )}
                      {!p.telefono && !p.email && !p.sitio && "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {p._count.modelos > 0 && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {p._count.modelos} modelo{p._count.modelos !== 1 ? "s" : ""}
                        </span>
                      )}
                      {p._count.productos > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {p._count.productos} producto{p._count.productos !== 1 ? "s" : ""}
                        </span>
                      )}
                      {p._count.modelos === 0 &&
                        p._count.productos === 0 && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        p.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/proveedores/${p.id}`} />}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
