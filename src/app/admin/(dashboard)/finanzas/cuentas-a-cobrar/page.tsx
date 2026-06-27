import { redirect } from "next/navigation"

export default function CuentasACobrarRedirect() {
  redirect("/admin/finanzas/cuentas-y-cheques")
}
