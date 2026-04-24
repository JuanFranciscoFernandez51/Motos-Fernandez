import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail } from "lucide-react"
import { ExportNewsletterCsvButton } from "./export-csv-button"
import { toggleSubscriberActivo, exportSubscribersCSV } from "./actions"

export const dynamic = "force-dynamic"

function formatFecha(d: Date) {
  return new Date(d).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export default async function NewsletterPage() {
  const session = await requireAdmin()
  if (!session) {
    redirect("/admin/login")
  }

  const [subs, totalActivos] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.newsletterSubscriber.count({ where: { activo: true } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail className="h-6 w-6 text-[#6B4F7A]" />
            Newsletter
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalActivos} suscriptor(es) activos &middot; {subs.length} en total
          </p>
        </div>
        <ExportNewsletterCsvButton exportAction={exportSubscribersCSV} />
      </div>

      <div className="rounded-lg border bg-white dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Todavía no hay suscriptores
                </TableCell>
              </TableRow>
            ) : (
              subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>
                    {s.nombre || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    {s.origen ? (
                      <Badge variant="outline">{s.origen}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={toggleSubscriberActivo}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="activo" value={String(s.activo)} />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            s.activo
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {s.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFecha(s.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
