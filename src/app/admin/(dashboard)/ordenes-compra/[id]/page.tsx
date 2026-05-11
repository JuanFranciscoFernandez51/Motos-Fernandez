import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { OCForm } from "@/components/admin/operativo/oc-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatNumero,
  ESTADO_OC_STYLES,
  ESTADO_OC_LABELS,
} from "@/lib/admin-helpers"
import { FileText, CheckCircle, Trash2, Download, PartyPopper } from "lucide-react"
import { invalidateModelos } from "@/lib/cached-queries"
import { crearFinanciacionDesdeOC } from "@/lib/financiacion-helpers"
import { checklistPermutaTexto } from "@/lib/admin-helpers"
import { crearMandatoDesdePermuta } from "@/lib/mandato-helpers"

export const dynamic = "force-dynamic"

type PermutaFormPayload = {
  id: string | null
  marca: string | null
  modelo: string | null
  anio: number | null
  kilometros: number | null
  patente: string | null
  chasis: string | null
  motor: string | null
  descripcion: string | null
  valor: number
  motoRecibidaId: string | null
  subirAlStock: boolean
  tieneTitulo?: boolean
  tieneManual?: boolean
  tieneSegundaLlave?: boolean
  tieneCasco?: boolean
  tieneVtv?: boolean
  tieneSeguro?: boolean
  tieneFactura?: boolean
  tieneFichaTecnica?: boolean
  accesoriosExtra?: string | null
}

type PagoFormPayload = {
  id: string | null
  metodo: string
  monto: number
  detalle: string | null
  fecha: string | null
}

