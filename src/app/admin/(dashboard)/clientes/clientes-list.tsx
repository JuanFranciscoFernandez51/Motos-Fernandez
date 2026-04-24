"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, X, Pencil, User, Phone, Mail } from "lucide-react"
import { formatDate, nombreCompleto } from "@/lib/admin-helpers"

type Cliente = {
  id: string
  dni: string | null
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  ciudad: string | null
  createdAt: Date
  _count: {
    mandatos: number
    ventas: number
    ordenesTrabajo: number
  }
}

export function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) => {
      const hay = [c.nombre, c.apellido, c.dni, c.email, c.telefono, c.ciudad]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [clientes, query])

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, DNI, teléfono, email..."
          className="pl-9"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
        {query && ` (filtrados de ${clientes.length})`}
      </p>

      <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Historia</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {clientes.length === 0 ? (
                    <div className="space-y-2">
                      <User className="size-10 mx-auto text-gray-300" />
                      <p>Todavía no cargaste ningún cliente.</p>
                      <p className="text-sm">Cargá el primero con el botón de arriba.</p>
                    </div>
                  ) : (
                    "Sin resultados"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{nombreCompleto(c)}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    {c.dni || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {c.telefono && (
                        <p className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <Phone className="size-3" /> {c.telefono}
                        </p>
                      )}
                      {c.email && (
                        <p className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <Mail className="size-3" /> {c.email}
                        </p>
                      )}
                      {!c.telefono && !c.email && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {c.ciudad || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c._count.mandatos > 0 && (
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded" title="Mandatos">
                          {c._count.mandatos} mand.
                        </span>
                      )}
                      {c._count.ventas > 0 && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded" title="Compras">
                          {c._count.ventas} vtas.
                        </span>
                      )}
                      {c._count.ordenesTrabajo > 0 && (
                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded" title="Órdenes de trabajo">
                          {c._count.ordenesTrabajo} OT
                        </span>
                      )}
                      {c._count.mandatos === 0 &&
                        c._count.ventas === 0 &&
                        c._count.ordenesTrabajo === 0 && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/clientes/${c.id}`} />}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
