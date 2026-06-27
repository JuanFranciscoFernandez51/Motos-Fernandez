import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

// Estilos compactos: el boleto debería caber en 1-2 hojas A4 incluso con
// muchos pagos / permutas. Sin colores estridentes, padding reducido.
const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: { borderBottom: "1.5px solid #7C3AED", paddingBottom: 8, marginBottom: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  logo: { width: 130, height: 46, objectFit: "contain" },
  brandSub: { fontSize: 7.5, color: "#666", marginTop: 1 },
  docInfo: { textAlign: "right" },
  docTitle: { fontSize: 12, fontWeight: 700 },
  docNumber: { fontSize: 10, color: "#7C3AED", marginTop: 1 },
  docDate: { fontSize: 7.5, color: "#666", marginTop: 1 },
  h2: {
    fontSize: 9.5, fontWeight: 700, color: "#7C3AED",
    textTransform: "uppercase", marginTop: 8, marginBottom: 3,
    borderBottom: "1px solid #E5E5E5", paddingBottom: 2,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 100, color: "#666", fontWeight: 700 },
  value: { flex: 1 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  col: { flex: 1 },
  // Línea de precio: ahora va inline, no banner gigante
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: "#F3EEF7",
    borderLeft: "3px solid #7C3AED",
    borderRadius: 2,
  },
  priceLineLabel: { fontSize: 9, fontWeight: 700, color: "#7C3AED" },
  priceLineValue: { fontSize: 11, fontWeight: 700, color: "#7C3AED" },
  // Tabla de pagos
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3EEF7",
    padding: 4,
    marginTop: 3,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#7C3AED",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #EFEFEF",
    padding: 4,
  },
  tableCell: { fontSize: 8.5 },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#F8F5FA",
    padding: 4,
  },
  tableTotalCell: { fontSize: 8.5, fontWeight: 700, color: "#7C3AED" },
  // Permuta - cuadro detallado por cada permuta
  permutaBox: {
    marginTop: 4,
    padding: 6,
    backgroundColor: "#FAF5FE",
    borderLeft: "2px solid #9333EA",
    borderRadius: 2,
  },
  permutaTitle: {
    fontSize: 8.5, fontWeight: 700, color: "#7E22CE", marginBottom: 2,
  },
  permutaSubrow: { flexDirection: "row", marginBottom: 1 },
  permutaLabel: { width: 60, color: "#7E22CE", fontSize: 7.5 },
  permutaValue: { flex: 1, fontSize: 7.5 },
  // Financiación
  finBox: {
    marginTop: 6, padding: 6, backgroundColor: "#EFF6FF",
    borderLeft: "2px solid #2563EB", borderRadius: 2,
  },
  finTitle: { fontSize: 9, fontWeight: 700, color: "#1E40AF", marginBottom: 3 },
  finRow: { flexDirection: "row", marginBottom: 2 },
  finLabel: { width: 110, color: "#1E40AF", fontWeight: 700 },
  finValue: { flex: 1 },
  finHighlight: {
    marginTop: 3, padding: 4, backgroundColor: "#DBEAFE",
    borderRadius: 2, flexDirection: "row", justifyContent: "space-between",
  },
  finHighlightLabel: { fontWeight: 700, color: "#1E3A8A", fontSize: 8.5 },
  finHighlightValue: { fontWeight: 700, color: "#1E3A8A", fontSize: 8.5 },
  garanteBox: {
    marginTop: 4, padding: 5, backgroundColor: "#F0FDF4",
    borderLeft: "2px solid #16A34A", borderRadius: 2,
  },
  garanteTitle: { fontSize: 8.5, fontWeight: 700, color: "#15803D", marginBottom: 2 },
  garanteRow: { flexDirection: "row", marginBottom: 1 },
  garanteLabel: { width: 75, color: "#15803D", fontSize: 7.5, fontWeight: 700 },
  garanteValue: { flex: 1, fontSize: 7.5 },
  // Resumen totales
  resumenBox: {
    marginTop: 6, padding: 6, backgroundColor: "#F8F5FA",
    borderRadius: 2,
  },
  resumenRow: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 1,
  },
  resumenLabel: { fontSize: 8.5, color: "#666" },
  resumenValue: { fontSize: 8.5, fontWeight: 700 },
  resumenTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTop: "1px solid #7C3AED", paddingTop: 3, marginTop: 3,
  },
  resumenTotalLabel: { fontSize: 9.5, fontWeight: 700, color: "#7C3AED" },
  resumenTotalValue: { fontSize: 9.5, fontWeight: 700, color: "#7C3AED" },
  terms: { marginTop: 8, padding: 6, backgroundColor: "#F8F5FA", fontSize: 7.5, lineHeight: 1.3 },
  termsTitle: { fontWeight: 700, marginBottom: 2, fontSize: 8.5, color: "#7C3AED" },
  termsItem: { marginBottom: 2 },
  // marginTop alto a propósito: deja ~5 renglones de aire arriba de la
  // línea de firma para que el cliente pueda firmar cómodo en papel.
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 60, gap: 24 },
  signBox: { flex: 1, textAlign: "center", borderTop: "1px solid #1A1A1A", paddingTop: 4 },
  signLabel: { fontSize: 8, fontWeight: 700 },
  signSub: { fontSize: 7, color: "#666", marginTop: 1 },
  footer: {
    position: "absolute", bottom: 12, left: 28, right: 28,
    textAlign: "center", fontSize: 6.5, color: "#999",
    borderTop: "1px solid #E5E5E5", paddingTop: 4,
  },
})

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA_DEBITO: "Débito",
  TARJETA_CREDITO: "Crédito",
  MERCADO_PAGO: "Mercado Pago",
  CHEQUE: "Cheque",
  DEPOSITO: "Depósito",
  DOLARES: "Dólares",
  OTRO: "Otro",
}

