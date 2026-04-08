import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { formatPrice, CATEGORIAS_VEHICULO, CATEGORIA_VEHICULO_LABELS } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import { Bike, Search } from "lucide-react"
import type { Metadata } from "next"
import { CatalogoClient } from "./catalogo-client"

export const metadata: Metadata = {
  title: "Modelos | Catalogo de motos, cuatriciclos, UTV y motos de agua",
  description:
    "Explora nuestro catalogo completo de motocicletas, cuatriciclos, UTV y motos de agua. Las mejores marcas con financiacion en Bahia Blanca.",
}

async function getModels() {
  try {
    return await prisma.modelo.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { colores: true },
    })
  } catch {
    return []
  }
}

async function getBrands() {
  try {
    const brands = await prisma.modelo.findMany({
      where: { activo: true },
      select: { marca: true },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
    })
    return brands.map((b) => b.marca)
  } catch {
    return []
  }
}

export default async function ModelosPage() {
  const [models, brands] = await Promise.all([getModels(), getBrands()])

  return (
    <>
      <TrackVisita pagina="catalogo" />
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Catalogo de Modelos
          </h1>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Encuentra el vehiculo perfecto para vos. Filtra por categoria, marca o busca directamente.
          </p>
        </div>
      </section>

      {/* Catalog */}
      <section className="py-12 bg-[#F0F0F0] min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogoClient
            models={JSON.parse(JSON.stringify(models))}
            brands={brands}
          />
        </div>
      </section>
    </>
  )
}
