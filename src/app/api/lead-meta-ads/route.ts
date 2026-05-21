import { NextRequest, NextResponse } from "next/server"
import { createOrUpdateLead } from "@/lib/create-lead"
import { notifyNewContact } from "@/lib/email"

/**
 * Endpoint para los forms de las landings de Meta Ads (XR150, DR650...).
 * Crea el Lead con origen META_ADS, manda mail al admin y registra
 * los UTMs en notas para que después podamos atribuir conversiones por
 * campaña en el CRM.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre,
      apellido,
      telefono,
      email,
      modeloInteres,
      permuta,
      contactoPref,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      fbclid,
    } = body as Record<string, string | undefined>

    if (!nombre || (!telefono && !email)) {
      return NextResponse.json(
        { error: "Necesitamos al menos nombre y un contacto (tel o email)" },
        { status: 400 }
      )
    }

    const partesNotas = [
      `Lead desde landing Meta Ads`,
      modeloInteres && `Modelo: ${modeloInteres}`,
      permuta && `¿Permuta? ${permuta}`,
      contactoPref && `Prefiere: ${contactoPref}`,
      utm_source && `utm_source=${utm_source}`,
      utm_medium && `utm_medium=${utm_medium}`,
      utm_campaign && `utm_campaign=${utm_campaign}`,
      utm_content && `utm_content=${utm_content}`,
      fbclid && `fbclid=${fbclid}`,
    ].filter(Boolean)

    const lead = await createOrUpdateLead({
      nombre,
      apellido,
      telefono,
      email,
      modeloInteres,
      origen: "META_ADS",
      temperatura: "CALIENTE",
      notas: partesNotas.join(" · "),
    })

    // Mail al admin (fire and forget — no rompe el flujo)
    try {
      await notifyNewContact({
        nombre,
        email: email || "",
        telefono,
        mensaje: `🔥 Lead desde Meta Ads. ${modeloInteres ? `Interesado en ${modeloInteres}.` : ""} ${permuta === "si" ? "Tiene permuta." : ""}`.trim(),
      })
    } catch (err) {
      console.error("Error notificando lead Meta Ads:", err)
    }

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 })
  } catch (err) {
    console.error("Error en /api/lead-meta-ads:", err)
    return NextResponse.json(
      { error: "Error al guardar el lead" },
      { status: 500 }
    )
  }
}
