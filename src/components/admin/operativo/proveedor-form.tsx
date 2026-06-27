"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Landmark,
  ListOrdered,
  Copy,
  Check,
  Star,
} from "lucide-react"

export type Contacto = {
  id: string
  nombre: string
  rol: string
  telefono: string
  email: string
}

export type CuentaBancaria = {
  id: string
  banco: string
  tipo: string // "CA" (caja de ahorro) | "CC" (cuenta corriente)
  numero: string
  cbu: string
  alias: string
  titular: string
  moneda: string // "ARS" | "USD"
  principal: boolean // si es la cuenta destacada para esa moneda
}

export type ItemLista = {
  id: string
  concepto: string
  precio: string
  moneda: string
  notas: string
}

export type ProveedorData = {
  id?: string
  nombre: string
  cuit: string
  rubro: string
  sitio: string
  email: string
  direccion: string
  ciudad: string
  notas: string
  activo: boolean
  contactos: Contacto[]
  cuentasBancarias: CuentaBancaria[]
  listaPrecios: ItemLista[]
}

const EMPTY: ProveedorData = {
  nombre: "",
  cuit: "",
  rubro: "",
  sitio: "",
  email: "",
  direccion: "",
  ciudad: "",
  notas: "",
  activo: true,
  contactos: [],
  cuentasBancarias: [],
  listaPrecios: [],
}

const ROLES_SUGERIDOS = [
  "Comercial",
  "Administración",
  "Vendedor",
  "Atención al cliente",
  "Posventa",
  "Garantía",
  "Logística",
  "Repuestos",
  "Otro",
]

const BANCOS_SUGERIDOS = [
  "Banco Nación",
  "Banco Provincia",
  "Banco Galicia",
  "Banco Santander",
  "BBVA",
  "Banco Macro",
  "ICBC",
  "Banco Ciudad",
  "Banco Patagonia",
  "Banco Credicoop",
  "Banco Hipotecario",
  "Brubank",
  "Mercado Pago",
  "Naranja X",
  "Ualá",
  "Otro",
]

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function newContacto(): Contacto {
  return {
    id: genId("c"),
    nombre: "",
    rol: "",
    telefono: "",
    email: "",
  }
}

function newCuenta(): CuentaBancaria {
  return {
    id: genId("b"),
    banco: "",
    tipo: "CA",
    numero: "",
    cbu: "",
    alias: "",
    titular: "",
    moneda: "ARS",
    principal: false,
  }
}

function newItem(): ItemLista {
  return {
    id: genId("p"),
    concepto: "",
    precio: "",
    moneda: "ARS",
    notas: "",
  }
}

