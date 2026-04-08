import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatPrice, getWhatsAppUrl, BUSINESS } from "@/lib/constants"
import { ShoppingBag, ArrowLeft, MessageCircle } from "lucide-react"
import { AddToCartButton } from "./add-to-cart-button"
import { TrackVisita } from "@/components/public/track-visita"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producto = await prisma.producto.findUnique({ where: { slug } })
  if (!producto) return { title: "Producto no encontrado" }
  return {
    title: `${producto.nombre} | Tienda Motos Fernandez`,
    description: producto.descripcion || `${producto.nombre} disponible en Motos Fernandez`,
  }
}

export default async function ProductoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producto = await prisma.producto.findUnique({
    where: { slug },
    include: { categoria: true },
  })

  if (!producto || !producto.activo) notFound()

  const related = await prisma.producto.findMany({
    where: { categoriaId: producto.categoriaId, activo: true, id: { not: producto.id } },
    take: 4,
    include: { categoria: true },
  })

  const precio = producto.precioOferta || producto.precio
  const talles = producto.talles || []
  const stockPorTalle = (producto.stockPorTalle as Record<string, number>) || {}

  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      <TrackVisita pagina="producto-detalle" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link href="/tienda" className="inline-flex items-center gap-2 text-sm text-[#6B4F7A] hover:text-[#9B59B6] mb-6">
          <ArrowLeft className="size-4" />
          Volver a la tienda
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl bg-white overflow-hidden">
              {producto.fotos[0] ? (
                <Image
                  src={producto.fotos[0]}
                  alt={producto.nombre}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300">
                  <ShoppingBag className="size-20" />
                </div>
              )}
              {producto.precioOferta && (
                <span className="absolute top-4 right-4 rounded-lg bg-[#9B59B6] px-3 py-1.5 text-sm font-bold text-white">
                  OFERTA
                </span>
              )}
            </div>
            {producto.fotos.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {producto.fotos.slice(1, 5).map((foto, i) => (
                  <div key={i} className="relative aspect-square rounded-lg bg-white overflow-hidden">
                    <Image src={foto} alt={`${producto.nombre} ${i + 2}`} fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-sm font-medium text-[#8B6F9A] uppercase tracking-wider">
              {producto.categoria.nombre}
            </p>
            <h1
              className="mt-2 text-2xl sm:text-3xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {producto.nombre}
            </h1>

            {/* Price */}
            <div className="mt-4">
              {producto.precioOferta ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-[#6B4F7A]">
                    {formatPrice(producto.precioOferta)}
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(producto.precio)}
                  </span>
                  <span className="rounded-md bg-[#9B59B6]/10 px-2 py-0.5 text-sm font-semibold text-[#9B59B6]">
                    -{Math.round(((producto.precio - producto.precioOferta) / producto.precio) * 100)}%
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-[#6B4F7A]">
                  {formatPrice(producto.precio)}
                </span>
              )}
            </div>

            {/* Stock */}
            <p className={`mt-2 text-sm ${producto.stock > 0 ? "text-green-600" : "text-red-500"}`}>
              {producto.stock > 0 ? `${producto.stock} en stock` : "Sin stock"}
            </p>

            {/* Talles */}
            {talles.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Talles disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {talles.map((talle) => {
                    const stock = stockPorTalle[talle] ?? 0
                    return (
                      <div
                        key={talle}
                        className={`flex items-center justify-center rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                          stock > 0
                            ? "border-[#6B4F7A] text-[#6B4F7A] bg-[#6B4F7A]/5"
                            : "border-gray-200 text-gray-300 line-through"
                        }`}
                      >
                        {talle}
                        {stock > 0 && <span className="ml-1.5 text-xs text-gray-400">({stock})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {producto.descripcion && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Descripcion</p>
                <div className="prose prose-sm text-[#4E4B48] max-w-none">
                  <p>{producto.descripcion}</p>
                </div>
              </div>
            )}

            {/* Compatible motos */}
            {producto.motoCompatible && (
              <div className="mt-4 rounded-lg bg-white p-4">
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Motos compatibles</p>
                <p className="text-sm text-[#4E4B48]">{producto.motoCompatible}</p>
              </div>
            )}

            {/* Add to cart */}
            {producto.stock > 0 && (
              <div className="mt-8">
                <AddToCartButton
                  producto={{
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    precioOferta: producto.precioOferta,
                    fotos: producto.fotos,
                    slug: producto.slug,
                    categoriaId: producto.categoriaId,
                    talles: talles,
                    stockPorTalle: stockPorTalle,
                    stock: producto.stock,
                  }}
                />
              </div>
            )}

            {/* WhatsApp CTA */}
            <div className="mt-4 space-y-3">
              <a
                href={getWhatsAppUrl(`Hola! Quiero consultar por: ${producto.nombre} (${formatPrice(precio)})`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#20BD5A] transition-colors"
              >
                <MessageCircle className="size-5" />
                Consultar por WhatsApp
              </a>
              <p className="text-center text-xs text-gray-400">
                Escribinos al {BUSINESS.whatsappDisplay} y te asesoramos
              </p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2
              className="text-xl font-bold text-[#1A1A1A] mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Productos relacionados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/tienda/${prod.slug}`}
                  className="group rounded-xl bg-white overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all flex flex-col"
                >
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {prod.fotos[0] ? (
                      <Image
                        src={prod.fotos[0]}
                        alt={prod.nombre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <ShoppingBag className="size-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs font-medium text-[#8B6F9A] uppercase tracking-wider">
                      {prod.categoria.nombre}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-[#1A1A1A] line-clamp-2 flex-1">
                      {prod.nombre}
                    </h3>
                    <p className="mt-2 text-base font-bold text-[#6B4F7A]">
                      {prod.precioOferta ? formatPrice(prod.precioOferta) : formatPrice(prod.precio)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
