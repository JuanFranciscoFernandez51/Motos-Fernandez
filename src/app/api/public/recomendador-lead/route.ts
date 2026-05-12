import { NextRequest, NextResponse } from "next/server"
import { createOrUpdateLead } from "@/lib/create-lead"

export const dynamic = "force-dynamic"

/**
 * Recibe los datos de contacto del usuario al terminar el quiz recomendador.
 * Crea un Lead (o updatea uno existente con el mismo email/telefono) con
 * origen RECOMENDADOR y temperatura CALIENTE (ya hizo el quiz, está
 * activamente buscando moto).
 *
 * Body:
 *   nombre: string (obligatorio)
 *   telefono: string (obligatorio)
 *   email?: string
 *   modeloInteres?: string  (la #1 recomendada)
 *   modeloId?: string       (id del modelo #1)
 *   resumenQuiz?: string    (resumen de las respuestas, va a notas)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nombre = String(body.nombre ?? "").trim()
    const telefono = String(body.telefono ?? "").trim()
    const email = body.email ? String(body.email).trim().toLowerCase() : null

    if (!nombre) {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 })
    }
    if (!telefono) {
      return NextResponse.json({ error: "Teléfono obligatorio" }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    const modeloInteres = body.modeloInteres ? String(body.modeloInteres) : undefined
    const modeloId = body.modeloId ? String(body.modeloId) : undefined
    const resumen = body.resumenQuiz ? String(body.resumenQuiz) : ""

    const notas = [
      "Termino el quiz recomendador y dejo sus datos para que lo contacten.",
      modeloInteres ? `Moto #1 recomendada: ${modeloInteres}` : null,
      resumen ? `\nResumen del quiz:\n${resumen}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const lead = await createOrUpdateLead({
      nombre,
      telefono,
      email: email || undefined,
      modeloInteres,
      modeloId,
      origen: "RECOMENDADOR",
      // CALIENTE: el usuario llego al final del quiz e hizo el esfuerzo
      // de dejar sus datos. Es mas caliente que un visitante random.
      temperatura: "CALIENTE",
      etapa: "CONTACTADO",
      notas,
    })

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 })
  } catch (e) {
    console.error("[recomendador-lead] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}
