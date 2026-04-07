import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { formatPrice } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Search } from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function toggleProductoActivo(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const activo = formData.get("activo") === "true"
  await prisma.producto.update({
    where: { id },
    data: { activo: !activo },
  })
  revalidatePath("/admin/productos")
}

async function updatePrecio(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const precio = parseInt(formData.get("precio") as string, 10)
  if (isNaN(precio) || precio < 0) return
  await prisma.producto.update({
    where: { id },
    data: { precio },
  })
  revalidatePath("/admin/productos")
}

async function updateStock(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const stock = parseInt(formData.get("stock") as string, 10)
  if (isNaN(stock) || stock < 0) return
  await prisma.producto.update({
    where: { id },
    data: { stock },
  })
  revalidatePath("/admin/productos")
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { q, cat } = await searchParams

  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: "asc" },
  })

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { codigo: { contains: q, mode: "insensitive" } },
    ]
  }
  if (cat) {
    where.categoriaId = cat
  }

  const productos = await prisma.producto.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { categoria: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {productos.length} producto(s)
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B6F9A] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por nombre o codigo..."
            className="pl-10"
          />
        </div>
        {cat && <input type="hidden" name="cat" value={cat} />}
        <button type="submit" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Buscar
        </button>
      </form>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/productos${q ? `?q=${q}` : ""}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !cat
              ? "bg-[#6B4F7A] text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Todas
        </Link>
        {categorias.map((c) => (
          <Link
            key={c.id}
            href={`/admin/productos?cat=${c.id}${q ? `&q=${q}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              cat === c.id
                ? "bg-[#6B4F7A] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {c.nombre}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-36">Precio</TableHead>
              <TableHead className="w-28">Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No hay productos {q ? `que coincidan con "${q}"` : "cargados"}
                </TableCell>
              </TableRow>
            ) : (
              productos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell>
                    {producto.fotos[0] ? (
                      <Image
                        src={producto.fotos[0]}
                        alt={producto.nombre}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        Sin foto
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-xs text-gray-500">{producto.codigo || producto.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{producto.categoria.nombre}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={updatePrecio} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={producto.id} />
                      <Input
                        name="precio"
                        type="number"
                        defaultValue={producto.precio}
                        className="w-28 h-8 text-sm"
                        min={0}
                      />
                      <button type="submit" className="text-xs text-[#6B4F7A] hover:underline whitespace-nowrap">
                        OK
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={updateStock} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={producto.id} />
                      <Input
                        name="stock"
                        type="number"
                        defaultValue={producto.stock}
                        className="w-20 h-8 text-sm"
                        min={0}
                      />
                      <button type="submit" className="text-xs text-[#6B4F7A] hover:underline whitespace-nowrap">
                        OK
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={toggleProductoActivo}>
                      <input type="hidden" name="id" value={producto.id} />
                      <input type="hidden" name="activo" value={String(producto.activo)} />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            producto.activo
                              ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {producto.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/productos/${producto.id}`}
                      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#6B4F7A] transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
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
