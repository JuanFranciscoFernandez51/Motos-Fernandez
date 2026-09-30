import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { puntosDeVenta, ultimoAutorizado, consultarComprobante } from "@/lib/afip/wsfe"
import { ARCA_PTO_VENTA } from "@/lib/afip/config"
import { CBTE, DOC, labelCbte } from "@/lib/afip/tipos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Consultar comprobante por comprobante tarda; damos margen amplio.
export const maxDuration = 300

// Tope de consultas a ARCA por corrida, para no timeoutear. Si quedan más,
// devolvemos hayMas=true y el usuario vuelve a sincronizar.
const MAX_CONSULTAS = 200

// Tipos de comprobante que recorremos (Factura / ND / NC, A/B/C).
const TIPOS = Object.values(CBTE)

/** YYYYMMDD (string ARCA) → Date UTC. */
function fechaDesdeAfip(s: string): Date | null {
  if (!/^\d{8}$/.test(s)) return null
  const y = +s.slice(0, 4)
  const m = +s.slice(4, 6)
  const d = +s.slice(6, 8)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

function nombreReceptor(docTipo: number, docNro: string): string {
  if (docTipo === DOC.CONSUMIDOR_FINAL || docNro === "0") return "Consumidor Final"
  const et = docTipo === DOC.CUIT ? "CUIT" : docTipo === DOC.CUIL ? "CUIL" : docTipo === DOC.DNI ? "DNI" : "Doc"
  return `${et} ${docNro}`
}

/**
 * POST /api/admin/facturacion/sincronizar-arca
 * Trae de ARCA todos los comprobantes autorizados que NO estén en nuestra base
 * (típicamente los emitidos a mano desde el portal / comprobantes en línea, que
 * usan un punto de venta distinto al de web services) y los importa como
 * Factura con origen="ARCA". Idempotente: los que ya existen se saltean.
 */
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    // 1) Puntos de venta habilitados (fallback: el de web services).
    let ptos: number[] = []
    try {
      ptos = (await puntosDeVenta())
        .filter((p) => !p.bloqueado)
        .map((p) => p.nro)
    } catch {
      ptos = []
    }
    if (!ptos.includes(ARCA_PTO_VENTA)) ptos.push(ARCA_PTO_VENTA)

    let consultas = 0
    let importadas = 0
    let revisadas = 0
    let hayMas = false
    const detalle: Record<string, number> = {}

    for (const ptoVta of ptos) {
      for (const cbteTipo of TIPOS) {
        if (consultas >= MAX_CONSULTAS) {
          hayMas = true
          break
        }
        let ultimo = 0
        try {
          ultimo = await ultimoAutorizado(ptoVta, cbteTipo)
        } catch {
          continue // este pto/tipo no aplica
        }
        if (!ultimo) continue

        // Números que ya tenemos para este (ptoVta, cbteTipo).
        const existentes = new Set(
          (
            await prisma.factura.findMany({
              where: { puntoVenta: ptoVta, tipoCbte: cbteTipo, numero: { not: null } },
              select: { numero: true },
            })
          ).map((f) => f.numero as number)
        )

        // Recorremos desde el último hacia atrás (más recientes primero).
        for (let n = ultimo; n >= 1; n--) {
          if (consultas >= MAX_CONSULTAS) {
            hayMas = true
            break
          }
          if (existentes.has(n)) continue
          consultas++
          const c = await consultarComprobante(ptoVta, cbteTipo, n)
          revisadas++
          if (!c || c.resultado !== "A") continue

          await prisma.factura.upsert({
            where: {
              puntoVenta_tipoCbte_numero: {
                puntoVenta: ptoVta,
                tipoCbte: cbteTipo,
                numero: n,
              },
            },
            create: {
              puntoVenta: ptoVta,
              tipoCbte: cbteTipo,
              numero: n,
              concepto: c.concepto,
              fechaCbte: fechaDesdeAfip(c.fechaCbte) || new Date(),
              docTipo: c.docTipo,
              docNro: c.docNro,
              receptorNombre: nombreReceptor(c.docTipo, c.docNro),
              impNeto: c.impNeto,
              impIva: c.impIva,
              impTotConc: c.impTotConc,
              impOpEx: c.impOpEx,
              impTrib: c.impTrib,
              impTotal: c.impTotal,
              moneda: c.monId,
              cotizacion: c.monCotiz,
              items: [],
              alicuotas: c.alicuotas,
              estado: "EMITIDA",
              cae: c.cae,
              caeVto: fechaDesdeAfip(c.caeVto),
              arcaResultado: c.resultado,
              origen: "ARCA",
              notas: `Importado de ARCA (${labelCbte(cbteTipo)} ${String(ptoVta).padStart(4, "0")}-${String(n).padStart(8, "0")})`,
            },
            update: {}, // si ya existe, no lo tocamos
          })
          importadas++
          detalle[labelCbte(cbteTipo)] = (detalle[labelCbte(cbteTipo)] || 0) + 1
          await new Promise((r) => setTimeout(r, 120))
        }
      }
      if (hayMas) break
    }

    revalidatePath("/admin/facturacion")
    return NextResponse.json({
      ok: true,
      importadas,
      revisadas,
      consultas,
      hayMas,
      detalle,
      puntosDeVenta: ptos,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error sincronizando con ARCA" },
      { status: 500 }
    )
  }
}
