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
import { buscarMotoExistentePorIdentificadores } from "@/lib/moto-dedup-helpers"
import { checklistPermutaTexto } from "@/lib/admin-helpers"
import { crearMandatoDesdePermuta } from "@/lib/mandato-helpers"
import { manejarVentaDeMoto, crearModeloDesdeOCSinModelo } from "@/lib/venta-moto-helpers"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"
import { autoCargarGananciaBruta } from "@/lib/margen-helpers"

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
  moneda?: string
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
  moneda?: string
  detalle: string | null
  fecha: string | null
}

type VentaExtraPayload = {
  id: string | null
  modeloId: string | null
  descripcion: string
  marca: string | null
  anio: number | null
  kilometros: number | null
  patente: string | null
  chasis: string | null
  motor: string | null
  precio: number
  moneda?: string
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

    // Unidades EXTRA vendidas
    let ventasInput: VentaExtraPayload[] = []
    try {
      ventasInput = JSON.parse(get("ventasExtra") || "[]")
    } catch {
      ventasInput = []
    }
    const precioPrincipal = num("precioVenta") ?? 0
    const sumaVentasExtra = ventasInput.reduce((s, v) => s + (v.precio || 0), 0)
    const precioVentaTotal = precioPrincipal + sumaVentasExtra

    const formaPago = get("formaPago") || null
    // formaPago llega calculada por el cliente (no hay select), pero
    // mantenemos lectura defensiva: permutas/financiacion se determinan
    // por la presencia real de los datos para no depender solo del label.
    const hayPermuta =
      permutasInput.length > 0 ||
      formaPago === "Permuta" ||
      formaPago === "Mixta"
    const cuotasInput = num("cuotas")
    const valorCuotaInput = num("valorCuota")
    const hayFin =
      (cuotasInput && cuotasInput > 0 && valorCuotaInput && valorCuotaInput > 0) ||
      formaPago === "Financiado" ||
      formaPago === "Mixta"

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
          precioVenta: precioVentaTotal,
          gananciaBruta: num("gananciaBruta"),
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
          const permutaAct = await tx.oCPermuta.update({
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
              moneda: p.moneda || orden.moneda || "ARS",
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
          // Sincronizar el mandato asociado (es idempotente: update si existe,
          // create si no — por ej. si la permuta es vieja y nunca tuvo mandato).
          await crearMandatoDesdePermuta(tx, {
            ocPermutaId: permutaAct.id,
            clienteId: orden.clienteId,
            ordenCompraId: orden.id,
            modeloId: permutaAct.motoRecibidaId,
            fecha: orden.fecha,
            moneda: permutaAct.moneda || orden.moneda || "ARS",
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
        } else {
          // Permuta nueva. Siempre cargar al catalogo si hay marca + modelo
          // (la moto queda inactiva hasta que el admin la habilite).
          let motoRecibidaId: string | null = null
          const checklistTxt = checklistPermutaTexto(p)
          const monedaPermuta = p.moneda || orden.moneda || "ARS"
          if (p.marca && p.modelo) {
            const slug = `mf-${String(proximoMF).padStart(4, "0")}`
            proximoMF++
            const codigo = await generarCodigoModelo(tx, { condicion: "USADA" })
            const yaExisteMoto = await buscarMotoExistentePorIdentificadores(tx, {
              chasis: p.chasis,
              motor: p.motor,
              patente: p.patente,
            })
            if (yaExisteMoto) {
              // Anti-duplicado: la moto ya estaba en stock → la vinculamos en vez
              // de crear una copia (le cargamos el valor de toma y el origen OC).
              motoRecibidaId = yaExisteMoto.id
              await tx.modelo.update({
                where: { id: yaExisteMoto.id },
                data: {
                  valorToma: p.valor,
                  valorTomaMoneda: monedaPermuta,
                  origen: "PARTE_DE_PAGO",
                  ordenCompraOrigenId: orden.id,
                  clienteEntregaId: orden.clienteId,
                },
              })
            } else {
              const motoRecibida = await tx.modelo.create({
                data: {
                  nombre: p.modelo,
                  slug,
                  codigo,
                  marca: p.marca,
                  condicion: "USADA",
                  anio: p.anio,
                  kilometros: p.kilometros,
                  patente: p.patente,
                  chasis: p.chasis,
                  motor: p.motor,
                  precio: null, // precio de PUBLICACIÓN: a completar en Stock motos
                  moneda: monedaPermuta,
                  valorToma: p.valor, // valor de toma (interno)
                  valorTomaMoneda: monedaPermuta,
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
          }
          const permutaCreada = await tx.oCPermuta.create({
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
              moneda: monedaPermuta,
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

          // Auto-crear MandatoVenta para esta permuta nueva (idempotente).
          await crearMandatoDesdePermuta(tx, {
            ocPermutaId: permutaCreada.id,
            clienteId: orden.clienteId,
            ordenCompraId: orden.id,
            modeloId: motoRecibidaId,
            fecha: orden.fecha,
            moneda: monedaPermuta,
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
        const monedaPago = p.moneda || orden.moneda || "ARS"
        if (p.id) {
          await tx.oCPago.update({
            where: { id: p.id },
            data: {
              metodo: p.metodo,
              monto: p.monto,
              moneda: monedaPago,
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
              moneda: monedaPago,
              detalle: p.detalle,
              fecha,
            },
          })
        }
      }

      if (orden.modeloId) {
        if (orden.estado === "CONCRETADA") {
          await manejarVentaDeMoto(tx, {
            modeloId: orden.modeloId,
            clienteId: orden.clienteId,
            ordenCompraId: orden.id,
            fechaVenta: orden.fecha,
            chasis: orden.motoChasis,
            motor: orden.motoMotor,
            patente: orden.motoPatente,
          })
        } else if (orden.estado === "RESERVADA") {
          await tx.modelo.update({
            where: { id: orden.modeloId },
            data: { etiqueta: "RESERVADA" },
          })
        }
      } else if (orden.estado === "CONCRETADA") {
        // OC concretada sin modelo del catalogo: crear modelo post-mortem
        // (vendida=true, activo=false) para que aparezca en stock motos.
        await crearModeloDesdeOCSinModelo(tx, orden)
      }

      // Sincronizar unidades EXTRA vendidas (OCVenta). Borra las que se
      // quitaron (salvo que ya tengan unidad en stock vinculada), actualiza
      // las existentes y crea las nuevas. El marcado/clonado en stock solo
      // se hace una vez (cuando unidadVendidaId aún es null), para no
      // duplicar clones al re-editar.
      const ventasExistentes = await tx.oCVenta.findMany({
        where: { ordenCompraId: id },
        select: { id: true, unidadVendidaId: true },
      })
      const ventasIdsEnviados = new Set(
        ventasInput.filter((v) => v.id).map((v) => v.id as string)
      )
      const ventasABorrar = ventasExistentes.filter(
        (e) => !ventasIdsEnviados.has(e.id) && !e.unidadVendidaId
      )
      if (ventasABorrar.length > 0) {
        await tx.oCVenta.deleteMany({
          where: { id: { in: ventasABorrar.map((e) => e.id) } },
        })
      }

      const procesarStockUnidad = async (
        v: VentaExtraPayload,
        yaVinculada: string | null
      ): Promise<string | null> => {
        if (yaVinculada) return yaVinculada // ya se procesó antes
        if (!v.modeloId) return null
        if (orden.estado === "CONCRETADA") {
          const r = await manejarVentaDeMoto(tx, {
            modeloId: v.modeloId,
            clienteId: orden.clienteId,
            ordenCompraId: null,
            fechaVenta: orden.fecha,
            chasis: v.chasis,
            motor: v.motor,
            patente: v.patente,
          })
          return r.modeloIdFinal
        }
        if (orden.estado === "RESERVADA") {
          await tx.modelo.update({
            where: { id: v.modeloId },
            data: { etiqueta: "RESERVADA" },
          })
        }
        return null
      }

      for (const v of ventasInput) {
        if (v.id) {
          const prev = ventasExistentes.find((e) => e.id === v.id)
          const unidadVendidaId = await procesarStockUnidad(
            v,
            prev?.unidadVendidaId ?? null
          )
          await tx.oCVenta.update({
            where: { id: v.id },
            data: {
              modeloId: v.modeloId || null,
              descripcion: v.descripcion || "Unidad",
              marca: v.marca || null,
              anio: v.anio,
              kilometros: v.kilometros,
              patente: v.patente || null,
              chasis: v.chasis || null,
              motor: v.motor || null,
              precio: v.precio || 0,
              moneda: v.moneda || orden.moneda || "ARS",
              ...(unidadVendidaId ? { unidadVendidaId } : {}),
            },
          })
        } else {
          const unidadVendidaId = await procesarStockUnidad(v, null)
          await tx.oCVenta.create({
            data: {
              ordenCompraId: orden.id,
              modeloId: v.modeloId || null,
              descripcion: v.descripcion || "Unidad",
              marca: v.marca || null,
              anio: v.anio,
              kilometros: v.kilometros,
              patente: v.patente || null,
              chasis: v.chasis || null,
              motor: v.motor || null,
              precio: v.precio || 0,
              moneda: v.moneda || orden.moneda || "ARS",
              unidadVendidaId,
            },
          })
        }
      }

      // Crear o actualizar financiación. Si ya existe, solo actualizar el garante.
      const finExistente = await tx.financiacionOC.findUnique({
        where: { ordenCompraId: orden.id },
      })
      const montoFinanciadoInput = num("montoFinanciado")
      const fechaPrimeraCuotaInput = get("fechaPrimeraCuota") || null
      if (finExistente && hayFin) {
        // Update lo que vino del form. Si la fecha o cantidad de cuotas
        // cambio Y no hay cuotas PAGADAS aun, regeneramos el cronograma.
        // Si ya hay alguna pagada, ignoramos el cambio de fechas (para
        // no pisar pagos ya registrados).
        const cuotasExistentes = await tx.cuotaFinanciacion.findMany({
          where: { financiacionId: finExistente.id },
          select: { id: true, numero: true, fechaVencimiento: true, estado: true },
          orderBy: { numero: "asc" },
        })
        const hayPagadas = cuotasExistentes.some((c) => c.estado === "PAGADA")
        const fecha1Nueva = fechaPrimeraCuotaInput
          ? new Date(fechaPrimeraCuotaInput)
          : null
        const fecha1Vieja = cuotasExistentes[0]?.fechaVencimiento ?? null
        const fechaCambio =
          !!fecha1Nueva &&
          (!fecha1Vieja ||
            fecha1Nueva.toISOString().slice(0, 10) !==
              fecha1Vieja.toISOString().slice(0, 10))
        const cantCambio =
          cuotasInput != null && cuotasInput !== finExistente.cantidadCuotas
        const valorCambio =
          valorCuotaInput != null && valorCuotaInput !== finExistente.valorCuota

        await tx.financiacionOC.update({
          where: { id: finExistente.id },
          data: {
            ...(montoFinanciadoInput && montoFinanciadoInput > 0
              ? { montoTotal: montoFinanciadoInput }
              : {}),
            cantidadCuotas: cuotasInput ?? finExistente.cantidadCuotas,
            valorCuota: valorCuotaInput ?? finExistente.valorCuota,
            entrega: num("entrega") ?? finExistente.entrega,
            ...(fecha1Nueva
              ? { diaVencimiento: fecha1Nueva.getDate() }
              : {}),
            garanteNombre: get("garanteNombre") || null,
            garanteApellido: get("garanteApellido") || null,
            garanteDni: get("garanteDni") || null,
            garanteTelefono: get("garanteTelefono") || null,
            garanteDireccion: get("garanteDireccion") || null,
          },
        })

        // Regenerar cuotas si cambio algo critico Y nada esta pagado.
        if ((fechaCambio || cantCambio || valorCambio) && !hayPagadas) {
          const cantidadFinal = cuotasInput ?? finExistente.cantidadCuotas
          const valorFinal = valorCuotaInput ?? finExistente.valorCuota
          const base = fecha1Nueva ?? fecha1Vieja ?? new Date()
          base.setHours(0, 0, 0, 0)
          await tx.cuotaFinanciacion.deleteMany({
            where: { financiacionId: finExistente.id },
          })
          const nuevasCuotas = Array.from({ length: cantidadFinal }, (_, i) => {
            const fechaVenc = new Date(base)
            fechaVenc.setMonth(fechaVenc.getMonth() + i)
            return {
              financiacionId: finExistente.id,
              numero: i + 1,
              monto: valorFinal,
              fechaVencimiento: fechaVenc,
              estado: "PENDIENTE" as const,
            }
          })
          await tx.cuotaFinanciacion.createMany({ data: nuevasCuotas })
        }
      } else if (hayFin) {
        // No existia y la OC tiene cuotas: crear la financiacion con
        // capital explicito + garante.
        await crearFinanciacionDesdeOC(tx, {
          ...orden,
          montoFinanciado: montoFinanciadoInput,
          fechaPrimeraCuota: fechaPrimeraCuotaInput,
          garanteNombre: get("garanteNombre") || null,
          garanteApellido: get("garanteApellido") || null,
          garanteDni: get("garanteDni") || null,
          garanteTelefono: get("garanteTelefono") || null,
          garanteDireccion: get("garanteDireccion") || null,
        })
      }

      // Ganancia bruta sugerida si la OC quedó concretada y no tenía una cargada.
      await autoCargarGananciaBruta(tx, orden.id)

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

  await prisma.$transaction(async (tx) => {
    await tx.ordenCompra.update({
      where: { id },
      data: { estado: "CONCRETADA" },
    })
    // Para 0KM: clona como unidad vendida. Para USADA: marca el modelo
    // original como vendida. El padre 0KM queda activo en stock.
    if (orden.modeloId) {
      await manejarVentaDeMoto(tx, {
        modeloId: orden.modeloId,
        clienteId: orden.clienteId,
        ordenCompraId: orden.id,
        fechaVenta: new Date(),
        chasis: orden.motoChasis,
        motor: orden.motoMotor,
        patente: orden.motoPatente,
      })
    } else {
      // OC sin modelo del catálogo: crear modelo post-mortem para que
      // aparezca en /admin/stock-motos pestaña Vendidas.
      await crearModeloDesdeOCSinModelo(tx, { ...orden, fecha: new Date() })
    }

    // Unidades EXTRA: marcar/clonar cada una (solo si aún no se procesó).
    const ventasExtra = await tx.oCVenta.findMany({
      where: { ordenCompraId: id },
    })
    for (const v of ventasExtra) {
      if (v.unidadVendidaId || !v.modeloId) continue
      const r = await manejarVentaDeMoto(tx, {
        modeloId: v.modeloId,
        clienteId: orden.clienteId,
        ordenCompraId: null,
        fechaVenta: new Date(),
        chasis: v.chasis,
        motor: v.motor,
        patente: v.patente,
      })
      await tx.oCVenta.update({
        where: { id: v.id },
        data: { unidadVendidaId: r.modeloIdFinal },
      })
    }

    // Cargar la ganancia bruta sugerida al concretar.
    await autoCargarGananciaBruta(tx, id)
  })

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
        ventas: { orderBy: { createdAt: "asc" } },
        financiacion: {
          // Necesitamos la fecha de la primera cuota para que el form
          // muestre la fecha real al editar.
          include: {
            cuotas: {
              where: { numero: 1 },
              select: { fechaVencimiento: true },
            },
          },
        },
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

  // El precioVenta guardado es el TOTAL. El precio de la unidad principal
  // se deriva restando las unidades extra (para OCs viejas, ventas=[] → total).
  const sumaExtras = orden.ventas.reduce((s, v) => s + v.precio, 0)
  const precioPrincipal = orden.precioVenta - sumaExtras

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
    precioVenta: String(precioPrincipal),
    gananciaBruta: orden.gananciaBruta != null ? String(orden.gananciaBruta) : "",
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
    // El capital lo tomamos del FinanciacionOC asociado. Si no hay, queda "".
    montoFinanciado:
      orden.financiacion?.montoTotal != null
        ? String(orden.financiacion.montoTotal)
        : "",
    // Fecha de la primera cuota (vencimiento) — sale de la cuota numero 1.
    fechaPrimeraCuota:
      orden.financiacion?.cuotas?.[0]?.fechaVencimiento
        ? toDateInput(orden.financiacion.cuotas[0].fechaVencimiento)
        : "",
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
    moneda: p.moneda || orden.moneda || "ARS",
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
    moneda: p.moneda || orden.moneda || "ARS",
    detalle: p.detalle || "",
    fecha: p.fecha ? p.fecha.toISOString().split("T")[0] : "",
  }))

  // Unidades extra existentes -> shape VentaForm
  const initialVentas = orden.ventas.map((v) => ({
    id: v.id,
    modeloId: v.modeloId || "",
    descripcion: v.descripcion || "",
    marca: v.marca || "",
    anio: v.anio != null ? String(v.anio) : "",
    kilometros: v.kilometros != null ? String(v.kilometros) : "",
    patente: v.patente || "",
    chasis: v.chasis || "",
    motor: v.motor || "",
    precio: String(v.precio),
    moneda: v.moneda || orden.moneda || "ARS",
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

      <Card className="border-[#7C3AED]/30">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Orden de compra</p>
              <p className="font-mono text-lg font-bold text-[#7C3AED]">
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
        initialVentas={initialVentas}
        initialGarante={initialGarante}
        clientes={clientes}
        modelos={modelos}
        saveAction={updateOrden}
      />
    </div>
  )
}
