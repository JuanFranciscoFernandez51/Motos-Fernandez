"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Receipt, Trash2, Loader2, Undo2 } from "lucide-react"
import { OCDrawer, type ModeloAVender } from "./operativo/oc-drawer"
import type { ClienteOption } from "./operativo/cliente-selector"

type Props = {
  modelo: ModeloAVender & { vendida: boolean; slug: string }
  clientes: ClienteOption[]
  markVendida: (id: string, vendida: boolean) => Promise<void>
  crearOCDesdeModelo: React.ComponentProps<typeof OCDrawer>["crearOCDesdeModelo"]
  deleteModelo: (
    id: string,
    confirmText: string
  ) => Promise<{ error?: string } | void>
}

/**
 * Botones extra para mostrar en el header del form de editar moto:
 * - "Vender" (abre el drawer de OC con cliente selector)
 * - "Borrar" (modal de confirmacion con tipeo del slug)
 * - "Devolver al catálogo" si ya está vendida
 */
export function ModeloEditActions({
  modelo,
  clientes,
  markVendida,
  crearOCDesdeModelo,
  deleteModelo,
}: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleDevolver = () => {
    if (!confirm(`¿Devolver "${modelo.nombre}" al catálogo (sacar el estado de vendida)?`)) return
    startTransition(async () => {
      await markVendida(modelo.id, false)
      router.refresh()
    })
  }

  const handleConfirmarBorrar = () => {
    setDeleteError("")
    if (confirmText !== modelo.slug) {
      setDeleteError(`Tenés que escribir exactamente "${modelo.slug}" para confirmar`)
      return
    }
    startTransition(async () => {
      const result = await deleteModelo(modelo.id, confirmText)
      if (result?.error) {
        setDeleteError(result.error)
        return
      }
      setDeleteOpen(false)
      router.push("/admin/modelos")
    })
  }

  return (
    <>
      {/* Botones del header */}
      {modelo.vendida ? (
        <Button
          type="button"
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={handleDevolver}
          disabled={isPending}
        >
          <Undo2 className="h-4 w-4 mr-2" />
          Devolver al catálogo
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          onClick={() => setDrawerOpen(true)}
          disabled={isPending}
        >
          <Receipt className="h-4 w-4 mr-2" />
          Vender
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50"
        onClick={() => {
          setConfirmText("")
          setDeleteError("")
          setDeleteOpen(true)
        }}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Borrar
      </Button>

      {/* Drawer de Vender (OC) */}
      <OCDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        modelo={drawerOpen ? modelo : null}
        clientes={clientes}
        markVendida={markVendida}
        crearOCDesdeModelo={crearOCDesdeModelo}
      />

      {/* Modal de borrar */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteOpen(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Borrar "{modelo.nombre}"
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Esta acción no se puede deshacer. Si la moto tiene OC, mandatos
                  o turnos asociados, no se va a poder borrar.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Para confirmar, escribí <span className="font-mono">{modelo.slug}</span>:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm font-mono"
                autoFocus
              />
            </div>
            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarBorrar}
                disabled={isPending || confirmText !== modelo.slug}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Borrar definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
