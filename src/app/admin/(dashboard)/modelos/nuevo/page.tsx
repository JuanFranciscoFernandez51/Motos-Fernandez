import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ModeloForm } from "@/components/admin/modelo-form"
import { invalidateModelos } from "@/lib/cached-queries"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"

export const dynamic = "force-dynamic"

async function createModelo(formData: FormData) {
  "use server"

  try {
    const nombre = formData.get("nombre") as string
    const slug = formData.get("slug") as string
    const marca = formData.get("marca") as string
    const categoriaVehiculo = formData.get("categoriaVehiculo") as string
    const condicion = formData.get("condicion") as string || "0KM"
    const anioStr = formData.get("anio") as string
    const kilometrosStr = formData.get("kilometros") as string
    const observaciones = formData.get("observaciones") as string
    const cilindrada = formData.get("cilindrada") as string
    const transmision = formData.get("transmision") as string
    const combustible = formData.get("combustible") as string
    const color = formData.get("color") as string
    // ML opcionales
    const frenos = formData.get("frenos") as string
    const tipoMotor = formData.get("tipoMotor") as string
    const potenciaHpStr = formData.get("potenciaHp") as string
    const garantiaFabrica = formData.get("garantiaFabrica") === "true"
    const aceptaPermuta = formData.get("aceptaPermuta") === "true"
    const precioNegociable = formData.get("precioNegociable") === "true"
    const unicoDueno = formData.get("unicoDueno") === "true"
    const tieneAlarma = formData.get("tieneAlarma") === "true"
    const entradaUsb = formData.get("entradaUsb") === "true"
    const distanciaEjesCmStr = formData.get("distanciaEjesCm") as string
    const largoMmStr = formData.get("largoMm") as string
    const alturaMmStr = formData.get("alturaMm") as string
    const anchoMmStr = formData.get("anchoMm") as string
    const pesoKgStr = formData.get("pesoKg") as string
    // Equipamiento extra
    const marcaMotor = formData.get("marcaMotor") as string
    const capacidadTanqueStr = formData.get("capacidadTanque") as string
    const sistemaArranque = formData.get("sistemaArranque") as string
    const velocidadMaximaStr = formData.get("velocidadMaxima") as string
    const numeroVelocidadesStr = formData.get("numeroVelocidades") as string
    const alturaAsientoStr = formData.get("alturaAsiento") as string
    const gps = formData.get("gps") === "true"
    const eficienciaKmLStr = formData.get("eficienciaKmL") as string
    const tipoBateria = formData.get("tipoBateria") as string
    const cantidadBateriasStr = formData.get("cantidadBaterias") as string
    const capacidadBateriaStr = formData.get("capacidadBateria") as string
    const voltajeBateriaStr = formData.get("voltajeBateria") as string
    const autonomiaKmStr = formData.get("autonomiaKm") as string
    const tiempoCargaStr = formData.get("tiempoCarga") as string
    const pesoBateriaGStr = formData.get("pesoBateriaG") as string
    const tipoCargador = formData.get("tipoCargador") as string
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
    const proveedorId = (formData.get("proveedorId") as string) || ""
    const clienteEntregaId = (formData.get("clienteEntregaId") as string) || ""
    const clienteNombre = (formData.get("clienteNombre") as string) || ""
    const clienteContacto = (formData.get("clienteContacto") as string) || ""
    const notasInternas = (formData.get("notasInternas") as string) || ""

    const specs: Record<string, string> = {}
    for (const s of specsRaw) {
      if (s.key.trim()) specs[s.key] = s.value
    }

    await prisma.$transaction(async (tx) => {
      const codigo = await generarCodigoModelo(tx, { condicion })
      await tx.modelo.create({
      data: {
        nombre,
        slug,
        codigo,
        marca,
        categoriaVehiculo: categoriaVehiculo as "MOTOCICLETA" | "CUATRICICLO" | "UTV" | "MOTO_DE_AGUA",
        condicion,
        anio: anioStr ? parseInt(anioStr) : null,
        kilometros: kilometrosStr ? parseInt(kilometrosStr) : null,
        observaciones: observaciones || null,
        cilindrada: cilindrada || null,
        transmision: transmision || null,
        combustible: combustible || null,
        color: color || null,
        frenos: frenos || null,
        tipoMotor: tipoMotor || null,
        potenciaHp: potenciaHpStr ? parseInt(potenciaHpStr) : null,
        garantiaFabrica,
        aceptaPermuta,
        precioNegociable,
        unicoDueno,
        tieneAlarma,
        entradaUsb,
        distanciaEjesCm: distanciaEjesCmStr ? parseInt(distanciaEjesCmStr) : null,
        largoMm: largoMmStr ? parseInt(largoMmStr) : null,
        alturaMm: alturaMmStr ? parseInt(alturaMmStr) : null,
        anchoMm: anchoMmStr ? parseInt(anchoMmStr) : null,
        pesoKg: pesoKgStr ? parseInt(pesoKgStr) : null,
        marcaMotor: marcaMotor || null,
        capacidadTanque: capacidadTanqueStr ? parseInt(capacidadTanqueStr) : null,
        sistemaArranque: sistemaArranque || null,
        velocidadMaxima: velocidadMaximaStr ? parseInt(velocidadMaximaStr) : null,
        numeroVelocidades: numeroVelocidadesStr ? parseInt(numeroVelocidadesStr) : null,
        alturaAsiento: alturaAsientoStr ? parseInt(alturaAsientoStr) : null,
        gps,
        eficienciaKmL: eficienciaKmLStr ? parseFloat(eficienciaKmLStr) : null,
        tipoBateria: tipoBateria || null,
        cantidadBaterias: cantidadBateriasStr ? parseInt(cantidadBateriasStr) : null,
        capacidadBateria: capacidadBateriaStr ? parseFloat(capacidadBateriaStr) : null,
        voltajeBateria: voltajeBateriaStr ? parseFloat(voltajeBateriaStr) : null,
        autonomiaKm: autonomiaKmStr ? parseInt(autonomiaKmStr) : null,
        tiempoCarga: tiempoCargaStr ? parseFloat(tiempoCargaStr) : null,
        pesoBateriaG: pesoBateriaGStr ? parseInt(pesoBateriaGStr) : null,
        tipoCargador: tipoCargador || null,
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
        proveedorId: proveedorId || null,
        clienteEntregaId: clienteEntregaId || null,
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
    })

    revalidatePath("/admin/modelos")
    invalidateModelos()
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear el modelo"
    return { error: message }
  }
}

export default async function NuevoModeloPage() {
  const [clientes, proveedores] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      take: 15, // semilla: ClienteSelector busca server-side al tipear
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        telefono: true,
        email: true,
      },
    }),
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ])
  return <ModeloForm saveAction={createModelo} clientes={clientes} proveedores={proveedores} />
}
