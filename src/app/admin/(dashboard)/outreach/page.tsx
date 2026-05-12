import { prisma } from "@/lib/prisma"
import { OutreachClient, type OutreachTareaUI } from "./outreach-client"

export const dynamic = "force-dynamic"

export default async function OutreachPage() {
  const tareas = await prisma.outreachTarea.findMany({
    orderBy: [
      // Primero las programadas más viejas (las que necesitan más urgencia)
      { estado: "asc" },
      { fechaProgramada: "desc" },
    ],
    take: 200,
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          telefono: true,
        },
      },
      ordenCompra: {
        select: { id: true, numero: true, motoDescripcion: true, fecha: true },
      },
    },
  })

  const ui: OutreachTareaUI[] = tareas.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    estado: t.estado,
    cliente: {
      id: t.cliente.id,
      nombre: t.cliente.nombre,
      apellido: t.cliente.apellido,
      telefono: t.telefono || t.cliente.telefono || "",
    },
    oc: t.ordenCompra
      ? {
          id: t.ordenCompra.id,
          numero: t.ordenCompra.numero,
          motoDescripcion: t.ordenCompra.motoDescripcion,
          fecha: t.ordenCompra.fecha.toISOString(),
        }
      : null,
    mensaje: t.mensaje,
    respuesta: t.respuesta,
    notaInterna: t.notaInterna,
    fechaProgramada: t.fechaProgramada.toISOString(),
    enviadaAt: t.enviadaAt ? t.enviadaAt.toISOString() : null,
    descartadaAt: t.descartadaAt ? t.descartadaAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }))

  return <OutreachClient tareas={ui} />
}
