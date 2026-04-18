import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

// Metadata de la imagen
export const alt = "Motos Fernandez"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

// Generación de la imagen OG para cada modelo
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const model = await prisma.modelo.findUnique({
    where: { slug },
    select: {
      nombre: true,
      marca: true,
      precio: true,
      moneda: true,
      condicion: true,
      anio: true,
      kilometros: true,
      cilindrada: true,
      fotos: true,
    },
  })

  if (!model) {
    // Fallback: imagen genérica
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1A1A1A 0%, #6B4F7A 100%)",
            color: "white",
            fontSize: 72,
            fontWeight: 800,
          }}
        >
          Motos Fernandez
        </div>
      ),
      size
    )
  }

  const precioFormateado = model.precio
    ? model.moneda === "USD"
      ? `USD ${model.precio.toLocaleString("es-AR")}`
      : `$${model.precio.toLocaleString("es-AR")}`
    : "Consultar"

  const esUsada = (model.condicion || "0KM") === "USADA"
  const foto = model.fotos[0]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1A1A1A",
          position: "relative",
        }}
      >
        {/* Overlay de gradiente */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(107,79,122,0.15) 0%, rgba(26,26,26,0.0) 50%, rgba(107,79,122,0.35) 100%)",
            display: "flex",
          }}
        />

        {/* Lado izquierdo: info */}
        <div
          style={{
            width: "50%",
            padding: "60px 50px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#9B59B6",
                fontSize: 20,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 20,
              }}
            >
              MOTOS FERNANDEZ
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: "6px 14px",
                  background: esUsada ? "#F97316" : "#10B981",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800,
                  borderRadius: 8,
                  display: "flex",
                }}
              >
                {esUsada ? "USADA" : "0KM"}
              </div>
              <div
                style={{
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 600,
                  borderRadius: 8,
                  display: "flex",
                }}
              >
                {model.marca}
              </div>
            </div>

            <div
              style={{
                color: "white",
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1,
                display: "flex",
              }}
            >
              {model.nombre}
            </div>

            <div
              style={{
                marginTop: 16,
                color: "#9CA3AF",
                fontSize: 22,
                display: "flex",
                gap: 12,
              }}
            >
              {model.anio && <span>{model.anio}</span>}
              {esUsada && model.kilometros != null && (
                <span>· {model.kilometros.toLocaleString("es-AR")} km</span>
              )}
              {model.cilindrada && <span>· {model.cilindrada}</span>}
            </div>
          </div>

          {/* Precio abajo */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#9CA3AF", fontSize: 16, textTransform: "uppercase", letterSpacing: 1 }}>
              Precio
            </div>
            <div
              style={{
                color: "#9B59B6",
                fontSize: 52,
                fontWeight: 900,
                marginTop: 4,
                display: "flex",
              }}
            >
              {precioFormateado}
            </div>
          </div>
        </div>

        {/* Lado derecho: foto del modelo */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt={model.nombre}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#2A2A2A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6B4F7A",
                fontSize: 120,
                fontWeight: 900,
              }}
            >
              MF
            </div>
          )}
          {/* Gradiente sobre foto para transición */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "linear-gradient(to right, #1A1A1A 0%, rgba(26,26,26,0) 15%)",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    size
  )
}
