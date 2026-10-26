/**
 * Mejora de fotos vía Cloudinary (e_improve: luz/color + sharpen leve).
 *
 * La mejora se HORNEA: el server sube el resultado como asset NUEVO
 * (/api/admin/hornear-foto) y en la base queda una URL limpia, sin el efecto.
 * Si el efecto quedara en la URL, cada ancho/formato que pide la web
 * generaría otra derivada con el efecto (gasto de créditos).
 *
 * Prohibido acá: e_upscale, e_gen_*, e_enhance y e_background_removal
 * (IA / add-ons pagos de Cloudinary).
 */

// e_improve = auto-mejora (luz/color) + sharpen leve. Sutil y seguro.
export const TRANSFORM_MEJORA = "e_improve,e_sharpen:60"

// Detecta un transform NUESTRO ya aplicado (para reemplazarlo o quitarlo).
const NUESTRO = /\/upload\/(?:e_improve[^/]*|e_background_removal[^/]*|e_auto_[^/]*)\//

export function esCloudinary(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
}

/**
 * Aplica (o reemplaza) nuestro transform en una URL de Cloudinary.
 * Si `transform` es vacío, deja la foto ORIGINAL (saca nuestra mejora).
 * URLs que no son de Cloudinary se devuelven intactas.
 */
export function aplicarMejora(url: string, transform: string): string {
  if (!esCloudinary(url)) return url
  const limpia = url.replace(NUESTRO, "/upload/")
  return transform ? limpia.replace("/upload/", `/upload/${transform}/`) : limpia
}

export const mejorarFoto = (url: string) => aplicarMejora(url, TRANSFORM_MEJORA)
export const fotoOriginal = (url: string) => aplicarMejora(url, "")