type PagoData = {
  metodo: string
  monto: number
  moneda?: string
  detalle?: string | null
  fecha?: Date | null
}

type SeniaData = {
  monto: number
  moneda?: string
  metodo?: string
  detalle?: string | null
  fecha?: Date | null
}

type PermutaData = {
  marca?: string | null
  modelo?: string | null
  anio?: number | null
  kilometros?: number | null
  patente?: string | null
  chasis?: string | null
  motor?: string | null
  descripcion?: string | null
  valor: number
  moneda?: string
  // Checklist de qué entrega el cliente con la moto
  tieneTitulo?: boolean
  tieneManual?: boolean
  tieneSegundaLlave?: boolean
  tieneCasco?: boolean
  tieneVtv?: boolean
  tieneSeguro?: boolean
  tieneFactura?: boolean
  tieneFichaTecnica?: boolean
  accesoriosExtra?: string | null
}

type GaranteData = {
  nombre?: string | null
  apellido?: string | null
  dni?: string | null
  telefono?: string | null
  direccion?: string | null
}

type OCPDFData = {
  numero: number
  fecha: Date
  logoSrc: string | Buffer
  cliente: {
    nombre: string
    apellido: string
    dni?: string | null
    cuit?: string | null
    direccion?: string | null
    ciudad?: string | null
    telefono?: string | null
    email?: string | null
  }
  moto: {
    descripcion: string
    chasis?: string | null
    motor?: string | null
    patente?: string | null
    anio?: number | null
    kilometros?: number | null
  }
  // Unidades EXTRA vendidas (2da, 3ra...). La principal va en `moto`.
  ventas?: {
    descripcion: string
    anio?: number | null
    kilometros?: number | null
    patente?: string | null
    chasis?: string | null
    motor?: string | null
    precio: number
    moneda: string
  }[]
  economico: {
    precioVenta: number
    moneda: string
    formaPago?: string | null
    sena?: number | null
    saldo?: number | null
    detallePago?: string | null
    cuotas?: number | null
    valorCuota?: number | null
    entrega?: number | null
  }
  pagos?: PagoData[]
  senias?: SeniaData[]
  permutas?: PermutaData[]
  garante?: GaranteData | null
  observaciones?: string | null
  negocio: {
    razonSocial: string
    cuit: string
    direccion: string
    ciudad: string
    telefono: string
    email: string
  }
}

const money = (n: number | null | undefined, moneda = "ARS") =>
  n == null ? "—" : `${moneda === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`

