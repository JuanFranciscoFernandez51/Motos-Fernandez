import { prisma } from "@/lib/prisma"
import { PromocionesClient } from "./promociones-client"

export const dynamic = "force-dynamic"

export default async function PromocionesPage() {
  const promociones = await prisma.promocion.findMany({
    orderBy: { fechaInicio: "desc" },
  })

  return <PromocionesClient promociones={promociones} />
}
