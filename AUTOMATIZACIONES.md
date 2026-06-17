# Automatizaciones — Motos Fernández

Mapa de TODAS las automatizaciones del proyecto (Next.js + Prisma + PostgreSQL/Neon,
deploy en Vercel). Pensado como referencia/ejemplo para replicar en otras webs.

> Stack: Next.js (App Router) · Prisma ORM · PostgreSQL (Neon) · Cloudinary (fotos/videos)
> · Meta Graph + Marketing API (IG/FB) · Mercado Libre API · Anthropic Claude API
> · MercadoPago · Resend (emails) · Vercel (deploy + crons).

---

## 1. Crons de Vercel (`vercel.json`)

Vercel ejecuta estos endpoints por HTTP según el `schedule` (cron). Cada uno
valida `Authorization: Bearer ${CRON_SECRET}`.

| Endpoint | Schedule | Qué hace |
|---|---|---|
| `/api/cron/publish-scheduled` | `*/5 * * * *` (cada 5 min) | Publica los posts programados a Instagram + Facebook cuando llega su hora. |
| `/api/cron/sync-ad-insights` | `0 */6 * * *` (cada 6 h) | Trae métricas de campañas/adsets/ads de Meta Ads y las cachea. |
| `/api/admin/backup` | `0 6 * * 1` (lun 6am) | Backup semanal de la DB. |
| `/api/admin/backup-sheets` | `0 7 * * *` (diario 7am) | Backup a Google Sheets. |
| `/api/admin/jobs/verificar-publicaciones` | `0 12 * * 1` (lun) | Verifica estado de publicaciones. |
| `/api/admin/jobs/generar-outreach` | `30 12 * * *` (diario) | Genera leads/outreach automáticos. |
| `/api/admin/jobs/cuotas-recordatorio` | `0 12 * * *` (diario) | Recordatorio de cuotas de financiación. |

**Patrón clave de cron seguro** (ver `src/app/api/cron/publish-scheduled/route.ts`):
- Auth por `CRON_SECRET`.
- Feature flag (`FEATURE_SCHEDULED_POSTS_ENABLED`) para activar/desactivar.
- **Optimistic locking** con `lockedAt`/`lockedBy` + timeout de 10 min para
  recuperar trabajos "zombie" sin duplicar.
- Batch chico (5 por corrida) para no superar `maxDuration` de Vercel (60s).
- Reintentos con `retryCount` y `MAX_RETRIES`.

---

## 2. Publicación automática a Instagram + Facebook

**Sistema de posts programados** (un "calendario" de publicaciones).

- **Modelo**: `ScheduledPost` (Prisma) — `motoId`, `scheduledAt`, `platforms` (IG/FB),
  `customCaption`, `status` (PENDING/PROCESSING/PUBLISHED/PARTIAL/FAILED/CANCELLED),
  `mediaType` (PHOTO_CAROUSEL/VIDEO/REEL), `videoUrls`, locking, `publishedRefs`.
- **Cron**: `src/app/api/cron/publish-scheduled/route.ts` (cada 5 min).
- **Publicación a Meta**: `src/lib/meta/publication.ts`
  - `publicarEnMeta()` — carrusel de fotos a IG + cross-post a FB.
  - `publicarVideoEnMeta()` — Reels / video feed.
  - `esperarMediaListo()` — polling del contenedor de IG (`status_code,status`).
    ⚠️ NO pedir `error_message` como campo del container: rompe TODA la
    publicación con `(#100) Tried accessing nonexisting field`.
- **CRUD + UI**: endpoints `src/app/api/admin/meta/scheduled/*`, pantalla
  `src/app/admin/(dashboard)/meta/calendario/` (lista + cancelar + crear).

**Control para el usuario**: Admin → Meta → Calendario. Muestra qué se va a
publicar y cuándo; permite cancelar y programar nuevos.

---

## 3. Meta Ads (Marketing API)

Jerarquía Campaign → AdSet → Ad → Creative. Todo en `src/lib/meta/ads.ts`.

- **Crear campaña** (`createCampaignInMeta`): requiere
  `special_ad_categories: ["NONE"]`, `buying_type: "AUCTION"`,
  `is_adset_budget_sharing_enabled: false`.
- **AdSet**: `bid_strategy: "LOWEST_COST_WITHOUT_CAP"` +
  `targeting_automation: { advantage_audience: 0 }`.
- **Creative**: usa `instagram_user_id` (v25, NO el legacy `instagram_actor_id`).
  - `crearAdCreative()` tiene **fallback**: si Meta rechaza con `100/1487194`
    (IG no vinculado a la ad account), reintenta SIN `instagram_user_id`.
  - Soporta foto (link_data), carrusel (child_attachments) y video/reel
    (sube a `/advideos` y usa `video_data`).
