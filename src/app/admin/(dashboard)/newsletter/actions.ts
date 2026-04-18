"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export async function toggleSubscriberActivo(formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    throw new Error("Unauthorized")
  }
  const id = formData.get("id") as string
  const activo = formData.get("activo") === "true"
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { activo: !activo },
  })
  revalidatePath("/admin/newsletter")
}

export async function exportSubscribersCSV(): Promise<string> {
  const session = await requireAdmin()
  if (!session) {
    throw new Error("Unauthorized")
  }

  const subs = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  })

  const escape = (val: string | null | undefined) => {
    if (val === null || val === undefined) return ""
    const str = String(val)
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = "email,nombre,origen,fecha"
  const rows = subs.map((s) =>
    [
      escape(s.email),
      escape(s.nombre),
      escape(s.origen),
      escape(s.createdAt.toISOString()),
    ].join(",")
  )

  return [header, ...rows].join("\n")
}
