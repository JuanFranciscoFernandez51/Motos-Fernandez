/**
 * Overlay "VENDIDO" sobre la foto principal de una moto vendida.
 *
 * Se estampa con una transformación de Cloudinary (cinta diagonal en la
 * esquina, color de marca púrpura) sobre la primera foto. Es 100%
 * reversible y sin pérdida: la transformación se inserta después de
 * `/upload/`; para revertir, se quita ese mismo bloque y vuelve la
 * original.
 *
 * Se aplica automáticamente desde el flujo único de venta
 * (marcarModeloComoVendido + clon 0KM) y se quita al "devolver al
 * catálogo". No depende de ningún botón manual.
 */

// Cinta diagonal púrpura (#5b4368) arriba a la izquierda, fuente Montserrat.
// f_jpg para que renderice también sobre originales .heic.
const SOLD_TRANSFORM =
  "w_1100,c_limit,f_jpg/l_text:Montserrat_40_800_letter_spacing_8:%20%20%20VENDIDO%20%20%20,co_white,b_rgb:5b4368,a_-45/fl_layer_apply,g_north_west,x_-46,y_70"

const INSERT = `/upload/${SOLD_TRANSFORM}/`

function esCloudinaryUpload(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
}

/** ¿La URL ya tiene el cartel VENDIDO estampado? */
export function tieneOverlayVendido(url: string): boolean {
  return url.includes("VENDIDO") && url.includes("b_rgb:5b4368")
}

/**
 * Devuelve un nuevo array de fotos con el cartel VENDIDO en la primera.
 * Idempotente: si ya lo tiene o la primera no es de Cloudinary, no toca nada.
 */
export function marcarFotosVendido(fotos: string[]): string[] {
  if (!fotos.length) return fotos
  const [first, ...rest] = fotos
  if (!esCloudinaryUpload(first) || tieneOverlayVendido(first)) return fotos
  return [first.replace("/upload/", INSERT), ...rest]
}

/**
 * Quita el cartel VENDIDO de la primera foto (restaura la original).
 * Idempotente: si no tiene overlay, devuelve las fotos tal cual.
 */
export function desmarcarFotosVendido(fotos: string[]): string[] {
  if (!fotos.length) return fotos
  const [first, ...rest] = fotos
  if (!tieneOverlayVendido(first)) return fotos
  return [first.replace(INSERT, "/upload/"), ...rest]
}
