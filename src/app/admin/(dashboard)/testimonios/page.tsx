import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Star, User } from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function toggleTestimonioPublicado(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const publicado = formData.get("publicado") === "true"
  await prisma.testimonio.update({
    where: { id },
    data: { publicado: !publicado },
  })
  revalidatePath("/admin/testimonios")
  revalidatePath("/")
}

async function toggleTestimonioDestacado(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const destacado = formData.get("destacado") === "true"
  await prisma.testimonio.update({
    where: { id },
    data: { destacado: !destacado },
  })
  revalidatePath("/admin/testimonios")
  revalidatePath("/")
}

export default async function TestimoniosPage() {
  const testimonios = await prisma.testimonio.findMany({
    orderBy: [{ destacado: "desc" }, { orden: "asc" }, { createdAt: "desc" }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testimonios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {testimonios.length} testimonio(s) cargados
          </p>
        </div>
        <Button
          render={<Link href="/admin/testimonios/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo testimonio
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead className="w-20">Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead>Destacado</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No hay testimonios cargados todavia
                </TableCell>
              </TableRow>
            ) : (
              testimonios.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.orden}</TableCell>
                  <TableCell>
                    {t.foto ? (
                      <Image
                        src={t.foto}
                        alt={t.nombre}
                        width={48}
                        height={48}
                        className="rounded-full object-cover h-12 w-12"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{t.nombre}</p>
                      {t.ubicacion && (
                        <p className="text-xs text-gray-500">{t.ubicacion}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < t.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.modelo ? (
                      <Badge variant="outline">{t.modelo}</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={toggleTestimonioPublicado}>
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        type="hidden"
                        name="publicado"
                        value={String(t.publicado)}
                      />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            t.publicado
                              ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {t.publicado ? "Publicado" : "Oculto"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={toggleTestimonioDestacado}>
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        type="hidden"
                        name="destacado"
                        value={String(t.destacado)}
                      />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            t.destacado
                              ? "bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                              : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {t.destacado ? "Destacado" : "Normal"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/testimonios/${t.id}`} />}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
