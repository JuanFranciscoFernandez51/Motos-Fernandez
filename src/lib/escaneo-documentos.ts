/**
 * Escaneo de documentos con Claude Vision.
 * Detecta el tipo:
 *  - dni: DNI argentino
 *  - factura_moto: factura de fábrica/distribuidor con UNA o VARIAS motos
 *  - desconocido
 */
import Anthropic from "@anthropic-ai/sdk"
import * as XLSX from "xlsx"
import { CATEGORIAS_INGRESO, CATEGORIAS_GASTO } from "@/lib/finanzas"

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

// ==================== Schemas ====================

export type DniData = {
  apellido: string | null
  nombre: string | null
  dni: string | null
  cuit: string | null
  fechaNacimiento: string | null // YYYY-MM-DD
  domicilio: string | null
  ciudad: string | null
}

export type MotoFactura = {
  marca: "VESPA" | "PIAGGIO" | "APRILIA" | null
  modelo: string | null
  color: string | null
  chasis: string | null
  motor: string | null
  anio: number | null
  cilindrada: string | null
  numeroCertificado: string | null
  precioCompra: number | null // en pesos, unitario
}

export type FacturaData = {
  proveedor: string | null
  numeroFactura: string | null
  fechaFactura: string | null // YYYY-MM-DD
  motos: MotoFactura[]
}

export type EscaneoResultado =
  | { tipo: "dni"; data: DniData; confianza: number; resumen: string }
  | { tipo: "factura_moto"; data: FacturaData; confianza: number; resumen: string }
  | { tipo: "desconocido"; resumen: string }

// ==================== Tool definition ====================

const TOOL: Anthropic.Tool = {
  name: "registrar_documento",
  description:
    "Registra los datos extraídos del documento analizado. Debe llamarse exactamente una vez por documento.",
  input_schema: {
    type: "object" as const,
    properties: {
      tipo: {
        type: "string",
        enum: ["dni", "factura_moto", "desconocido"],
        description:
          "dni = DNI argentino (anverso o reverso). " +
          "factura_moto = factura/remito de fábrica o distribuidor con datos de UNA o VARIAS motos. " +
          "desconocido = cualquier otro documento.",
      },
      confianza: { type: "number", description: "Confianza de 0 a 1." },
      resumen: { type: "string", description: "Resumen breve (1-2 líneas)." },

      // ===== DNI =====
      apellido: { type: "string", description: "Solo tipo=dni." },
      nombre: { type: "string", description: "Solo tipo=dni." },
      dni: { type: "string", description: "Solo tipo=dni. Sin puntos." },
      cuit: { type: "string", description: "Solo tipo=dni y aparece." },
      fechaNacimiento: { type: "string", description: "Solo dni. YYYY-MM-DD." },
      domicilio: { type: "string", description: "Solo tipo=dni." },
      ciudad: { type: "string", description: "Solo tipo=dni." },

      // ===== Factura =====
      proveedor: {
        type: "string",
        description: "Solo factura. Razón social del emisor (BMW Cordasco, Grupo Simpa SA, etc.).",
      },
      numeroFactura: {
        type: "string",
        description: "Solo factura. Ej 'A 0001-00544263' o 'FCA00544263'.",
      },
      fechaFactura: {
        type: "string",
        description: "Solo factura. YYYY-MM-DD.",
      },
      motos: {
        type: "array",
        description:
          "Solo tipo=factura_moto. Lista de motos extraídas. Una factura puede tener varias unidades distintas (cada una con su chasis y motor). Si la factura describe UNA sola moto, devolvé un array con un único elemento.",
        items: {
          type: "object",
          properties: {
            marca: {
              type: "string",
              enum: ["VESPA", "PIAGGIO", "APRILIA"],
            },
            modelo: {
              type: "string",
              description:
                "Nombre del modelo. Ej 'Vespa VXL 150', 'Aprilia SR 160', 'Aprilia SR GT 200', 'Aprilia Tuono 457'.",
            },
            color: { type: "string" },
            chasis: { type: "string", description: "Nº de chasis VIN, mayúsculas." },
            motor: { type: "string", description: "Nº de motor tal como aparece." },
            anio: { type: "number" },
            cilindrada: { type: "string", description: "Ej '150cc'." },
            numeroCertificado: {
              type: "string",
              description: "Nº de certificado de fábrica si aparece.",
            },
            precioCompra: {
              type: "number",
              description: "Precio unitario de compra de esa moto, en pesos.",
            },
          },
          required: ["marca", "modelo", "chasis"],
        },
      },
    },
    required: ["tipo", "confianza", "resumen"],
  },
}

