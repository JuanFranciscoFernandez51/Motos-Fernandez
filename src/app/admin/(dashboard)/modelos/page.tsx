import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { ModelosList } from "./modelos-list"
import { invalidateModelos } from "@/lib/cached-queries"

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
  const [modelos, proveedores] = await Promise.all([
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
      },
    }),
    prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
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
        toggleActivo={toggleActivo}
        updateFotos={updateFotos}
        updateEtiqueta={updateEtiqueta}
        updateCampoModelo={updateCampoModelo}
        updateProveedorModelo={updateProveedorModelo}
        markVendida={markVendida}
        deleteModelo={deleteModelo}
      />
    </div>
  )
}
