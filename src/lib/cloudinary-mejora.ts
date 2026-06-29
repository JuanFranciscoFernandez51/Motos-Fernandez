/**
 * Mejora de fotos con IA vía transformaciones de Cloudinary (se aplican en la
 * URL, sin re-subir nada; Cloudinary conserva el original, así que es
 * reversible). Pensado para las fotos de motos usadas.
 */

// e_improve = auto-mejora (luz/color) + sharpen leve. Sutil y seguro.
export const TRANSFORM_MEJORA = "e_improve,e_sharpen:60"
// Quita el fondo (add-on de Cloudinary, habilitado en la cuenta) y lo deja
// blanco — look limpio y uniforme para catálogo/Meta.
export const TRANSFORM_FONDO_BLANCO = "e_background_removal,b_white"

// Detecta un transform NUESTRO ya aplicado (para reemplazarlo o quitarlo).
const NUESTRO = /\/upload\/(?:e_improve[^/]*|e_background_removal[^/]*|e_auto_[^/]*)\//

function esCloudinary(url: string) {
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
export const fondoBlancoFoto = (url: string) => aplicarMejora(url, TRANSFORM_FONDO_BLANCO)
export const fotoOriginal = (url: string) => aplicarMejora(url, "")
