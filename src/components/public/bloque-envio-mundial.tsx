import { getWhatsAppUrl } from "@/lib/constants"

/**
 * Bloque editorial "Envío gratis a todo el Sur" (promo Mundial).
 *
 * Sección full-width, estilo etiqueta de envío. Se monta en la home cuando la
 * promo está activa (gate server-side). El límite de 650cc NO se menciona en el
 * copy visible — va solo en la letra chica de Términos.
 */
export function BloqueEnvioMundial() {
  return (
    <section className="relative py-16 sm:py-20 bg-[#08090B] overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121318]">
          {/* Columna izquierda */}
          <div className="p-8 sm:p-10 lg:p-11">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#75AADB] mb-4">
              Por el Mundial
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] leading-[1.0] tracking-tight text-white">
              ENVÍO GRATIS A TODO EL <span className="text-[#75AADB]">SUR</span>.
            </h2>
            <p className="mt-4 text-base text-[#9aa6b3] leading-relaxed max-w-[430px]">
              Llevamos tu moto, repuestos y accesorios a cualquier punto de la
              Patagonia, con nuestro envío propio y sin cargo mientras dure el Mundial.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href={getWhatsAppUrl(
                  "Hola! Quiero consultar sobre el envío gratis al Sur por el Mundial."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-[9px] bg-white px-6 py-3 text-sm font-bold text-[#0c0e12] hover:bg-[#dbeafc] transition-colors"
              >
                Consultá tu envío
              </a>
              <span className="text-[13px] text-[#8a96a3]">Sin mínimo de compra</span>
            </div>
            <p className="mt-7 text-[11px] leading-relaxed text-[#6b7681] max-w-[460px]">
              Promoción válida por tiempo limitado durante el Mundial 2026. Envío sin
              cargo a destinos del Sur argentino (Patagonia) para motocicletas de hasta
              650&nbsp;cc de cilindrada, 0KM y usados seleccionados. Sin mínimo de compra.
              No acumulable con otras promociones. Consultá cobertura y plazos de entrega.
            </p>
          </div>

          {/* Columna derecha — campo bandera + etiqueta de envío */}
          <div
            className="relative flex items-center justify-center p-7"
            style={{
              background:
                "linear-gradient(180deg,#75AADB 0 33%,#ffffff 33% 67%,#75AADB 67% 100%)",
            }}
          >
            <div className="relative w-full max-w-[262px] rounded-[10px] bg-[#F7F5EF] p-[18px] shadow-[0_16px_32px_rgba(0,0,0,.3)] border-[1.5px] border-dashed border-[rgba(12,14,18,.55)]">
              <div className="flex items-baseline justify-between border-b border-[rgba(12,14,18,.18)] pb-2.5 mb-3">
                <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0c0e12]">
                  Envío
                </span>
                <span className="text-[11px] tracking-[0.14em] text-[#8a8170]">
                  MUNDIAL 2026
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8170] mb-0.5">
                Destino
              </p>
              <p className="font-display text-[18px] font-bold leading-tight text-[#0c0e12] mb-3">
                Todo el Sur — Patagonia
              </p>
              <p className="text-[11px] tracking-[0.1em] text-[#5b5446] mb-3.5 tabular-nums">
                ORIGEN · BAHÍA BLANCA
              </p>
              <div
                className="h-[42px] mb-2 rounded-[1px]"
                style={{
                  background:
                    "repeating-linear-gradient(90deg,#0c0e12 0 2px,transparent 2px 4px,#0c0e12 4px 5px,transparent 5px 9px,#0c0e12 9px 12px,transparent 12px 15px)",
                }}
                aria-hidden
              />
              <p className="text-center text-[10px] tracking-[0.3em] text-[#8a8170]">
                MOTOS FERNÁNDEZ
              </p>
              {/* Sello GRATIS */}
              <span
                className="absolute -bottom-3.5 -right-2.5 rotate-[-9deg] rounded-md border-2 border-white bg-[#F4B739] px-4 py-2 font-display text-[15px] font-black tracking-[0.04em] text-[#0c0e12] shadow-[0_8px_18px_rgba(0,0,0,.4)]"
              >
                GRATIS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
