import { prisma } from "@/lib/prisma"

// Valores default (se usan si la configuración no está cargada en la DB).
// Para editarlos: admin → Configuración → "Datos legales (para PDFs)"
const DEFAULTS = {
  razonSocial: "Motos Fernandez",
  cuit: "—",
  direccion: "Brown 1052",
  ciudad: "Bahía Blanca, Buenos Aires",
  telefono: "+54 291 578-8671",
  email: "info@motosfernandez.com.ar",
  iva: "Responsable Inscripto",
  ingresosBrutos: "",
}

export type NegocioConfig = typeof DEFAULTS

// Lee datos legales del negocio desde la tabla Configuracion (key-value)
// Se usa en los endpoints de PDF.
export async function getNegocioConfig(): Promise<NegocioConfig> {
  try {
    const rows = await prisma.configuracion.findMany({
      where: {
        key: {
          in: [
            "razonSocial",
            "cuit",
            "iva",
            "ingresosBrutos",
            "direccion",
            "ciudad",
            "telefonoLegal",
            "email",
          ],
        },
      },
    })

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    return {
      razonSocial: map.razonSocial || DEFAULTS.razonSocial,
      cuit: map.cuit || DEFAULTS.cuit,
      direccion: map.direccion || DEFAULTS.direccion,
      ciudad: map.ciudad || DEFAULTS.ciudad,
      telefono: map.telefonoLegal || DEFAULTS.telefono,
      email: map.email || DEFAULTS.email,
      iva: map.iva || DEFAULTS.iva,
      ingresosBrutos: map.ingresosBrutos || DEFAULTS.ingresosBrutos,
    }
  } catch {
    return DEFAULTS
  }
}

// Valor estático para compatibilidad con imports existentes (usa los defaults).
// Los endpoints PDF usan la versión async getNegocioConfig() que sí lee de la DB.
export const NEGOCIO = DEFAULTS
