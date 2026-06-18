import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { OCForm } from "@/components/admin/operativo/oc-form"
import { invalidateModelos } from "@/lib/cached-queries"
import { crearFinanciacionDesdeOC } from "@/lib/financiacion-helpers"
import { checklistPermutaTexto } from "@/lib/admin-helpers"
import { crearMandatoDesdePermuta } from "@/lib/mandato-helpers"
import { manejarVentaDeMoto, crearModeloDesdeOCSinModelo } from "@/lib/venta-moto-helpers"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"

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

async function createOrdenCompra(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : new Date()
    }

    let permutasInput: PermutaFormPayload[] = []
    try {
      permutasInput = JSON.parse(get("permutas") || "[]")
    } catch {
      permutasInput = []
    }

    let pagosInput: PagoFormPayload[] = []
    try {
      pagosInput = JSON.parse(get("pagos") || "[]")
    } catch {
      pagosInput = []
    }

    const formaPago = get("formaPago") || null
    const hayPermuta = formaPago === "Permuta" || formaPago === "Mixta"
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
      const orden = await tx.ordenCompra.create({
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

      // Crear permutas + motos en stock secuenciales mf-XXXX
      if (permutasInput.length > 0) {
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
          let motoRecibidaId: string | null = null
          const checklistTxt = checklistPermutaTexto(p)
          // Siempre cargar al catalogo si hay marca + modelo (la moto queda inactiva)
          const monedaPermuta = p.moneda || orden.moneda || "ARS"
          if (p.marca && p.modelo) {
            const slug = `mf-${String(proximoMF).padStart(4, "0")}`
            proximoMF++
            const codigo = await generarCodigoModelo(tx, { condicion: "USADA" })
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

          // Auto-crear MandatoVenta para trackear la venta de la moto
          // recibida (cliente: el que entregó, precio mínimo: valor de toma).
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

      // Crear pagos directos
      for (const p of pagosInput) {
        await tx.oCPago.create({
          data: {
            ordenCompraId: orden.id,
            metodo: p.metodo,
            monto: p.monto,
            moneda: p.moneda || orden.moneda || "ARS",
            detalle: p.detalle,
            fecha: p.fecha ? new Date(p.fecha) : null,
          },
        })
      }

      // Side effects según estado.
      // Para 0KM concretada: clona como unidad vendida (padre queda activo).
      // Para USADA concretada: marca el modelo original como vendida.
      // Si la OC no tiene modeloId y se concreta, creamos un modelo
      // "post-mortem" para que la venta quede registrada en stock motos.
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

      // Auto-crear financiación con garante si corresponde
      await crearFinanciacionDesdeOC(tx, {
        ...orden,
        // Capital explicito (si el admin lo cargo en el form)
        montoFinanciado: num("montoFinanciado"),
        // Fecha de la 1a cuota (opcional). Si esta vacia, el helper
        // usa mes siguiente dia 10.
        fechaPrimeraCuota: get("fechaPrimeraCuota") || null,
        garanteNombre: get("garanteNombre") || null,
        garanteApellido: get("garanteApellido") || null,
        garanteDni: get("garanteDni") || null,
        garanteTelefono: get("garanteTelefono") || null,
        garanteDireccion: get("garanteDireccion") || null,
      })

      return orden
    })

    revalidatePath("/admin/ordenes-compra")
    revalidatePath("/admin/modelos")
    revalidatePath("/admin/mandatos")
    revalidatePath("/admin/tesoreria")
    revalidatePath("/admin/tesoreria/financiaciones")
    revalidatePath("/catalogo")
    if (orden.modeloId) invalidateModelos()
    return { id: orden.id }
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Error al crear orden de compra",
    }
  }
}

export default async function NuevaOrdenCompraPage() {
  const [clientes, modelos] = await Promise.all([
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
  return <OCForm clientes={clientes} modelos={modelos} saveAction={createOrdenCompra} />
}
