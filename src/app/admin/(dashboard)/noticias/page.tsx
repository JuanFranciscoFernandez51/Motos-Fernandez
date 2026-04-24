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
import { Plus, Pencil, Newspaper } from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function togglePublicado(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const publicado = formData.get("publicado") === "true"
  await prisma.noticia.update({
    where: { id },
    data: { publicado: !publicado },
  })
  revalidatePath("/admin/noticias")
}

async function toggleDestacado(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const destacado = formData.get("destacado") === "true"
  await prisma.noticia.update({
    where: { id },
    data: { destacado: !destacado },
  })
  revalidatePath("/admin/noticias")
}

export default async function NoticiasPage() {
  const noticias = await prisma.noticia.findMany({
    orderBy: { fechaPublicacion: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Noticias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {noticias.length} noticia(s)
          </p>
        </div>
        <Button render={<Link href="/admin/noticias/nueva" />} className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
          <Plus className="h-4 w-4 mr-2" />
          Nueva noticia
        </Button>
      </div>

      <div className="rounded-lg border bg-white dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Imagen</TableHead>
              <TableHead>Titulo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead>Destacado</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {noticias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay noticias cargadas
                </TableCell>
              </TableRow>
            ) : (
              noticias.map((noticia) => (
                <TableRow key={noticia.id}>
                  <TableCell>
                    {noticia.imagen ? (
                      <Image
                        src={noticia.imagen}
                        alt={noticia.titulo}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400 text-xs">
                        Sin img
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{noticia.titulo}</p>
                      {noticia.resumen && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{noticia.resumen}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {noticia.categoria ? (
                      <Badge variant="outline" className="text-xs">
                        {noticia.categoria}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {noticia.fechaPublicacion.toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <form action={togglePublicado}>
                      <input type="hidden" name="id" value={noticia.id} />
                      <input type="hidden" name="publicado" value={String(noticia.publicado)} />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            noticia.publicado
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {noticia.publicado ? "Publicado" : "Borrador"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={toggleDestacado}>
                      <input type="hidden" name="id" value={noticia.id} />
                      <input type="hidden" name="destacado" value={String(noticia.destacado)} />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            noticia.destacado
                              ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 cursor-pointer hover:bg-yellow-200"
                              : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {noticia.destacado ? "Destacado" : "Normal"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/noticias/${noticia.id}`} />}>
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
