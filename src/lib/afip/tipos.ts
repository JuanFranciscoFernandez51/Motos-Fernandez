/**
 * Constantes de ARCA/AFIP para facturación electrónica (WSFEv1).
 * Los ids son los oficiales que espera el web service.
 */

// ---- Tipos de comprobante ----
export const CBTE = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
} as const

export function labelCbte(tipo: number): string {
  const map: Record<number, string> = {
    1: "Factura A",
    2: "Nota de Débito A",
    3: "Nota de Crédito A",
    6: "Factura B",
    7: "Nota de Débito B",
    8: "Nota de Crédito B",
    11: "Factura C",
    12: "Nota de Débito C",
    13: "Nota de Crédito C",
  }
  return map[tipo] || `Comprobante ${tipo}`
}

/** Letra del comprobante (A/B/C) según el tipo. */
export function letraCbte(tipo: number): "A" | "B" | "C" {
  if ([1, 2, 3].includes(tipo)) return "A"
  if ([6, 7, 8].includes(tipo)) return "B"
  return "C"
}

// ---- Tipos de documento del receptor ----
export const DOC = {
  CUIT: 80,
  CUIL: 86,
  CDI: 87,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const

// ---- Conceptos ----
export const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const

// ---- Alícuotas de IVA (id AFIP) ----
export const IVA_ALIC = {
  EXENTO: 2, // 0% (exento) — uso interno; AFIP usa ImpOpEx
  CERO: 3, // 0%
  DIEZ_CINCO: 4, // 10,5%
  VEINTIUNO: 5, // 21%
  VEINTISIETE: 6, // 27%
  CINCO: 8, // 5%
  DOS_CINCO: 9, // 2,5%
} as const

/** Porcentaje numérico de cada alícuota de IVA por su id AFIP. */
export const IVA_PCT: Record<number, number> = {
  3: 0,
  4: 10.5,
  5: 21,
  6: 27,
  8: 5,
  9: 2.5,
}

// ---- Condición frente al IVA del receptor (RG 5616, obligatorio desde 2025) ----
export const COND_IVA_RECEPTOR = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
  SUJETO_NO_CATEGORIZADO: 7,
  PROVEEDOR_EXTERIOR: 8,
  CLIENTE_EXTERIOR: 9,
  IVA_LIBERADO: 10,
  MONOTRIBUTO_SOCIAL: 13,
  MONOTRIBUTO_TRABAJADOR_INDEP: 16,
} as const

export function labelCondIva(id: number): string {
  const map: Record<number, string> = {
    1: "IVA Responsable Inscripto",
    4: "IVA Sujeto Exento",
    5: "Consumidor Final",
    6: "Responsable Monotributo",
    7: "Sujeto No Categorizado",
    8: "Proveedor del Exterior",
    9: "Cliente del Exterior",
    10: "IVA Liberado – Ley 19.640",
    13: "Monotributista Social",
    16: "Monotributo Trabajador Independiente Promovido",
  }
  return map[id] || `Condición ${id}`
}
