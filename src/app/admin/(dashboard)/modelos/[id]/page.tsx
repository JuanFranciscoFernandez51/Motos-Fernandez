import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ModeloForm } from "@/components/admin/modelo-form"

export const dynamic = "force-dynamic"

async function updateModelo(formData: FormData) {
  "use server"

  try {
    const id = formData.get("id") as string
    const nombre = formData.get("nombre") as string
    const slug = formData.get("slug") as string
    const marca = formData.get("marca") as string
    const categoriaVehiculo = formData.get("categoriaVehiculo") as string
    const condicion = formData.get("condicion") as string || "0KM"
    const anioStr = formData.get("anio") as string
    const kilometrosStr = formData.get("kilometros") as string
    const observaciones = formData.get("observaciones") as string
    const cilindrada = formData.get("cilindrada") as string
    const precioStr = formData.get("precio") as string
    const moneda = formData.get("moneda") as string || "ARS"
    const descripcion = formData.get("descripcion") as string
    const specsRaw = JSON.parse(formData.get("specs") as string) as { key: string; value: string }[]
    const coloresRaw = JSON.parse(formData.get("colores") as string) as { nombre: string; hex: string; foto: string }[]
    const fotos = JSON.parse(formData.get("fotos") as string) as string[]
    const financiacionRaw = JSON.parse((formData.get("financiacion") as string) || "[]") as { plan: string; cuota: number | null; entrega: number | null; detalle: string | null }[]
    const activo = formData.get("activo") === "true"
    const destacado = formData.get("destacado") === "true"
    const etiquetaRaw = formData.get("etiqueta") as string
    const etiqueta = etiquetaRaw && etiquetaRaw.trim() ? etiquetaRaw : null
    const orden = parseInt(formData.get("orden") as string) || 0
    // Datos internos (solo admin)
    const chasis = (formData.get("chasis") as string) || ""
    const motor = (formData.get("motor") as string) || ""
    const patente = (formData.get("patente") as string) || ""
    const clienteNombre = (formData.get("clienteNombre") as string) || ""
    const clienteContacto = (formData.get("clienteContacto") as string) || ""
    const notasInternas = (formData.get("notasInternas") as string) || ""

    const specs: Record<string, string> = {}
    for (const s of specsRaw) {
      if (s.key.trim()) specs[s.key] = s.value
    }

    await prisma.modeloColor.deleteMany({ where: { modeloId: id } })

    await prisma.modelo.update({
      where: { id },
      data: {
        nombre,
        slug,
        marca,
        categoriaVehiculo: categoriaVehiculo as "MOTOCICLETA" | "CUATRICICLO" | "UTV" | "MOTO_DE_AGUA",
        condicion,
        anio: anioStr ? parseInt(anioStr) : null,
        kilometros: kilometrosStr ? parseInt(kilometrosStr) : null,
        observaciones: observaciones || null,
        cilindrada: cilindrada || null,
        precio: precioStr ? parseInt(precioStr) : null,
        moneda,
        descripcion: descripcion || null,
        specs: Object.keys(specs).length > 0 ? specs : undefined,
        financiacion: financiacionRaw.length > 0 ? financiacionRaw : undefined,
        fotos,
        activo,
        destacado,
        etiqueta,
        orden,
        chasis: chasis || null,
        motor: motor || null,
        patente: patente || null,
        clienteNombre: clienteNombre || null,
        clienteContacto: clienteContacto || null,
        notasInternas: notasInternas || null,
        colores: {
          create: coloresRaw
            .filter((c) => c.nombre.trim())
            .map((c) => ({ nombre: c.nombre, hex: c.hex, foto: c.foto || null })),
        },
      },
    })

    revalidatePath("/admin/modelos")
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar el modelo"
    return { error: message }
  }
}

export default async function EditModeloPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const modelo = await prisma.modelo.findUnique({
    where: { id },
    include: { colores: true },
  })

  if (!modelo) notFound()

  const specsObj = (modelo.specs as Record<string, string>) || {}
  const specsArray = Object.entries(specsObj).map(([key, value]) => ({ key, value }))

  const financiacionRaw = (modelo.financiacion ?? []) as { plan: string; cuota?: number | null; entrega?: number | null; detalle?: string | null }[]
  const financiacionArray = financiacionRaw.map((f) => ({
    plan: f.plan || "",
    cuota: f.cuota != null ? String(f.cuota) : "",
    entrega: f.entrega != null ? String(f.entrega) : "",
    detalle: f.detalle || "",
  }))

  const initialData = {
    id: modelo.id,
    nombre: modelo.nombre,
    slug: modelo.slug,
    marca: modelo.marca,
    categoriaVehiculo: modelo.categoriaVehiculo,
    condicion: modelo.condicion || "0KM",
    anio: modelo.anio,
    kilometros: modelo.kilometros,
    observaciones: modelo.observaciones || "",
    cilindrada: modelo.cilindrada || "",
    precio: modelo.precio,
    moneda: modelo.moneda || "ARS",
    descripcion: modelo.descripcion || "",
    specs: specsArray,
    financiacion: financiacionArray,
    colores: modelo.colores.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      hex: c.hex,
      foto: c.foto || "",
    })),
    fotos: modelo.fotos,
    activo: modelo.activo,
    destacado: modelo.destacado,
    etiqueta: modelo.etiqueta,
    orden: modelo.orden,
    chasis: modelo.chasis,
    motor: modelo.motor,
    patente: modelo.patente,
    clienteNombre: modelo.clienteNombre,
    clienteContacto: modelo.clienteContacto,
    notasInternas: modelo.notasInternas,
  }

  return <ModeloForm initialData={initialData} saveAction={updateModelo} />
}
