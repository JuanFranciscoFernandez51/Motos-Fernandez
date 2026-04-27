import { TiendaClient } from "./tienda-client"
import { TrackVisita } from "@/components/public/track-visita"
import { getProductosTienda, getCategoriasTienda } from "@/lib/cached-queries"

export const metadata = {
  title: "Tienda | Motos Fernandez",
  description: "Accesorios, repuestos, indumentaria y cascos para tu moto. Envío propio a todo el país.",
}

export default async function TiendaPage() {
  const [productos, categorias] = await Promise.all([
    getProductosTienda(),
    getCategoriasTienda(),
  ])

  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 min-h-screen">
      <TrackVisita pagina="tienda" />
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tienda de Accesorios
          </h1>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Cascos, indumentaria, repuestos y accesorios para tu moto. Envío propio a todo el país.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <TiendaClient
          productos={JSON.parse(JSON.stringify(productos))}
          categorias={JSON.parse(JSON.stringify(categorias))}
        />
      </section>
    </div>
  )
}
