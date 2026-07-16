import { TiendaClient } from "./tienda-client"
import { TrackVisita } from "@/components/public/track-visita"
import { getProductosTienda, getCategoriasTienda } from "@/lib/cached-queries"
import { PageHero } from "@/components/public/ui/page-hero"
import { GlobalSearch } from "@/components/public/global-search"

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
    <div className="bg-[#F8F5FA] dark:bg-neutral-950 min-h-screen">
      <TrackVisita pagina="tienda" />

      <PageHero
        eyebrow="Tienda online"
        title="Accesorios &"
        highlight="repuestos"
        description="Cascos, indumentaria, repuestos y accesorios para tu moto. Envío propio a todo el país."
      />

      <section className="relative z-40 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="max-w-xl mx-auto">
          <GlobalSearch scope="tienda" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <TiendaClient
          productos={JSON.parse(JSON.stringify(productos))}
          categorias={JSON.parse(JSON.stringify(categorias))}
        />
      </section>
    </div>
  )
}
