import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProductoForm } from "@/components/admin/producto-form"
import { invalidateProductos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

async function createProducto(formData: FormData) {
  "use server"

  try {
    const nombre = formData.get("nombre") as string
    const slug = formData.get("slug") as string
    const codigo = (formData.get("codigo") as string) || null
    const precio = parseInt(formData.get("precio") as string, 10)
    const precioOfertaStr = formData.get("precioOferta") as string
    const precioOferta = precioOfertaStr ? parseInt(precioOfertaStr, 10) : null
    const descripcion = (formData.get("descripcion") as string) || null
    const fotos = JSON.parse(formData.get("fotos") as string) as string[]
    const stock = parseInt(formData.get("stock") as string, 10) || 0
    const talles = JSON.parse(formData.get("talles") as string) as string[]
    const stockPorTalle = JSON.parse(formData.get("stockPorTalle") as string)
    const motoCompatible = (formData.get("motoCompatible") as string) || null
    const activo = formData.get("activo") === "true"
    const destacado = formData.get("destacado") === "true"
    const categoriaId = formData.get("categoriaId") as string

    if (isNaN(precio) || precio < 0) return { error: "Precio invalido" }

    await prisma.producto.create({
      data: {
        nombre,
        slug,
        codigo,
        precio,
        precioOferta,
        descripcion,
        fotos,
        stock,
        talles,
        stockPorTalle: talles.length > 0 ? stockPorTalle : undefined,
        motoCompatible,
        activo,
        destacado,
        categoriaId,
      },
    })

    revalidatePath("/admin/productos")
    invalidateProductos()
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear el producto"
    return { error: message }
  }
}

export default async function NuevoProductoPage() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  })

  return <ProductoForm categorias={categorias} saveAction={createProducto} />
}
