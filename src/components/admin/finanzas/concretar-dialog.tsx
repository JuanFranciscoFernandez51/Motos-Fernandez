"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { CuentaFinanciera } from "@prisma/client"

/**
 * Al marcar una cuenta/cheque como cobrada o pagada, ofrece registrar el
 * movimiento de caja en una cuenta (cierra el círculo contable).
 */
export function ConcretarDialog({
  cuentas,
  verbo, // "cobrar" | "pagar"
  detalle,
  onClose,
  onConfirm,
}: {
  cuentas: CuentaFinanciera[]
  verbo: "cobrar" | "pagar"
  detalle?: string
  onClose: () => void
  onConfirm: (crearMovimiento: boolean, cuentaId: string | null) => void
}) {
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "")
  const part = verbo === "cobrar" ? "cobrada" : "pagada"
  const accion = verbo === "cobrar" ? "Entró" : "Salió"

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Marcar como {part}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {detalle && <p className="text-sm text-gray-600">{detalle}</p>}
          <p className="text-sm text-gray-600">¿Registrar el movimiento de caja? {accion} la plata, ¿de qué cuenta?</p>
          <div>
            <Label className="text-xs">Cuenta</Label>
            <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onConfirm(false, null)}>Solo marcar (sin movimiento)</Button>
          <Button onClick={() => onConfirm(true, cuentaId)} disabled={!cuentaId} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
            Registrar movimiento y marcar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
