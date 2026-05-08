import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Download, Pencil, MessageCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatMoney, formatNumero, nombreCompleto } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
  VENCIDO: "Vencido",
}

const ESTADO_STYLES: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300",
  ENVIADO: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ACEPTADO: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  RECHAZADO: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  VENCIDO: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
}

function normalizarParaWhatsApp(tel: string): string {
  let n = tel.replace(/[^\d]/g, "")
  if (n.startsWith("0")) n = n.slice(1)
  let isMobile = false
  if (n.startsWith("15")) { n = n.slice(2); isMobile = true }
  if (!n.startsWith("54")) n = "54" + n
  if (isMobile && n.startsWith("54") && !n.startsWith("549")) n = "549" + n.slice(2)
  return n
}

export default async function PresupuestosPage() {
  const presupuestos = await prisma.presupuesto.findMany({
    orderBy: { numero: "desc" },
    include: {
      cliente: { select: { nombre: true, apellido: true, telefono: true, dni: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="size-6 text-[#6B4F7A]" />
            Presupuestos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cotizaciones para entregar al cliente. Si aceptan, se convierten en OT.
          </p>
        </div>
        <Button render={<Link href="/admin/presupuestos/nuevo" />} className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
          <Plus className="h-4 w-4 mr-2" /> Nuevo presupuesto
        </Button>
      </div>

      {presupuestos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold mb-1">Todavía no armaste ningún presupuesto.</p>
            <p className="text-sm">Cargá el primero con el botón de arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nº</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Moto</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-4 py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.map((p) => {
                const tel = p.cliente?.telefono
                return (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-neutral-900 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-[#6B4F7A]">
                      {formatNumero("PRE", p.numero)}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{formatDate(p.fecha)}</td>
                    <td className="px-4 py-2">
                      {p.cliente ? (
                        <p className="text-sm">{nombreCompleto(p.cliente)}</p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{p.clienteNombre || "—"}</p>
                      )}
                      {tel && <p className="text-xs text-gray-500 dark:text-gray-400">{tel}</p>}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {[p.motoMarca, p.motoModelo].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{formatMoney(p.total)}</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary" className={ESTADO_STYLES[p.estado]}>
                        {ESTADO_LABELS[p.estado]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {tel && (
                          <a
                            href={`https://wa.me/${normalizarParaWhatsApp(tel)}?text=${encodeURIComponent(`Hola, te paso el presupuesto ${formatNumero("PRE", p.numero)}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md size-8 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
                            title="WhatsApp al cliente"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}
                        <a
                          href={`/api/pdf/presupuesto/${p.id}`}
                          className="inline-flex items-center justify-center rounded-md size-8 hover:bg-gray-100 dark:hover:bg-neutral-800"
                          title="Descargar PDF"
                        >
                          <Download className="size-4" />
                        </a>
                        <Button variant="ghost" size="sm" render={<Link href={`/admin/presupuestos/${p.id}`} />}>
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
