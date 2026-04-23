import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },
  header: {
    borderBottom: "2px solid #6B4F7A",
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: "#6B4F7A",
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  docInfo: {
    textAlign: "right",
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
  },
  docNumber: {
    fontSize: 11,
    color: "#6B4F7A",
    marginTop: 2,
  },
  docDate: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  h2: {
    fontSize: 11,
    fontWeight: 700,
    color: "#6B4F7A",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
    borderBottom: "1px solid #E5E5E5",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: "#666",
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  col: {
    flex: 1,
  },
  terms: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#F8F5FA",
    fontSize: 8,
    lineHeight: 1.5,
  },
  termsTitle: {
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 9,
    color: "#6B4F7A",
  },
  termsItem: {
    marginBottom: 3,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
    gap: 30,
  },
  signBox: {
    flex: 1,
    textAlign: "center",
    borderTop: "1px solid #1A1A1A",
    paddingTop: 5,
  },
  signLabel: {
    fontSize: 8,
    fontWeight: 700,
  },
  signSub: {
    fontSize: 7,
    color: "#666",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#999",
    borderTop: "1px solid #E5E5E5",
    paddingTop: 6,
  },
})

type MandatoPDFData = {
  numero: number
  fecha: Date
  fechaVencimiento?: Date | null
  cliente: {
    nombre: string
    apellido: string
    dni?: string | null
    cuit?: string | null
    direccion?: string | null
    ciudad?: string | null
    provincia?: string | null
    telefono?: string | null
    email?: string | null
  }
  moto: {
    marca: string
    modelo: string
    anio?: number | null
    kilometros?: number | null
    cilindrada?: string | null
    color?: string | null
    chasis?: string | null
    motor?: string | null
    patente?: string | null
  }
  documentacion: {
    tieneTitulo: boolean
    tituloANombreCliente: boolean
    tienePrenda: boolean
    detallePrenda?: string | null
    verificacionTecnica: boolean
  }
  economico: {
    precioVenta: number
    precioMinimo?: number | null
    comisionPorc?: number | null
    comisionMonto?: number | null
    moneda: string
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

const money = (amount: number | null | undefined, moneda: string = "ARS") => {
  if (amount == null) return "—"
  return `${moneda === "USD" ? "USD " : "$ "}${amount.toLocaleString("es-AR")}`
}

const dateStr = (d: Date | null | undefined) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-AR")
}

export function MandatoPDF({ data }: { data: MandatoPDFData }) {
  const numeroFormateado = `MV-${String(data.numero).padStart(4, "0")}`

  return (
    <Document
      title={`Mandato ${numeroFormateado}`}
      author={data.negocio.razonSocial}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
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
              <Text style={styles.docTitle}>MANDATO DE VENTA</Text>
              <Text style={styles.docNumber}>N° {numeroFormateado}</Text>
              <Text style={styles.docDate}>
                Fecha: {dateStr(data.fecha)}
              </Text>
            </View>
          </View>
        </View>

        {/* DATOS DEL MANDANTE (cliente) */}
        <Text style={styles.h2}>Mandante (dueño de la moto)</Text>
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

        {/* DATOS DE LA MOTO */}
        <Text style={styles.h2}>Moto objeto del mandato</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Marca:</Text>
              <Text style={styles.value}>{data.moto.marca}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Modelo:</Text>
              <Text style={styles.value}>{data.moto.modelo}</Text>
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
            <View style={styles.row}>
              <Text style={styles.label}>Cilindrada:</Text>
              <Text style={styles.value}>{data.moto.cilindrada || "—"}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.row}>
              <Text style={styles.label}>Color:</Text>
              <Text style={styles.value}>{data.moto.color || "—"}</Text>
            </View>
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

        {/* DOCUMENTACIÓN */}
        <Text style={styles.h2}>Documentación</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Título:</Text>
          <Text style={styles.value}>
            {data.documentacion.tieneTitulo
              ? data.documentacion.tituloANombreCliente
                ? "Sí, a nombre del mandante"
                : "Sí, a nombre de tercero"
              : "No posee"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Prenda:</Text>
          <Text style={styles.value}>
            {data.documentacion.tienePrenda
              ? data.documentacion.detallePrenda || "Sí"
              : "No posee"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VTV:</Text>
          <Text style={styles.value}>
            {data.documentacion.verificacionTecnica ? "Vigente" : "No vigente"}
          </Text>
        </View>

        {/* ECONÓMICO */}
        <Text style={styles.h2}>Condiciones económicas</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Precio de venta:</Text>
          <Text style={styles.value}>
            {money(data.economico.precioVenta, data.economico.moneda)}
          </Text>
        </View>
        {data.economico.precioMinimo && (
          <View style={styles.row}>
            <Text style={styles.label}>Precio mínimo:</Text>
            <Text style={styles.value}>
              {money(data.economico.precioMinimo, data.economico.moneda)}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Comisión:</Text>
          <Text style={styles.value}>
            {data.economico.comisionPorc
              ? `${data.economico.comisionPorc}% sobre el precio de venta`
              : data.economico.comisionMonto
              ? money(data.economico.comisionMonto, data.economico.moneda)
              : "A convenir"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vencimiento:</Text>
          <Text style={styles.value}>{dateStr(data.fechaVencimiento)}</Text>
        </View>

        {data.observaciones && (
          <>
            <Text style={styles.h2}>Observaciones</Text>
            <Text>{data.observaciones}</Text>
          </>
        )}

        {/* TÉRMINOS */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Términos y condiciones</Text>
          <Text style={styles.termsItem}>
            1. El mandante otorga al comisionista la facultad de ofrecer en
            venta la unidad descripta por el precio acordado en este mandato.
          </Text>
          <Text style={styles.termsItem}>
            2. El mandato tiene validez desde su firma y hasta la fecha de
            vencimiento indicada. Podrá ser renovado de común acuerdo.
          </Text>
          <Text style={styles.termsItem}>
            3. El mandante declara que la unidad es de su propiedad, que se
            encuentra libre de todo gravamen (excepto lo declarado en este
            documento) y que toda la documentación presentada es auténtica.
          </Text>
          <Text style={styles.termsItem}>
            4. La comisión del comisionista se calcula sobre el precio final de
            venta y se descuenta al liquidar al mandante.
          </Text>
          <Text style={styles.termsItem}>
            5. El mandante autoriza a exhibir la unidad en el local comercial y
            a tomarle fotografías para su publicación en catálogos, web y redes
            sociales del comisionista.
          </Text>
          <Text style={styles.termsItem}>
            6. Los gastos de traslado, limpieza, reparaciones menores y
            preparación para la venta corren por cuenta del mandante (salvo
            pacto en contrario).
          </Text>
          <Text style={styles.termsItem}>
            7. El mandante podrá retirar la unidad previa notificación al
            comisionista con 48hs de anticipación, siempre que no exista oferta
            de compra aceptada o seña recibida.
          </Text>
          <Text style={styles.termsItem}>
            8. Cualquier controversia se someterá a los tribunales ordinarios
            de la ciudad de Bahía Blanca, con renuncia a cualquier otro fuero.
          </Text>
        </View>

        {/* FIRMAS */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>MANDANTE</Text>
            <Text style={styles.signSub}>
              {data.cliente.apellido}, {data.cliente.nombre}
            </Text>
            {data.cliente.dni && (
              <Text style={styles.signSub}>DNI {data.cliente.dni}</Text>
            )}
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>COMISIONISTA</Text>
            <Text style={styles.signSub}>{data.negocio.razonSocial}</Text>
            <Text style={styles.signSub}>CUIT {data.negocio.cuit}</Text>
          </View>
        </View>

        {/* FOOTER */}
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
