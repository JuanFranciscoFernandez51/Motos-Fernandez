import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrUpdateLead } from "@/lib/create-lead"
import { notifyNewContact } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const contactForm = await prisma.contactForm.create({
      data: {
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono ?? null,
        mensaje: body.mensaje,
      },
    })

    // Create or update lead from contact form data
    await createOrUpdateLead({
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      origen: "WEB",
      temperatura: "TIBIO",
      notas: `Formulario de contacto: ${body.mensaje}`,
    })

    // Notificacion por email al admin (fire-and-forget, no rompe el flujo)
    try {
      await notifyNewContact({
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono,
        mensaje: body.mensaje,
      })
    } catch (emailError) {
      console.error("Error enviando notificacion de contacto:", emailError)
    }

    return NextResponse.json(contactForm, { status: 201 })
  } catch (error) {
    console.error("Error creating contact form:", error)
    return NextResponse.json(
      { error: "Error al enviar el formulario de contacto" },
      { status: 500 }
    )
  }
}