// Formatea totales mezclando monedas: "USD 5.000 + $ 200.000"
function moneyMix(
  ars: number,
  usd: number,
  monedaDefault = "ARS"
): string {
  if (ars === 0 && usd === 0) return money(0, monedaDefault)
  const partes: string[] = []
  if (usd !== 0) partes.push(money(usd, "USD"))
  if (ars !== 0) partes.push(money(ars, "ARS"))
  return partes.join(" + ")
}

const dateStr = (d: Date | null | undefined) =>
  !d ? "—" : new Date(d).toLocaleDateString("es-AR")

export function OCPDF({ data }: { data: OCPDFData }) {
  const numeroFormateado = `OC-${String(data.numero).padStart(4, "0")}`
  const moneda = data.economico.moneda

  // Sumas separadas por moneda — pagos directos
  const pagosPorMoneda = (data.pagos || []).reduce(
    (acc, p) => {
      const m = p.moneda || moneda
      if (m === "USD") acc.USD += p.monto || 0
      else acc.ARS += p.monto || 0
      return acc
    },
    { ARS: 0, USD: 0 }
  )
  const totalPagosOC =
    moneda === "USD" ? pagosPorMoneda.USD : pagosPorMoneda.ARS

  // Sumas separadas por moneda — señas / entregas a cuenta
  const seniasPorMoneda = (data.senias || []).reduce(
    (acc, s) => {
      const m = s.moneda || moneda
      if (m === "USD") acc.USD += s.monto || 0
      else acc.ARS += s.monto || 0
      return acc
    },
    { ARS: 0, USD: 0 }
  )
  const totalSeniasOC =
    moneda === "USD" ? seniasPorMoneda.USD : seniasPorMoneda.ARS

  // Sumas separadas por moneda — permutas
  const permutasPorMoneda = (data.permutas || []).reduce(
    (acc, p) => {
      const m = p.moneda || moneda
      if (m === "USD") acc.USD += p.valor || 0
      else acc.ARS += p.valor || 0
      return acc
    },
    { ARS: 0, USD: 0 }
  )
  const totalPermutasOC =
    moneda === "USD" ? permutasPorMoneda.USD : permutasPorMoneda.ARS

  const tieneFinanciacion =
    !!(data.economico.cuotas && data.economico.cuotas > 0)
  // ¿La financiación ya está cargada como un pago (método Financiación)?
  // En ese caso su CAPITAL ya está dentro de totalPagosOC.
  const finEnPagos = (data.pagos || []).some((p) => p.metodo === "FINANCIACION")
  // Total del PLAN de cuotas: lo que paga el cliente (incluye interés). Es
  // informativo para la sección de financiación, NO entra en el cuadre.
  const totalPlanCuotas =
    data.economico.cuotas && data.economico.valorCuota
      ? data.economico.cuotas * data.economico.valorCuota +
        (data.economico.entrega || 0)
      : 0
  // Para el CUADRE del boleto: si la financiación ya es un pago, su capital
  // ya está contado; si no (OCs viejas), absorbe el saldo restante del precio.
  // El interés es margen interno y nunca entra acá.
  const finCuadre =
    tieneFinanciacion && !finEnPagos
      ? Math.max(0, data.economico.precioVenta - totalPagosOC - totalPermutasOC - totalSeniasOC)
      : 0
  // El cubierto en la moneda de la OC. Lo que está en otra moneda no se mezcla.
  const totalCubierto = totalPagosOC + totalSeniasOC + totalPermutasOC + finCuadre
  const restante = data.economico.precioVenta - totalCubierto
  const tieneGarante =
    !!data.garante &&
    !!(
      data.garante.nombre ||
      data.garante.apellido ||
      data.garante.dni
    )

  return (
    <Document title={`Boleto Compra-Venta ${numeroFormateado}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Image src={data.logoSrc} style={styles.logo} />
              <Text style={[styles.brandSub, { marginTop: 6 }]}>
                {data.negocio.razonSocial} · CUIT {data.negocio.cuit}
              </Text>
              <Text style={styles.brandSub}>
                {data.negocio.direccion}, {data.negocio.ciudad}
              </Text>
              <Text style={styles.brandSub}>
                {data.negocio.telefono} · {data.negocio.email}
              </Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>BOLETO COMPRA-VENTA</Text>
              <Text style={styles.docNumber}>N° {numeroFormateado}</Text>
              <Text style={styles.docDate}>Fecha: {dateStr(data.fecha)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Comprador</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Apellido y nombre:</Text>
              <Text style={styles.value}>
                {data.cliente.apellido}, {data.cliente.nombre}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DNI:</Text>
              <Text style={styles.value}>{data.cliente.dni || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>CUIT/CUIL:</Text>
              <Text style={styles.value}>{data.cliente.cuit || "—"}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Domicilio:</Text>
              <Text style={styles.value}>
                {data.cliente.direccion || "—"}
                {data.cliente.ciudad ? `, ${data.cliente.ciudad}` : ""}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{data.cliente.telefono || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.cliente.email || "—"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Unidad vendida</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Descripción:</Text>
              <Text style={styles.value}>{data.moto.descripcion}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Año:</Text>
              <Text style={styles.value}>{data.moto.anio || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Km:</Text>
              <Text style={styles.value}>
                {data.moto.kilometros != null
                  ? data.moto.kilometros.toLocaleString("es-AR")
                  : "—"}
              </Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Patente:</Text>
              <Text style={styles.value}>{data.moto.patente || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>N° chasis:</Text>
              <Text style={styles.value}>{data.moto.chasis || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>N° motor:</Text>
              <Text style={styles.value}>{data.moto.motor || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Unidades EXTRA vendidas (cuando la OC vende más de un vehículo) */}
        {data.ventas && data.ventas.length > 0 && (
          <>
            <Text style={styles.h2}>Otras unidades vendidas</Text>
            {data.ventas.map((v, i) => (
              <View key={i} style={styles.twoCol}>
                <View style={styles.col}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Unidad #{i + 2}:</Text>
                    <Text style={styles.value}>
                      {v.descripcion}
                      {v.anio ? ` (${v.anio})` : ""}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Chasis/Motor/Pat.:</Text>
                    <Text style={styles.value}>
                      {[v.chasis, v.motor, v.patente].filter(Boolean).join(" · ") || "—"}
                    </Text>
                  </View>
                </View>
                <View style={styles.col}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Precio:</Text>
                    <Text style={styles.value}>{money(v.precio, v.moneda || moneda)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.priceLine}>
          <Text style={styles.priceLineLabel}>
            {data.ventas && data.ventas.length > 0
              ? "PRECIO TOTAL (TODAS LAS UNIDADES)"
              : "PRECIO TOTAL DE VENTA"}
          </Text>
          <Text style={styles.priceLineValue}>
            {money(data.economico.precioVenta, moneda)}
          </Text>
        </View>

        {/* Pagos directos */}
        {data.pagos && data.pagos.length > 0 && (
          <>
            <Text style={styles.h2}>Pagos directos</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Método</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Fecha</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Detalle</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>
                Monto
              </Text>
            </View>
            {data.pagos.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {METODO_LABELS[p.metodo] || p.metodo}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{dateStr(p.fecha)}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]}>
                  {p.detalle || "—"}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: "right" }]}>
                  {money(p.monto, p.moneda || moneda)}
                </Text>
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tableTotalCell, { flex: 6.2 }]}>
                Subtotal pagos directos
              </Text>
              <Text style={[styles.tableTotalCell, { flex: 1.5, textAlign: "right" }]}>
                {moneyMix(pagosPorMoneda.ARS, pagosPorMoneda.USD, moneda)}
              </Text>
            </View>
          </>
        )}

        {/* Permutas detalladas */}
        {data.permutas && data.permutas.length > 0 && (
          <>
            <Text style={styles.h2}>Motos recibidas en parte de pago</Text>
            {data.permutas.map((perm, i) => (
              <View key={i} style={styles.permutaBox}>
                <Text style={styles.permutaTitle}>
                  Permuta #{i + 1} — {money(perm.valor, perm.moneda || moneda)}
                </Text>
                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Marca:</Text>
                      <Text style={styles.permutaValue}>{perm.marca || "—"}</Text>
                    </View>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Modelo:</Text>
                      <Text style={styles.permutaValue}>{perm.modelo || "—"}</Text>
                    </View>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Año:</Text>
                      <Text style={styles.permutaValue}>{perm.anio || "—"}</Text>
                    </View>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Km:</Text>
                      <Text style={styles.permutaValue}>
                        {perm.kilometros != null
                          ? perm.kilometros.toLocaleString("es-AR")
                          : "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.col}>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Patente:</Text>
                      <Text style={styles.permutaValue}>{perm.patente || "—"}</Text>
                    </View>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Chasis:</Text>
                      <Text style={styles.permutaValue}>{perm.chasis || "—"}</Text>
                    </View>
                    <View style={styles.permutaSubrow}>
                      <Text style={styles.permutaLabel}>Motor:</Text>
                      <Text style={styles.permutaValue}>{perm.motor || "—"}</Text>
                    </View>
                  </View>
                </View>
                {perm.descripcion && (
                  <View style={styles.permutaSubrow}>
                    <Text style={styles.permutaLabel}>Notas:</Text>
                    <Text style={styles.permutaValue}>{perm.descripcion}</Text>
                  </View>
                )}
                {(() => {
                  const items: { ok: boolean; label: string }[] = [
                    { ok: !!perm.tieneTitulo, label: "Título" },
                    { ok: !!perm.tieneManual, label: "Manual" },
                    { ok: !!perm.tieneSegundaLlave, label: "2da llave" },
                    { ok: !!perm.tieneCasco, label: "Casco" },
                    { ok: !!perm.tieneVtv, label: "VTV" },
                    { ok: !!perm.tieneSeguro, label: "Seguro" },
                    { ok: !!perm.tieneFactura, label: "Factura" },
                    { ok: !!perm.tieneFichaTecnica, label: "Ficha técnica" },
                  ]
                  const algoMarcado = items.some((i) => i.ok) || !!perm.accesoriosExtra
                  if (!algoMarcado) return null
                  const checklistTxt = items
                    .map((i) => `${i.ok ? "[x]" : "[ ]"} ${i.label}`)
                    .join("   ")
                  return (
                    <View
                      style={{
                        marginTop: 4,
                        padding: 4,
                        backgroundColor: "#F3EEF7",
                        borderRadius: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: 700,
                          color: "#7E22CE",
                          marginBottom: 2,
                        }}
                      >
                        Entrega con la moto:
                      </Text>
                      <Text style={{ fontSize: 7, color: "#1A1A1A" }}>
                        {checklistTxt}
                      </Text>
                      {perm.accesoriosExtra && (
                        <Text
                          style={{ fontSize: 7, color: "#1A1A1A", marginTop: 1 }}
                        >
                          + Otros: {perm.accesoriosExtra}
                        </Text>
                      )}
                    </View>
                  )
                })()}
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tableTotalCell, { flex: 6.2 }]}>
                Subtotal permutas ({data.permutas.length})
              </Text>
              <Text style={[styles.tableTotalCell, { flex: 1.5, textAlign: "right" }]}>
                {moneyMix(permutasPorMoneda.ARS, permutasPorMoneda.USD, moneda)}
              </Text>
            </View>
          </>
        )}

        {/* Financiación */}
        {tieneFinanciacion && (
          <View style={styles.finBox}>
            <Text style={styles.finTitle}>FINANCIACIÓN ACORDADA</Text>
            {data.economico.entrega != null && data.economico.entrega > 0 && (
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Entrega:</Text>
                <Text style={styles.finValue}>
                  {money(data.economico.entrega, moneda)}
                </Text>
              </View>
            )}
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Cantidad de cuotas:</Text>
              <Text style={styles.finValue}>{data.economico.cuotas}</Text>
            </View>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Valor por cuota:</Text>
              <Text style={styles.finValue}>
                {money(data.economico.valorCuota, moneda)}
              </Text>
            </View>
            {data.economico.valorCuota != null && (
              <View style={styles.finHighlight}>
                <Text style={styles.finHighlightLabel}>
                  Total financiado ({data.economico.cuotas} cuotas
                  {data.economico.entrega ? " + entrega" : ""}):
                </Text>
                <Text style={styles.finHighlightValue}>
                  {money(totalPlanCuotas, moneda)}
                </Text>
              </View>
            )}

            {tieneGarante && data.garante && (
              <View style={styles.garanteBox}>
                <Text style={styles.garanteTitle}>Garante</Text>
                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    <View style={styles.garanteRow}>
                      <Text style={styles.garanteLabel}>Apellido y nombre:</Text>
                      <Text style={styles.garanteValue}>
                        {[data.garante.apellido, data.garante.nombre]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </Text>
                    </View>
                    <View style={styles.garanteRow}>
                      <Text style={styles.garanteLabel}>DNI:</Text>
                      <Text style={styles.garanteValue}>
                        {data.garante.dni || "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.col}>
                    <View style={styles.garanteRow}>
                      <Text style={styles.garanteLabel}>Teléfono:</Text>
                      <Text style={styles.garanteValue}>
                        {data.garante.telefono || "—"}
                      </Text>
                    </View>
                    <View style={styles.garanteRow}>
                      <Text style={styles.garanteLabel}>Domicilio:</Text>
                      <Text style={styles.garanteValue}>
                        {data.garante.direccion || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <Text
              style={{ fontSize: 7, color: "#1E40AF", marginTop: 6, fontStyle: "italic" }}
            >
              El comprador se compromete al pago en término de las cuotas pactadas. El plan
              detallado y los vencimientos quedan registrados en la planilla de tesorería de
              la concesionaria.
            </Text>
          </View>
        )}

        {/* Resumen totales (solo si tiene varias formas de pago combinadas) */}
        {((data.pagos && data.pagos.length > 0) ||
          (data.senias && data.senias.length > 0) ||
          (data.permutas && data.permutas.length > 0) ||
          tieneFinanciacion) && (
          <View style={styles.resumenBox}>
            {(seniasPorMoneda.ARS > 0 || seniasPorMoneda.USD > 0) && (
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Señas / a cuenta</Text>
                <Text style={styles.resumenValue}>
                  {moneyMix(seniasPorMoneda.ARS, seniasPorMoneda.USD, moneda)}
                </Text>
              </View>
            )}
            {(pagosPorMoneda.ARS > 0 || pagosPorMoneda.USD > 0) && (
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Pagos directos</Text>
                <Text style={styles.resumenValue}>
                  {moneyMix(pagosPorMoneda.ARS, pagosPorMoneda.USD, moneda)}
                </Text>
              </View>
            )}
            {(permutasPorMoneda.ARS > 0 || permutasPorMoneda.USD > 0) && (
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Permutas</Text>
                <Text style={styles.resumenValue}>
                  {moneyMix(permutasPorMoneda.ARS, permutasPorMoneda.USD, moneda)}
                </Text>
              </View>
            )}
            {finCuadre > 0 && (
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Financiación (capital)</Text>
                <Text style={styles.resumenValue}>{money(finCuadre, moneda)}</Text>
              </View>
            )}
            <View style={styles.resumenTotalRow}>
              <Text style={styles.resumenTotalLabel}>
                Total cubierto ({moneda})
              </Text>
              <Text style={styles.resumenTotalValue}>{money(totalCubierto, moneda)}</Text>
            </View>
            {/* Solo mostramos el saldo cuando REALMENTE falta cubrir. La
                sobre-cobertura por intereses de financiación es interna y no
                se muestra en el boleto. */}
            {restante > 0 && (
              <View style={styles.resumenRow}>
                <Text style={[styles.resumenLabel, { color: "#B91C1C" }]}>
                  Falta cubrir ({moneda})
                </Text>
                <Text style={[styles.resumenValue, { color: "#B91C1C" }]}>
                  {money(restante, moneda)}
                </Text>
              </View>
            )}
            {/* Aviso si hay sumas en la moneda secundaria que no contribuyen
                al cuadre en moneda principal */}
            {((moneda === "USD" && (pagosPorMoneda.ARS > 0 || permutasPorMoneda.ARS > 0)) ||
              (moneda !== "USD" && (pagosPorMoneda.USD > 0 || permutasPorMoneda.USD > 0))) && (
              <View style={[styles.resumenRow, { marginTop: 4 }]}>
                <Text style={[styles.resumenLabel, { color: "#92400E", fontStyle: "italic" }]}>
                  Nota: hay pagos/permutas en moneda distinta a la principal,
                  evaluar con tipo de cambio.
                </Text>
                <Text> </Text>
              </View>
            )}
          </View>
        )}

        {/* Detalle libre y modalidad legacy (si hay) */}
        {(data.economico.formaPago ||
          data.economico.sena ||
          data.economico.saldo ||
          data.economico.detallePago) && (
          <>
            <Text style={styles.h2}>Notas de pago</Text>
            {data.economico.formaPago && (
              <View style={styles.row}>
                <Text style={styles.label}>Modalidad:</Text>
                <Text style={styles.value}>{data.economico.formaPago}</Text>
              </View>
            )}
            {data.economico.sena != null && data.economico.sena > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Seña:</Text>
                <Text style={styles.value}>
                  {money(data.economico.sena, moneda)}
                </Text>
              </View>
            )}
            {data.economico.saldo != null && data.economico.saldo > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Saldo pendiente:</Text>
                <Text style={styles.value}>
                  {money(data.economico.saldo, moneda)}
                </Text>
              </View>
            )}
            {data.economico.detallePago && (
              <View style={styles.row}>
                <Text style={styles.label}>Observaciones:</Text>
                <Text style={styles.value}>{data.economico.detallePago}</Text>
              </View>
            )}
          </>
        )}

        {data.observaciones && (
          <>
            <Text style={styles.h2}>Observaciones</Text>
            <Text>{data.observaciones}</Text>
          </>
        )}

        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Términos</Text>
          <Text style={styles.termsItem}>
            1. El vendedor declara que la unidad detallada es de su propiedad,
            se encuentra libre de gravamen y la documentación entregada es
            auténtica y vigente.
          </Text>
          <Text style={styles.termsItem}>
            2. El comprador recibe la unidad con la documentación al día y
            libre de multas e infracciones anteriores a la fecha de entrega.
          </Text>
          <Text style={styles.termsItem}>
            3. Los gastos de transferencia, patentamiento y verificación
            quedan a cargo del comprador (salvo pacto en contrario).
          </Text>
          <Text style={styles.termsItem}>
            4. Las sumas entregadas en concepto de seña forman parte del precio
            total. El saldo deberá abonarse en los términos acordados.
          </Text>
          {tieneFinanciacion && (
            <Text style={styles.termsItem}>
              5. El saldo financiado se abonará en {data.economico.cuotas} cuota
              {data.economico.cuotas === 1 ? "" : "s"} de{" "}
              {money(data.economico.valorCuota, moneda)} cada una. La falta de pago
              de cualquier cuota faculta al vendedor a exigir el saldo total y/o
              resolver este boleto, sin perjuicio de las acciones legales
              correspondientes.
            </Text>
          )}
          {tieneGarante && (
            <Text style={styles.termsItem}>
              {tieneFinanciacion ? "6" : "5"}. El garante consignado en este
              boleto se constituye en deudor solidario del comprador frente al
              vendedor por todas las obligaciones asumidas, renunciando al
              beneficio de excusión.
            </Text>
          )}
          <Text style={styles.termsItem}>
            {tieneFinanciacion && tieneGarante
              ? "7"
              : tieneFinanciacion || tieneGarante
                ? "6"
                : "5"}
            . Cualquier controversia se someterá a los tribunales ordinarios de
            la ciudad de Bahía Blanca, con renuncia a cualquier otro fuero.
          </Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>COMPRADOR</Text>
            <Text style={styles.signSub}>
              {data.cliente.apellido}, {data.cliente.nombre}
            </Text>
            {data.cliente.dni && (
              <Text style={styles.signSub}>DNI {data.cliente.dni}</Text>
            )}
          </View>
          {tieneGarante && data.garante && (
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>GARANTE</Text>
              <Text style={styles.signSub}>
                {[data.garante.apellido, data.garante.nombre]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Text>
              {data.garante.dni && (
                <Text style={styles.signSub}>DNI {data.garante.dni}</Text>
              )}
            </View>
          )}
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>VENDEDOR</Text>
            <Text style={styles.signSub}>{data.negocio.razonSocial}</Text>
            <Text style={styles.signSub}>CUIT {data.negocio.cuit}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {data.negocio.razonSocial} · {data.negocio.direccion},{" "}
            {data.negocio.ciudad} · {data.negocio.telefono} ·{" "}
            {data.negocio.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
