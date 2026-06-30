import { redirect } from "next/navigation"
import { requireSection } from "@/lib/admin-auth"

// Protege TODA la sección Finanzas: solo admins o usuarios con permiso FINANZAS.
export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSection("FINANZAS")
  if (!session) redirect("/admin")
  return <>{children}</>
}