const SYSTEM_PROMPT = `Sos un asistente experto en extraer datos estructurados de documentos comerciales y de identidad argentinos para una concesionaria de motos.

REGLAS:
1. Llamá la herramienta registrar_documento exactamente UNA VEZ con todos los datos que puedas extraer.
2. Si no estás seguro de un campo, dejalo sin completar (no inventes).
3. Para chasis y motor: respetá MAYÚSCULAS y caracteres especiales tal cual aparecen.
4. Para precios: convertí siempre a entero en PESOS. Si dice "$ 5.810.000" devolvé 5810000.
5. Para fechas: usá formato YYYY-MM-DD.
6. Si el documento no es ni DNI ni factura de moto, marcá tipo="desconocido".

DETECCIÓN DE DNI:
- Tarjeta plástica con foto del titular
- Texto "REPÚBLICA ARGENTINA" / "DNI" / número de trámite
- Puede ser anverso (foto + datos) o reverso (firma + domicilio)

DETECCIÓN DE FACTURA DE MOTO:
- Documento comercial (factura A/B/C, remito) con datos de UNA O MÁS motos
- Suele incluir Nº motor, color, año, precio
- Puede venir de Vespa Argentina, Piaggio, Aprilia, Grupo Simpa o un concesionario
- IMPORTANTE: una factura puede contener VARIAS motos (con sus chasis y motores distintos).
  Devolvé TODAS en el array "motos", no solo la primera.`

// ==================== Función principal ====================

export type ArchivoEntrada = {
  nombre: string
  mimeType: string
  base64: string
}

export async function escanearDocumento(
  archivo: ArchivoEntrada
): Promise<EscaneoResultado> {
  const anthropic = getAnthropic()

  const isPDF = archivo.mimeType === "application/pdf"
  const isImage = archivo.mimeType.startsWith("image/")
  if (!isPDF && !isImage) {
    return {
      tipo: "desconocido",
      resumen: `Tipo no soportado: ${archivo.mimeType}. Solo imágenes y PDFs.`,
    }
  }

  type DocBlock = {
    type: "document"
    source: { type: "base64"; media_type: "application/pdf"; data: string }
  }
  type ImgBlock = {
    type: "image"
    source: { type: "base64"; media_type: string; data: string }
  }
  type TxtBlock = { type: "text"; text: string }
  const fileBlock: DocBlock | ImgBlock = isPDF
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: archivo.base64 },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: archivo.mimeType, data: archivo.base64 },
      }

  const content: Array<TxtBlock | DocBlock | ImgBlock> = [
    {
      type: "text",
      text: `Analizá el siguiente documento y extraé los datos llamando registrar_documento. Archivo: ${archivo.nombre}`,
    },
    fileBlock,
  ]

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "registrar_documento" },
    messages: [
      {
        role: "user",
        content: content as Anthropic.MessageParam["content"],
      },
    ],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use") as
    | Extract<Anthropic.ContentBlock, { type: "tool_use" }>
    | undefined
  if (!toolUse) {
    return { tipo: "desconocido", resumen: "Claude no devolvió tool_use" }
  }

  const input = toolUse.input as Record<string, unknown>
  const tipo = input.tipo as string
  const confianza = (input.confianza as number) ?? 0
  const resumen = (input.resumen as string) ?? ""

  if (tipo === "dni") {
    return {
      tipo: "dni",
      confianza,
      resumen,
      data: {
        apellido: (input.apellido as string) ?? null,
        nombre: (input.nombre as string) ?? null,
        dni: cleanDni(input.dni as string),
        cuit: (input.cuit as string) ?? null,
        fechaNacimiento: (input.fechaNacimiento as string) ?? null,
        domicilio: (input.domicilio as string) ?? null,
        ciudad: (input.ciudad as string) ?? null,
      },
    }
  }
  if (tipo === "factura_moto") {
    const motosRaw = Array.isArray(input.motos) ? (input.motos as Record<string, unknown>[]) : []
    const motos: MotoFactura[] = motosRaw.map((m) => ({
      marca: (m.marca as MotoFactura["marca"]) ?? null,
      modelo: (m.modelo as string) ?? null,
      color: (m.color as string) ?? null,
      chasis: (m.chasis as string)?.toUpperCase() ?? null,
      motor: (m.motor as string) ?? null,
      anio: (m.anio as number) ?? null,
      cilindrada: (m.cilindrada as string) ?? null,
      numeroCertificado: (m.numeroCertificado as string) ?? null,
      precioCompra: (m.precioCompra as number) ?? null,
    }))
    return {
      tipo: "factura_moto",
      confianza,
      resumen,
      data: {
        proveedor: (input.proveedor as string) ?? null,
        numeroFactura: (input.numeroFactura as string) ?? null,
        fechaFactura: (input.fechaFactura as string) ?? null,
        motos,
      },
    }
  }

  return { tipo: "desconocido", resumen: resumen || "Documento no reconocido" }
}

