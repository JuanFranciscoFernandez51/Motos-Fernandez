import { prisma } from "./prisma"

const TEMPERATURA_PRIORITY: Record<string, number> = {
  PERDIDO: 0,
  FRIO: 1,
  NUEVO: 2,
  TIBIO: 3,
  CALIENTE: 4,
  CLIENTE: 5,
}

interface CreateLeadInput {
  nombre: string
  apellido?: string
  telefono?: string
  email?: string
  ciudad?: string
  modeloInteres?: string
  modeloId?: string
  origen: string
  temperatura?: string
  etapa?: string
  notas?: string
}

export async function createOrUpdateLead(input: CreateLeadInput) {
  // Try to find existing lead by email or phone
  let existingLead = null

  if (input.email) {
    existingLead = await prisma.lead.findFirst({
      where: { email: input.email },
    })
  }

  if (!existingLead && input.telefono) {
    existingLead = await prisma.lead.findFirst({
      where: { telefono: input.telefono },
    })
  }

  if (existingLead) {
    // Update existing lead - upgrade temperature if higher priority
    const currentPriority = TEMPERATURA_PRIORITY[existingLead.temperatura] ?? 0
    const newPriority = TEMPERATURA_PRIORITY[input.temperatura ?? "NUEVO"] ?? 2
    const newTemperatura = newPriority > currentPriority ? (input.temperatura ?? existingLead.temperatura) : existingLead.temperatura

    const lead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        nombre: input.nombre || existingLead.nombre,
        apellido: input.apellido || existingLead.apellido,
        telefono: input.telefono || existingLead.telefono,
        email: input.email || existingLead.email,
        ciudad: input.ciudad || existingLead.ciudad,
        modeloInteres: input.modeloInteres || existingLead.modeloInteres,
        modeloId: input.modeloId || existingLead.modeloId,
        temperatura: newTemperatura as any,
      },
    })

    // Record interaction
    if (input.notas) {
      await prisma.leadInteraction.create({
        data: {
          leadId: lead.id,
          tipo: "nota",
          contenido: input.notas,
        },
      })
    }

    return lead
  }

  // Create new lead
  const lead = await prisma.lead.create({
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono,
      email: input.email,
      ciudad: input.ciudad,
      modeloInteres: input.modeloInteres,
      modeloId: input.modeloId,
      origen: input.origen as "WEB" | "WHATSAPP" | "INSTAGRAM" | "MARKETPLACE" | "MERCADOLIBRE" | "TELEFONO" | "PRESENCIAL",
      temperatura: (input.temperatura as "NUEVO" | "CALIENTE" | "TIBIO" | "FRIO" | "CLIENTE" | "PERDIDO") ?? "NUEVO",
      etapa: (input.etapa as "NUEVO" | "CONTACTADO" | "PRESUPUESTADO" | "NEGOCIANDO" | "VENDIDO" | "PERDIDO") ?? "NUEVO",
      notas: input.notas,
    },
  })

  return lead
}
