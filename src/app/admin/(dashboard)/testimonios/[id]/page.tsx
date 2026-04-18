import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TestimonioForm } from "@/components/admin/testimonio-form"

export const dynamic = "force-dynamic"

async function updateTestimonio(formData: FormData) {
  "use server"

  try {
    const id = formData.get("id") as string
    const nombre = formData.get("nombre") as string
    const ubicacion = formData.get("ubicacion") as string
    const modelo = formData.get("modelo") as string
    const ratingStr = formData.get("rating") as string
    const contenido = formData.get("contenido") as string
    const foto = formData.get("foto") as string
    const destacado = formData.get("destacado") === "true"
    const publicado = formData.get("publicado") === "true"
    const orden = parseInt(formData.get("orden") as string) || 0

    if (!id) return { error: "Falta el ID del testimonio" }
    if (!nombre?.trim()) return { error: "El nombre es obligatorio" }
    if (!contenido?.trim()) return { error: "El contenido del testimonio es obligatorio" }

    const rating = Math.min(5, Math.max(1, parseInt(ratingStr) || 5))

    await prisma.testimonio.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        ubicacion: ubicacion?.trim() || null,
        modelo: modelo?.trim() || null,
        rating,
        contenido: contenido.trim(),
        foto: foto?.trim() || null,
        destacado,
        publicado,
        orden,
      },
    })

    revalidatePath("/admin/testimonios")
    revalidatePath("/")
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar el testimonio"
    return { error: message }
  }
}

export default async function EditTestimonioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const testimonio = await prisma.testimonio.findUnique({
    where: { id },
  })

  if (!testimonio) notFound()

  const initialData = {
    id: testimonio.id,
    nombre: testimonio.nombre,
    ubicacion: testimonio.ubicacion || "",
    modelo: testimonio.modelo || "",
    rating: testimonio.rating,
    contenido: testimonio.contenido,
    foto: testimonio.foto || "",
    destacado: testimonio.destacado,
    publicado: testimonio.publicado,
    orden: testimonio.orden,
  }

  return <TestimonioForm initialData={initialData} saveAction={updateTestimonio} />
}
