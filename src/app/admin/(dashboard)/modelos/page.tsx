import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { ModelosList } from "./modelos-list"
import { invalidateModelos } from "@/lib/cached-queries"
import { crearFinanciacionDesdeOC } from "@/lib/financiacion-helpers"

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
  await prisma.modelo.update({
    where: { id },
    data: vendida
      ? { vendida: true, fechaVenta: new Date(), activo: false }
      : { vendida: false, fechaVenta: null },
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

// Server action: crear OC desde el catálogo (con cliente, parte de pago, etc.)
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
  // Permuta / parte de pago
  permutaDescripcion: string | null
  permutaValor: number | null
  subirPermutaAStock: boolean
  permutaMarca: string | null
  permutaModelo: string | null
  permutaAnio: number | null
  permutaKm: number | null
  permutaPatente: string | null
  permutaChasis: string | null
  permutaMotor: string | null
  // Financiación
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
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
          permutaDescripcion: input.permutaDescripcion,
          permutaValor: input.permutaValor,
          cuotas: input.cuotas,
          valorCuota: input.valorCuota,
          entrega: input.entrega,
          estado: input.estado,
          observaciones: input.observaciones,
          fecha: new Date(),
        },
      })

      // 2) Si hay parte de pago + se sube a stock → crear nuevo Modelo
      let motoRecibidaId: string | null = null
      if (
        input.subirPermutaAStock &&
        input.permutaMarca &&
        input.permutaModelo
      ) {
        // Generar slug secuencial mf-XXXX continuando el ultimo que haya en
        // el catalogo. Ejemplo: si el ultimo es mf-0023, el nuevo es mf-0024.
        // Si no hay ninguno con ese formato, empieza en mf-0001.
        const ultimosMF = await tx.modelo.findMany({
          where: { slug: { startsWith: "mf-" } },
          select: { slug: true },
        })
        const numeros = ultimosMF
          .map((m) => {
            const match = m.slug.match(/^mf-(\d+)$/i)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter((n) => n > 0)
        const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
        const slug = `mf-${String(proximo).padStart(4, "0")}`

        // Foto placeholder (logo) si no hay foto
        const placeholderFoto = "/images/logo-clasico.png"

        const motoRecibida = await tx.modelo.create({
          data: {
            nombre: input.permutaModelo,
            slug,
            marca: input.permutaMarca,
            condicion: "USADA",
            anio: input.permutaAnio,
            kilometros: input.permutaKm,
            patente: input.permutaPatente,
            chasis: input.permutaChasis,
            motor: input.permutaMotor,
            precio: input.permutaValor,
            moneda: input.moneda,
            // Inactiva por default — Francisco la activa cuando suba fotos buenas
            activo: false,
            fotos: [placeholderFoto],
            // Trazabilidad
            origen: "PARTE_DE_PAGO",
            clienteEntregaId: input.clienteId,
            ordenCompraOrigenId: orden.id,
            // Etiqueta para que se vea que falta info
            etiqueta: null,
          },
        })
        motoRecibidaId = motoRecibida.id

        // Linkear desde la OC
        await tx.ordenCompra.update({
          where: { id: orden.id },
          data: { motoRecibidaId: motoRecibida.id },
        })
      }

      // 3) Side effects sobre la moto vendida según estado
      if (input.estado === "CONCRETADA") {
        await tx.modelo.update({
          where: { id: input.modeloId },
          data: {
            vendida: true,
            fechaVenta: new Date(),
            activo: false,
          },
        })
      } else if (input.estado === "RESERVADA") {
        await tx.modelo.update({
          where: { id: input.modeloId },
          data: { etiqueta: "RESERVADA" },
        })
      }

      // 4) Si tiene financiación → crear planilla en tesorería
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
      })

      return { ordenId: orden.id, motoRecibidaId }
    })

    revalidatePath("/admin/modelos")
    revalidatePath("/admin/ordenes-compra")
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
