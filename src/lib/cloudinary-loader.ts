/**
 * Loader custom de next/image para Cloudinary.
 *
 * Reemplaza el optimizador de Vercel (que estaba en `unoptimized: true` para
 * evitar el error 402 de cuota): ahora next/image genera el srcset apuntando
 * DIRECTO a la CDN de Cloudinary con transformaciones por ancho. Así el
 * browser baja la imagen en el tamaño exacto que necesita y en formato
 * moderno (AVIF/WebP vía f_auto) — clave para el LCP en mobile.
 *
 * - Imágenes de Cloudinary → inyecta `f_auto,q_auto,c_limit,w_<width>`.
 * - Cualquier otra URL (SVGs locales, /images/*, externas) → se devuelve
 *   tal cual, sin tocar.
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // Solo transformamos URLs de Cloudinary subidas (con /upload/).
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src
  }

  // Si la URL ya trae transformaciones nuestras (ej. un f_auto previo),
  // no las dupliquemos.
  if (/\/upload\/[^/]*(?:f_auto|q_auto|w_\d)/.test(src)) {
    return src
  }

  const params = [
    "f_auto", // AVIF/WebP según el navegador
    "c_limit", // nunca agranda la original
    `w_${width}`,
    `q_${quality || "auto"}`,
  ].join(",")

  return src.replace("/upload/", `/upload/${params}/`)
}
