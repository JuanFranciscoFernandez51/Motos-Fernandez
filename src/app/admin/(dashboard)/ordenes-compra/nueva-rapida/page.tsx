import { prisma } from "@/lib/prisma"
import { OCFormRapida } from "@/components/admin/operativo/oc-form-rapida"

/**
 * OC rápida — form corto (default). El formulario completo (con permutas/pagos
 * a la vista) sigue disponible en /admin/ordenes-compra/nueva.
 */
export default async function NuevaOCRapidaPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, apellido: true, dni: true },
    take: 2000,
  })

  return <OCFormRapida clientes={clientes} />
}
