import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: { borderBottom: "2px solid #6B4F7A", paddingBottom: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  logo: { width: 160, height: 58, objectFit: "contain" },
  brandSub: { fontSize: 8, color: "#666", marginTop: 2 },
  docInfo: { textAlign: "right" },
  docTitle: { fontSize: 14, fontWeight: 700 },
  docNumber: { fontSize: 11, color: "#6B4F7A", marginTop: 2 },
  docDate: { fontSize: 8, color: "#666", marginTop: 2 },
  validez: { fontSize: 9, color: "#B45309", marginTop: 4, fontWeight: 700 },
  h2: {
    fontSize: 11, fontWeight: 700, color: "#6B4F7A",
    textTransform: "uppercase", marginTop: 14, marginBottom: 6,
    borderBottom: "1px solid #E5E5E5", paddingBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 120, color: "#666", fontWeight: 700 },
  value: { flex: 1 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  col: { flex: 1 },
  box: { padding: 8, backgroundColor: "#F8F5FA", marginTop: 4, marginBottom: 4 },
  table: { marginTop: 10, borderTop: "1px solid #E5E5E5" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #EFEFEF", paddingVertical: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F8F5FA", paddingVertical: 6, paddingHorizontal: 2, fontWeight: 700 },
  col1: { flex: 2, paddingRight: 4 },
  col2: { flex: 4, paddingRight: 4 },
  col3: { flex: 1, textAlign: "center", paddingRight: 4 },
  col4: { flex: 2, textAlign: "right", paddingRight: 4 },
  col5: { flex: 2, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  totalLabel: { width: 100, textAlign: "right", paddingRight: 6, color: "#666" },
  totalValue: { width: 100, textAlign: "right", fontWeight: 700 },
  totalGrande: {
    flexDirection: "row", justifyContent: "flex-end",
    marginTop: 8, paddingTop: 6, borderTop: "2px solid #6B4F7A",
  },
  totalGrandeLabel: { width: 100, textAlign: "right", paddingRight: 6, fontWeight: 700 },
  totalGrandeValue: { width: 100, textAlign: "right", fontWeight: 700, fontSize: 13, color: "#6B4F7A" },
  footer: { marginTop: 24, paddingTop: 10, borderTop: "1px solid #E5E5E5", fontSize: 8, color: "#666", textAlign: "center" },
  obs: { marginTop: 14, padding: 8, backgroundColor: "#FFF8E5", borderLeft: "3px solid #F0B400", fontSize: 9 },
})

const fmtMoney = (n: number) =>
  "$ " + new Intl.NumberFormat("es-AR").format(Math.round(n))

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d))

type Item = {
  descripcion: string
  tipo?: string
  cantidad?: number | string
  precio?: number | string
}

export type PresupuestoData = {
  logoSrc: Buffer | null
  numero: number
  fecha: Date
  validezDias: number
  fechaVencimiento: Date
  cliente: {
    nombre: string | null
    apellido: string | null
    dni: string | null
    telefono: string | null
    contacto: string | null
  }
  moto: {
    marca: string | null
    modelo: string | null
    anio: number | null
    patente: string | null
    kilometros: number | null
  }
  motivoIngreso: string | null
  trabajosACotizar: string | null
  items: Item[]
  economico: {
    subtotal: number
    descuento: number
    total: number
  }
  observaciones: string | null
  negocio: {
    razonSocial: string
    direccion?: string | null
    telefono?: string | null
    email?: string | null
    cuit?: string | null
  }
}

