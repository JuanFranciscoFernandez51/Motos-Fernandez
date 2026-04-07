import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Coeficientes calculados con amortización francesa (sistema de cuotas fijas)
// TNA 72% → tasa mensual 6% → cuota = PV × [0.06 × (1.06)^n] / [(1.06)^n - 1]
// TNA 40% → tasa mensual 3.333% → cuota = PV × [i × (1+i)^n] / [(1+i)^n - 1]

const PLANES_DEFAULT = [
  // Financiación propia — TNA 72%, anticipo mínimo 40%
  { id: "d-p3",  nombre: "3 cuotas",  tipo: "PROPIA",  cuotas: 3,  coeficiente: 0.3741, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 1 },
  { id: "d-p6",  nombre: "6 cuotas",  tipo: "PROPIA",  cuotas: 6,  coeficiente: 0.2034, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 2 },
  { id: "d-p9",  nombre: "9 cuotas",  tipo: "PROPIA",  cuotas: 9,  coeficiente: 0.1470, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 3 },
  { id: "d-p12", nombre: "12 cuotas", tipo: "PROPIA",  cuotas: 12, coeficiente: 0.1193, anticipoMinimo: 40, descripcion: "TNA 72%", activo: true, orden: 4 },
  // Con tarjeta — TNA 40%, sin anticipo mínimo
  { id: "d-t3",  nombre: "3 cuotas",  tipo: "TARJETA", cuotas: 3,  coeficiente: 0.3547, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 5 },
  { id: "d-t6",  nombre: "6 cuotas",  tipo: "TARJETA", cuotas: 6,  coeficiente: 0.1866, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 6 },
  { id: "d-t12", nombre: "12 cuotas", tipo: "TARJETA", cuotas: 12, coeficiente: 0.1025, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 7 },
  { id: "d-t18", nombre: "18 cuotas", tipo: "TARJETA", cuotas: 18, coeficiente: 0.0748, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 8 },
  { id: "d-t24", nombre: "24 cuotas", tipo: "TARJETA", cuotas: 24, coeficiente: 0.0612, anticipoMinimo: 0,  descripcion: "TNA 40%", activo: true, orden: 9 },
]

export async function GET() {
  try {
    const planes = await prisma.planFinanciacion.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    })
    return NextResponse.json(planes.length > 0 ? planes : PLANES_DEFAULT)
  } catch {
    return NextResponse.json(PLANES_DEFAULT)
  }
}
