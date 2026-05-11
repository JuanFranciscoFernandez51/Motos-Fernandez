import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ModeloForm } from "@/components/admin/modelo-form"
import { ModeloEditActions } from "@/components/admin/modelo-edit-actions"
import { invalidateModelos } from "@/lib/cached-queries"
import { crearFinanciacionDesdeOC } from "@/lib/financiacion-helpers"

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
        // Equipamiento extra
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

    revalidatePath("/admin/modelos")
    invalidateModelos(slug)
    return {}
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar el modelo"
    return { error: message }
  }
}

// ─── Server actions de Vender / Borrar / Devolver al catálogo ───
// Duplicadas de /admin/modelos/page.tsx para usar desde el form de editar.

async function markVendida(id: string, vendida: boolean) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: vendida
      ? { vendida: true, fechaVenta: new Date(), activo: false }
      : { vendida: false, fechaVenta: null },
  })
  // Side-effects en redes — best effort, no bloquean si fallan
  if (vendida) {
    const { despublicarAlVender } = await import("@/lib/ml/publication")
    const { marcarVendidaEnMeta } = await import("@/lib/meta/publication")
    await Promise.allSettled([despublicarAlVender(id), marcarVendidaEnMeta(id)])
  }
  revalidatePath("/admin/modelos")
  revalidatePath(`/admin/modelos/${id}`)
  revalidatePath("/admin/ml")
  revalidatePath("/admin/meta")
  revalidatePath("/catalogo")
  revalidatePath("/")
  invalidateModelos()
}

type PermutaInput = {
  marca: string | null
  modelo: string | null
  anio: number | null
  kilometros: number | null
  patente: string | null
  chasis: string | null
  motor: string | null
  descripcion: string | null
  valor: number | null
  subirAlStock: boolean
}

type PagoInput = {
  metodo: string
  monto: number
  detalle: string | null
  fecha: string | null
}

type CrearOCDesdeModeloInput = {
  modeloId: string
  clienteId: string
  precioVenta: number
  moneda: string
  formaPago: string
  sena: number | null
  saldo: number | null
  detallePago: string | null
  estado: "BORRADOR" | "RESERVADA" | "CONCRETADA"
  observaciones: string | null
  permutas: PermutaInput[]
  pagos?: PagoInput[]
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
  garanteNombre: string | null
  garanteApellido: string | null
  garanteDni: string | null
  garanteTelefono: string | null
  garanteDireccion: string | null
}

