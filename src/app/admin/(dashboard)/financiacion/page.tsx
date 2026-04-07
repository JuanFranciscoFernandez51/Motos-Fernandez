import { prisma } from "@/lib/prisma"
import { PlanesClient } from "./planes-client"

export const dynamic = "force-dynamic"

const PLANES_DEFAULT = [
  { id: "", nombre: "3 cuotas",  tipo: "PROPIA",  cuotas: 3,  coeficiente: 0.3741, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 1 },
  { id: "", nombre: "6 cuotas",  tipo: "PROPIA",  cuotas: 6,  coeficiente: 0.2034, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 2 },
  { id: "", nombre: "9 cuotas",  tipo: "PROPIA",  cuotas: 9,  coeficiente: 0.1470, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 3 },
  { id: "", nombre: "12 cuotas", tipo: "PROPIA",  cuotas: 12, coeficiente: 0.1193, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 4 },
  { id: "", nombre: "3 cuotas",  tipo: "TARJETA", cuotas: 3,  coeficiente: 0.3547, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 5 },
  { id: "", nombre: "6 cuotas",  tipo: "TARJETA", cuotas: 6,  coeficiente: 0.1866, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 6 },
  { id: "", nombre: "12 cuotas", tipo: "TARJETA", cuotas: 12, coeficiente: 0.1025, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 7 },
  { id: "", nombre: "18 cuotas", tipo: "TARJETA", cuotas: 18, coeficiente: 0.0748, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 8 },
  { id: "", nombre: "24 cuotas", tipo: "TARJETA", cuotas: 24, coeficiente: 0.0612, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 9 },
]

export default async function FinanciacionAdminPage() {
  let planes: any[] = []
  try {
    planes = await prisma.planFinanciacion.findMany({ orderBy: { orden: "asc" } })
  } catch {
    planes = []
  }
  return <PlanesClient planes={planes} defaultsIfEmpty={PLANES_DEFAULT} />
}
