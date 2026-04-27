import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TestimonioForm } from "@/components/admin/testimonio-form"
import { invalidateTestimonios } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

async function createTestimonio(formData: FormData) {
  "use server"

  try {
    const nombre = formData.get("nombre") as string
    const ubicacion = formData.get("ubicacion") as string
    const modelo = formData.get("modelo") as string
    const ratingStr = formData.get("rating") as string
    const contenido = formData.get("contenido") as string
    const foto = formData.get("foto") as string
    const destacado = formData.get("destacado") === "true"
    const publicado = formData.get("publicado") === "true"
    const orden = parseInt(formData.get("orden") as string) || 0

    if (!nombre?.trim()) {
      return { error: "El nombre es obligatorio" }
    }
    if (!contenido?.trim()) {
      return { error: "El contenido del testimonio es obligatorio" }
    }

    const rating = Math.min(5, Math.max(1, parseInt(ratingStr) || 5))

    await prisma.testimonio.create({
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
    invalidateTestimonios()
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear el testimonio"
    return { error: message }
  }
}

export default function NuevoTestimonioPage() {
  return <TestimonioForm saveAction={createTestimonio} />
}
