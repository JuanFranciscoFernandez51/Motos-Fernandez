import { NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

const baseSchema = z.object({
  fecha: z.string().min(8), // yyyy-mm-dd
  registrado: z.boolean().default(true),
  descripcion: z.string().optional().default(""),
  observaciones: z.string().optional().nullable(),
  comprobante: z.string().optional().nullable(),
})

const movSchema = baseSchema.extend({
  modo: z.literal("MOVIMIENTO"),
  tipo: z.enum(["INGRESO", "GASTO"]),
  categoria: z.string().min(1),
  cuentaId: z.string().min(1),
  monto: z.number().int().positive(),
})

const transfSchema = baseSchema.extend({
  modo: z.literal("TRANSFERENCIA"),
  cuentaOrigenId: z.string().min(1),
  cuentaDestinoId: z.string().min(1),
  monto: z.number().int().positive(),
})

const schema = z.discriminatedUnion("modo", [movSchema, transfSchema])

/** POST /api/admin/finanzas/movimientos */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    )
  }
  const b = parsed.data
  const fecha = fechaDeInput(b.fecha)

  try {
    if (b.modo === "MOVIMIENTO") {
      const cuenta = await prisma.cuentaFinanciera.findUnique({
        where: { id: b.cuentaId },
        select: { moneda: true },
      })
      if (!cuenta) return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })
      await prisma.movimientoFinanciero.create({
        data: {
          fecha,
          tipo: b.tipo,
          categoria: b.categoria,
          descripcion: b.descripcion || "",
          monto: b.monto,
          moneda: cuenta.moneda,
          registrado: b.registrado,
          cuentaId: b.cuentaId,
          observaciones: b.observaciones || null,
          comprobante: b.comprobante || null,
        },
      })
    } else {
      // Transferencia: dos patas vinculadas por transferenciaId
      if (b.cuentaOrigenId === b.cuentaDestinoId) {
        return NextResponse.json({ error: "Las cuentas deben ser distintas" }, { status: 400 })
      }
      const [origen, destino] = await Promise.all([
        prisma.cuentaFinanciera.findUnique({ where: { id: b.cuentaOrigenId }, select: { moneda: true, nombre: true } }),
        prisma.cuentaFinanciera.findUnique({ where: { id: b.cuentaDestinoId }, select: { moneda: true, nombre: true } }),
      ])
      if (!origen || !destino) return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })
      if (origen.moneda !== destino.moneda) {
        return NextResponse.json(
          { error: "Por ahora las transferencias son entre cuentas de la misma moneda" },
          { status: 400 }
        )
      }
      const transferenciaId = randomUUID()
      await prisma.$transaction([
        prisma.movimientoFinanciero.create({
          data: {
            fecha,
            tipo: "TRANSFERENCIA",
            categoria: "Transferencia",
            descripcion: b.descripcion || `→ ${destino.nombre}`,
            monto: -b.monto,
            moneda: origen.moneda,
            registrado: b.registrado,
            cuentaId: b.cuentaOrigenId,
            transferenciaId,
            observaciones: b.observaciones || null,
          },
        }),
        prisma.movimientoFinanciero.create({
          data: {
            fecha,
            tipo: "TRANSFERENCIA",
            categoria: "Transferencia",
            descripcion: b.descripcion || `← ${origen.nombre}`,
            monto: b.monto,
            moneda: destino.moneda,
            registrado: b.registrado,
            cuentaId: b.cuentaDestinoId,
            transferenciaId,
            observaciones: b.observaciones || null,
          },
        }),
      ])
    }

    revalidatePath("/admin/tesoreria/finanzas")
    revalidatePath("/admin/tesoreria/finanzas/movimientos")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    )
  }
}
