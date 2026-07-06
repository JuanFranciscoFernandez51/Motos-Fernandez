import { ImageResponse } from "next/og"
import sharp from "sharp"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// next/og entrega PNG. Instagram por la API rechaza PNG a veces
// (error 2207052). Convertimos a JPEG con sharp para que la portada (slide 1
// del carrusel) sea siempre aceptada.
async function jpegFrom(img: ImageResponse): Promise<Response> {
  const png = Buffer.from(await img.arrayBuffer())
  const jpeg = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}

/**
 * GET /api/portada/[id]
 *
 * Portada 1080×1350 (4:5 retrato IG) con next/og (Satori). Foto a sangre
 * (full-bleed) + degradado que oscurece hacia abajo para que el texto se lea
 * encima. Slide 1 de los carruseles de Instagram (ver publicarEnMeta).
 */

const LILA = "#C39BD3"
const WHATSAPP = "#25D366"
const CUOTAS = "Financiá hasta el 100%"
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
    return jpegFrom(new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0A0810",
            color: "#fff",
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          Motos Fernández
        </div>
      ),
      SIZE
    ))
  }

  const esUsada = (m.condicion || "0KM").toUpperCase() === "USADA"
  const foto = m.fotos.find((u) => /^https?:\/\//i.test(u)) || ""

  const precio = m.precio
    ? (m.moneda || "ARS") === "USD"
      ? `USD ${m.precio.toLocaleString("es-AR")}`
      : `$${m.precio.toLocaleString("es-AR")}`
    : "Consultar"

  // Evitar "BMW BMW ..." si el nombre ya incluye la marca.
  const marca = (m.marca || "").trim()
  const nombre = (m.nombre || "").trim()
  const modeloTxt = (
    marca && !nombre.toLowerCase().startsWith(marca.toLowerCase())
      ? `${marca} ${nombre}`
      : nombre
  ).trim()
  const L = modeloTxt.length
  const modeloSize = L <= 13 ? 108 : L <= 18 ? 90 : L <= 24 ? 72 : 60

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

  return jpegFrom(new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0A0810" }}>
        {/* Foto a sangre */}
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "radial-gradient(120% 90% at 50% 18%, #2a1b33 0%, #150e1d 60%, #0A0810 100%)",
            }}
          />
        )}

        {/* Degradado inferior que se difumina hacia arriba (legibilidad del texto) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 820,
            display: "flex",
            background:
              "linear-gradient(0deg, rgba(10,8,16,0.97) 0%, rgba(10,8,16,0.9) 16%, rgba(10,8,16,0.55) 40%, rgba(10,8,16,0) 100%)",
          }}
        />

        {/* INFO inferior */}
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 132, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: LILA, fontSize: 27, fontWeight: 700, letterSpacing: 5, marginBottom: 8 }}>
            {esUsada ? "USADA SELECCIONADA" : "0 KM · UNIDAD NUEVA"}
          </div>
          <div
            style={{
              display: "flex",
              color: "#fff",
              fontSize: modeloSize,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -2,
              marginBottom: 28,
            }}
          >
            {modeloTxt}
          </div>

          {/* Specs */}
          <div style={{ display: "flex", gap: 52, marginBottom: 30 }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", color: LILA, fontSize: 19, fontWeight: 700, letterSpacing: 2 }}>
                  {s.lbl.toUpperCase()}
                </div>
                <div style={{ display: "flex", color: "#fff", fontSize: 40, fontWeight: 700, marginTop: 6 }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Precio + cuotas + WhatsApp */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: "#fff", fontSize: 90, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
                {precio}
              </div>
              <div style={{ display: "flex", color: LILA, fontSize: 25, fontWeight: 600, marginTop: 12 }}>
                {CUOTAS}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 32px",
                borderRadius: 999,
                background: WHATSAPP,
                color: "#053d1c",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              <svg width="30" height="30" viewBox="0 0 32 32" fill="#053d1c">
                <path d="M16.04 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.72 6.4L3.2 28.8l6.56-1.72c1.87 1.02 3.97 1.56 6.28 1.56 7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.8-12.8zm0 23.36c-2.05 0-4.06-.55-5.81-1.59l-.42-.25-3.89 1.02 1.04-3.79-.27-.44a10.5 10.5 0 0 1-1.61-5.6c0-5.86 4.77-10.62 10.63-10.62 2.84 0 5.5 1.11 7.51 3.12a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.63-10.62 10.63zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.89-1.78-2.21-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.62 0 1.54 1.13 3.03 1.29 3.24.16.21 2.22 3.39 5.38 4.76.75.32 1.34.51 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37z" />
              </svg>
              Consultá
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(255,255,255,0.6)",
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex" }}>motosfernandez.com.ar</div>
          <div style={{ display: "flex" }}>+54 9 291 578 8671</div>
        </div>
      </div>
    ),
    SIZE
  ))
}
