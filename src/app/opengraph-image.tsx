import { ImageResponse } from "next/og"

export const alt = "Motos Fernandez - Concesionaria multimarca en Bahía Blanca"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          background: "linear-gradient(135deg, #1A1A1A 0%, #2B1F35 50%, #6B4F7A 100%)",
          color: "white",
          position: "relative",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 3,
            color: "#9B59B6",
          }}
        >
          MOTOS FERNANDEZ
        </div>

        {/* Título principal */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            Tu próxima aventura
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              color: "#9B59B6",
              marginTop: 8,
              display: "flex",
            }}
          >
            empieza acá
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#D1D5DB",
              marginTop: 28,
              display: "flex",
            }}
          >
            +40 años en Bahía Blanca · Motocicletas, cuatriciclos, UTV y motos de agua
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48, marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: "white" }}>+41</div>
            <div style={{ fontSize: 16, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>
              Años
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: "white" }}>+50</div>
            <div style={{ fontSize: 16, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>
              Marcas
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: "white" }}>#1</div>
            <div style={{ fontSize: 16, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>
              Bahía Blanca
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
