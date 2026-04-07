import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NoticiaForm } from "@/components/admin/noticia-form"

export const dynamic = "force-dynamic"

async function createNoticia(formData: FormData) {
  "use server"

  try {
    const titulo = formData.get("titulo") as string
    const slug = formData.get("slug") as string
    const resumen = formData.get("resumen") as string
    const contenido = formData.get("contenido") as string
    const imagen = formData.get("imagen") as string
    const categoria = formData.get("categoria") as string
    const publicado = formData.get("publicado") === "true"
    const destacado = formData.get("destacado") === "true"
    const fechaPublicacionStr = formData.get("fechaPublicacion") as string

    await prisma.noticia.create({
      data: {
        titulo,
        slug,
        resumen: resumen || null,
        contenido,
        imagen: imagen || null,
        categoria: categoria || null,
        publicado,
        destacado,
        fechaPublicacion: fechaPublicacionStr
          ? new Date(fechaPublicacionStr)
          : new Date(),
      },
    })

    revalidatePath("/admin/noticias")
    revalidatePath("/noticias")
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear la noticia"
    return { error: message }
  }

  redirect("/admin/noticias")
}

export default function NuevaNoticiaPage() {
  return <NoticiaForm saveAction={createNoticia} />
}
