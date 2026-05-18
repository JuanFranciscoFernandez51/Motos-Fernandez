"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Lock, Trash2 } from "lucide-react"
import { OcrDocButton } from "./ocr-doc-button"
import type { PermutaForm } from "./oc-form"

/**
 * Renglón de una permuta dentro del form de OC. Cada OC puede tener N
 * permutas. La sección entera vive en oc-form.tsx envuelta en una Card,
 * acá solo está el contenido de cada renglón individual.
 *
 * Vive en archivo propio para no inflar oc-form (eran ~200 líneas inline).
 */
export function OCPermutaRow({
  pp,
  idx,
  canDelete,
  onChange,
  onRemove,
}: {
  pp: PermutaForm
  idx: number
  canDelete: boolean
  onChange: (patch: Partial<PermutaForm>) => void
  onRemove: () => void
}) {
  const yaEnStock = !!pp.motoRecibidaId
  return (
    <div
      className={`rounded-md border p-3 space-y-3 ${
        yaEnStock
          ? "border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10"
          : "border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Permuta #{idx + 1}
          </span>
          {yaEnStock && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
              <Lock className="size-3" />
              En stock
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!yaEnStock && (
            <OcrDocButton
              tipo="CEDULA_VERDE"
              label="Scanear cédula"
              onResult={(d) => {
                onChange({
                  marca: d.marca || pp.marca,
                  modelo: d.modelo || pp.modelo,
                  anio: d.anio != null ? String(d.anio) : pp.anio,
                  patente: d.patente || pp.patente,
                  chasis: d.chasis || pp.chasis,
                  motor: d.motor || pp.motor,
                })
              }}
            />
          )}
          {canDelete && !yaEnStock && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {yaEnStock && (
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          Esta permuta ya creó una moto en el catálogo. Si necesitás
          cambiar la marca/modelo, editá la moto desde el catálogo
          para mantener todo sincronizado.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Marca</Label>
          <Input
            value={pp.marca}
            onChange={(e) => onChange({ marca: e.target.value })}
            placeholder="Honda"
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input
            value={pp.modelo}
            onChange={(e) => onChange({ modelo: e.target.value })}
            placeholder="Wave 110"
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Año</Label>
          <Input
            type="number"
            value={pp.anio}
            onChange={(e) => onChange({ anio: e.target.value })}
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Km</Label>
          <Input
            type="number"
            value={pp.kilometros}
            onChange={(e) => onChange({ kilometros: e.target.value })}
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Patente</Label>
          <Input
            value={pp.patente}
            onChange={(e) => onChange({ patente: e.target.value.toUpperCase() })}
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Valor tomado</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={pp.valor}
              onChange={(e) => onChange({ valor: e.target.value })}
              className="flex-1"
            />
            <select
              value={pp.moneda || "ARS"}
              onChange={(e) => onChange({ moneda: e.target.value })}
              className="w-20 h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-sm"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Nº chasis</Label>
          <Input
            value={pp.chasis}
            onChange={(e) => onChange({ chasis: e.target.value })}
            disabled={yaEnStock}
          />
        </div>
        <div>
          <Label>Nº motor</Label>
          <Input
            value={pp.motor}
            onChange={(e) => onChange({ motor: e.target.value })}
            disabled={yaEnStock}
          />
        </div>
        <div className="col-span-2">
          <Label>Notas/descripción</Label>
          <Textarea
            value={pp.descripcion}
            onChange={(e) => onChange({ descripcion: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {/* Checklist de accesorios que entrega el cliente con la moto.
          Importante porque la moto va a entrar a la venta y el
          vendedor necesita saber qué trae. */}
      <div className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-neutral-900 p-3 space-y-2">
        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
          ✓ Qué entrega el cliente
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { key: "tieneTitulo" as const, label: "Título" },
            { key: "tieneManual" as const, label: "Manual" },
            { key: "tieneSegundaLlave" as const, label: "2da llave" },
            { key: "tieneCasco" as const, label: "Casco" },
            { key: "tieneVtv" as const, label: "VTV" },
            { key: "tieneSeguro" as const, label: "Seguro" },
            { key: "tieneFactura" as const, label: "Factura" },
            { key: "tieneFichaTecnica" as const, label: "Ficha técnica" },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-1.5 cursor-pointer text-xs hover:bg-gray-50 dark:hover:bg-neutral-800 rounded px-1.5 py-1"
            >
              <input
                type="checkbox"
                checked={!!pp[item.key]}
                onChange={(e) => onChange({ [item.key]: e.target.checked })}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <Input
          value={pp.accesoriosExtra || ""}
          onChange={(e) => onChange({ accesoriosExtra: e.target.value })}
          placeholder="Otros accesorios (maleta, GPS, escape Leovince, etc.)"
          className="h-8 text-xs"
        />
      </div>

      {!pp.id && !yaEnStock && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Esta moto se va a cargar al catálogo como usada (inactiva
          hasta que la actives desde la lista de motos).
        </p>
      )}
    </div>
  )
}
