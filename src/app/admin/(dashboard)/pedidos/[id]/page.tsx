import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatPrice, ESTADO_PEDIDO_LABELS, ESTADO_PAGO_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Package, User, MapPin, Truck } from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function updateEstadoPedido(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const estado = formData.get("estado") as string
  await prisma.pedido.update({
    where: { id },
    data: { estado: estado as "NUEVO" | "PAGO_CONFIRMADO" | "PREPARANDO" | "ENVIADO" | "ENTREGADO" | "CANCELADO" },
  })
  revalidatePath(`/admin/pedidos/${id}`)
}

async function updateTracking(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const trackingNumber = formData.get("trackingNumber") as string
  const trackingCompany = formData.get("trackingCompany") as string
  await prisma.pedido.update({
    where: { id },
    data: { trackingNumber, trackingCompany },
  })
  revalidatePath(`/admin/pedidos/${id}`)
}

async function updateNotas(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const notas = formData.get("notas") as string
  await prisma.pedido.update({
    where: { id },
    data: { notas },
  })
  revalidatePath(`/admin/pedidos/${id}`)
}

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { items: { include: { producto: true } } },
  })

  if (!pedido) notFound()

  const estadoInfo = ESTADO_PEDIDO_LABELS[pedido.estado]
  const pagoInfo = ESTADO_PAGO_LABELS[pedido.estadoPago]
  const estados = Object.entries(ESTADO_PEDIDO_LABELS)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/admin/pedidos" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Pedido #{pedido.numero}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pedido.createdAt.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge variant="secondary" className={`text-sm px-3 py-1 ${estadoInfo?.color || ""}`}>
          {estadoInfo?.label || pedido.estado}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items + Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items del pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Talle</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedido.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.producto.nombre}
                      </TableCell>
                      <TableCell>{item.talle || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.precio)}
                      </TableCell>
                      <TableCell className="text-right">{item.cantidad}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.precio * item.cantidad)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t mt-4 pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span>{formatPrice(pedido.subtotal)}</span>
                </div>
                {pedido.descuento > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-300">
                    <span>Descuento {pedido.cuponCodigo && `(${pedido.cuponCodigo})`}</span>
                    <span>-{formatPrice(pedido.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Envio</span>
                  <span>{pedido.costoEnvio > 0 ? formatPrice(pedido.costoEnvio) : "Gratis"}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(pedido.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Actualizar estado</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateEstadoPedido} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={pedido.id} />
                {estados.map(([key, val]) => (
                  <button
                    key={key}
                    type="submit"
                    name="estado"
                    value={key}
                    disabled={pedido.estado === key}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      pedido.estado === key
                        ? "bg-[#6B4F7A] text-white border-[#6B4F7A]"
                        : "hover:bg-gray-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </form>
            </CardContent>
          </Card>

          {/* Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Seguimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateTracking} className="flex gap-3 items-end">
                <input type="hidden" name="id" value={pedido.id} />
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Empresa</label>
                  <Input
                    name="trackingCompany"
                    defaultValue={pedido.trackingCompany || ""}
                    placeholder="Ej: Andreani, OCA"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Numero de seguimiento</label>
                  <Input
                    name="trackingNumber"
                    defaultValue={pedido.trackingNumber || ""}
                    placeholder="Codigo de tracking"
                  />
                </div>
                <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
                  Guardar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Client + Payment + Notes */}
        <div className="space-y-6">
          {/* Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {pedido.nombre} {pedido.apellido}
              </p>
              <p className="text-gray-600 dark:text-gray-300">{pedido.email}</p>
              <p className="text-gray-600 dark:text-gray-300">{pedido.telefono}</p>
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Badge variant="outline" className="mb-2">
                {pedido.tipoEntrega === "ENVIO" ? "Envio a domicilio" : "Retiro en local"}
              </Badge>
              {pedido.tipoEntrega === "ENVIO" && (
                <>
                  {pedido.direccion && <p>{pedido.direccion}</p>}
                  {pedido.ciudad && (
                    <p className="text-gray-600 dark:text-gray-300">
                      {pedido.ciudad}, {pedido.provincia}
                    </p>
                  )}
                  {pedido.codigoPostal && (
                    <p className="text-gray-500 dark:text-gray-400">CP: {pedido.codigoPostal}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Estado</span>
                <Badge variant="secondary" className={`text-xs ${pagoInfo?.color || ""}`}>
                  {pagoInfo?.label || pedido.estadoPago}
                </Badge>
              </div>
              {pedido.mpPaymentId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">MP ID</span>
                  <span className="font-mono text-xs">{pedido.mpPaymentId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notas internas</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateNotas} className="space-y-3">
                <input type="hidden" name="id" value={pedido.id} />
                <Textarea
                  name="notas"
                  defaultValue={pedido.notas || ""}
                  placeholder="Agregar notas sobre este pedido..."
                  rows={4}
                />
                <Button type="submit" size="sm" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
                  Guardar notas
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
