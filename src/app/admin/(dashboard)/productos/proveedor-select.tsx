"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"

export function ProveedorSelect({
  productoId,
  value,
  proveedores,
  action,
}: {
  productoId: string
  value: string | null
  proveedores: { id: string; nombre: string }[]
  action: (productoId: string, proveedorId: string | null) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="relative">
      <select
        defaultValue={value || ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() =>
            action(productoId, e.target.value || null)
          )
        }
        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs disabled:opacity-60"
      >
        <option value="">— Sin proveedor —</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 size-3 animate-spin text-gray-400" />
      )}
    </div>
  )
}
