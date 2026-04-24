import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, Ticket } from "lucide-react"

export const dynamic = "force-dynamic"

async function createCupon(formData: FormData) {
  "use server"

  const codigoRaw = formData.get("codigo") as string
  const codigo = codigoRaw?.toUpperCase().trim()
  const descripcion = formData.get("descripcion") as string
  const porcentaje = parseInt(formData.get("porcentaje") as string, 10)
  const montoMaximoStr = formData.get("montoMaximo") as string
  const montoMinimoStr = formData.get("montoMinimo") as string
  const usosMaximosStr = formData.get("usosMaximos") as string
  const fechaInicioStr = formData.get("fechaInicio") as string
  const fechaFinStr = formData.get("fechaFin") as string
  const activo = formData.get("activo") === "on"

  try {
    await prisma.cupon.create({
      data: {
        codigo,
        descripcion: descripcion || null,
        porcentaje,
        montoMaximo: montoMaximoStr ? parseFloat(montoMaximoStr) : null,
        montoMinimo: montoMinimoStr ? parseFloat(montoMinimoStr) : null,
        usosMaximos: usosMaximosStr ? parseInt(usosMaximosStr, 10) : null,
        fechaInicio: fechaInicioStr ? new Date(fechaInicioStr) : new Date(),
        fechaFin: fechaFinStr ? new Date(fechaFinStr) : null,
        activo,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : ""
    if (message.includes("Unique constraint") || message.includes("unique")) {
      redirect("/admin/cupones/nuevo?error=codigo-duplicado")
    }
    redirect("/admin/cupones/nuevo?error=error-general")
  }

  revalidatePath("/admin/cupones")
  redirect("/admin/cupones")
}

export default async function NuevoCuponPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/cupones"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-[#6B4F7A]" />
            Nuevo cupón
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Completá los datos para crear el cupón de descuento
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error === "codigo-duplicado"
            ? "El código ya existe. Probá con uno diferente."
            : "Ocurrió un error al crear el cupón. Intentá de nuevo."}
        </div>
      )}

      {/* Form */}
      <form action={createCupon} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 space-y-6">

        {/* Código y Descripción */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Información del cupón
          </h2>

          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              required
              placeholder="Ej: VERANO20"
              style={{ textTransform: "uppercase" }}
              className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
            />
            <p className="mt-1 text-xs text-gray-400">Se guardará en mayúsculas automáticamente.</p>
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              placeholder="Ej: Descuento de verano para clientes nuevos"
              className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A] resize-none"
            />
          </div>
        </div>

        <hr className="border-gray-100 dark:border-neutral-800" />

        {/* Descuento */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Condiciones del descuento
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="porcentaje" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Porcentaje de descuento <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="porcentaje"
                  name="porcentaje"
                  type="number"
                  required
                  min={1}
                  max={100}
                  placeholder="20"
                  className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label htmlFor="montoMaximo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monto máximo de descuento
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  id="montoMaximo"
                  name="montoMaximo"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Sin límite"
                  className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Dejá vacío para sin límite.</p>
            </div>

            <div>
              <label htmlFor="montoMinimo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monto mínimo de compra
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  id="montoMinimo"
                  name="montoMinimo"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Sin mínimo"
                  className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Dejá vacío para sin mínimo.</p>
            </div>

            <div>
              <label htmlFor="usosMaximos" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usos máximos
              </label>
              <input
                id="usosMaximos"
                name="usosMaximos"
                type="number"
                min={1}
                placeholder="Sin límite"
                className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
              />
              <p className="mt-1 text-xs text-gray-400">Dejá vacío para usos ilimitados.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-neutral-800" />

        {/* Vigencia */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Vigencia
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                required
                defaultValue={today}
                className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
              />
            </div>

            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de vencimiento
              </label>
              <input
                id="fechaFin"
                name="fechaFin"
                type="date"
                className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/30 focus:border-[#6B4F7A]"
              />
              <p className="mt-1 text-xs text-gray-400">Dejá vacío para que no expire.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-neutral-800" />

        {/* Estado */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Activo</p>
            <p className="text-xs text-gray-400">El cupón estará disponible para usar desde el inicio.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="activo"
              defaultChecked
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#6B4F7A]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-neutral-900 after:border-gray-300 dark:border-neutral-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B4F7A]" />
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/cupones"
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Crear cupón
          </button>
        </div>
      </form>
    </div>
  )
}
