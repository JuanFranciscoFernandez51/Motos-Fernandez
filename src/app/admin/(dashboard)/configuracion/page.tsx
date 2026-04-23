"use client"

import { useState, useEffect } from "react"
import { Save, Globe, Phone, Clock, ShoppingCart, Truck, CheckCircle, XCircle, Loader2, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Config = {
  nombre: string
  descripcion: string
  whatsapp: string
  email: string
  direccion: string
  horarioLV: string
  horarioSab: string
  mercadopagoHabilitado: boolean
  enviosHabilitados: boolean
  retiroHabilitado: boolean
  // Datos legales (para PDFs de mandato, venta, OT)
  razonSocial: string
  cuit: string
  iva: string
  ingresosBrutos: string
  telefonoLegal: string
  ciudad: string
}

const DEFAULT: Config = {
  nombre: "Motos Fernandez",
  descripcion: "Concesionaria multimarca en Bahía Blanca",
  whatsapp: "5492915788671",
  email: "info@motosfernandez.com.ar",
  direccion: "Brown 1052, Bahia Blanca",
  horarioLV: "8:30 - 12:30 / 15:30 - 19:30",
  horarioSab: "9:00 - 13:00",
  mercadopagoHabilitado: true,
  enviosHabilitados: true,
  retiroHabilitado: true,
  razonSocial: "Motos Fernandez",
  cuit: "",
  iva: "Responsable Inscripto",
  ingresosBrutos: "",
  telefonoLegal: "+54 291 578-8671",
  ciudad: "Bahía Blanca, Buenos Aires",
}

function IntegrationStatus({ label, envKey }: { label: string; envKey?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle className="h-4 w-4" /> Conectado
      </span>
    </div>
  )
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Config>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/config")
      .then(r => r.json())
      .then(data => { setConfig({ ...DEFAULT, ...data }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: keyof Config, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Configuración general del sitio web</p>
      </div>

      {/* Datos del sitio */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-[#6B4F7A]" />
          Datos del sitio
        </h2>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Nombre del sitio</label>
          <Input value={config.nombre} onChange={e => set("nombre", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Descripción</label>
          <Input value={config.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Descripción breve del negocio" />
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Phone className="h-4 w-4 text-[#6B4F7A]" />
          Contacto
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">WhatsApp (con código de país)</label>
            <Input value={config.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="5492910000000" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Email de contacto</label>
            <Input type="email" value={config.email} onChange={e => set("email", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Dirección</label>
          <Input value={config.direccion} onChange={e => set("direccion", e.target.value)} />
        </div>
      </div>

      {/* Horarios */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#6B4F7A]" />
          Horarios
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Lunes a Viernes</label>
            <Input value={config.horarioLV} onChange={e => set("horarioLV", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Sábados</label>
            <Input value={config.horarioSab} onChange={e => set("horarioSab", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Opciones de venta */}
      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-[#6B4F7A]" />
          Opciones de venta
        </h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.mercadopagoHabilitado}
            onChange={e => set("mercadopagoHabilitado", e.target.checked)}
            className="w-4 h-4 rounded accent-[#6B4F7A]"
          />
          <div>
            <p className="text-sm font-medium">MercadoPago habilitado</p>
            <p className="text-xs text-gray-500">Permite pago online con MercadoPago</p>
          </div>
        </label>
      </div>

      {/* Opciones de entrega */}
      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="h-4 w-4 text-[#6B4F7A]" />
          Opciones de entrega
        </h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enviosHabilitados}
            onChange={e => set("enviosHabilitados", e.target.checked)}
            className="w-4 h-4 rounded accent-[#6B4F7A]"
          />
          <div>
            <p className="text-sm font-medium">Envíos habilitados</p>
            <p className="text-xs text-gray-500">Permite envíos a domicilio</p>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.retiroHabilitado}
            onChange={e => set("retiroHabilitado", e.target.checked)}
            className="w-4 h-4 rounded accent-[#6B4F7A]"
          />
          <div>
            <p className="text-sm font-medium">Retiro en local habilitado</p>
            <p className="text-xs text-gray-500">Permite retiro en {config.direccion}</p>
          </div>
        </label>
      </div>

      {/* Datos legales para PDFs */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#6B4F7A]" />
            Datos legales (para PDFs)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Estos datos aparecen en los mandatos de venta, boletos de compra-venta y órdenes de trabajo.
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Razón social</label>
          <Input
            value={config.razonSocial}
            onChange={(e) => set("razonSocial", e.target.value)}
            placeholder="Fernandez Hermanos S.A."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">CUIT</label>
            <Input
              value={config.cuit}
              onChange={(e) => set("cuit", e.target.value)}
              placeholder="30-12345678-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Condición frente al IVA</label>
            <Input
              value={config.iva}
              onChange={(e) => set("iva", e.target.value)}
              placeholder="Responsable Inscripto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">N° Ingresos Brutos</label>
            <Input
              value={config.ingresosBrutos}
              onChange={(e) => set("ingresosBrutos", e.target.value)}
              placeholder="Convenio Multilateral 901-XXXX"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Teléfono (formato PDF)</label>
            <Input
              value={config.telefonoLegal}
              onChange={(e) => set("telefonoLegal", e.target.value)}
              placeholder="+54 291 578-8671"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-gray-500">Ciudad (formato PDF)</label>
            <Input
              value={config.ciudad}
              onChange={(e) => set("ciudad", e.target.value)}
              placeholder="Bahía Blanca, Buenos Aires"
            />
          </div>
        </div>
      </div>

      {/* Integraciones */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Estado de integraciones</h2>
        <IntegrationStatus label="MercadoPago" />
        <IntegrationStatus label="Anthropic IA (Chatbot)" />
        <IntegrationStatus label="Cloudinary (Imágenes)" />
        <IntegrationStatus label="Resend (Emails)" />
      </div>

      {/* Sticky save */}
      <div className="sticky bottom-6 flex justify-end pb-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`shadow-lg gap-2 transition-all ${saved ? "bg-green-600 hover:bg-green-600" : "bg-[#6B4F7A] hover:bg-[#8B6F9A]"}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  )
}
