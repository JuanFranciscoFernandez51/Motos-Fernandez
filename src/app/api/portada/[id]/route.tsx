import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/portada/[id]
 *
 * Portada 1080×1350 (4:5, retrato IG) generada con next/og (Satori) a partir de
 * los datos de una moto. Se usa como slide 1 de los carruseles de Instagram
 * (ver publicarEnMeta → se antepone esta URL a las fotos).
 *
 * Identidad: violeta MF, foto full-bleed + scrim, badge de condición, modelo
 * grande, specs (año/km/cil), precio + pill WhatsApp, footer web/tel.
 */

const VIOLETA = "#3D2649"
const LILA = "#C39BD3"
const NARANJA = "#FF9500"
const WHATSAPP = "#25D366"
const SIZE = { width: 1080, height: 1350 }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const m = await prisma.modelo.findUnique({
    where: { id },
    select: {
      marca: true,
      nombre: true,
      condicion: true,
      anio: true,
      kilometros: true,
      cilindrada: true,
      precio: true,
      moneda: true,
      fotos: true,
    },
  })

  if (!m) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: VIOLETA,
            color: "#fff",
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          Motos Fernández
        </div>
      ),
      SIZE
    )
  }

  const esUsada = (m.condicion || "0KM").toUpperCase() === "USADA"
  const foto = m.fotos.find((u) => /^https?:\/\//i.test(u)) || ""

  const precio = m.precio
    ? (m.moneda || "ARS") === "USD"
      ? `USD ${m.precio.toLocaleString("es-AR")}`
      : `$${m.precio.toLocaleString("es-AR")}`
    : "Consultar"

  const modeloTxt = `${m.marca ? m.marca + " " : ""}${m.nombre}`.trim()
  const modeloLen = modeloTxt.length
  const modeloSize = modeloLen > 22 ? 64 : modeloLen > 16 ? 80 : 96

  // Specs (ocultar vacíos)
  const specs: { lbl: string; val: string }[] = []
  if (esUsada) {
    if (m.anio) specs.push({ lbl: "Año", val: String(m.anio) })
    if (m.kilometros != null)
      specs.push({ lbl: "Kilómetros", val: `${m.kilometros.toLocaleString("es-AR")} km` })
  } else {
    specs.push({ lbl: "Año", val: String(m.anio || new Date().getFullYear()) })
    specs.push({ lbl: "Kilómetros", val: "0 km" })
  }
  if (m.cilindrada) specs.push({ lbl: "Cilindrada", val: m.cilindrada })

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: VIOLETA }}>
        {/* Foto full-bleed */}
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: `radial-gradient(120% 90% at 50% 12%, #2a1b33 0%, #150e1d 60%, #0A0810 100%)`,
            }}
          />
        )}

        {/* Scrim superior */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 520,
            display: "flex",
            background: "linear-gradient(180deg, rgba(10,8,16,0.82) 0%, rgba(10,8,16,0) 100%)",
          }}
        />
        {/* Scrim inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 780,
            display: "flex",
            background: "linear-gradient(0deg, rgba(10,8,16,0.96) 0%, rgba(10,8,16,0.86) 26%, rgba(10,8,16,0) 100%)",
          }}
        />

        {/* HEADER */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 64,
            right: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 18,
                background: VIOLETA,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: -1,
              }}
            >
              MF
            </div>
            <div style={{ display: "flex", color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>
              MOTOS · <span style={{ color: LILA, marginLeft: 8 }}>FERNÁNDEZ</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: 999,
              background: esUsada ? "#7a4d92" : NARANJA,
              color: esUsada ? "#fff" : "#1a0f00",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            {esUsada ? "USADA" : "0 KM"}
          </div>
        </div>

        {/* INFO inferior */}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 128, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: LILA, fontSize: 26, fontWeight: 700, letterSpacing: 6, marginBottom: 14 }}>
            {esUsada ? "USADA · OPORTUNIDAD" : "0 KM · UNIDAD NUEVA"}
          </div>
          <div
            style={{
              display: "flex",
              color: "#fff",
              fontSize: modeloSize,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -2,
              marginBottom: 30,
            }}
          >
            {modeloTxt}
          </div>

          {/* Specs */}
          <div style={{ display: "flex", gap: 54, marginBottom: 32 }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", color: LILA, fontSize: 19, fontWeight: 700, letterSpacing: 2 }}>
                  {s.lbl.toUpperCase()}
                </div>
                <div style={{ display: "flex", color: "#fff", fontSize: 38, fontWeight: 700, marginTop: 6 }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Precio + WhatsApp */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: LILA, fontSize: 22, fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>
                PRECIO
              </div>
              <div style={{ display: "flex", color: "#fff", fontSize: 84, fontWeight: 800, lineHeight: 1 }}>
                {precio}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "20px 34px",
                borderRadius: 999,
                background: WHATSAPP,
                color: "#053d1c",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              Consultanos
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(255,255,255,0.62)",
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex" }}>motosfernandez.com.ar</div>
          <div style={{ display: "flex" }}>291 578-8671</div>
        </div>
      </div>
    ),
    SIZE
  )
}
