import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProductoForm } from "@/components/admin/producto-form"
import { invalidateProductos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

async function updateProducto(formData: FormData) {
  "use server"

  try {
    const id = formData.get("id") as string
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

    await prisma.producto.update({
      where: { id },
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
    invalidateProductos(slug)
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar el producto"
    return { error: message }
  }
}

export default async function EditProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [producto, categorias] = await Promise.all([
    prisma.producto.findUnique({ where: { id } }),
    prisma.categoria.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ])

  if (!producto) notFound()

  const stockPorTalle = (producto.stockPorTalle as Record<string, number>) || {}
  const tallesWithStock = producto.talles.map((talle) => ({
    talle,
    stock: String(stockPorTalle[talle] ?? 0),
  }))

  const initialData = {
    id: producto.id,
    nombre: producto.nombre,
    slug: producto.slug,
    codigo: producto.codigo || "",
    precio: String(producto.precio),
    precioOferta: producto.precioOferta ? String(producto.precioOferta) : "",
    descripcion: producto.descripcion || "",
    fotos: producto.fotos.length ? producto.fotos : [""],
    stock: String(producto.stock),
    talles: tallesWithStock,
    motoCompatible: producto.motoCompatible || "",
    activo: producto.activo,
    destacado: producto.destacado,
    categoriaId: producto.categoriaId,
  }

  return (
    <ProductoForm
      initialData={initialData}
      categorias={categorias}
      saveAction={updateProducto}
    />
  )
}