async function updateOrden(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : new Date()
    }

    // Parsear permutas + garante
    let permutasInput: PermutaFormPayload[] = []
    try {
      permutasInput = JSON.parse(get("permutas") || "[]")
    } catch {
      permutasInput = []
    }

    // Parsear pagos directos (efectivo, transfer, tarjeta, etc)
    let pagosInput: PagoFormPayload[] = []
    try {
      pagosInput = JSON.parse(get("pagos") || "[]")
    } catch {
      pagosInput = []
    }

    const formaPago = get("formaPago") || null
    const hayPermuta = formaPago === "Permuta" || formaPago === "Mixta"
    const hayFin = formaPago === "Financiado" || formaPago === "Mixta"

    // Resumen agregado de permutas para campos legacy
    const sumaPermutas = hayPermuta
      ? permutasInput.reduce((s, p) => s + (p.valor || 0), 0) || null
      : null
    const resumenPermutas = hayPermuta && permutasInput.length > 0
      ? permutasInput
          .map((p, i) => {
            const partes = [p.marca, p.modelo, p.anio ? String(p.anio) : null]
              .filter(Boolean)
              .join(" ")
            return `${i + 1}) ${partes || "Permuta"} — $${(p.valor ?? 0).toLocaleString("es-AR")}`
          })
          .join("\n")
      : null

    const orden = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.update({
        where: { id },
        data: {
          clienteId: get("clienteId"),
          modeloId: get("modeloId") || null,
          motoDescripcion: get("motoDescripcion"),
          motoChasis: get("motoChasis") || null,
          motoMotor: get("motoMotor") || null,
          motoPatente: get("motoPatente") || null,
          motoAnio: num("motoAnio"),
          motoKilometros: num("motoKilometros"),
          precioVenta: num("precioVenta") ?? 0,
          moneda: get("moneda") || "ARS",
          formaPago,
          sena: num("sena"),
          saldo: num("saldo"),
          detallePago: get("detallePago") || null,
          permutaDescripcion: resumenPermutas,
          permutaValor: sumaPermutas,
          cuotas: num("cuotas"),
          valorCuota: num("valorCuota"),
          entrega: num("entrega"),
          fecha: date("fecha"),
          estado: (get("estado") || "BORRADOR") as
            | "BORRADOR"
            | "RESERVADA"
            | "CONCRETADA"
            | "CANCELADA",
          observaciones: get("observaciones") || null,
        },
      })

      // Sincronizar permutas: borrar las que ya no estan, actualizar las que tienen id, crear las nuevas
      const idsEnviados = new Set(permutasInput.filter((p) => p.id).map((p) => p.id as string))
      // Borrar permutas que estaban antes pero ya no estan
      // OJO: si una permuta tiene motoRecibidaId, NO la borro (rompería la moto del catálogo)
      const existentes = await tx.oCPermuta.findMany({
        where: { ordenCompraId: id },
        select: { id: true, motoRecibidaId: true },
      })
      const aBorrar = existentes.filter(
        (e) => !idsEnviados.has(e.id) && !e.motoRecibidaId
      )
      if (aBorrar.length > 0) {
        await tx.oCPermuta.deleteMany({
          where: { id: { in: aBorrar.map((e) => e.id) } },
        })
      }

      // Calculo el siguiente slug mf-XXXX para permutas nuevas que se suban al stock
      const ultimosMF = await tx.modelo.findMany({
        where: { slug: { startsWith: "mf-" } },
        select: { slug: true },
      })
      const numerosMF = ultimosMF
        .map((m) => {
          const match = m.slug.match(/^mf-(\d+)$/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((n) => n > 0)
      let proximoMF = numerosMF.length > 0 ? Math.max(...numerosMF) + 1 : 1
      const placeholderFoto = "/images/logo-clasico.png"

      for (const p of permutasInput) {
        if (p.id) {
          // Update permuta existente — NO toco motoRecibidaId (la moto del catálogo
          // se edita aparte para no desincronizar)
          await tx.oCPermuta.update({
            where: { id: p.id },
            data: {
              marca: p.marca,
              modelo: p.modelo,
              anio: p.anio,
              kilometros: p.kilometros,
              patente: p.patente,
              chasis: p.chasis,
              motor: p.motor,
              descripcion: p.descripcion,
              valor: p.valor,
              tieneTitulo: !!p.tieneTitulo,
              tieneManual: !!p.tieneManual,
              tieneSegundaLlave: !!p.tieneSegundaLlave,
              tieneCasco: !!p.tieneCasco,
              tieneVtv: !!p.tieneVtv,
              tieneSeguro: !!p.tieneSeguro,
              tieneFactura: !!p.tieneFactura,
              tieneFichaTecnica: !!p.tieneFichaTecnica,
              accesoriosExtra: p.accesoriosExtra || null,
            },
          })
        } else {
          // Permuta nueva. Siempre cargar al catalogo si hay marca + modelo
          // (la moto queda inactiva hasta que el admin la habilite).
          let motoRecibidaId: string | null = null
          const checklistTxt = checklistPermutaTexto(p)
          if (p.marca && p.modelo) {
            const slug = `mf-${String(proximoMF).padStart(4, "0")}`
            proximoMF++
            const motoRecibida = await tx.modelo.create({
              data: {
                nombre: p.modelo,
                slug,
                marca: p.marca,
                condicion: "USADA",
                anio: p.anio,
                kilometros: p.kilometros,
                patente: p.patente,
                chasis: p.chasis,
                motor: p.motor,
                precio: p.valor,
                moneda: orden.moneda,
                activo: false,
                fotos: [placeholderFoto],
                origen: "PARTE_DE_PAGO",
                clienteEntregaId: orden.clienteId,
                ordenCompraOrigenId: orden.id,
                etiqueta: null,
                notasInternas: checklistTxt
                  ? `Checklist al recibir (de OC):\n${checklistTxt}`
                  : null,
              },
            })
            motoRecibidaId = motoRecibida.id
          }
          await tx.oCPermuta.create({
            data: {
              ordenCompraId: orden.id,
              marca: p.marca,
              modelo: p.modelo,
              anio: p.anio,
              kilometros: p.kilometros,
              patente: p.patente,
              chasis: p.chasis,
              motor: p.motor,
              descripcion: p.descripcion,
              valor: p.valor,
              motoRecibidaId,
              tieneTitulo: !!p.tieneTitulo,
              tieneManual: !!p.tieneManual,
              tieneSegundaLlave: !!p.tieneSegundaLlave,
              tieneCasco: !!p.tieneCasco,
              tieneVtv: !!p.tieneVtv,
              tieneSeguro: !!p.tieneSeguro,
              tieneFactura: !!p.tieneFactura,
              tieneFichaTecnica: !!p.tieneFichaTecnica,
              accesoriosExtra: p.accesoriosExtra || null,
            },
          })

          // Auto-crear MandatoVenta para esta permuta nueva.
          // No se crea cuando UPDATE-amos una permuta ya existente (no
          // queremos duplicar el mandato si el admin solo está editando).
          await crearMandatoDesdePermuta(tx, {
            clienteId: orden.clienteId,
            ordenCompraId: orden.id,
            modeloId: motoRecibidaId,
            fecha: orden.fecha,
            moneda: orden.moneda,
            permuta: {
              marca: p.marca,
              modelo: p.modelo,
              anio: p.anio,
              kilometros: p.kilometros,
              patente: p.patente,
              chasis: p.chasis,
              motor: p.motor,
              descripcion: p.descripcion,
              valor: p.valor,
              tieneTitulo: p.tieneTitulo,
              tieneManual: p.tieneManual,
              tieneSegundaLlave: p.tieneSegundaLlave,
              tieneVtv: p.tieneVtv,
              accesoriosExtra: p.accesoriosExtra,
            },
          })
        }
      }

      // Sincronizar pagos directos: delete los que no estan, update id existentes,
      // create los nuevos. No hay efectos colaterales (a diferencia de las permutas
      // que crean motos), así que es más simple.
      const pagosIdsEnviados = new Set(
        pagosInput.filter((p) => p.id).map((p) => p.id as string)
      )
      const pagosExistentes = await tx.oCPago.findMany({
        where: { ordenCompraId: id },
        select: { id: true },
      })
      const pagosABorrar = pagosExistentes
        .filter((e) => !pagosIdsEnviados.has(e.id))
        .map((e) => e.id)
      if (pagosABorrar.length > 0) {
        await tx.oCPago.deleteMany({ where: { id: { in: pagosABorrar } } })
      }
      for (const p of pagosInput) {
        const fecha = p.fecha ? new Date(p.fecha) : null
        if (p.id) {
          await tx.oCPago.update({
            where: { id: p.id },
            data: {
              metodo: p.metodo,
              monto: p.monto,
              detalle: p.detalle,
              fecha,
            },
          })
        } else {
          await tx.oCPago.create({
            data: {
              ordenCompraId: orden.id,
              metodo: p.metodo,
              monto: p.monto,
              detalle: p.detalle,
              fecha,
            },
          })
        }
      }

      if (orden.modeloId) {
        if (orden.estado === "CONCRETADA") {
          await tx.modelo.update({
            where: { id: orden.modeloId },
            data: { vendida: true, fechaVenta: orden.fecha, activo: false },
          })
        } else if (orden.estado === "RESERVADA") {
          await tx.modelo.update({
            where: { id: orden.modeloId },
            data: { etiqueta: "RESERVADA" },
          })
        }
      }

      // Crear o actualizar financiación. Si ya existe, solo actualizar el garante.
      const finExistente = await tx.financiacionOC.findUnique({
        where: { ordenCompraId: orden.id },
      })
      if (finExistente && hayFin) {
        await tx.financiacionOC.update({
          where: { id: finExistente.id },
          data: {
            garanteNombre: get("garanteNombre") || null,
            garanteApellido: get("garanteApellido") || null,
            garanteDni: get("garanteDni") || null,
            garanteTelefono: get("garanteTelefono") || null,
            garanteDireccion: get("garanteDireccion") || null,
          },
        })
      } else {
        // No existia: la helper la crea con garante incluido
        await crearFinanciacionDesdeOC(tx, {
          ...orden,
          garanteNombre: get("garanteNombre") || null,
          garanteApellido: get("garanteApellido") || null,
          garanteDni: get("garanteDni") || null,
          garanteTelefono: get("garanteTelefono") || null,
          garanteDireccion: get("garanteDireccion") || null,
        })
      }

      return orden
    })

    revalidatePath("/admin/ordenes-compra")
    revalidatePath("/admin/modelos")
    revalidatePath("/admin/mandatos")
    revalidatePath("/admin/tesoreria")
    revalidatePath("/admin/tesoreria/financiaciones")
    revalidatePath("/catalogo")
    if (orden.modeloId) invalidateModelos()
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

async function marcarConcretada(id: string) {
  "use server"
  const orden = await prisma.ordenCompra.findUnique({ where: { id } })
  if (!orden) return

  await prisma.ordenCompra.update({
    where: { id },
    data: { estado: "CONCRETADA" },
  })

  // Si hay moto del catálogo, marcarla como vendida
  if (orden.modeloId) {
    await prisma.modelo.update({
      where: { id: orden.modeloId },
      data: { vendida: true, fechaVenta: new Date(), activo: false },
    })
  }

  revalidatePath("/admin/ordenes-compra")
  revalidatePath(`/admin/ordenes-compra/${id}`)
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  if (orden.modeloId) invalidateModelos()
}

async function deleteOrden(id: string) {
  "use server"
  await prisma.ordenCompra.delete({ where: { id } })
  revalidatePath("/admin/ordenes-compra")
  redirect("/admin/ordenes-compra")
}

export default async function EditarOrdenCompraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ recien?: string }>
}) {
  const { id } = await params
  const { recien } = await searchParams
  const esReciente = recien === "1"

  const [orden, clientes, modelos] = await Promise.all([
    prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        permutas: { orderBy: { createdAt: "asc" } },
        pagos: { orderBy: { createdAt: "asc" } },
        financiacion: true,
      },
    }),
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        telefono: true,
        email: true,
      },
    }),
    prisma.modelo.findMany({
      orderBy: [{ slug: "asc" }],
      select: {
        id: true,
        slug: true,
        nombre: true,
        marca: true,
        anio: true,
        kilometros: true,
        condicion: true,
        chasis: true,
        motor: true,
        patente: true,
        precio: true,
        moneda: true,
        fotos: true,
        vendida: true,
      },
    }),
  ])

  if (!orden) notFound()

  const toDateInput = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "")

  const initialData = {
    id: orden.id,
    clienteId: orden.clienteId,
    modeloId: orden.modeloId || "",
    motoDescripcion: orden.motoDescripcion,
    motoChasis: orden.motoChasis || "",
    motoMotor: orden.motoMotor || "",
    motoPatente: orden.motoPatente || "",
    motoAnio: orden.motoAnio != null ? String(orden.motoAnio) : "",
    motoKilometros: orden.motoKilometros != null ? String(orden.motoKilometros) : "",
    precioVenta: String(orden.precioVenta),
    moneda: orden.moneda,
    formaPago: orden.formaPago || "Contado",
    sena: orden.sena != null ? String(orden.sena) : "",
    saldo: orden.saldo != null ? String(orden.saldo) : "",
    detallePago: orden.detallePago || "",
    permutaDescripcion: orden.permutaDescripcion || "",
    permutaValor: orden.permutaValor != null ? String(orden.permutaValor) : "",
    cuotas: orden.cuotas != null ? String(orden.cuotas) : "",
    valorCuota: orden.valorCuota != null ? String(orden.valorCuota) : "",
    entrega: orden.entrega != null ? String(orden.entrega) : "",
    fecha: toDateInput(orden.fecha),
    estado: orden.estado,
    observaciones: orden.observaciones || "",
  }

  // Permutas existentes -> shape PermutaForm
  const initialPermutas = orden.permutas.map((p) => ({
    id: p.id,
    marca: p.marca || "",
    modelo: p.modelo || "",
    anio: p.anio != null ? String(p.anio) : "",
    kilometros: p.kilometros != null ? String(p.kilometros) : "",
    patente: p.patente || "",
    chasis: p.chasis || "",
    motor: p.motor || "",
    descripcion: p.descripcion || "",
    valor: String(p.valor),
    motoRecibidaId: p.motoRecibidaId,
    tieneTitulo: p.tieneTitulo,
    tieneManual: p.tieneManual,
    tieneSegundaLlave: p.tieneSegundaLlave,
    tieneCasco: p.tieneCasco,
    tieneVtv: p.tieneVtv,
    tieneSeguro: p.tieneSeguro,
    tieneFactura: p.tieneFactura,
    tieneFichaTecnica: p.tieneFichaTecnica,
    accesoriosExtra: p.accesoriosExtra || "",
  }))

  const initialPagos = orden.pagos.map((p) => ({
    id: p.id,
    metodo: p.metodo,
    monto: String(p.monto),
    detalle: p.detalle || "",
    fecha: p.fecha ? p.fecha.toISOString().split("T")[0] : "",
  }))

  const initialGarante = orden.financiacion
    ? {
        nombre: orden.financiacion.garanteNombre || "",
        apellido: orden.financiacion.garanteApellido || "",
        dni: orden.financiacion.garanteDni || "",
        telefono: orden.financiacion.garanteTelefono || "",
        direccion: orden.financiacion.garanteDireccion || "",
      }
    : undefined

  return (
    <div className="space-y-6">
      {esReciente && (
        <div className="rounded-xl border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <PartyPopper className="size-5" />
            </div>
            <div>
              <p className="font-bold text-green-900">
                ¡Orden de compra registrada con éxito!
              </p>
              <p className="text-sm text-green-800 dark:text-green-300/80 mt-0.5">
                Descargá el boleto de compra-venta para firmarlo con el cliente.
              </p>
            </div>
          </div>
          <a
            href={`/api/pdf/orden-compra/${orden.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 shadow-md"
          >
            <Download className="size-4" />
            Descargar boleto (PDF)
          </a>
        </div>
      )}

      <Card className="border-[#6B4F7A]/30">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Orden de compra</p>
              <p className="font-mono text-lg font-bold text-[#6B4F7A]">
                {formatNumero("OC", orden.numero)}
              </p>
            </div>
            <Badge variant="secondary" className={ESTADO_OC_STYLES[orden.estado]}>
              {ESTADO_OC_LABELS[orden.estado]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/pdf/orden-compra/${orden.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
            >
              <FileText className="size-4" /> Boleto compra-venta
            </a>
            {orden.estado !== "CONCRETADA" && orden.estado !== "CANCELADA" && (
              <form action={marcarConcretada.bind(null, orden.id)}>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="size-4 mr-1" />
                  Marcar como concretada
                </Button>
              </form>
            )}
            <form action={deleteOrden.bind(null, orden.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:bg-red-950/30"
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <OCForm
        initialData={initialData}
        initialPermutas={initialPermutas}
        initialPagos={initialPagos}
        initialGarante={initialGarante}
        clientes={clientes}
        modelos={modelos}
        saveAction={updateOrden}
      />
    </div>
  )
}
