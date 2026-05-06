import { TiendaClient } from "./tienda-client"
import { TrackVisita } from "@/components/public/track-visita"
import { getProductosTienda, getCategoriasTienda } from "@/lib/cached-queries"
import { PageHero } from "@/components/public/ui/page-hero"

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

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <TiendaClient
          productos={JSON.parse(JSON.stringify(productos))}
          categorias={JSON.parse(JSON.stringify(categorias))}
        />
      </section>
    </div>
  )
}
