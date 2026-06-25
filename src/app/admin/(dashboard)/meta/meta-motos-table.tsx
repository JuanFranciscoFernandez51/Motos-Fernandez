"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InstagramIcon, FacebookIcon } from "@/components/icons/social"
import { MetaPublishButton } from "./publish-button"

export type MetaMotoRow = {
  id: string
  slug: string
  nombre: string
  marca: string | null
  anio: number | null
  precio: number | null
  moneda: string | null
  igPostId: string | null
  igPermalink: string | null
  fbPermalink: string | null
  igUltimaSync: string | null // ISO
}

const fmtMoney = (n: number | null, moneda: string | null) =>
  n == null ? "—" : `${moneda === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`
const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"

export function MetaMotosTable({ motos }: { motos: MetaMotoRow[] }) {
  const [query, setQuery] = useState("")

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return motos
    // Cada término debe matchear (permite "ktm adventure" en cualquier orden).
    const terminos = q.split(/\s+/)
    return motos.filter((m) => {
      const texto = `${m.marca || ""} ${m.nombre} ${m.anio || ""} ${m.slug}`.toLowerCase()
      return terminos.every((t) => texto.includes(t))
    })
  }, [motos, query])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar moto por marca, modelo o año… (ej: KTM 390 Adventure)"
          className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]"
        />
      </div>
      {query.trim() && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filtradas.length} resultado{filtradas.length === 1 ? "" : "s"} para “{query.trim()}”
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr className="border-b">
              <th className="text-left px-2 py-2">Moto</th>
              <th className="text-right px-2 py-2">Precio</th>
              <th className="text-left px-2 py-2">Estado</th>
              <th className="text-left px-2 py-2">Última pub.</th>
              <th className="text-right px-2 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-sm text-gray-400">
                  No se encontró ninguna moto con “{query.trim()}”.
                </td>
              </tr>
            ) : (
              filtradas.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 dark:border-neutral-900 last:border-0">
                  <td className="px-2 py-2">
                    <Link href={`/admin/modelos/${m.id}`} className="hover:underline">
                      <p className="font-medium">
                        {m.marca} {m.nombre}
                        {m.anio ? ` ${m.anio}` : ""}
                      </p>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{m.slug}</p>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{fmtMoney(m.precio, m.moneda)}</td>
                  <td className="px-2 py-2">
                    {m.igPostId ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      >
                        Publicada
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">No publicada</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {fmtFecha(m.igUltimaSync)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {m.igPermalink && (
                        <a
                          href={m.igPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center size-7 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                          title="Ver en Instagram"
                        >
                          <InstagramIcon className="size-3.5" />
                        </a>
                      )}
                      {m.fbPermalink && (
                        <a
                          href={m.fbPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center size-7 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                          title="Ver en Facebook"
                        >
                          <FacebookIcon className="size-3.5" />
                        </a>
                      )}
                      <MetaPublishButton modeloId={m.id} yaPublicada={!!m.igPostId} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
