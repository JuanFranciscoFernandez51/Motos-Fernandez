import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { ModelosList } from "./modelos-list"
import { invalidateModelos } from "@/lib/cached-queries"
import { crearFinanciacionDesdeOC } from "@/lib/financiacion-helpers"
import { checklistPermutaTexto } from "@/lib/admin-helpers"
import { crearMandatoDesdePermuta } from "@/lib/mandato-helpers"
import { manejarVentaDeMoto } from "@/lib/venta-moto-helpers"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"

export const dynamic = "force-dynamic"

async function toggleActivo(id: string, activoActual: boolean) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: { activo: !activoActual },
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

async function updateEtiqueta(id: string, etiqueta: string | null) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: { etiqueta: etiqueta || null },
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  invalidateModelos()
}

async function updateProveedorModelo(id: string, proveedorId: string | null) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: { proveedorId: proveedorId || null },
  })
  revalidatePath("/admin/modelos")
}

// Whitelist de campos editables inline desde la lista
const CAMPOS_EDITABLES_STRING = new Set([
  "nombre",
  "marca",
  "condicion",
  "moneda",
])
const CAMPOS_EDITABLES_NUMBER = new Set([
  "kilometros",
  "precio",
  "anio",
])

async function updateCampoModelo(
  id: string,
  field: string,
  value: string | number | null
) {
  "use server"
  const data: Record<string, string | number | null> = {}

  if (CAMPOS_EDITABLES_STRING.has(field)) {
    data[field] = typeof value === "string" ? value.trim() || null : null
  } else if (CAMPOS_EDITABLES_NUMBER.has(field)) {
    data[field] = typeof value === "number" ? value : null
  } else {
    throw new Error(`Campo ${field} no es editable`)
  }

  await prisma.modelo.update({
    where: { id },
    data,
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

async function updateFotos(id: string, fotos: string[]) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: { fotos },
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

async function markVendida(id: string, vendida: boolean) {
  "use server"
  if (vendida) {
    // 0KM clona como unidad vendida; USADA se marca directamente.
    // El padre 0KM queda activo en stock.
    const { modeloIdFinal, esClon } = await prisma.$transaction(async (tx) =>
      manejarVentaDeMoto(tx, { modeloId: id })
    )
    // Side-effects en redes: solo despublicar si la moto vendida es la
    // visible en catálogo (= no es 0KM, o sea el padre se mantiene).
    if (!esClon) {
      const { despublicarAlVender } = await import("@/lib/ml/publication")
      const { marcarVendidaEnMeta } = await import("@/lib/meta/publication")
      await Promise.allSettled([
        despublicarAlVender(modeloIdFinal),
        marcarVendidaEnMeta(modeloIdFinal),
      ])
    }
  } else {
    // Desmarcar: solo aplica al modelo que está marcado como vendida.
    // Si era un clon, mejor borrarlo manual desde la lista.
    await prisma.modelo.update({
      where: { id },
      data: { vendida: false, fechaVenta: null },
    })
  }
  revalidatePath("/admin/modelos")
  revalidatePath("/admin/ml")
  revalidatePath("/admin/meta")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

// Server action: crear OC desde el catálogo (con cliente, parte de pago, etc.)
type PermutaInput = {
  marca: string | null
  modelo: string | null
  anio: number | null
  kilometros: number | null
  patente: string | null
  chasis: string | null
  motor: string | null
  descripcion: string | null
  valor: number | null
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

type CrearOCDesdeModeloInput = {
  modeloId: string
  clienteId: string
  precioVenta: number
  moneda: string
  formaPago: string
  sena: number | null
  saldo: number | null
  detallePago: string | null
  estado: "BORRADOR" | "RESERVADA" | "CONCRETADA"
  observaciones: string | null
  // Permutas (N) — cada una puede o no subirse al stock
  permutas: PermutaInput[]
  // Financiación
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
  // Garante (opcional, solo si hay financiación)
  garanteNombre: string | null
  garanteApellido: string | null
  garanteDni: string | null
  garanteTelefono: string | null
  garanteDireccion: string | null
}

async function crearOCDesdeModelo(input: CrearOCDesdeModeloInput) {
  "use server"
  try {
    // Buscar la moto a vender para snapshot
    const modelo = await prisma.modelo.findUnique({
      where: { id: input.modeloId },
      select: {
        id: true,
        nombre: true,
        marca: true,
        anio: true,
        kilometros: true,
        chasis: true,
        motor: true,
        patente: true,
      },
    })
    if (!modelo) return { error: "Moto no encontrada" }

    const motoDescripcion = `${modelo.marca} ${modelo.nombre}${modelo.anio ? ` ${modelo.anio}` : ""}`

    // Resumen agregado de las permutas (suma valores + texto resumen) para
    // los campos legacy permutaDescripcion/permutaValor (compat con OCs viejas).
    const sumaPermutas = input.permutas.reduce((s, p) => s + (p.valor || 0), 0) || null
    const resumenPermutas =
      input.permutas.length > 0
        ? input.permutas
            .map((p, i) => {
              const partes = [p.marca, p.modelo, p.anio ? String(p.anio) : null]
                .filter(Boolean)
                .join(" ")
              return `${i + 1}) ${partes || "Permuta"} — $${(p.valor ?? 0).toLocaleString("es-AR")}`
            })
            .join("\n")
        : null

    // Transaction: todo o nada
    const result = await prisma.$transaction(async (tx) => {
      // 1) Crear la OC
      const orden = await tx.ordenCompra.create({
        data: {
          clienteId: input.clienteId,
          modeloId: input.modeloId,
          motoDescripcion,
          motoChasis: modelo.chasis,
          motoMotor: modelo.motor,
          motoPatente: modelo.patente,
          motoAnio: modelo.anio,
          motoKilometros: modelo.kilometros,
          precioVenta: input.precioVenta,
          moneda: input.moneda,
          formaPago: input.formaPago,
          sena: input.sena,
          saldo: input.saldo,
          detallePago: input.detallePago,
          // Legacy: agregamos resumen y suma para compat con código que aún lee
          // estos campos. La fuente de verdad ahora es la tabla OCPermuta.
          permutaDescripcion: resumenPermutas,
          permutaValor: sumaPermutas,
          cuotas: input.cuotas,
          valorCuota: input.valorCuota,
          entrega: input.entrega,
          estado: input.estado,
          observaciones: input.observaciones,
          fecha: new Date(),
        },
      })

      // 2) Crear cada permuta (con o sin subir al stock)
      // Calculo el siguiente slug mf-XXXX una sola vez, e incremento por cada
      // moto que tenga subirAlStock=true.
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

      const motosRecibidasIds: string[] = []
      for (const p of input.permutas) {
        let motoRecibidaId: string | null = null
        const checklistTxt = checklistPermutaTexto(p)
        // Siempre cargar al catalogo si hay marca + modelo (la moto queda inactiva)
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
              precio: p.valor,
              moneda: input.moneda,
              activo: false,
              fotos: [placeholderFoto],
              origen: "PARTE_DE_PAGO",
              clienteEntregaId: input.clienteId,
              ordenCompraOrigenId: orden.id,
              etiqueta: null,
              notasInternas: checklistTxt
                ? `Checklist al recibir (de OC):\n${checklistTxt}`
                : null,
            },
          })
          motoRecibidaId = motoRecibida.id
          motosRecibidasIds.push(motoRecibida.id)
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
            valor: p.valor ?? 0,
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

        // Auto-crear MandatoVenta para trackear la venta de la moto.
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
            valor: p.valor ?? 0,
            tieneTitulo: p.tieneTitulo,
            tieneManual: p.tieneManual,
            tieneSegundaLlave: p.tieneSegundaLlave,
            tieneVtv: p.tieneVtv,
            accesoriosExtra: p.accesoriosExtra,
          },
        })
      }
      // Compat: si hay al menos una moto recibida, linkeamos la PRIMERA en
      // el campo legacy motoRecibidaId de OC (para que código viejo no se rompa).
      if (motosRecibidasIds.length > 0) {
        await tx.ordenCompra.update({
          where: { id: orden.id },
          data: { motoRecibidaId: motosRecibidasIds[0] },
        })
      }

      // 3) Side effects sobre la moto vendida según estado.
      // Para 0KM: el helper clona como unidad vendida (el padre queda activo).
      // Para USADA: marca el modelo original como vendida.
      if (input.estado === "CONCRETADA") {
        await manejarVentaDeMoto(tx, {
          modeloId: input.modeloId,
          clienteId: input.clienteId,
          ordenCompraId: orden.id,
          fechaVenta: orden.fecha,
        })
      } else if (input.estado === "RESERVADA") {
        await tx.modelo.update({
          where: { id: input.modeloId },
          data: { etiqueta: "RESERVADA" },
        })
      }

      // 4) Si tiene financiación → crear planilla en tesorería con garante
      await crearFinanciacionDesdeOC(tx, {
        id: orden.id,
        clienteId: orden.clienteId,
        motoDescripcion: orden.motoDescripcion,
        formaPago: orden.formaPago,
        cuotas: orden.cuotas,
        valorCuota: orden.valorCuota,
        entrega: orden.entrega,
        precioVenta: orden.precioVenta,
        moneda: orden.moneda,
        garanteNombre: input.garanteNombre,
        garanteApellido: input.garanteApellido,
        garanteDni: input.garanteDni,
        garanteTelefono: input.garanteTelefono,
        garanteDireccion: input.garanteDireccion,
      })

      return { ordenId: orden.id, motoRecibidaId: motosRecibidasIds[0] || null }
    })

    revalidatePath("/admin/modelos")
    revalidatePath("/admin/ordenes-compra")
    revalidatePath("/admin/mandatos")
    revalidatePath("/admin/tesoreria")
    revalidatePath("/admin/tesoreria/financiaciones")
    revalidatePath("/catalogo")
    revalidatePath("/")
    invalidateModelos()
    return result
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Error al crear orden de compra",
    }
  }
}

