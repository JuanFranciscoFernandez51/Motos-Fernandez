import { z } from "zod"

/**
 * Validación + tipos compartidos para ScheduledPost. Centralizado para
 * que la UI, los endpoints y el cron usen exactamente el mismo contrato.
 */

export const PLATFORMS = ["IG", "FB"] as const
export type Platform = (typeof PLATFORMS)[number]

export const SCHEDULED_POST_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PUBLISHED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const
export type ScheduledPostStatus = (typeof SCHEDULED_POST_STATUSES)[number]

/**
 * Reglas de validación al crear:
 * - scheduledAt > ahora + 5 min (margen para el cron de 5 min).
 * - scheduledAt < ahora + 6 meses (límite arbitrario para evitar olvidos).
 * - Al menos una plataforma.
 * - Caption ≤ 2200 (límite de IG).
 */
const MIN_LEAD_TIME_MIN = 5
const MAX_FUTURE_MONTHS = 6
const CAPTION_MAX = 2200

export const MEDIA_TYPES = ["PHOTO_CAROUSEL", "VIDEO", "REEL"] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const scheduledPostCreateSchema = z
  .object({
    motoId: z.string().min(1, "motoId requerido"),
    platforms: z
      .array(z.enum(PLATFORMS))
      .min(1, "Elegí al menos una plataforma"),
    scheduledAt: z.coerce.date(),
    customCaption: z
      .string()
      .max(CAPTION_MAX, `Caption máximo ${CAPTION_MAX} chars`)
      .optional()
      .nullable(),
    mediaType: z.enum(MEDIA_TYPES).default("PHOTO_CAROUSEL"),
    // URL(s) de Cloudinary. Para VIDEO/REEL es obligatorio al menos 1.
    videoUrls: z.array(z.string().url()).default([]),
    customFotos: z.array(z.string().url()).default([]),
  })
  .refine(
    (d) => {
      if (d.mediaType === "VIDEO" || d.mediaType === "REEL") {
        return d.videoUrls.length >= 1
      }
      return true
    },
    {
      message: "VIDEO y REEL requieren al menos una URL en videoUrls",
      path: ["videoUrls"],
    }
  )
  .refine(
    (data) => {
      const ahora = Date.now()
      const minimo = ahora + MIN_LEAD_TIME_MIN * 60 * 1000
      return data.scheduledAt.getTime() >= minimo
    },
    {
      message: `La fecha debe ser al menos ${MIN_LEAD_TIME_MIN} min en el futuro (para que el cron lo agarre)`,
      path: ["scheduledAt"],
    }
  )
  .refine(
    (data) => {
      const ahora = Date.now()
      const tope = ahora + MAX_FUTURE_MONTHS * 30 * 24 * 60 * 60 * 1000
      return data.scheduledAt.getTime() <= tope
    },
    {
      message: `Máximo ${MAX_FUTURE_MONTHS} meses en el futuro`,
      path: ["scheduledAt"],
    }
  )

export type ScheduledPostCreateInput = z.infer<typeof scheduledPostCreateSchema>

/**
 * Update parcial. Solo se permite cuando el post sigue PENDING — si ya
 * está PROCESSING/PUBLISHED no tiene sentido. El endpoint valida el
 * estado antes de aplicar.
 */
export const scheduledPostPatchSchema = z
  .object({
    platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
    scheduledAt: z.coerce.date().optional(),
    customCaption: z.string().max(CAPTION_MAX).nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.scheduledAt) return true
      return (
        data.scheduledAt.getTime() >=
        Date.now() + MIN_LEAD_TIME_MIN * 60 * 1000
      )
    },
    {
      message: `La nueva fecha debe ser ≥ ahora + ${MIN_LEAD_TIME_MIN} min`,
      path: ["scheduledAt"],
    }
  )

export type ScheduledPostPatchInput = z.infer<typeof scheduledPostPatchSchema>

/**
 * Bulk: crear varios posts de la misma moto en una grilla recurrente.
 * Ej: "esta moto, todos los lunes a las 10 AM durante 4 semanas".
 */
export const scheduledPostBulkSchema = z.object({
  motoId: z.string().min(1),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  // Lista explícita de fechas a programar — el cliente las calcula
  // según el patrón elegido (semanal/diario/etc). Server las valida
  // contra MIN_LEAD_TIME_MIN y MAX_FUTURE_MONTHS.
  fechas: z.array(z.coerce.date()).min(1).max(50),
  customCaption: z.string().max(CAPTION_MAX).nullable().optional(),
})

export type ScheduledPostBulkInput = z.infer<typeof scheduledPostBulkSchema>

/**
 * Filtro de la lista (query string del GET).
 */
export const scheduledPostListSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(SCHEDULED_POST_STATUSES).optional(),
  motoId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(100),
})

export type ScheduledPostListInput = z.infer<typeof scheduledPostListSchema>
