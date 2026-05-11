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
import { Search, X, Pencil, User, Phone, Mail, MessageCircle } from "lucide-react"
import { formatDate, nombreCompleto } from "@/lib/admin-helpers"
import { DeleteWithConfirmButton } from "@/components/admin/delete-with-confirm-button"

type Cliente = {
  id: string
  dni: string | null
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  ciudad: string | null
  notasInternas: string | null
  createdAt: Date
  _count: {
    mandatos: number
    ordenesCompra: number
    ordenesTrabajo: number
  }
}

/**
 * Quita acentos / diacríticos para comparar strings sin importar
 * "fernandez" vs "fernández", "gomez" vs "gómez", "nuñez" vs "núñez".
 */
function sinAcentos(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * Normaliza un teléfono argentino al formato wa.me (E.164 sin +).
 * - Saca espacios, guiones, puntos.
 * - Si arranca con 0 (código de área local), lo saca.
 * - Si arranca con 15 (cel viejo), lo saca y agrega 9 después del código país.
 * - Si NO empieza con 54, le antepone 54.
 * - Inserta el "9" obligatorio para mobile en Argentina si no lo tiene.
 */
function normalizarParaWhatsApp(tel: string): string {
  let n = tel.replace(/[^\d]/g, "")
  // Si arranca con 0, sacarlo (código local)
  if (n.startsWith("0")) n = n.slice(1)
  // Si arranca con "15" (mobile prefix viejo), sacar y marcar mobile
  let isMobile = false
  if (n.startsWith("15")) {
    n = n.slice(2)
    isMobile = true
  }
  // Si tiene 10+ dígitos sin código país, agregar 54
  if (!n.startsWith("54")) n = "54" + n
  // Insertar "9" después de 54 para mobile (si no está ya)
  if (isMobile && n.startsWith("54") && !n.startsWith("549")) {
    n = "549" + n.slice(2)
  }
  return n
}

export function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = sinAcentos(query.trim())
    if (!q) return clientes
    return clientes.filter((c) => {
      // Incluye notasInternas: alli vive el historial de motos (ej buscar "versys 650"
      // y que aparezcan los clientes que la tuvieron).
      // sinAcentos: matchea "fernandez" con "Fernández", "muñoz" con "munoz", etc.
      const hay = sinAcentos(
        [c.nombre, c.apellido, c.dni, c.email, c.telefono, c.ciudad, c.notasInternas]
          .filter(Boolean)
          .join(" ")
      )
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
          placeholder="Buscar por nombre, DNI, teléfono, moto que tuvo..."
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
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <Phone className="size-3 shrink-0" />
                          <span>{c.telefono}</span>
                          <a
                            href={`https://wa.me/${normalizarParaWhatsApp(c.telefono)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors shrink-0"
                            title={`Abrir WhatsApp con ${c.telefono}`}
                            aria-label="Abrir WhatsApp"
                          >
                            <MessageCircle className="size-3" />
                          </a>
                        </div>
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
                      {c._count.ordenesCompra > 0 && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded" title="Órdenes de compra">
                          {c._count.ordenesCompra} OC
                        </span>
                      )}
                      {c._count.ordenesTrabajo > 0 && (
                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded" title="Órdenes de trabajo">
                          {c._count.ordenesTrabajo} OT
                        </span>
                      )}
                      {c._count.mandatos === 0 &&
                        c._count.ordenesCompra === 0 &&
                        c._count.ordenesTrabajo === 0 && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/admin/clientes/${c.id}`} />}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteWithConfirmButton
                        deleteUrl={`/api/admin/clientes/${c.id}`}
                        label={nombreCompleto(c)}
                        extraWarning="Si el cliente tiene OCs, mandatos, financiaciones u órdenes de taller asociadas, el sistema NO va a permitir eliminarlo."
                      />
                    </div>
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
