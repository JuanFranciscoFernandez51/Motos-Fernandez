import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { emitirFactura } from "@/lib/afip/emitir"

const itemSchema = z.object({
  descripcion: z.string().min(1, "Descripción vacía"),
  cantidad: z.number().positive(),
  precioUnit: z.number().nonnegative(),
  alicuotaIva: z.number().int(), // id AFIP (5=21%, 4=10.5%, 3=0%)
})

const bodySchema = z.object({
  tipoCbte: z.number().int().optional(),
  concepto: z.number().int().optional(),
  clienteId: z.string().optional().nullable(),
  docTipo: z.number().int(),
  docNro: z.string().min(1),
  receptorNombre: z.string().min(1, "Falta el nombre del receptor"),
  receptorDomicilio: z.string().optional().nullable(),
  condIvaReceptorId: z.number().int(),
  items: z.array(itemSchema).min(1, "Agregá al menos un ítem"),
  fecha: z.string().optional(), // ISO
  notas: z.string().optional().nullable(),
})

/** POST /api/admin/facturacion/emitir */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    )
  }
  const b = parsed.data

  try {
    const result = await emitirFactura({
      tipoCbte: b.tipoCbte,
      concepto: b.concepto,
      clienteId: b.clienteId || undefined,
      docTipo: b.docTipo,
      docNro: b.docNro,
      receptorNombre: b.receptorNombre,
      receptorDomicilio: b.receptorDomicilio || undefined,
      condIvaReceptorId: b.condIvaReceptorId,
      items: b.items,
      fecha: b.fecha ? new Date(b.fecha) : undefined,
      notas: b.notas || undefined,
    })

    revalidatePath("/admin/facturacion")

    if (!result.ok) {
      // Comprobante rechazado por ARCA (se guardó igual con estado RECHAZADA).
      const detalle = [...result.errores, ...result.observaciones]
        .map((e) => `${e.code ? `[${e.code}] ` : ""}${e.msg}`)
        .join(" · ")
      return NextResponse.json({
        ok: false,
        facturaId: result.facturaId,
        estado: result.estado,
        error: detalle || "ARCA rechazó el comprobante",
      })
    }

    return NextResponse.json({
      ok: true,
      facturaId: result.facturaId,
      numero: result.numero,
      cae: result.cae,
      observaciones: result.observaciones,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error al emitir" },
      { status: 500 }
    )
  }
}
