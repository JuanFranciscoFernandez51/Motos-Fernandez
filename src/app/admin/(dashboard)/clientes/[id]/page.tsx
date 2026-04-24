import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ClienteForm } from "@/components/admin/operativo/cliente-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  formatMoney,
  formatNumero,
  ESTADO_MANDATO_STYLES,
  ESTADO_MANDATO_LABELS,
  ESTADO_VENTA_STYLES,
  ESTADO_VENTA_LABELS,
  ESTADO_OT_STYLES,
  ESTADO_OT_LABELS,
} from "@/lib/admin-helpers"
import { FileText, Receipt, Wrench } from "lucide-react"

export const dynamic = "force-dynamic"

async function updateCliente(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const data: Record<string, string | null> = {}
    const fields = [
      "dni",
      "cuit",
      "nombre",
      "apellido",
      "email",
      "telefono",
      "telefonoAlt",
      "direccion",
      "ciudad",
      "provincia",
      "codigoPostal",
      "ocupacion",
      "notasInternas",
    ]
    for (const f of fields) {
      const v = formData.get(f) as string
      data[f] = v && v.trim() ? v.trim() : null
    }

    await prisma.cliente.update({
      where: { id },
      data,
    })
    revalidatePath("/admin/clientes")
    revalidatePath(`/admin/clientes/${id}`)
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al actualizar cliente"
    if (msg.includes("Unique constraint") && msg.includes("dni")) {
      return { error: "Ya existe otro cliente con ese DNI" }
    }
    return { error: msg }
  }
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      mandatos: {
        orderBy: { createdAt: "desc" },
        include: { modelo_: { select: { slug: true } } },
      },
      ventas: {
        orderBy: { createdAt: "desc" },
      },
      ordenesTrabajo: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!cliente) notFound()

  const initialData = {
    id: cliente.id,
    dni: cliente.dni || "",
    cuit: cliente.cuit || "",
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    email: cliente.email || "",
    telefono: cliente.telefono || "",
    telefonoAlt: cliente.telefonoAlt || "",
    direccion: cliente.direccion || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    codigoPostal: cliente.codigoPostal || "",
    ocupacion: cliente.ocupacion || "",
    notasInternas: cliente.notasInternas || "",
  }

  return (
    <div className="space-y-6">
      <ClienteForm initialData={initialData} saveAction={updateCliente} />

      {/* Histórico del cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mandatos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-purple-600 dark:text-purple-300" />
              Mandatos ({cliente.mandatos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.mandatos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin mandatos</p>
            ) : (
              <ul className="space-y-2">
                {cliente.mandatos.map((m) => (
                  <li key={m.id} className="text-sm">
                    <Link
                      href={`/admin/mandatos/${m.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900 rounded p-2 -m-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {formatNumero("MV", m.numero)}
                        </p>
                        <p className="font-medium">
                          {m.marca} {m.modelo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMoney(m.precioVenta, m.moneda)} ·{" "}
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={ESTADO_MANDATO_STYLES[m.estado]}
                      >
                        {ESTADO_MANDATO_LABELS[m.estado]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ventas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-blue-600" />
              Compras ({cliente.ventas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.ventas.length === 0 ? (
              <p className="text-sm text-gray-400">Sin compras</p>
            ) : (
              <ul className="space-y-2">
                {cliente.ventas.map((v) => (
                  <li key={v.id} className="text-sm">
                    <Link
                      href={`/admin/ventas/${v.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900 rounded p-2 -m-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {formatNumero("V", v.numero)}
                        </p>
                        <p className="font-medium">{v.motoDescripcion}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMoney(v.precioVenta, v.moneda)} ·{" "}
                          {formatDate(v.fecha)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={ESTADO_VENTA_STYLES[v.estado]}
                      >
                        {ESTADO_VENTA_LABELS[v.estado]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Órdenes de Trabajo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-orange-600 dark:text-orange-300" />
              Órdenes de taller ({cliente.ordenesTrabajo.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.ordenesTrabajo.length === 0 ? (
              <p className="text-sm text-gray-400">Sin OT</p>
            ) : (
              <ul className="space-y-2">
                {cliente.ordenesTrabajo.map((ot) => (
                  <li key={ot.id} className="text-sm">
                    <Link
                      href={`/admin/taller/${ot.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900 rounded p-2 -m-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {formatNumero("OT", ot.numero)}
                        </p>
                        <p className="font-medium">
                          {ot.motoMarca} {ot.motoModelo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMoney(ot.total)} ·{" "}
                          {formatDate(ot.fechaIngreso)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={ESTADO_OT_STYLES[ot.estado]}
                      >
                        {ESTADO_OT_LABELS[ot.estado]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