function cleanDni(s: string | null | undefined): string | null {
  if (!s) return null
  return s.replace(/\./g, "").trim() || null
}

// ==================== Factura de PRODUCTOS (calculador de precios) ====================

export type ItemFacturaProducto = {
  codigo: string | null
  nombre: string
  costoNeto: number // unitario, sin IVA, en pesos
  categoria: "Indumentaria" | "Cascos" | "Repuestos" | "Accesorios"
  cantidad: number
}

export type FacturaProductosData = {
  proveedor: string | null
  numeroFactura: string | null
  items: ItemFacturaProducto[]
}

const TOOL_PRODUCTOS: Anthropic.Tool = {
  name: "registrar_factura_productos",
  description: "Registra los productos (renglones) extraídos de una factura/remito de mercadería. Llamar una sola vez.",
  input_schema: {
    type: "object" as const,
    properties: {
      proveedor: { type: "string", description: "Razón social del emisor de la factura." },
      numeroFactura: { type: "string", description: "Número de factura/remito si aparece." },
      items: {
        type: "array",
        description: "Cada renglón/producto de la factura.",
        items: {
          type: "object",
          properties: {
            codigo: { type: "string", description: "Código o SKU del producto si aparece." },
            nombre: { type: "string", description: "Descripción del producto." },
            costoNeto: {
              type: "number",
              description:
                "Costo UNITARIO en pesos, SIN IVA (precio neto por unidad). Si la factura muestra el subtotal por renglón, dividilo por la cantidad. Convertí '$ 12.345,67' a 12345.67.",
            },
            cantidad: { type: "number", description: "Cantidad de unidades del renglón. Si no figura, 1." },
            categoria: {
              type: "string",
              enum: ["Indumentaria", "Cascos", "Repuestos", "Accesorios"],
              description:
                "Clasificá: Cascos (cascos). Indumentaria (ropa: remeras, buzos, camperas, guantes, gorras). Repuestos (filtros, frenos, aceite, baterías, fundas mecánicas, partes). Accesorios (baúles, parrillas, parabrisas, alarmas, todo lo demás).",
            },
          },
          required: ["nombre", "costoNeto", "categoria"],
        },
      },
    },
    required: ["items"],
  },
}

const SYSTEM_PRODUCTOS = `Sos un asistente que extrae los renglones de productos de una factura o remito de un proveedor de una tienda de motos (repuestos, indumentaria, cascos, accesorios).

REGLAS:
1. Llamá registrar_factura_productos UNA sola vez con TODOS los renglones de mercadería.
2. costoNeto = costo UNITARIO en pesos SIN IVA. Si solo ves el total del renglón, dividilo por la cantidad. Convertí formato argentino ('$ 12.345,67' → 12345.67).
3. Ignorá renglones que no sean productos (fletes, descuentos, percepciones, IVA, totales).
4. Clasificá cada producto en una categoría: Cascos, Indumentaria, Repuestos o Accesorios.
5. Si no estás seguro del código, dejalo vacío. No inventes datos.`

