/**
 * Loader custom de next/image para Cloudinary.
 *
 * next/image arma el srcset apuntando DIRECTO a la CDN de Cloudinary (no pasa
 * por el optimizador de Vercel). Cada combinación ancho x formato es una
 * derivada que Cloudinary cobra, así que:
 *
 * - El ancho se redondea PARA ARRIBA a una grilla corta [160..1920] (la misma
 *   de next.config: deviceSizes + imageSizes). Nunca más de 1920.
 * - Calidad: siempre q_auto:eco; q_auto solo si se pide quality >= 80.
 * - Un solo parámetro de formato: f_auto.
 * - Si la URL guardada YA trae una transformación (cualquier segmento tipo
 *   `x_...` justo después de /upload/: el cartel VENDIDO, un recorte, etc.)
 *   se devuelve tal cual: una sola variante, sin multiplicarla por ancho.
 * - Cualquier otra URL (SVGs locales, /images/*, externas) → tal cual.
 */
const GRILLA = [160, 320, 640, 960, 1280, 1920]

function anchoGrilla(width: number): number {
  return GRILLA.find((g) => g >= width) ?? GRILLA[GRILLA.length - 1]
}

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

  // Ya transformada (ej. `/upload/w_1100,c_limit,f_jpg/...` o
  // `/upload/b_white,c_pad,.../...`): no le apilamos otra cadena encima.
  if (/\/upload\/[a-z]{1,3}_[^/]*\//.test(src)) {
    return src
  }

  const params = [
    "f_auto", // AVIF/WebP según el navegador
    "c_limit", // nunca agranda la original
    `w_${anchoGrilla(width)}`,
    quality && quality >= 80 ? "q_auto" : "q_auto:eco",
  ].join(",")

  return src.replace("/upload/", `/upload/${params}/`)
}
