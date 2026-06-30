import { redirect } from "next/navigation"
import { requireSection } from "@/lib/admin-auth"

// Protege TODA la sección Facturación (ARCA): solo admins o permiso FACTURACION.
export default async function FacturacionLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSection("FACTURACION")
  if (!session) redirect("/admin")
  return <>{children}</>
}
