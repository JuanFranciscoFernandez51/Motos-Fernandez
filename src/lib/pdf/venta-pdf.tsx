import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: { borderBottom: "2px solid #6B4F7A", paddingBottom: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontSize: 20, fontWeight: 700, color: "#6B4F7A", letterSpacing: 1 },
  brandSub: { fontSize: 8, color: "#666", marginTop: 2 },
  docInfo: { textAlign: "right" },
  docTitle: { fontSize: 14, fontWeight: 700 },
  docNumber: { fontSize: 11, color: "#6B4F7A", marginTop: 2 },
  docDate: { fontSize: 8, color: "#666", marginTop: 2 },
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
  priceBox: {
    marginTop: 10, padding: 12, backgroundColor: "#6B4F7A", color: "#fff",
    borderRadius: 4,
  },
  priceLabel: { fontSize: 9, textTransform: "uppercase", opacity: 0.8 },
  priceValue: { fontSize: 18, fontWeight: 700, marginTop: 2 },
  terms: { marginTop: 18, padding: 10, backgroundColor: "#F8F5FA", fontSize: 8, lineHeight: 1.5 },
  termsTitle: { fontWeight: 700, marginBottom: 4, fontSize: 9, color: "#6B4F7A" },
  termsItem: { marginBottom: 3 },
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 50, gap: 30 },
  signBox: { flex: 1, textAlign: "center", borderTop: "1px solid #1A1A1A", paddingTop: 5 },
  signLabel: { fontSize: 8, fontWeight: 700 },
  signSub: { fontSize: 7, color: "#666", marginTop: 2 },
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    textAlign: "center", fontSize: 7, color: "#999",
    borderTop: "1px solid #E5E5E5", paddingTop: 6,
  },
})

type VentaPDFData = {
  numero: number
  fecha: Date
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
  economico: {
    precioVenta: number
    moneda: string
    formaPago?: string | null
    sena?: number | null
    saldo?: number | null
    detallePago?: string | null
    permutaDescripcion?: string | null
    permutaValor?: number | null
    cuotas?: number | null
    valorCuota?: number | null
    entrega?: number | null
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

const money = (n: number | null | undefined, moneda = "ARS") =>
  n == null ? "—" : `${moneda === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`

const dateStr = (d: Date | null | undefined) =>
  !d ? "—" : new Date(d).toLocaleDateString("es-AR")

export function VentaPDF({ data }: { data: VentaPDFData }) {
  const numeroFormateado = `V-${String(data.numero).padStart(4, "0")}`

  return (
    <Document title={`Boleto Compra-Venta ${numeroFormateado}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>MOTOS FERNANDEZ</Text>
              <Text style={styles.brandSub}>
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

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Precio total de venta</Text>
          <Text style={styles.priceValue}>
            {money(data.economico.precioVenta, data.economico.moneda)}
          </Text>
        </View>

        <Text style={styles.h2}>Forma de pago</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Modalidad:</Text>
          <Text style={styles.value}>{data.economico.formaPago || "—"}</Text>
        </View>
        {data.economico.sena != null && data.economico.sena > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Seña:</Text>
            <Text style={styles.value}>
              {money(data.economico.sena, data.economico.moneda)}
            </Text>
          </View>
        )}
        {data.economico.saldo != null && data.economico.saldo > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Saldo pendiente:</Text>
            <Text style={styles.value}>
              {money(data.economico.saldo, data.economico.moneda)}
            </Text>
          </View>
        )}
        {data.economico.permutaDescripcion && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Permuta:</Text>
              <Text style={styles.value}>{data.economico.permutaDescripcion}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Valor permuta:</Text>
              <Text style={styles.value}>
                {money(data.economico.permutaValor, data.economico.moneda)}
              </Text>
            </View>
          </>
        )}
        {data.economico.cuotas && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Entrega:</Text>
              <Text style={styles.value}>
                {money(data.economico.entrega, data.economico.moneda)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cuotas:</Text>
              <Text style={styles.value}>
                {data.economico.cuotas} x{" "}
                {money(data.economico.valorCuota, data.economico.moneda)}
              </Text>
            </View>
          </>
        )}
        {data.economico.detallePago && (
          <View style={styles.row}>
            <Text style={styles.label}>Detalle:</Text>
            <Text style={styles.value}>{data.economico.detallePago}</Text>
          </View>
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
            4. La seña entregada forma parte del precio total. El saldo deberá
            abonarse en los términos acordados.
          </Text>
          <Text style={styles.termsItem}>
            5. Cualquier controversia se someterá a los tribunales ordinarios
            de la ciudad de Bahía Blanca, con renuncia a cualquier otro fuero.
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