- **Insights**: `fetchCampaignInsights` + cron `sync-ad-insights` (cada 6h) cachean
  reach/impressions/clicks/ctr/cpc/spend por campaign/adset/ad.
- **UI**: wizard rápido + editor jerárquico con play/pause por AdSet/Ad y tabla
  comparativa de creativos (CTR/CPC). `src/app/admin/(dashboard)/meta/ads/`.

---

## 4. Mercado Libre (publicación + sync)

`src/lib/ml/` — `client.ts` (auth/refresh token), `publication.ts`
(publicar/pausar/despublicar). Al vender una moto se pausa el listing de ML
para que el cron lo despublique (no se llama la API de ML dentro de una
transacción).

---

## 5. IA — Anthropic Claude API

- **Specs técnicas automáticas**: `scripts/completar-specs-ia.cjs` (y
  `-todas.cjs`) + endpoint `src/app/api/admin/specs-ia/`. System prompt
  estricto: devuelve solo datos seguros en JSON, **nunca inventa**, omite lo
  dudoso. Idempotente (saltea las que ya tienen ≥3 specs), rate-limit 600ms.
- **Copy de avisos** (Meta Ads): `src/app/api/admin/meta/ads/suggest-caption/`.
- **Chatbot público + admin**: `src/app/api/chat/` y `src/app/api/admin/chat/`
  (el admin tiene tools para gestionar la DB).
- **Descripciones de productos**: `scripts/generar-descripciones.mjs`.

⚠️ En scripts: `require("dotenv").config({ path: ".env.local", override: true })`
— el `override:true` es CRÍTICO si la var existe vacía en el shell.

---

## 6. Cloudinary (fotos / videos)

- **Loader de next/image**: `src/lib/cloudinary-loader.ts` — arma el srcset
  apuntando directo a la CDN con `f_auto,q_auto,c_limit,w_X` (clave para LCP
  mobile y para no agotar la cuota del optimizador de Vercel).
- **Cartel VENDIDO automático**: `src/lib/sold-overlay.ts` — estampa una cinta
  "VENDIDO" sobre la primera foto vía transformación de Cloudinary, reversible
  y sin pérdida. Se dispara solo desde el flujo único de venta
  (`marcarModeloComoVendido` en `src/lib/venta-moto-helpers.ts`).
- **Upload firmado**: `src/app/api/admin/upload-sign/` + `video-upload.tsx`
  (bypassa el límite de 4.5MB/10s de Vercel subiendo directo a Cloudinary).

---

## 7. Seguridad de tokens

`src/lib/crypto/tokens.ts` — encripta tokens sensibles (Meta, ML) con
**AES-256-GCM** antes de guardarlos en la DB (prefijo `enc:v1:`). Clave maestra
en `META_TOKEN_ENCRYPTION_KEY` (base64 de 32 bytes).

---

## 8. Automatización de venta / stock

`src/lib/venta-moto-helpers.ts` — **fuente única de verdad** para "marcar como
vendida". Al concretarse una Orden de Compra / mandato / toggle manual:
- Modelo: `vendida=true`, `activo=false`, `fechaVenta`, cartel VENDIDO en la foto.
- Sincroniza mandato (estado VENDIDO) y pausa ML.
- Para 0KM: clona la unidad vendida (el modelo padre queda en stock).

El formulario de modelo crea con `activo=true` (publicado en catálogo) por defecto.

---

## 9. Scripts de operación (carpeta `scripts/`)

Operaciones batch reutilizables (idempotentes, con `--dry-run` varios):
- **Fotos**: `subir-fotos-*.cjs` (matcheo fuzzy archivo→modelo, colores con hex).
- **Modelos**: `crear-motos-0km-excel.cjs`, `crear-yamaha-competicion.cjs`.
- **Specs**: `completar-specs-ia*.cjs`.
- **Posts**: `programar-15-dias.cjs` (arma calendario de publicaciones).
- **Backups / migraciones**: `backup-clientes.mjs`, `restore-backup.mjs`,
  `migrar-adcampaigns-a-adsets.cjs`, `encriptar-tokens-meta.cjs`, etc.

---

## 10. Variables de entorno y feature flags

Ver `.env.example`. Flags importantes:
- `FEATURE_SCHEDULED_POSTS_ENABLED` — activa/desactiva la publicación automática.
- `FEATURE_META_ADS_ENABLED` — activa Meta Ads.
- `CRON_SECRET` — protege los endpoints de cron.
- `META_TOKEN_ENCRYPTION_KEY` — clave de encriptación de tokens.

> Los secretos reales (`.env.local`) NO están en este paquete por seguridad.
> Copiá `.env.example` a `.env.local` y completá los valores.