export async function escanearFacturaProductos(
  archivo: ArchivoEntrada
): Promise<FacturaProductosData> {
  const anthropic = getAnthropic()
  const isPDF = archivo.mimeType === "application/pdf"
  const isImage = archivo.mimeType.startsWith("image/")
  if (!isPDF && !isImage) {
    throw new Error(`Tipo no soportado: ${archivo.mimeType}. Subí una imagen o PDF.`)
  }

  const fileBlock = isPDF
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: archivo.base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: archivo.mimeType, data: archivo.base64 } }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PRODUCTOS,
    tools: [TOOL_PRODUCTOS],
    tool_choice: { type: "tool", name: "registrar_factura_productos" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Extraé los productos de esta factura. Archivo: ${archivo.nombre}` },
          fileBlock,
        ] as Anthropic.MessageParam["content"],
      },
    ],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use") as
    | Extract<Anthropic.ContentBlock, { type: "tool_use" }>
    | undefined
  if (!toolUse) throw new Error("No se pudieron leer productos de la factura")

  const input = toolUse.input as Record<string, unknown>
  const itemsRaw = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : []
  const cats = ["Indumentaria", "Cascos", "Repuestos", "Accesorios"]
  const items: ItemFacturaProducto[] = itemsRaw
    .map((it) => ({
      codigo: (it.codigo as string) || null,
      nombre: (it.nombre as string) || "",
      costoNeto: Number(it.costoNeto) || 0,
      categoria: (cats.includes(it.categoria as string) ? it.categoria : "Accesorios") as ItemFacturaProducto["categoria"],
      cantidad: Number(it.cantidad) || 1,
    }))
    .filter((it) => it.nombre && it.costoNeto > 0)

  return {
    proveedor: (input.proveedor as string) || null,
    numeroFactura: (input.numeroFactura as string) || null,
    items,
  }
}

// ==================== Extracto bancario → movimientos ====================

export type MovimientoExtraido = {
  fecha: string // YYYY-MM-DD
  descripcion: string
  monto: number // con signo: negativo = salida/gasto, positivo = entrada/ingreso
  tipo: "INGRESO" | "GASTO" | "TRANSFERENCIA"
  categoria: string
}

const TOOL_EXTRACTO: Anthropic.Tool = {
  name: "registrar_movimientos_bancarios",
  description: "Registra los movimientos extraídos de un extracto bancario. Llamar una sola vez.",
  input_schema: {
    type: "object" as const,
    properties: {
      movimientos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fecha: { type: "string", description: "YYYY-MM-DD." },
            descripcion: { type: "string", description: "Concepto del movimiento." },
            monto: { type: "number", description: "Con signo: NEGATIVO si sale plata, POSITIVO si entra. En pesos enteros." },
            tipo: { type: "string", enum: ["INGRESO", "GASTO", "TRANSFERENCIA"] },
            categoria: { type: "string", description: "Una categoría válida según el tipo." },
          },
          required: ["fecha", "descripcion", "monto", "tipo", "categoria"],
        },
      },
    },
    required: ["movimientos"],
  },
}

function systemExtracto(): string {
  return `Sos un asistente que extrae movimientos de extractos bancarios argentinos para cargarlos en un sistema de finanzas.

REGLAS DE EXTRACCIÓN:
1. Llamá registrar_movimientos_bancarios UNA sola vez con TODOS los movimientos.
2. monto: con SIGNO. Negativo si sale plata (débitos, pagos, transferencias salientes), positivo si entra (acreditaciones, depósitos). Formato argentino: "-2.178,91" → -2178.91. Redondeá a entero.
3. fecha en formato YYYY-MM-DD.
4. tipo: "GASTO" si sale plata por un gasto/pago, "INGRESO" si entra plata, "TRANSFERENCIA" sólo si es claramente un movimiento entre cuentas propias (igual ponelo con su signo).
5. REGLA ESPECIAL: todo lo que sea "PAGO CON VISA DEBITO" o pago con débito → categoria "Otros Gastos".
6. REGLA ESPECIAL: cuando haya VARIOS pagos con débito SEGUIDOS (filas consecutivas), JUNTALOS en UN solo movimiento sumando los montos, con descripción tipo "Pagos con débito (N) — DD/MM".
7. "Impuesto Ley 25.413" o impuestos bancarios → categoria "Gastos Bancarios".
8. Acreditaciones de préstamos, depósitos, ventas → tipo INGRESO, categoria "Otros Ingresos".
9. El resto clasificalo lo mejor que puedas; si dudás, usá "Otros Gastos" / "Otros Ingresos". El usuario revisa y edita después.
10. NO incluyas filas de saldo, encabezados ni totales: solo movimientos reales.

CATEGORÍAS VÁLIDAS DE INGRESO: ${CATEGORIAS_INGRESO.join(", ")}.
CATEGORÍAS VÁLIDAS DE GASTO: ${CATEGORIAS_GASTO.join(", ")}.`
}

/** Convierte un Excel (.xls/.xlsx) a texto tipo CSV para que Claude lo lea. */
function excelATexto(base64: string): string {
  const buf = Buffer.from(base64, "base64")
  const wb = XLSX.read(buf, { type: "buffer" })
  const partes: string[] = []
  for (const nombre of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nombre])
    partes.push(`# Hoja: ${nombre}\n${csv}`)
  }
  return partes.join("\n\n").slice(0, 60000)
}

