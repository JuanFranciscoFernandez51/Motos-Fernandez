import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Ticket } from "lucide-react"
import { revalidatePath } from "next/cache"
import { formatPrice } from "@/lib/constants"

export const dynamic = "force-dynamic"

async function toggleCuponActivo(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const activo = formData.get("activo") === "true"
  await prisma.cupon.update({
    where: { id },
    data: { activo: !activo },
  })
  revalidatePath("/admin/cupones")
}

export default async function CuponesPage() {
  const cupones = await prisma.cupon.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cupones.length} cupon(es)
          </p>
        </div>
        <Button render={<Link href="/admin/cupones/nuevo" />} className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cupon
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Monto maximo</TableHead>
              <TableHead>Compra minima</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cupones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <Ticket className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay cupones cargados
                </TableCell>
              </TableRow>
            ) : (
              cupones.map((cupon) => {
                const now = new Date()
                const isExpired = cupon.fechaFin && cupon.fechaFin < now
                const isMaxUsed = cupon.usosMaximos && cupon.usosActuales >= cupon.usosMaximos
                const effectiveActive = cupon.activo && !isExpired && !isMaxUsed

                return (
                  <TableRow key={cupon.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-1 rounded">
                        {cupon.codigo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {cupon.descripcion || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#6B4F7A]">
                        {cupon.porcentaje}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cupon.montoMaximo ? formatPrice(cupon.montoMaximo) : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cupon.montoMinimo ? formatPrice(cupon.montoMinimo) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{cupon.usosActuales}</span>
                        {cupon.usosMaximos && (
                          <span className="text-gray-400"> / {cupon.usosMaximos}</span>
                        )}
                      </div>
                      {isMaxUsed && (
                        <span className="text-xs text-red-500">Agotado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <div>
                        {cupon.fechaInicio.toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                        {cupon.fechaFin && (
                          <>
                            {" - "}
                            {cupon.fechaFin.toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </>
                        )}
                      </div>
                      {isExpired && (
                        <span className="text-xs text-red-500">Vencido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <form action={toggleCuponActivo}>
                        <input type="hidden" name="id" value={cupon.id} />
                        <input type="hidden" name="activo" value={String(cupon.activo)} />
                        <button type="submit">
                          <Badge
                            variant="secondary"
                            className={
                              effectiveActive
                                ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                            }
                          >
                            {effectiveActive ? "Activo" : cupon.activo ? "Activo (vencido)" : "Inactivo"}
                          </Badge>
                        </button>
                      </form>
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
