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
  ESTADO_OC_STYLES,
  ESTADO_OC_LABELS,
  ESTADO_OT_STYLES,
  ESTADO_OT_LABELS,
} from "@/lib/admin-helpers"
import { FileText, Receipt, Wrench, Bike } from "lucide-react"
import {
  ClienteDocumentos,
  type ClienteDocumento,
} from "@/components/admin/operativo/cliente-documentos"
import { ClienteResumen } from "@/components/admin/operativo/cliente-resumen"

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
      ordenesCompra: {
        orderBy: { createdAt: "desc" },
      },
      motosEntregadas: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          nombre: true,
          marca: true,
          anio: true,
          kilometros: true,
          precio: true,
          moneda: true,
          activo: true,
          vendida: true,
          fotos: true,
          ordenCompraOrigenId: true,
        },
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

  // Documentos del cliente
  const documentos: ClienteDocumento[] = Array.isArray(cliente.documentos)
    ? (cliente.documentos as unknown as ClienteDocumento[])
    : []

  // Construir timeline unificado de eventos
  type Evento = React.ComponentProps<typeof ClienteResumen>["eventos"][number]
  const eventos: Evento[] = [
    ...cliente.mandatos.map((m) => ({
      id: m.id,
      fecha: m.createdAt,
      tipo: "MANDATO" as const,
      titulo: `${m.marca} ${m.modelo}`,
      subtitulo: `${formatNumero("MV", m.numero)} · ${ESTADO_MANDATO_LABELS[m.estado]}`,
      importe: m.precioVenta,
      moneda: m.moneda,
      estado: ESTADO_MANDATO_LABELS[m.estado],
      href: `/admin/mandatos/${m.id}`,
    })),
    ...cliente.ordenesCompra.map((o) => ({
      id: o.id,
      fecha: o.fecha,
      tipo: "OC" as const,
      titulo: o.motoDescripcion,
      subtitulo: `${formatNumero("OC", o.numero)} · ${o.formaPago || "—"}`,
      importe: o.precioVenta,
      moneda: o.moneda,
      estado: ESTADO_OC_LABELS[o.estado],
      href: `/admin/ordenes-compra/${o.id}`,
    })),
    ...cliente.motosEntregadas.map((m) => ({
      id: m.id,
      fecha: (m as unknown as { createdAt: Date }).createdAt ?? new Date(),
      tipo: "MOTO_ENTREGA" as const,
      titulo: `${m.marca} ${m.nombre}`,
      subtitulo: [m.anio, m.kilometros ? `${m.kilometros.toLocaleString("es-AR")} km` : null]
        .filter(Boolean)
        .join(" · "),
      importe: m.precio,
      moneda: m.moneda,
      estado: m.vendida ? "Vendida" : m.activo ? "En catálogo" : "Pendiente",
      href: `/admin/modelos/${m.id}`,
    })),
    ...cliente.ordenesTrabajo.map((ot) => ({
      id: ot.id,
      fecha: ot.fechaIngreso,
      tipo: "OT" as const,
      titulo: `${ot.motoMarca} ${ot.motoModelo}`,
      subtitulo: `${formatNumero("OT", ot.numero)} · ${ESTADO_OT_LABELS[ot.estado]}`,
      importe: ot.total,
      moneda: "ARS",
      estado: ESTADO_OT_LABELS[ot.estado],
      href: `/admin/taller/${ot.id}`,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  // Totales para los stats. Separamos compras por moneda para no mezclar
  // ARS con USD — el cliente puede haber comprado motos en distintas monedas.
  const comprasPorMoneda = cliente.ordenesCompra
    .filter((o) => o.estado === "CONCRETADA")
    .reduce(
      (acc, o) => {
        const m = (o.moneda || "ARS") as "ARS" | "USD"
        acc[m] = (acc[m] || 0) + (o.precioVenta || 0)
        return acc
      },
      { ARS: 0, USD: 0 }
    )
  const totalTaller = cliente.ordenesTrabajo.reduce((sum, ot) => sum + (ot.total || 0), 0)

  return (
    <div className="space-y-6">
      <ClienteResumen
        cliente={{
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          dni: cliente.dni,
          email: cliente.email,
          telefono: cliente.telefono,
          telefonoAlt: cliente.telefonoAlt,
          direccion: cliente.direccion,
          ciudad: cliente.ciudad,
          ocupacion: cliente.ocupacion,
          createdAt: cliente.createdAt,
        }}
        totalComprasARS={comprasPorMoneda.ARS}
        totalComprasUSD={comprasPorMoneda.USD}
        totalTaller={totalTaller}
        ultimoEvento={eventos[0] || null}
        eventos={eventos}
      />

      <ClienteForm initialData={initialData} saveAction={updateCliente} />

      {/* Carpeta de documentos digitales */}
      <ClienteDocumentos clienteId={cliente.id} documentosIniciales={documentos} />

      {/* Histórico del cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
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

        {/* Órdenes de compra */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-blue-600" />
              Compras ({cliente.ordenesCompra.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.ordenesCompra.length === 0 ? (
              <p className="text-sm text-gray-400">Sin compras</p>
            ) : (
              <ul className="space-y-2">
                {cliente.ordenesCompra.map((o) => (
                  <li key={o.id} className="text-sm">
                    <Link
                      href={`/admin/ordenes-compra/${o.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900 rounded p-2 -m-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {formatNumero("OC", o.numero)}
                        </p>
                        <p className="font-medium">{o.motoDescripcion}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMoney(o.precioVenta, o.moneda)} ·{" "}
                          {formatDate(o.fecha)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={ESTADO_OC_STYLES[o.estado]}
                      >
                        {ESTADO_OC_LABELS[o.estado]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Motos entregadas en parte de pago */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bike className="size-4 text-emerald-600 dark:text-emerald-300" />
              Motos entregadas ({cliente.motosEntregadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.motosEntregadas.length === 0 ? (
              <p className="text-sm text-gray-400">Sin motos entregadas en parte de pago</p>
            ) : (
              <ul className="space-y-2">
                {cliente.motosEntregadas.map((m) => (
                  <li key={m.id} className="text-sm">
                    <Link
                      href={`/admin/modelos/${m.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900 rounded p-2 -m-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {m.slug}
                        </p>
                        <p className="font-medium">
                          {m.marca} {m.nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {[
                            m.anio,
                            m.kilometros ? `${m.kilometros.toLocaleString("es-AR")} km` : null,
                            m.precio ? formatMoney(m.precio, m.moneda) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          m.vendida
                            ? "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
                            : m.activo
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                              : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                        }
                      >
                        {m.vendida ? "Vendida" : m.activo ? "Activa" : "Pendiente"}
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
