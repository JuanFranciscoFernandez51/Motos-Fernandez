import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { runJob } from "@/lib/job-log"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 min

/**
 * Endpoint de backup a Google Sheets.
 *
 * Requiere variables de entorno:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: el email del service account.
 * - GOOGLE_PRIVATE_KEY: la private key del service account (con \\n escapados).
 * - GOOGLE_SHEET_ID: el ID del Sheet (se ve en la URL: docs.google.com/spreadsheets/d/<ID>/...).
 * - BACKUP_TOKEN: para invocaciones manuales (mismo del backup JSON).
 *
 * El Sheet debe estar **compartido con el email del service account**
 * con permiso de Editor.
 *
 * El endpoint regenera completamente cada pestaña: Clientes, Motos, OC,
 * Permutas, Mandatos, Taller, Financiaciones, Cuotas, Proveedores.
 * Cada pestaña tiene un header en negrita en la primera fila.
 *
 * Si una pestaña no existe en el Sheet, se crea. Si existe, se limpia y
 * se rellena.
 */

type Pestania = {
  nombre: string
  headers: string[]
  rows: (string | number | null)[][]
}

function safe(v: unknown): string {
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString().split("T")[0]
  if (typeof v === "object") return JSON.stringify(v).slice(0, 500)
  return String(v)
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const cronSecret = process.env.CRON_SECRET
  const backupToken = process.env.BACKUP_TOKEN
  const isAuthorized =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (backupToken && auth === `Bearer ${backupToken}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Validar config de Google
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!serviceAccountEmail || !privateKeyRaw || !sheetId) {
    return NextResponse.json(
      {
        error:
          "Faltan env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID",
      },
      { status: 500 }
    )
  }
  // En Vercel las private keys vienen con \n literales — hay que reemplazarlos
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n")

  try {
    const out = await runJob("backup-sheets", async () => {
    const startedAt = new Date()
    console.log("[backup-sheets] Iniciando dump...")

    // 1) Traer todas las tablas
    const [
      clientes,
      modelos,
      ordenesCompra,
      ocPermutas,
      mandatos,
      ordenesTrabajo,
      financiaciones,
      cuotas,
      proveedores,
    ] = await Promise.all([
      prisma.cliente.findMany({
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      }),
      prisma.modelo.findMany({ orderBy: { slug: "asc" } }),
      prisma.ordenCompra.findMany({
        orderBy: { numero: "desc" },
        include: { cliente: { select: { nombre: true, apellido: true } } },
      }),
      prisma.oCPermuta.findMany({
        include: {
          ordenCompra: { select: { numero: true } },
          motoRecibida: { select: { slug: true } },
        },
      }),
      prisma.mandatoVenta.findMany({
        orderBy: { numero: "desc" },
        include: { cliente: { select: { nombre: true, apellido: true } } },
      }),
      prisma.ordenTrabajo.findMany({
        orderBy: { numero: "desc" },
        include: { cliente: { select: { nombre: true, apellido: true } } },
      }),
      prisma.financiacionOC.findMany({
        orderBy: { numero: "desc" },
        include: { cliente: { select: { nombre: true, apellido: true } } },
      }),
      prisma.cuotaFinanciacion.findMany({
        orderBy: [{ financiacionId: "asc" }, { numero: "asc" }],
        include: { financiacion: { select: { numero: true } } },
      }),
      prisma.proveedor.findMany({ orderBy: { nombre: "asc" } }),
    ])

    // 2) Armar las pestañas
    const pestanias: Pestania[] = [
      {
        nombre: "Clientes",
        headers: [
          "Apellido", "Nombre", "DNI", "CUIT", "Email", "Teléfono", "Tel alt",
          "Dirección", "Ciudad", "Provincia", "CP", "Ocupación", "Notas internas",
          "Creado", "ID",
        ],
        rows: clientes.map((c) => [
          safe(c.apellido), safe(c.nombre), safe(c.dni), safe(c.cuit),
          safe(c.email), safe(c.telefono), safe(c.telefonoAlt),
          safe(c.direccion), safe(c.ciudad), safe(c.provincia), safe(c.codigoPostal),
          safe(c.ocupacion), safe(c.notasInternas).slice(0, 500),
          safe(c.createdAt), c.id,
        ]),
      },
      {
        nombre: "Motos",
        headers: [
          "Slug", "Marca", "Modelo", "Condición", "Año", "Km", "Cilindrada",
          "Precio", "Moneda", "Activo", "Vendida", "Etiqueta", "Patente",
          "Chasis", "Motor", "Origen", "Creado", "ID",
        ],
        rows: modelos.map((m) => [
          safe(m.slug), safe(m.marca), safe(m.nombre), safe(m.condicion),
          safe(m.anio), safe(m.kilometros), safe(m.cilindrada),
          safe(m.precio), safe(m.moneda),
          m.activo ? "SÍ" : "NO", m.vendida ? "SÍ" : "NO",
          safe(m.etiqueta), safe(m.patente), safe(m.chasis), safe(m.motor),
          safe(m.origen), safe(m.createdAt), m.id,
        ]),
      },
      {
        nombre: "Órdenes de Compra",
        headers: [
          "Nº", "Fecha", "Cliente", "Moto", "Precio", "Moneda",
          "Forma pago", "Seña", "Saldo", "Estado", "Patente moto", "ID",
        ],
        rows: ordenesCompra.map((o) => [
          `OC-${String(o.numero).padStart(4, "0")}`,
          safe(o.fecha),
          `${o.cliente.apellido}, ${o.cliente.nombre}`,
          safe(o.motoDescripcion),
          safe(o.precioVenta), safe(o.moneda),
          safe(o.formaPago), safe(o.sena), safe(o.saldo),
          safe(o.estado), safe(o.motoPatente), o.id,
        ]),
      },
      {
        nombre: "Permutas",
        headers: [
          "OC #", "Marca", "Modelo", "Año", "Km", "Patente",
          "Valor", "Moto stock", "Descripción", "ID",
        ],
        rows: ocPermutas.map((p) => [
          p.ordenCompra ? `OC-${String(p.ordenCompra.numero).padStart(4, "0")}` : "",
          safe(p.marca), safe(p.modelo), safe(p.anio), safe(p.kilometros),
          safe(p.patente), safe(p.valor),
          p.motoRecibida ? p.motoRecibida.slug : "",
          safe(p.descripcion).slice(0, 200), p.id,
        ]),
      },
      {
        nombre: "Mandatos",
        headers: [
          "Nº", "Fecha", "Cliente", "Marca", "Modelo", "Precio venta",
          "Moneda", "Estado", "Patente", "ID",
        ],
        rows: mandatos.map((m) => [
          `MV-${String(m.numero).padStart(4, "0")}`,
          safe(m.createdAt),
          `${m.cliente.apellido}, ${m.cliente.nombre}`,
          safe(m.marca), safe(m.modelo), safe(m.precioVenta),
          safe(m.moneda), safe(m.estado), safe(m.patente), m.id,
        ]),
      },
      {
        nombre: "Taller (OT)",
        headers: [
          "Nº", "Fecha ingreso", "Cliente", "Marca", "Modelo", "Patente",
          "Estado", "Total", "Pagado", "Saldo", "Fecha entrega", "ID",
        ],
        rows: ordenesTrabajo.map((ot) => [
          `OT-${String(ot.numero).padStart(4, "0")}`,
          safe(ot.fechaIngreso),
          `${ot.cliente.apellido}, ${ot.cliente.nombre}`,
          safe(ot.motoMarca), safe(ot.motoModelo), safe(ot.motoPatente),
          safe(ot.estado), safe(ot.total), safe(ot.pagado), safe(ot.saldo),
          safe(ot.fechaEntrega), ot.id,
        ]),
      },
      {
        nombre: "Financiaciones",
        headers: [
          "Nº", "Cliente", "Descripción", "Monto", "Entrega", "Cuotas",
          "Valor cuota", "Moneda", "Inicio", "Fin", "Estado",
          "Garante apellido", "Garante nombre", "Garante DNI",
          "Garante teléfono", "ID",
        ],
        rows: financiaciones.map((f) => [
          `FIN-${String(f.numero).padStart(4, "0")}`,
          `${f.cliente.apellido}, ${f.cliente.nombre}`,
          safe(f.descripcion), safe(f.montoTotal), safe(f.entrega),
          safe(f.cantidadCuotas), safe(f.valorCuota), safe(f.moneda),
          safe(f.fechaInicio), safe(f.fechaFin), safe(f.estado),
          safe(f.garanteApellido), safe(f.garanteNombre),
          safe(f.garanteDni), safe(f.garanteTelefono), f.id,
        ]),
      },
      {
        nombre: "Cuotas",
        headers: [
          "FIN #", "Nº", "Monto", "Vencimiento", "Estado", "Fecha pago",
          "Método pago", "ID",
        ],
        rows: cuotas.map((c) => [
          c.financiacion ? `FIN-${String(c.financiacion.numero).padStart(4, "0")}` : "",
          c.numero, safe(c.monto), safe(c.fechaVencimiento), safe(c.estado),
          safe(c.fechaPago), safe(c.metodoPago), c.id,
        ]),
      },
      {
        nombre: "Proveedores",
        headers: ["Nombre", "Email", "Teléfono", "Dirección", "Ciudad", "ID"],
        rows: proveedores.map((p) => [
          safe(p.nombre), safe(p.email), safe(p.telefono),
          safe(p.direccion), safe(p.ciudad), p.id,
        ]),
      },
    ]

    // 3) Auth con el service account
    const authClient = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
    const sheets = google.sheets({ version: "v4", auth: authClient })

    // 4) Obtener el spreadsheet existente para saber qué pestañas hay
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const existingSheets = new Map<string, number>()
    meta.data.sheets?.forEach((s) => {
      if (s.properties?.title && s.properties.sheetId != null) {
        existingSheets.set(s.properties.title, s.properties.sheetId)
      }
    })

    // 5) Crear pestañas que no existan
    const requestsCrear = pestanias
      .filter((p) => !existingSheets.has(p.nombre))
      .map((p) => ({
        addSheet: { properties: { title: p.nombre } },
      }))
    if (requestsCrear.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: requestsCrear },
      })
    }

    // 6) Limpiar y rellenar cada pestaña
    for (const p of pestanias) {
      const valores = [p.headers, ...p.rows]
      // Limpiar
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${p.nombre}!A:ZZ`,
      })
      // Rellenar
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${p.nombre}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: valores },
      })
    }

    // 7) Hacer header bold + freeze first row en cada pestaña
    // (Solo si la pestaña fue recién creada — para no resetear formato cada vez.
    //  El user puede agregar formato custom y persiste)
    if (requestsCrear.length > 0) {
      // Re-leer para tener los nuevos sheetIds
      const meta2 = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
      const finalSheets = new Map<string, number>()
      meta2.data.sheets?.forEach((s) => {
        if (s.properties?.title && s.properties.sheetId != null) {
          finalSheets.set(s.properties.title, s.properties.sheetId)
        }
      })
      const formatRequests = pestanias.flatMap((p) => {
        const sId = finalSheets.get(p.nombre)
        if (sId == null) return []
        return [
          {
            repeatCell: {
              range: { sheetId: sId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: sId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ]
      })
      if (formatRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: formatRequests },
        })
      }
    }

    const elapsedMs = Date.now() - startedAt.getTime()
    console.log(`[backup-sheets] OK en ${elapsedMs}ms`)

    return {
      startedAt,
      elapsedMs,
      pestanias: pestanias.map((p) => ({ nombre: p.nombre, filas: p.rows.length })),
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      // metadata: lo que se guarda en JobLog
      metadata: {
        sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        totalFilas: pestanias.reduce((s, p) => s + p.rows.length, 0),
        pestanias: pestanias.length,
      },
    }
    })  // cierra runJob
    return NextResponse.json({
      ok: true,
      createdAt: out.result.startedAt.toISOString(),
      elapsedMs: out.result.elapsedMs,
      pestanias: out.result.pestanias,
      sheetUrl: out.result.sheetUrl,
    })
  } catch (e) {
    console.error("[backup-sheets] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en backup-sheets" },
      { status: 500 }
    )
  }
}