export async function extraerMovimientosBancarios(
  archivo: ArchivoEntrada
): Promise<{ movimientos: MovimientoExtraido[] }> {
  const anthropic = getAnthropic()
  const nombre = archivo.nombre.toLowerCase()
  const esExcel =
    nombre.endsWith(".xls") || nombre.endsWith(".xlsx") ||
    archivo.mimeType.includes("spreadsheet") || archivo.mimeType.includes("excel")
  const isPDF = archivo.mimeType === "application/pdf" || nombre.endsWith(".pdf")
  const isImage = archivo.mimeType.startsWith("image/")

  let content: Anthropic.MessageParam["content"]
  if (esExcel) {
    const texto = excelATexto(archivo.base64)
    content = [{ type: "text", text: `Extraé los movimientos de este extracto bancario (formato CSV de un Excel):\n\n${texto}` }]
  } else if (isPDF) {
    content = [
      { type: "text", text: "Extraé los movimientos de este extracto bancario." },
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: archivo.base64 } },
    ] as Anthropic.MessageParam["content"]
  } else if (isImage) {
    content = [
      { type: "text", text: "Extraé los movimientos de este extracto bancario." },
      { type: "image", source: { type: "base64", media_type: archivo.mimeType, data: archivo.base64 } },
    ] as Anthropic.MessageParam["content"]
  } else {
    throw new Error("Formato no soportado. Subí un Excel (.xls/.xlsx), PDF o imagen.")
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemExtracto(),
    tools: [TOOL_EXTRACTO],
    tool_choice: { type: "tool", name: "registrar_movimientos_bancarios" },
    messages: [{ role: "user", content }],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use") as
    | Extract<Anthropic.ContentBlock, { type: "tool_use" }>
    | undefined
  if (!toolUse) throw new Error("No se pudieron leer movimientos del extracto")

  const input = toolUse.input as Record<string, unknown>
  const raw = Array.isArray(input.movimientos) ? (input.movimientos as Record<string, unknown>[]) : []
  const tipos = ["INGRESO", "GASTO", "TRANSFERENCIA"]
  const movimientos: MovimientoExtraido[] = raw
    .map((m) => ({
      fecha: String(m.fecha || ""),
      descripcion: String(m.descripcion || ""),
      monto: Math.round(Number(m.monto) || 0),
      tipo: (tipos.includes(m.tipo as string) ? m.tipo : "GASTO") as MovimientoExtraido["tipo"],
      categoria: String(m.categoria || "Otros Gastos"),
    }))
    .filter((m) => m.fecha && m.monto !== 0)

  return { movimientos }
}
