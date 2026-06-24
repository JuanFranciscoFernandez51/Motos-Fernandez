import { prisma } from "@/lib/prisma"

/** Tipos de obligación fiscal (Responsable Inscripto). */
export const TIPOS_OBLIGACION = [
  { value: "IVA", label: "IVA" },
  { value: "IIBB", label: "Ingresos Brutos" },
  { value: "CARGAS_SOCIALES", label: "Cargas Sociales" },
  { value: "MUNICIPAL", label: "Municipal" },
  { value: "SINDICATO", label: "Sindicato" },
  { value: "OTRO", label: "Otro" },
] as const

export function labelTipo(tipo: string): string {
  return TIPOS_OBLIGACION.find((t) => t.value === tipo)?.label || tipo
}

function periodoStr(y: number, m0: number): string {
  // m0: 0-11
  return `${y}-${String(m0 + 1).padStart(2, "0")}`
}

/** Fecha de vencimiento de un período, con el día clampeado al mes. Mediodía
 *  para evitar líos de zona horaria. */
export function fechaVencimiento(y: number, m0: number, dia: number): Date {
  const ultimoDia = new Date(y, m0 + 1, 0).getDate()
  const d = Math.min(Math.max(1, dia), ultimoDia)
  return new Date(y, m0, d, 12, 0, 0)
}

/**
 * Asegura que existan los vencimientos de las obligaciones ACTIVAS para los
 * próximos `meses` meses (incluye el mes actual). Idempotente: si ya existe el
 * vencimiento de ese período no lo toca (respeta pagos/ediciones).
 */
export async function asegurarVencimientos(meses = 3): Promise<void> {
  const obligaciones = await prisma.obligacionFiscal.findMany({
    where: { activo: true },
  })
  if (obligaciones.length === 0) return
  const hoy = new Date()
  for (const o of obligaciones) {
    for (let i = 0; i < meses; i++) {
      const base = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
      const yy = base.getFullYear()
      const mm = base.getMonth()
      const periodo = periodoStr(yy, mm)
      await prisma.vencimiento.upsert({
        where: { obligacionId_periodo: { obligacionId: o.id, periodo } },
        update: {},
        create: {
          obligacionId: o.id,
          tipo: o.tipo,
          titulo: o.titulo,
          periodo,
          fechaVencimiento: fechaVencimiento(yy, mm, o.diaVencimiento),
          monto: o.montoEstimado ?? null,
        },
      })
    }
  }
}
