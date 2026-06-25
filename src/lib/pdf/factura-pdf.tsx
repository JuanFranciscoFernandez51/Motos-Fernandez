import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#1A1A1A" },
  // Encabezado con la caja de letra centrada al estilo AFIP
  header: { flexDirection: "row", borderBottom: "1.5px solid #000", paddingBottom: 6 },
  col: { flex: 1, paddingHorizontal: 8 },
  letraBox: {
    width: 56,
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  letra: { fontSize: 30, fontWeight: 700, lineHeight: 1 },
  codigo: { fontSize: 6.5, marginTop: 1 },
  razon: { fontSize: 13, fontWeight: 700 },
  small: { fontSize: 8, color: "#333", marginTop: 1 },
  docTitle: { fontSize: 12, fontWeight: 700 },
  rowLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 1 },
  section: { marginTop: 8, border: "1px solid #999", borderRadius: 3, padding: 6 },
  label: { fontSize: 7.5, color: "#666" },
  // Tabla de ítems
  thead: {
    flexDirection: "row",
    backgroundColor: "#EFEAF3",
    borderTop: "1px solid #999",
    borderBottom: "1px solid #999",
    paddingVertical: 3,
    marginTop: 8,
    fontWeight: 700,
  },
  trow: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5px solid #DDD" },
  cDesc: { flex: 1, paddingHorizontal: 3 },
  cQty: { width: 40, textAlign: "right", paddingHorizontal: 3 },
  cPrice: { width: 70, textAlign: "right", paddingHorizontal: 3 },
  cAlic: { width: 45, textAlign: "right", paddingHorizontal: 3 },
  cSub: { width: 75, textAlign: "right", paddingHorizontal: 3 },
  totals: { marginTop: 8, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 1 },
  totalLbl: { width: 90, textAlign: "right", color: "#555" },
  totalVal: { width: 90, textAlign: "right" },
  grandTotal: { fontSize: 12, fontWeight: 700 },
  caeBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTop: "1px solid #999",
    paddingTop: 6,
  },
  qr: { width: 90, height: 90 },
})

export interface FacturaPDFData {
  letra: "A" | "B" | "C"
  codigoCbte: number // tipoCbte AFIP
  tituloCbte: string // "Factura B"
  ptoVta: number
  numero: number
  fecha: Date
  // Emisor
  emisor: {
    razonSocial: string
    domicilio: string
    cuit: string
    iva: string
    ingresosBrutos: string
    inicioActividades?: string
  }
  // Receptor
  receptor: {
    nombre: string
    docLabel: string // "CUIT" | "DNI"
    docNro: string
    domicilio: string | null
    condIva: string
  }
  items: {
    descripcion: string
    cantidad: number
    precioUnit: number
    subtotal: number
    alicuota: string
  }[]
  impNeto: number
  impIva: number
  impTotal: number
  cae: string
  caeVto: Date | null
  qrDataUrl: string
}

const money = (n: number) =>
  "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaCorta = (d: Date) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

export function FacturaPDF({ data }: { data: FacturaPDFData }) {
  const d = data
  const esA = d.letra === "A"
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.col}>
            <Text style={styles.razon}>{d.emisor.razonSocial}</Text>
            <Text style={styles.small}>{d.emisor.domicilio}</Text>
            <Text style={styles.small}>{d.emisor.iva}</Text>
          </View>
          <View style={styles.letraBox}>
            <Text style={styles.letra}>{d.letra}</Text>
            <Text style={styles.codigo}>COD. {String(d.codigoCbte).padStart(2, "0")}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.docTitle}>{d.tituloCbte}</Text>
            <View style={styles.rowLine}>
              <Text>N°:</Text>
              <Text>
                {String(d.ptoVta).padStart(4, "0")}-{String(d.numero).padStart(8, "0")}
              </Text>
            </View>
            <View style={styles.rowLine}>
              <Text>Fecha:</Text>
              <Text>{fechaCorta(d.fecha)}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text>CUIT:</Text>
              <Text>{d.emisor.cuit}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text>Ing. Brutos:</Text>
              <Text>{d.emisor.ingresosBrutos || d.emisor.cuit}</Text>
            </View>
            {d.emisor.inicioActividades ? (
              <View style={styles.rowLine}>
                <Text>Inicio act.:</Text>
                <Text>{d.emisor.inicioActividades}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Receptor */}
        <View style={styles.section}>
          <Text style={styles.label}>RECEPTOR</Text>
          <Text style={{ fontWeight: 700, marginTop: 1 }}>{d.receptor.nombre}</Text>
          <View style={styles.rowLine}>
            <Text>
              {d.receptor.docLabel}: {d.receptor.docNro}
            </Text>
            <Text>{d.receptor.condIva}</Text>
          </View>
          {d.receptor.domicilio ? (
            <Text style={styles.small}>{d.receptor.domicilio}</Text>
          ) : null}
        </View>

        {/* Ítems */}
        <View style={styles.thead}>
          <Text style={styles.cDesc}>Descripción</Text>
          <Text style={styles.cQty}>Cant.</Text>
          <Text style={styles.cPrice}>{esA ? "P.Unit (neto)" : "P.Unit"}</Text>
          {esA ? <Text style={styles.cAlic}>IVA</Text> : null}
          <Text style={styles.cSub}>Subtotal</Text>
        </View>
        {d.items.map((it, i) => (
          <View style={styles.trow} key={i}>
            <Text style={styles.cDesc}>{it.descripcion}</Text>
            <Text style={styles.cQty}>{it.cantidad}</Text>
            <Text style={styles.cPrice}>{money(it.precioUnit)}</Text>
            {esA ? <Text style={styles.cAlic}>{it.alicuota}</Text> : null}
            <Text style={styles.cSub}>{money(it.subtotal)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={styles.totals}>
          {esA ? (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>Neto gravado:</Text>
                <Text style={styles.totalVal}>{money(d.impNeto)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>IVA:</Text>
                <Text style={styles.totalVal}>{money(d.impIva)}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLbl, styles.grandTotal]}>TOTAL:</Text>
            <Text style={[styles.totalVal, styles.grandTotal]}>{money(d.impTotal)}</Text>
          </View>
        </View>

        {/* CAE + QR */}
        <View style={styles.caeBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.qr} src={d.qrDataUrl} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontWeight: 700 }}>CAE N°: {d.cae}</Text>
            <Text>Vto. CAE: {d.caeVto ? fechaCorta(d.caeVto) : "—"}</Text>
            <Text style={{ fontSize: 7.5, color: "#666", marginTop: 4 }}>
              Comprobante Autorizado · ARCA
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