export function ProveedorForm({
  initialData,
  saveAction,
}: {
  initialData?: Partial<ProveedorData> & { id?: string }
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ProveedorData>({
    ...EMPTY,
    ...initialData,
    contactos: initialData?.contactos ?? [],
    cuentasBancarias: initialData?.cuentasBancarias ?? [],
    listaPrecios: initialData?.listaPrecios ?? [],
  })
  const [error, setError] = useState("")
  const [copiado, setCopiado] = useState<string>("")

  const set = <K extends keyof ProveedorData>(
    key: K,
    value: ProveedorData[K]
  ) => setData((prev) => ({ ...prev, [key]: value }))

  // Contactos
  const addContacto = () =>
    setData((p) => ({ ...p, contactos: [...p.contactos, newContacto()] }))
  const removeContacto = (id: string) =>
    setData((p) => ({
      ...p,
      contactos: p.contactos.filter((c) => c.id !== id),
    }))
  const updateContacto = (id: string, field: keyof Contacto, value: string) =>
    setData((p) => ({
      ...p,
      contactos: p.contactos.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))

  // Cuentas bancarias
  const addCuenta = () =>
    setData((p) => ({
      ...p,
      cuentasBancarias: [...p.cuentasBancarias, newCuenta()],
    }))
  const removeCuenta = (id: string) =>
    setData((p) => ({
      ...p,
      cuentasBancarias: p.cuentasBancarias.filter((c) => c.id !== id),
    }))
  const updateCuenta = (
    id: string,
    field: keyof CuentaBancaria,
    value: string | boolean
  ) =>
    setData((p) => ({
      ...p,
      cuentasBancarias: p.cuentasBancarias.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))

  // Marca una cuenta como principal y desmarca las demás de la misma moneda
  const setPrincipal = (id: string) =>
    setData((p) => {
      const cuenta = p.cuentasBancarias.find((c) => c.id === id)
      if (!cuenta) return p
      return {
        ...p,
        cuentasBancarias: p.cuentasBancarias.map((c) => {
          if (c.id === id) return { ...c, principal: !c.principal }
          // Si la cuenta target la marcamos principal, desmarcamos las otras
          // de la misma moneda
          if (!cuenta.principal && c.moneda === cuenta.moneda) {
            return { ...c, principal: false }
          }
          return c
        }),
      }
    })

  // Lista de precios
  const addItem = () =>
    setData((p) => ({ ...p, listaPrecios: [...p.listaPrecios, newItem()] }))
  const removeItem = (id: string) =>
    setData((p) => ({
      ...p,
      listaPrecios: p.listaPrecios.filter((c) => c.id !== id),
    }))
  const updateItem = (id: string, field: keyof ItemLista, value: string) =>
    setData((p) => ({
      ...p,
      listaPrecios: p.listaPrecios.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))

  const copiar = async (texto: string, key: string) => {
    if (!texto) return
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(key)
      setTimeout(() => setCopiado(""), 1500)
    } catch {
      // ignore
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    formData.append("nombre", data.nombre)
    formData.append("cuit", data.cuit)
    formData.append("rubro", data.rubro)
    formData.append("sitio", data.sitio)
    formData.append("email", data.email)
    formData.append("direccion", data.direccion)
    formData.append("ciudad", data.ciudad)
    formData.append("notas", data.notas)
    formData.append("activo", String(data.activo))

    const contactosLimpios = data.contactos.filter(
      (c) => c.nombre.trim() || c.telefono.trim() || c.email.trim()
    )
    formData.append("contactos", JSON.stringify(contactosLimpios))

    const cuentasLimpias = data.cuentasBancarias.filter(
      (c) => c.banco.trim() || c.cbu.trim() || c.alias.trim() || c.numero.trim()
    )
    formData.append("cuentasBancarias", JSON.stringify(cuentasLimpias))

    const listaLimpia = data.listaPrecios.filter(
      (c) => c.concepto.trim() || c.precio.trim()
    )
    formData.append("listaPrecios", JSON.stringify(listaLimpia))

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) setError(result.error)
      else {
        router.push("/admin/proveedores")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/admin/proveedores" />}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar proveedor" : "Nuevo proveedor"}
          </h1>
        </div>
        <Button
          type="submit"
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info del proveedor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información del proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nombre">Nombre / Razón social *</Label>
                <Input
                  id="nombre"
                  value={data.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rubro">Rubro</Label>
                <Input
                  id="rubro"
                  value={data.rubro}
                  onChange={(e) => set("rubro", e.target.value)}
                  placeholder="ej: Motos 0km, Cascos, Repuestos..."
                />
              </div>
              <div>
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={data.cuit}
                  onChange={(e) => set("cuit", e.target.value)}
                  placeholder="30-12345678-9"
                />
              </div>
              <div>
                <Label htmlFor="email">Email general</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="info@proveedor.com.ar"
                />
              </div>
              <div>
                <Label htmlFor="sitio">Sitio web</Label>
                <Input
                  id="sitio"
                  value={data.sitio}
                  onChange={(e) => set("sitio", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={data.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Av. Siempreviva 742"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={data.ciudad}
                  onChange={(e) => set("ciudad", e.target.value)}
                  placeholder="Bahía Blanca"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm pt-2">
              <input
                type="checkbox"
                checked={data.activo}
                onChange={(e) => set("activo", e.target.checked)}
                className="rounded accent-[#7C3AED]"
              />
              Proveedor activo
            </label>

            {/* === Cuentas bancarias === */}
            <div className="pt-5 mt-5 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="size-5 text-[#7C3AED]" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Cuentas bancarias
                    {data.cuentasBancarias.length > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({data.cuentasBancarias.length})
                      </span>
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addCuenta}
                  className="inline-flex items-center gap-1 rounded-md bg-[#7C3AED] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0] transition-colors"
                >
                  <Plus className="size-3.5" />
                  Agregar
                </button>
              </div>

              {data.cuentasBancarias.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-neutral-800 p-6 text-center">
                  <Landmark className="size-7 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Sin cuentas bancarias cargadas.
                  </p>
                  <button
                    type="button"
                    onClick={addCuenta}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0]"
                  >
                    <Plus className="size-3.5" />
                    Agregar primera cuenta
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.cuentasBancarias.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-4 space-y-3 transition-colors ${
                        c.principal
                          ? "border-[#7C3AED]/60 bg-[#7C3AED]/5"
                          : "border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                            Cuenta #{idx + 1}
                          </span>
                          {c.principal && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                              <Star className="size-2.5 fill-current" />
                              Principal {c.moneda}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-gray-600 dark:text-gray-300 hover:text-[#7C3AED]">
                            <input
                              type="checkbox"
                              checked={c.principal}
                              onChange={() => setPrincipal(c.id)}
                              className="rounded accent-[#7C3AED]"
                            />
                            Principal
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCuenta(c.id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-300 transition-colors"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Banco</Label>
                          <Input
                            value={c.banco}
                            onChange={(e) => updateCuenta(c.id, "banco", e.target.value)}
                            list={`bancos-${c.id}`}
                            placeholder="Banco Galicia"
                            className="h-9 text-sm"
                          />
                          <datalist id={`bancos-${c.id}`}>
                            {BANCOS_SUGERIDOS.map((b) => (
                              <option key={b} value={b} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <Label className="text-xs">Moneda</Label>
                          <select
                            value={c.moneda}
                            onChange={(e) => updateCuenta(c.id, "moneda", e.target.value)}
                            className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                          >
                            <option value="ARS">Pesos (ARS)</option>
                            <option value="USD">Dólares (USD)</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <select
                            value={c.tipo}
                            onChange={(e) => updateCuenta(c.id, "tipo", e.target.value)}
                            className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                          >
                            <option value="CA">Caja de ahorro</option>
                            <option value="CC">Cuenta corriente</option>
                            <option value="VIRTUAL">Cuenta virtual</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Nº de cuenta</Label>
                          <Input
                            value={c.numero}
                            onChange={(e) => updateCuenta(c.id, "numero", e.target.value)}
                            placeholder="12345/6"
                            className="h-9 text-sm font-mono"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Label className="text-xs">CBU / CVU</Label>
                          <div className="flex gap-1.5">
                            <Input
                              value={c.cbu}
                              onChange={(e) => updateCuenta(c.id, "cbu", e.target.value.replace(/\s/g, ""))}
                              placeholder="0000000000000000000000"
                              maxLength={22}
                              className="h-9 text-sm font-mono"
                            />
                            {c.cbu && (
                              <button
                                type="button"
                                onClick={() => copiar(c.cbu, `cbu-${c.id}`)}
                                className="shrink-0 inline-flex items-center justify-center size-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[#7C3AED] hover:bg-[#7C3AED]/5"
                                title="Copiar CBU"
                              >
                                {copiado === `cbu-${c.id}` ? (
                                  <Check className="size-4 text-green-600" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <Label className="text-xs">Alias</Label>
                          <div className="flex gap-1.5">
                            <Input
                              value={c.alias}
                              onChange={(e) => updateCuenta(c.id, "alias", e.target.value)}
                              placeholder="proveedor.banco.alias"
                              className="h-9 text-sm font-mono"
                            />
                            {c.alias && (
                              <button
                                type="button"
                                onClick={() => copiar(c.alias, `alias-${c.id}`)}
                                className="shrink-0 inline-flex items-center justify-center size-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[#7C3AED] hover:bg-[#7C3AED]/5"
                                title="Copiar alias"
                              >
                                {copiado === `alias-${c.id}` ? (
                                  <Check className="size-4 text-green-600" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <Label className="text-xs">Titular</Label>
                          <Input
                            value={c.titular}
                            onChange={(e) => updateCuenta(c.id, "titular", e.target.value)}
                            placeholder="Razón social del titular"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCuenta}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 px-3 py-2 text-xs font-semibold text-[#7C3AED] transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Agregar otra cuenta
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contactos */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-[#7C3AED]" />
              Contactos
            </CardTitle>
            <button
              type="button"
              onClick={addContacto}
              className="inline-flex items-center gap-1 rounded-md bg-[#7C3AED] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0] transition-colors"
            >
              <Plus className="size-3.5" />
              Agregar
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contactos.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-neutral-800 p-6 text-center">
                <UserPlus className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Sin contactos cargados.
                </p>
                <button
                  type="button"
                  onClick={addContacto}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0]"
                >
                  <Plus className="size-3.5" />
                  Agregar primer contacto
                </button>
              </div>
            )}

            {data.contactos.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                    Contacto #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContacto(c.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-300 transition-colors"
                    title="Eliminar contacto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div>
                  <Label htmlFor={`nombre-${c.id}`} className="text-xs">
                    Nombre
                  </Label>
                  <Input
                    id={`nombre-${c.id}`}
                    value={c.nombre}
                    onChange={(e) => updateContacto(c.id, "nombre", e.target.value)}
                    placeholder="Juan García"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`rol-${c.id}`} className="text-xs">
                    Rol / Sector
                  </Label>
                  <Input
                    id={`rol-${c.id}`}
                    value={c.rol}
                    onChange={(e) => updateContacto(c.id, "rol", e.target.value)}
                    placeholder="Ej: Administración"
                    list={`roles-${c.id}`}
                    className="h-9 text-sm"
                  />
                  <datalist id={`roles-${c.id}`}>
                    {ROLES_SUGERIDOS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor={`tel-${c.id}`} className="text-xs">
                    Teléfono / Celular
                  </Label>
                  <Input
                    id={`tel-${c.id}`}
                    value={c.telefono}
                    onChange={(e) =>
                      updateContacto(c.id, "telefono", e.target.value)
                    }
                    placeholder="291 123-4567"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`email-${c.id}`} className="text-xs">
                    Email (opcional)
                  </Label>
                  <Input
                    id={`email-${c.id}`}
                    type="email"
                    value={c.email}
                    onChange={(e) => updateContacto(c.id, "email", e.target.value)}
                    placeholder="juan@proveedor.com"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ))}

            {data.contactos.length > 0 && (
              <button
                type="button"
                onClick={addContacto}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 px-3 py-2 text-xs font-semibold text-[#7C3AED] transition-colors"
              >
                <Plus className="size-3.5" />
                Agregar otro contacto
              </button>
            )}
          </CardContent>
        </Card>

        {/* Lista de precios - full width */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="size-5 text-[#7C3AED]" />
              Lista de precios ({data.listaPrecios.length})
            </CardTitle>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-md bg-[#7C3AED] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0] transition-colors"
            >
              <Plus className="size-3.5" />
              Agregar fila
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.listaPrecios.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-neutral-800 p-8 text-center">
                <ListOrdered className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Sin productos en la lista de precios.
                </p>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0]"
                >
                  <Plus className="size-3.5" />
                  Agregar primer producto
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
                {/* Header de la tabla */}
                <div className="hidden sm:grid grid-cols-[1fr_140px_100px_1fr_44px] gap-2 bg-gray-50 dark:bg-neutral-950 px-3 py-2 border-b border-gray-200 dark:border-neutral-800 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <div>Concepto / Producto</div>
                  <div>Precio</div>
                  <div>Moneda</div>
                  <div>Notas</div>
                  <div></div>
                </div>
                {/* Filas */}
                <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {data.listaPrecios.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px_1fr_44px] gap-2 p-3 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900/80"
                    >
                      <Input
                        value={item.concepto}
                        onChange={(e) =>
                          updateItem(item.id, "concepto", e.target.value)
                        }
                        placeholder="Nombre del producto / código"
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        value={item.precio}
                        onChange={(e) =>
                          updateItem(item.id, "precio", e.target.value)
                        }
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                      <select
                        value={item.moneda}
                        onChange={(e) =>
                          updateItem(item.id, "moneda", e.target.value)
                        }
                        className="h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-sm"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                      <Input
                        value={item.notas}
                        onChange={(e) =>
                          updateItem(item.id, "notas", e.target.value)
                        }
                        placeholder="Detalles, código, descuentos..."
                        className="h-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center justify-center size-9 rounded-md text-red-500 hover:bg-red-50 dark:bg-red-950/30 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.listaPrecios.length > 0 && (
              <button
                type="button"
                onClick={addItem}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 px-3 py-2.5 text-sm font-semibold text-[#7C3AED] transition-colors"
              >
                <Plus className="size-4" />
                Agregar fila
              </button>
            )}

            {data.listaPrecios.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                💡 Tip: usá esta tabla como referencia interna de precios mayoristas
                del proveedor. No se publica en la web.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notas - full width */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.notas}
              onChange={(e) => set("notas", e.target.value)}
              placeholder="Condiciones comerciales, plazos de pago, observaciones..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
