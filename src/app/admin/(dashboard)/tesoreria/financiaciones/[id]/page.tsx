import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumero,
  ESTADO_FINANCIACION_STYLES,
  ESTADO_FINANCIACION_LABELS,
} from "@/lib/admin-helpers"
import { ArrowLeft, User, Bike, Calendar, FileText } from "lucide-react"
import { CuotasTable } from "./cuotas-table"
import { actualizarEstadosVencidos } from "@/lib/financiacion-helpers"

export const dynamic = "force-dynamic"

async function pagarCuota(
  cuotaId: string,
  fechaPago: string,
  metodoPago: string,
  observaciones: string
) {
  "use server"

  const cuota = await prisma.cuotaFinanciacion.update({
    where: { id: cuotaId },
    data: {
      estado: "PAGADA",
      fechaPago: new Date(fechaPago),
      metodoPago: metodoPago || null,
      observaciones: observaciones || null,
    },
    select: { financiacionId: true },
  })

  // Cancelar tareas de outreach pendientes asociadas a esta cuota.
  // Si el admin manda el aviso WhatsApp pero el cliente paga antes de
  // verlo, igual lo seguimos teniendo registrado. Solo marcamos las
  // PROGRAMADA como DESCARTADA con nota indicando que se pago.
  await prisma.outreachTarea.updateMany({
    where: {
      cuotaId,
      estado: "PROGRAMADA",
    },
    data: {
      estado: "DESCARTADA",
      descartadaAt: new Date(),
      notaInterna: "Cancelada automaticamente: la cuota fue pagada.",
    },
  })

  // Si todas las cuotas están pagadas → financiación COMPLETADA
  const allCuotas = await prisma.cuotaFinanciacion.findMany({
    where: { financiacionId: cuota.financiacionId },
    select: { estado: true },
  })
  const allPagadas = allCuotas.every((c) => c.estado === "PAGADA" || c.estado === "CANCELADA")
  if (allPagadas) {
    await prisma.financiacionOC.update({
      where: { id: cuota.financiacionId },
      data: { estado: "COMPLETADA" },
    })
  } else {
    // Si quedan atrasadas → ATRASADA, sino ACTIVA
    const hayAtrasada = allCuotas.some((c) => c.estado === "ATRASADA")
    await prisma.financiacionOC.update({
      where: { id: cuota.financiacionId },
      data: { estado: hayAtrasada ? "ATRASADA" : "ACTIVA" },
    })
  }

  revalidatePath(`/admin/tesoreria/financiaciones/${cuota.financiacionId}`)
  revalidatePath("/admin/tesoreria/financiaciones")
  revalidatePath("/admin/tesoreria")
}

async function desmarcarPago(cuotaId: string) {
  "use server"

  const cuota = await prisma.cuotaFinanciacion.update({
    where: { id: cuotaId },
    data: {
      estado: "PENDIENTE",
      fechaPago: null,
      metodoPago: null,
    },
    select: { financiacionId: true },
  })

  // Reasignar estado de la financiación
  await prisma.financiacionOC.update({
    where: { id: cuota.financiacionId },
    data: { estado: "ACTIVA" },
  })
  await actualizarEstadosVencidos(prisma)

  revalidatePath(`/admin/tesoreria/financiaciones/${cuota.financiacionId}`)
  revalidatePath("/admin/tesoreria/financiaciones")
  revalidatePath("/admin/tesoreria")
}