export function PresupuestoPDF({ data }: { data: PresupuestoData }) {
  const numeroFormateado = `PRE-${String(data.numero).padStart(4, "0")}`
  const items = data.items || []

  const nombreCliente =
    [data.cliente.apellido, data.cliente.nombre].filter(Boolean).join(", ") ||
    data.cliente.contacto ||
    "Consumidor final"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              {data.logoSrc ? (
                <Image src={data.logoSrc} style={styles.logo} />
              ) : (
                <Text style={{ fontSize: 18, fontWeight: 700, color: "#6B4F7A" }}>
                  {data.negocio.razonSocial}
                </Text>
              )}
              <Text style={styles.brandSub}>
                {data.negocio.direccion} {data.negocio.telefono ? "· " + data.negocio.telefono : ""}
              </Text>
              {data.negocio.cuit && <Text style={styles.brandSub}>CUIT: {data.negocio.cuit}</Text>}
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>PRESUPUESTO</Text>
              <Text style={styles.docNumber}>{numeroFormateado}</Text>
              <Text style={styles.docDate}>Fecha: {fmtDate(data.fecha)}</Text>
              <Text style={styles.validez}>
                Válido hasta: {fmtDate(data.fechaVencimiento)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cliente y moto */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.h2}>Cliente</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>{nombreCliente}</Text>
            </View>
            {data.cliente.dni && (
              <View style={styles.row}>
                <Text style={styles.label}>DNI:</Text>
                <Text style={styles.value}>{data.cliente.dni}</Text>
              </View>
            )}
            {data.cliente.telefono && (
              <View style={styles.row}>
                <Text style={styles.label}>Teléfono:</Text>
                <Text style={styles.value}>{data.cliente.telefono}</Text>
              </View>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.h2}>Vehículo</Text>
            {(data.moto.marca || data.moto.modelo) && (
              <View style={styles.row}>
                <Text style={styles.label}>Modelo:</Text>
                <Text style={styles.value}>
                  {[data.moto.marca, data.moto.modelo, data.moto.anio]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              </View>
            )}
            {data.moto.patente && (
              <View style={styles.row}>
                <Text style={styles.label}>Patente:</Text>
                <Text style={styles.value}>{data.moto.patente}</Text>
              </View>
            )}
            {data.moto.kilometros != null && (
              <View style={styles.row}>
                <Text style={styles.label}>Km:</Text>
                <Text style={styles.value}>
                  {Number(data.moto.kilometros).toLocaleString("es-AR")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Trabajos a cotizar */}
        {(data.motivoIngreso || data.trabajosACotizar) && (
          <View>
            <Text style={styles.h2}>Detalle del trabajo</Text>
            {data.motivoIngreso && <Text style={{ marginBottom: 4 }}>{data.motivoIngreso}</Text>}
            {data.trabajosACotizar && (
              <View style={styles.box}>
                <Text style={{ color: "#666", fontWeight: 700, marginBottom: 2 }}>Trabajos a realizar:</Text>
                <Text>{data.trabajosACotizar}</Text>
              </View>
            )}
          </View>
        )}

        {/* Items */}
        {items.length > 0 && (
          <View>
            <Text style={styles.h2}>Items / repuestos</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>TIPO</Text>
              <Text style={styles.col2}>DESCRIPCIÓN</Text>
              <Text style={styles.col3}>CANT.</Text>
              <Text style={styles.col4}>P. UNIT.</Text>
              <Text style={styles.col5}>SUBTOTAL</Text>
            </View>
            {items.map((it, i) => {
              const cant = Number(it.cantidad ?? 1) || 1
              const precio = Number(it.precio ?? 0) || 0
              return (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {it.tipo === "mano_obra" ? "Mano de obra" : "Repuesto"}
                  </Text>
                  <Text style={styles.col2}>{it.descripcion || "—"}</Text>
                  <Text style={styles.col3}>{cant}</Text>
                  <Text style={styles.col4}>{fmtMoney(precio)}</Text>
                  <Text style={styles.col5}>{fmtMoney(cant * precio)}</Text>
                </View>
              )
            })}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{fmtMoney(data.economico.subtotal)}</Text>
            </View>
            {data.economico.descuento > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento:</Text>
                <Text style={styles.totalValue}>- {fmtMoney(data.economico.descuento)}</Text>
              </View>
            )}
            <View style={styles.totalGrande}>
              <Text style={styles.totalGrandeLabel}>TOTAL:</Text>
              <Text style={styles.totalGrandeValue}>{fmtMoney(data.economico.total)}</Text>
            </View>
          </View>
        )}

        {/* Observaciones */}
        {data.observaciones && (
          <View style={styles.obs}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>Observaciones</Text>
            <Text>{data.observaciones}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Este presupuesto es válido por {data.validezDias} días desde la fecha de emisión.
          Sujeto a disponibilidad de repuestos. {data.negocio.razonSocial}
        </Text>
      </Page>
    </Document>
  )
}
