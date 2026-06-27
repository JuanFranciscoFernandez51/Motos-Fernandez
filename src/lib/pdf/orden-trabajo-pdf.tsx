import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

// Estilos compactos: una OT típica entra en 1 hoja A4.
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
  box: { padding: 6, backgroundColor: "#F8F5FA", marginTop: 3, marginBottom: 3 },
  table: { marginTop: 6, borderTop: "1px solid #E5E5E5" },
  tableRow: {
    flexDirection: "row", borderBottom: "1px solid #EFEFEF",
    paddingVertical: 3,
  },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#F8F5FA",
    paddingVertical: 4, paddingHorizontal: 2, fontWeight: 700,
  },
  col1: { flex: 2, paddingRight: 4 },
  col2: { flex: 4, paddingRight: 4 },
  col3: { flex: 1, textAlign: "center", paddingRight: 4 },
  col4: { flex: 2, textAlign: "right", paddingRight: 4 },
  col5: { flex: 2, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  totalLabel: { width: 90, textAlign: "right", paddingRight: 6, color: "#666" },
  totalValue: { width: 90, textAlign: "right", fontWeight: 700 },
  totalGrande: {
    flexDirection: "row", justifyContent: "flex-end",
    marginTop: 5, paddingTop: 4, borderTop: "1.5px solid #7C3AED",
  },
  totalGrandeLabel: { width: 90, textAlign: "right", paddingRight: 6, fontWeight: 700 },
  totalGrandeValue: {
    width: 90, textAlign: "right", fontWeight: 700,
    fontSize: 11, color: "#7C3AED",
  },
  footer: {
    position: "absolute", bottom: 12, left: 28, right: 28,
    textAlign: "center", fontSize: 6.5, color: "#999",
    borderTop: "1px solid #E5E5E5", paddingTop: 4,
  },
})

type OTItem = {
  descripcion: string
  tipo: string
  cantidad: number | string
  precio: number | string
}

type OTPDFData = {
  numero: number
  fecha: Date
  logoSrc: string | Buffer
  fechaPrometida?: Date | null
  estado: string
  cliente: {
    nombre: string
    apellido: string
    dni?: string | null
    telefono?: string | null
    direccion?: string | null
    ciudad?: string | null
  }
  moto: {
    marca: string
    modelo: string
    anio?: number | null
    patente?: string | null
    kilometros?: number | null
  }
  servicio: {
    tipo?: string | null
    motivoIngreso: string
    diagnostico?: string | null
    trabajosRealizados?: string | null
  }
  items: OTItem[]
  economico: {
    subtotal: number
    descuento: number
    total: number
    pagado: number
    saldo: number
  }
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

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$ ${n.toLocaleString("es-AR")}`

const dateStr = (d: Date | null | undefined) =>
  !d ? "—" : new Date(d).toLocaleDateString("es-AR")

export function OrdenTrabajoPDF({ data }: { data: OTPDFData }) {
  const numeroFormateado = `OT-${String(data.numero).padStart(4, "0")}`

  return (
    <Document title={`Orden de trabajo ${numeroFormateado}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Image src={data.logoSrc} style={styles.logo} />
              <Text style={[styles.brandSub, { marginTop: 6 }]}>
                TALLER — {data.negocio.direccion}, {data.negocio.ciudad}
              </Text>
              <Text style={styles.brandSub}>
                {data.negocio.telefono} · {data.negocio.email}
              </Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>ORDEN DE TRABAJO</Text>
              <Text style={styles.docNumber}>N° {numeroFormateado}</Text>
              <Text style={styles.docDate}>Ingreso: {dateStr(data.fecha)}</Text>
              {data.fechaPrometida && (
                <Text style={styles.docDate}>
                  Entrega prometida: {dateStr(data.fechaPrometida)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Cliente / Moto</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Cliente:</Text>
              <Text style={styles.value}>
                {data.cliente.apellido}, {data.cliente.nombre}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DNI:</Text>
              <Text style={styles.value}>{data.cliente.dni || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{data.cliente.telefono || "—"}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Moto:</Text>
              <Text style={styles.value}>
                {data.moto.marca} {data.moto.modelo} {data.moto.anio || ""}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Patente:</Text>
              <Text style={styles.value}>{data.moto.patente || "—"}</Text>
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
        </View>

        <Text style={styles.h2}>Servicio</Text>
        {data.servicio.tipo && (
          <View style={styles.row}>
            <Text style={styles.label}>Tipo:</Text>
            <Text style={styles.value}>{data.servicio.tipo}</Text>
          </View>
        )}
        <View style={styles.box}>
          <Text style={{ fontWeight: 700, marginBottom: 2, color: "#666" }}>
            Motivo de ingreso
          </Text>
          <Text>{data.servicio.motivoIngreso}</Text>
        </View>
        {data.servicio.diagnostico && (
          <View style={styles.box}>
            <Text style={{ fontWeight: 700, marginBottom: 2, color: "#666" }}>Diagnóstico</Text>
            <Text>{data.servicio.diagnostico}</Text>
          </View>
        )}
        {data.servicio.trabajosRealizados && (
          <View style={styles.box}>
            <Text style={{ fontWeight: 700, marginBottom: 2, color: "#666" }}>
              Trabajos realizados
            </Text>
            <Text>{data.servicio.trabajosRealizados}</Text>
          </View>
        )}

        {/* Items */}
        {data.items.length > 0 && (
          <>
            <Text style={styles.h2}>Repuestos y mano de obra</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Tipo</Text>
              <Text style={styles.col2}>Descripción</Text>
              <Text style={styles.col3}>Cant.</Text>
              <Text style={styles.col4}>P. unit.</Text>
              <Text style={styles.col5}>Subtotal</Text>
            </View>
            {data.items.map((it, i) => {
              const c = typeof it.cantidad === "string" ? parseInt(it.cantidad) || 1 : it.cantidad
              const p = typeof it.precio === "string" ? parseInt(it.precio) || 0 : it.precio
              return (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {it.tipo === "mano_obra" ? "M. Obra" : "Repuesto"}
                  </Text>
                  <Text style={styles.col2}>{it.descripcion}</Text>
                  <Text style={styles.col3}>{c}</Text>
                  <Text style={styles.col4}>{money(p)}</Text>
                  <Text style={styles.col5}>{money(c * p)}</Text>
                </View>
              )
            })}

            {/* Totales */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{money(data.economico.subtotal)}</Text>
            </View>
            {data.economico.descuento > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento:</Text>
                <Text style={styles.totalValue}>
                  - {money(data.economico.descuento)}
                </Text>
              </View>
            )}
            <View style={styles.totalGrande}>
              <Text style={styles.totalGrandeLabel}>TOTAL:</Text>
              <Text style={styles.totalGrandeValue}>{money(data.economico.total)}</Text>
            </View>
            {data.economico.pagado > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Pagado:</Text>
                  <Text style={styles.totalValue}>{money(data.economico.pagado)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Saldo:</Text>
                  <Text
                    style={{
                      ...styles.totalValue,
                      color: data.economico.saldo > 0 ? "#EA580C" : "#16A34A",
                    }}
                  >
                    {money(data.economico.saldo)}
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        {data.observaciones && (
          <>
            <Text style={styles.h2}>Observaciones</Text>
            <Text>{data.observaciones}</Text>
          </>
        )}

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
