import { redirect } from "next/navigation"
import { requireSection } from "@/lib/admin-auth"

// Protege TODA la sección Tesorería (créditos personales / financiaciones de OC).
export default async function TesoreriaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSection("TESORERIA")
  if (!session) redirect("/admin")
  return <>{children}</>
}
