import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import {
  ProveedorForm,
  type Contacto,
  type CuentaBancaria,
  type ItemLista,
} from "@/components/admin/operativo/proveedor-form"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

type ContactoInput = {
  id?: string
  nombre?: string
  rol?: string
  telefono?: string
  email?: string
}

function parseJsonArray(raw: string): unknown[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // ignore
  }
  return null
}

async function updateProveedor(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const get = (k: string) => (formData.get(k) as string) || ""

    const contactos = parseJsonArray(get("contactos")) as ContactoInput[] | null
    const cuentasBancarias = parseJsonArray(get("cuentasBancarias"))
    const listaPrecios = parseJsonArray(get("listaPrecios"))

    // Compatibilidad: usar primer contacto como principal legacy
    let contactoPrincipal: string | null = null
    let telefonoPrincipal: string | null = null
    if (contactos && contactos.length > 0) {
      const primero = contactos[0]
      if (primero?.nombre) {
        contactoPrincipal = primero.rol
          ? `${primero.nombre} (${primero.rol})`
          : primero.nombre
      }
      if (primero?.telefono) telefonoPrincipal = primero.telefono
    }

    await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: get("nombre"),
        contacto: contactoPrincipal,
        telefono: telefonoPrincipal,
        email: get("email") || null,
        cuit: get("cuit") || null,
        direccion: get("direccion") || null,
        ciudad: get("ciudad") || null,
        rubro: get("rubro") || null,
        sitio: get("sitio") || null,
        notas: get("notas") || null,
        activo: get("activo") === "true",
        contactos: contactos
          ? (contactos as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        cuentasBancarias: cuentasBancarias
          ? (cuentasBancarias as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        listaPrecios: listaPrecios
          ? (listaPrecios as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    revalidatePath("/admin/proveedores")
    revalidatePath(`/admin/proveedores/${id}`)
    return {}
  } catch (e: unknown) {
    console.error("Error actualizando proveedor:", e)
    return {
      error: e instanceof Error ? e.message : "Error al actualizar",
    }
  }
}

async function deleteProveedor(id: string) {
  "use server"
  await prisma.modelo.updateMany({
    where: { proveedorId: id },
    data: { proveedorId: null },
  })
  await prisma.producto.updateMany({
    where: { proveedorId: id },
    data: { proveedorId: null },
  })
  await prisma.proveedor.delete({ where: { id } })
  revalidatePath("/admin/proveedores")
  redirect("/admin/proveedores")
}

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      _count: { select: { modelos: true, productos: true } },
    },
  })
  if (!proveedor) notFound()

  // Migrar contactos: si hay datos en formato JSON, usarlos.
  // Si no, intentar derivar uno desde los campos legacy (contacto + telefono).
  let contactosIniciales: Contacto[] = []
  if (Array.isArray(proveedor.contactos)) {
    contactosIniciales = (proveedor.contactos as unknown as Contacto[]).map(
      (c, i) => ({
        id: c.id || `c-existing-${i}`,
        nombre: c.nombre || "",
        rol: c.rol || "",
        telefono: c.telefono || "",
        email: c.email || "",
      })
    )
  } else if (proveedor.contacto || proveedor.telefono) {
    contactosIniciales = [
      {
        id: "c-legacy-0",
        nombre: proveedor.contacto || "",
        rol: "",
        telefono: proveedor.telefono || "",
        email: "",
      },
    ]
  }

  // Cuentas bancarias
  let cuentasIniciales: CuentaBancaria[] = []
  if (Array.isArray(proveedor.cuentasBancarias)) {
    cuentasIniciales = (
      proveedor.cuentasBancarias as unknown as CuentaBancaria[]
    ).map((c, i) => ({
      id: c.id || `b-existing-${i}`,
      banco: c.banco || "",
      tipo: c.tipo || "CA",
      numero: c.numero || "",
      cbu: c.cbu || "",
      alias: c.alias || "",
      titular: c.titular || "",
      moneda: c.moneda || "ARS",
    }))
  }

  // Lista de precios
  let listaIniciales: ItemLista[] = []
  if (Array.isArray(proveedor.listaPrecios)) {
    listaIniciales = (proveedor.listaPrecios as unknown as ItemLista[]).map(
      (item, i) => ({
        id: item.id || `p-existing-${i}`,
        concepto: item.concepto || "",
        precio: item.precio != null ? String(item.precio) : "",
        moneda: item.moneda || "ARS",
        notas: item.notas || "",
      })
    )
  }

  const initialData = {
    id: proveedor.id,
    nombre: proveedor.nombre,
    cuit: proveedor.cuit || "",
    rubro: proveedor.rubro || "",
    sitio: proveedor.sitio || "",
    email: proveedor.email || "",
    direccion: proveedor.direccion || "",
    ciudad: proveedor.ciudad || "",
    notas: proveedor.notas || "",
    activo: proveedor.activo,
    contactos: contactosIniciales,
    cuentasBancarias: cuentasIniciales,
    listaPrecios: listaIniciales,
  }

  return (
    <div className="space-y-6">
      <ProveedorForm initialData={initialData} saveAction={updateProveedor} />

      <div className="rounded-lg border bg-red-50/40 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-900 dark:text-red-300">Eliminar proveedor</p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Se desasocian los modelos ({proveedor._count.modelos}) y productos (
            {proveedor._count.productos}) que lo tenían asignado.
          </p>
        </div>
        <form action={deleteProveedor.bind(null, proveedor.id)}>
          <Button
            type="submit"
            variant="outline"
            className="border-red-300 text-red-700 dark:text-red-300 hover:bg-red-100 dark:bg-red-900/40"
          >
            <Trash2 className="size-4 mr-1" /> Eliminar
          </Button>
        </form>
      </div>
    </div>
  )
}
