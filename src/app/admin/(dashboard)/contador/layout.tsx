import { redirect } from "next/navigation"
import { requireSection } from "@/lib/admin-auth"

// Protege TODA la sección Contador: solo admins o usuarios con permiso CONTADOR.
export default async function ContadorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSection("CONTADOR")
  if (!session) redirect("/admin")
  return <>{children}</>
}
