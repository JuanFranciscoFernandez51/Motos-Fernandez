/**
 * URL base canónica para los QRs físicos.
 * Es lo que se imprime en el acrílico, por lo tanto DEBE ser estable.
 * Cuando esté el dominio custom, esta variable apunta ahí.
 */
export const QR_BASE_URL =
  process.env.NEXT_PUBLIC_QR_BASE_URL || "https://motosfernandez.com.ar"

/** URL completa que va al QR, dado un código. */
export function urlDeQrPara(codigo: string): string {
  const base = QR_BASE_URL.replace(/\/$/, "")
  return `${base}/m/${codigo.toLowerCase()}`
}
