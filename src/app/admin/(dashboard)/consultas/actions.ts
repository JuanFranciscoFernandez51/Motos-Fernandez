"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export async function toggleConsultaLeida(formData: FormData) {
  const session = await requireAdmin()
  if (!session) throw new Error("Unauthorized")

  const id = formData.get("id") as string
  const leido = formData.get("leido") === "true"
  await prisma.contactForm.update({
    where: { id },
    data: { leido: !leido },
  })
  revalidatePath("/admin/consultas")
  revalidatePath("/admin")
}

export async function marcarTodasLeidas() {
  const session = await requireAdmin()
  if (!session) throw new Error("Unauthorized")

  await prisma.contactForm.updateMany({
    where: { leido: false },
    data: { leido: true },
  })
  revalidatePath("/admin/consultas")
  revalidatePath("/admin")
}