export default async function FinanciacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await actualizarEstadosVencidos(prisma)

  const financiacion = await prisma.financiacionOC.findUnique({
    where: { id },
    include: {
      cliente: true,
      ordenCompra: {
        select: { id: true, numero: true, motoDescripcion: true, modeloId: true },
      },
      cuotas: {
        orderBy: { numero: "asc" },
      },
    },
  })

  if (!financiacion) notFound()

  const cuotasPagadas = financiacion.cuotas.filter((c) => c.estado === "PAGADA")
  const totalPagado = cuotasPagadas.reduce((s, c) => s + c.monto, 0)
  const saldoPendiente = financiacion.cuotas
    .filter((c) => c.estado !== "PAGADA" && c.estado !== "CANCELADA")
    .reduce((s, c) => s + c.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/admin/tesoreria/financiaciones" />}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="font-mono text-sm text-[#6B4F7A]">
            {formatNumero("FIN", financiacion.numero)}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Financiación
          </h1>
        </div>
        <Badge
          variant="secondary"
          className={`ml-2 ${ESTADO_FINANCIACION_STYLES[financiacion.estado]}`}
        >
          {ESTADO_FINANCIACION_LABELS[financiacion.estado]}
        </Badge>
      </div>

      {/* Info principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="size-4 text-[#6B4F7A]" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/admin/clientes/${financiacion.cliente.id}`}
              className="block hover:underline"
            >
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {financiacion.cliente.apellido}, {financiacion.cliente.nombre}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {financiacion.cliente.dni && `DNI ${financiacion.cliente.dni}`}
              </p>
              {financiacion.cliente.telefono && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  📞 {financiacion.cliente.telefono}
                </p>
              )}
              {financiacion.cliente.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ✉️ {financiacion.cliente.email}
                </p>
              )}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bike className="size-4 text-emerald-600 dark:text-emerald-300" />
              Moto financiada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {financiacion.descripcion || "—"}
            </p>
            {financiacion.ordenCompra && (
              <Link
                href={`/admin/ordenes-compra/${financiacion.ordenCompra.id}`}
                className="text-xs text-[#6B4F7A] hover:underline flex items-center gap-1 mt-1"
              >
                <FileText className="size-3" />
                Ver OC {formatNumero("OC", financiacion.ordenCompra.numero)}
              </Link>
            )}
            {!financiacion.ordenCompra && (
              <p className="text-xs text-gray-400 italic mt-1">
                Financiación cargada manualmente (sin OC asociada)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="size-4 text-blue-600 dark:text-blue-300" />
              Datos del plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total:</span>
              <span className="font-medium">{formatMoney(financiacion.montoTotal, financiacion.moneda)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Entrega:</span>
              <span className="font-medium">{formatMoney(financiacion.entrega, financiacion.moneda)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Cuotas:</span>
              <span className="font-medium">
                {financiacion.cantidadCuotas} × {formatMoney(financiacion.valorCuota, financiacion.moneda)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Inicio:</span>
              <span className="font-medium">{formatDate(financiacion.fechaInicio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Día venc.:</span>
              <span className="font-medium">{financiacion.diaVencimiento} de cada mes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Garante (si fue cargado al crear la financiación) */}
      {(financiacion.garanteNombre ||
        financiacion.garanteApellido ||
        financiacion.garanteDni ||
        financiacion.garanteTelefono ||
        financiacion.garanteDireccion) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="size-4 text-amber-600 dark:text-amber-300" />
              Garante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {(financiacion.garanteNombre || financiacion.garanteApellido) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="font-medium">
                    {[financiacion.garanteApellido, financiacion.garanteNombre]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              )}
              {financiacion.garanteDni && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">DNI</p>
                  <p className="font-medium font-mono">{financiacion.garanteDni}</p>
                </div>
              )}
              {financiacion.garanteTelefono && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="font-medium">{financiacion.garanteTelefono}</p>
                </div>
              )}
              {financiacion.garanteDireccion && (
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Dirección</p>
                  <p className="font-medium">{financiacion.garanteDireccion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de avance */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pagado</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatMoney(totalPagado, financiacion.moneda)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {cuotasPagadas.length} / {financiacion.cantidadCuotas} cuotas
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Saldo pendiente</p>
              <p className="text-2xl font-bold text-[#6B4F7A]">
                {formatMoney(saldoPendiente, financiacion.moneda)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Progreso</p>
              <div className="mt-2 h-3 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-600 transition-all"
                  style={{
                    width: `${(cuotasPagadas.length / financiacion.cantidadCuotas) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round((cuotasPagadas.length / financiacion.cantidadCuotas) * 100)}% completado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de cuotas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuotas</CardTitle>
        </CardHeader>
        <CardContent>
          <CuotasTable
            cuotas={financiacion.cuotas.map((c) => ({
              id: c.id,
              numero: c.numero,
              monto: c.monto,
              fechaVencimiento: c.fechaVencimiento,
              fechaPago: c.fechaPago,
              estado: c.estado,
              metodoPago: c.metodoPago,
              observaciones: c.observaciones,
            }))}
            moneda={financiacion.moneda}
            pagarCuota={pagarCuota}
            desmarcarPago={desmarcarPago}
          />
        </CardContent>
      </Card>

      {financiacion.observaciones && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{financiacion.observaciones}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-400 text-right">
        Creada: {formatDateTime(financiacion.createdAt)}
      </p>
    </div>
  )
}