async function crearOCDesdeModelo(input: CrearOCDesdeModeloInput) {
  "use server"
  try {
    const modelo = await prisma.modelo.findUnique({
      where: { id: input.modeloId },
      select: {
        id: true, nombre: true, marca: true, anio: true, kilometros: true,
        chasis: true, motor: true, patente: true,
      },
    })
    if (!modelo) return { error: "Moto no encontrada" }
    const motoDescripcion = `${modelo.marca} ${modelo.nombre}${modelo.anio ? ` ${modelo.anio}` : ""}`

    const sumaPermutas = input.permutas.reduce((s, p) => s + (p.valor || 0), 0) || null
    const resumenPermutas =
      input.permutas.length > 0
        ? input.permutas
            .map((p, i) => {
              const partes = [p.marca, p.modelo, p.anio ? String(p.anio) : null]
                .filter(Boolean)
                .join(" ")
              return `${i + 1}) ${partes || "Permuta"} — $${(p.valor ?? 0).toLocaleString("es-AR")}`
            })
            .join("\n")
        : null

    const result = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.create({
        data: {
          clienteId: input.clienteId,
          modeloId: input.modeloId,
          motoDescripcion,
          motoChasis: modelo.chasis,
          motoMotor: modelo.motor,
          motoPatente: modelo.patente,
          motoAnio: modelo.anio,
          motoKilometros: modelo.kilometros,
          precioVenta: input.precioVenta,
          moneda: input.moneda,
          formaPago: input.formaPago,
          sena: input.sena,
          saldo: input.saldo,
          detallePago: input.detallePago,
          permutaDescripcion: resumenPermutas,
          permutaValor: sumaPermutas,
          cuotas: input.cuotas,
          valorCuota: input.valorCuota,
          entrega: input.entrega,
          estado: input.estado,
          observaciones: input.observaciones,
          fecha: new Date(),
        },
      })

      const ultimosMF = await tx.modelo.findMany({
        where: { slug: { startsWith: "mf-" } },
        select: { slug: true },
      })
      const numerosMF = ultimosMF
        .map((m) => {
          const match = m.slug.match(/^mf-(\d+)$/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((n) => n > 0)
      let proximoMF = numerosMF.length > 0 ? Math.max(...numerosMF) + 1 : 1
      const placeholderFoto = "/images/logo-clasico.png"

      const motosRecibidasIds: string[] = []
      for (const p of input.permutas) {
        let motoRecibidaId: string | null = null
        // Siempre cargar al catalogo si hay marca + modelo (la moto queda inactiva)
        if (p.marca && p.modelo) {
          const slug = `mf-${String(proximoMF).padStart(4, "0")}`
          proximoMF++
          const motoRecibida = await tx.modelo.create({
            data: {
              nombre: p.modelo,
              slug,
              marca: p.marca,
              condicion: "USADA",
              anio: p.anio,
              kilometros: p.kilometros,
              patente: p.patente,
              chasis: p.chasis,
              motor: p.motor,
              precio: p.valor,
              moneda: input.moneda,
              activo: false,
              fotos: [placeholderFoto],
              origen: "PARTE_DE_PAGO",
              clienteEntregaId: input.clienteId,
              ordenCompraOrigenId: orden.id,
              etiqueta: null,
            },
          })
          motoRecibidaId = motoRecibida.id
          motosRecibidasIds.push(motoRecibida.id)
        }
        await tx.oCPermuta.create({
          data: {
            ordenCompraId: orden.id,
            marca: p.marca,
            modelo: p.modelo,
            anio: p.anio,
            kilometros: p.kilometros,
            patente: p.patente,
            chasis: p.chasis,
            motor: p.motor,
            descripcion: p.descripcion,
            valor: p.valor ?? 0,
            motoRecibidaId,
          },
        })
      }
      if (motosRecibidasIds.length > 0) {
        await tx.ordenCompra.update({
          where: { id: orden.id },
          data: { motoRecibidaId: motosRecibidasIds[0] },
        })
      }

      // Crear pagos directos si vinieron
      for (const p of input.pagos || []) {
        await tx.oCPago.create({
          data: {
            ordenCompraId: orden.id,
            metodo: p.metodo,
            monto: p.monto,
            detalle: p.detalle,
            fecha: p.fecha ? new Date(p.fecha) : null,
          },
        })
      }

      if (input.estado === "CONCRETADA") {
        await tx.modelo.update({
          where: { id: input.modeloId },
          data: { vendida: true, fechaVenta: new Date(), activo: false },
        })
      } else if (input.estado === "RESERVADA") {
        await tx.modelo.update({
          where: { id: input.modeloId },
          data: { etiqueta: "RESERVADA" },
        })
      }

      await crearFinanciacionDesdeOC(tx, {
        id: orden.id,
        clienteId: orden.clienteId,
        motoDescripcion: orden.motoDescripcion,
        formaPago: orden.formaPago,
        cuotas: orden.cuotas,
        valorCuota: orden.valorCuota,
        entrega: orden.entrega,
        precioVenta: orden.precioVenta,
        moneda: orden.moneda,
        garanteNombre: input.garanteNombre,
        garanteApellido: input.garanteApellido,
        garanteDni: input.garanteDni,
        garanteTelefono: input.garanteTelefono,
        garanteDireccion: input.garanteDireccion,
      })

      return { ordenId: orden.id, motoRecibidaId: motosRecibidasIds[0] || null }
    })

    revalidatePath("/admin/modelos")
    revalidatePath("/admin/ordenes-compra")
    revalidatePath("/admin/tesoreria")
    revalidatePath("/admin/tesoreria/financiaciones")
    revalidatePath("/catalogo")
    revalidatePath("/")
    invalidateModelos()
    return result
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al crear OC" }
  }
}

async function deleteModelo(id: string, confirmText: string) {
  "use server"
  try {
    const modelo = await prisma.modelo.findUnique({
      where: { id },
      select: { nombre: true, slug: true },
    })
    if (!modelo) return { error: "Modelo no encontrado" }
    if (confirmText !== modelo.slug) {
      return { error: `Tenés que escribir exactamente "${modelo.slug}"` }
    }
    await prisma.modelo.delete({ where: { id } })
    revalidatePath("/admin/modelos")
    revalidatePath("/catalogo")
    revalidatePath("/")
    invalidateModelos()
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al borrar" }
  }
}

export default async function EditModeloPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [modelo, clientes, proveedores] = await Promise.all([
    prisma.modelo.findUnique({
      where: { id },
      include: { colores: true },
    }),
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
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
    transmision: modelo.transmision || "",
    combustible: modelo.combustible || "",
    color: modelo.color || "",
    frenos: modelo.frenos || "",
    tipoMotor: modelo.tipoMotor || "",
    potenciaHp: modelo.potenciaHp,
    garantiaFabrica: modelo.garantiaFabrica,
    aceptaPermuta: modelo.aceptaPermuta,
    precioNegociable: modelo.precioNegociable,
    unicoDueno: modelo.unicoDueno,
    tieneAlarma: modelo.tieneAlarma,
    entradaUsb: modelo.entradaUsb,
    distanciaEjesCm: modelo.distanciaEjesCm,
    largoMm: modelo.largoMm,
    alturaMm: modelo.alturaMm,
    anchoMm: modelo.anchoMm,
    pesoKg: modelo.pesoKg,
    marcaMotor: modelo.marcaMotor,
    capacidadTanque: modelo.capacidadTanque,
    sistemaArranque: modelo.sistemaArranque,
    velocidadMaxima: modelo.velocidadMaxima,
    numeroVelocidades: modelo.numeroVelocidades,
    alturaAsiento: modelo.alturaAsiento,
    gps: modelo.gps,
    eficienciaKmL: modelo.eficienciaKmL,
    tipoBateria: modelo.tipoBateria,
    cantidadBaterias: modelo.cantidadBaterias,
    capacidadBateria: modelo.capacidadBateria,
    voltajeBateria: modelo.voltajeBateria,
    autonomiaKm: modelo.autonomiaKm,
    tiempoCarga: modelo.tiempoCarga,
    pesoBateriaG: modelo.pesoBateriaG,
    tipoCargador: modelo.tipoCargador,
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
    proveedorId: modelo.proveedorId,
    clienteEntregaId: modelo.clienteEntregaId,
    clienteNombre: modelo.clienteNombre,
    clienteContacto: modelo.clienteContacto,
    notasInternas: modelo.notasInternas,
  }

  // Datos minimos para el OCDrawer (necesita ModeloAVender shape)
  const modeloAVender = {
    id: modelo.id,
    nombre: modelo.nombre,
    slug: modelo.slug,
    marca: modelo.marca,
    anio: modelo.anio,
    kilometros: modelo.kilometros,
    precio: modelo.precio,
    moneda: modelo.moneda,
    fotos: modelo.fotos,
    patente: modelo.patente,
    vendida: modelo.vendida,
  }

  return (
    <ModeloForm
      initialData={initialData}
      saveAction={updateModelo}
      clientes={clientes}
      proveedores={proveedores}
      extraActions={
        <ModeloEditActions
          modelo={modeloAVender}
          clientes={clientes}
          markVendida={markVendida}
          crearOCDesdeModelo={crearOCDesdeModelo}
          deleteModelo={deleteModelo}
        />
      }
    />
  )
}