async function deleteModelo(id: string, confirmText: string) {
  "use server"
  const modelo = await prisma.modelo.findUnique({
    where: { id },
    select: { nombre: true, slug: true },
  })
  if (!modelo) {
    throw new Error("Modelo no encontrado")
  }
  const expected = `eliminar ${modelo.nombre}`.toLowerCase().trim()
  const given = confirmText.toLowerCase().trim()
  if (given !== expected) {
    throw new Error(
      `La confirmación no coincide. Esperado: "eliminar ${modelo.nombre}"`
    )
  }
  await prisma.modelo.delete({ where: { id } })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

export default async function ModelosPage() {
  const [modelos, proveedores, clientes] = await Promise.all([
    prisma.modelo.findMany({
      orderBy: [{ slug: "asc" }],
      select: {
        id: true,
        nombre: true,
        slug: true,
        codigo: true,
        marca: true,
        categoriaVehiculo: true,
        condicion: true,
        anio: true,
        kilometros: true,
        precio: true,
        moneda: true,
        fotos: true,
        activo: true,
        orden: true,
        cilindrada: true,
        vendida: true,
        fechaVenta: true,
        etiqueta: true,
        proveedorId: true,
        origen: true,
        clienteEntregaId: true,
      },
    }),
    prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
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
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Modelos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestioná el catálogo de motos, cuatriciclos y vehículos.
          </p>
        </div>
        <Button
          render={<Link href="/admin/modelos/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo modelo
        </Button>
      </div>

      <ModelosList
        modelos={modelos}
        proveedores={proveedores}
        clientes={clientes}
        toggleActivo={toggleActivo}
        updateFotos={updateFotos}
        updateEtiqueta={updateEtiqueta}
        updateCampoModelo={updateCampoModelo}
        updateProveedorModelo={updateProveedorModelo}
        markVendida={markVendida}
        crearOCDesdeModelo={crearOCDesdeModelo}
        deleteModelo={deleteModelo}
      />
    </div>
  )
}
