import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminFloatingAssistant } from "@/components/admin/admin-floating-assistant"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar
        userName={session.user?.name || "Admin"}
        role={session.user?.role || "usuario"}
        permisos={session.user?.permisos || []}
      />

      {/* Mobile top bar spacer */}
      <div className="h-14 lg:hidden" />

      {/* Main content — el padding-left se ajusta dinamicamente segun si la
          sidebar esta colapsada (clase admin-sidebar-collapsed en body) o
          expandida. Las reglas estan en globals.css. */}
      <main className="admin-main transition-[padding] duration-200">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Botón flotante del Asistente IA — visible en todas las páginas del admin */}
      <AdminFloatingAssistant />
    </div>
  )
}
