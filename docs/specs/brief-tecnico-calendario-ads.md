# Brief técnico — Calendario de publicaciones + Meta Ads para `motosfernandez.com.ar/admin`

> **Para:** agente Claude Code que va a ejecutar la implementación.
> **De:** brief generado a partir de la spec de Francisco.
> **Stack actual confirmado:** Next.js 16 (App Router) + Prisma + Postgres (Neon) + Cloudinary + Meta Graph API v18.0.
> **Objetivo:** agregar dos features sin romper la integración orgánica que ya funciona.

---

## 0. Contexto y principios

### 0.1. Estado actual del sistema

- Admin tiene módulo `/admin/meta` con integración Graph API v18.0.
- Publica **carruseles en IG** y **fotos en FB** **on-demand** (no programado).
- Tabla `MetaConfig` ya guarda: `pageId`, `igUserId`, `pageAccessToken`, `igUsername`.
- Fotos en Cloudinary, transformadas on-the-fly a 1080×1080.
- 37 motos en catálogo, 14 publicadas, 23 sin publicar, 1 con error (huérfana).

### 0.2. Lo que se va a agregar

1. **Calendario de publicaciones programadas** (`/admin/meta/calendario`).
2. **Automatización de Meta Ads** (sub-módulo dentro de `/admin/meta`).

### 0.3. Principios no negociables

- **No romper el flujo orgánico actual.** El módulo existente sigue funcionando exactamente igual hasta que Francisco active los nuevos features.
- **Migración por fases con feature flags.** Cada fase es desplegable independientemente.
- **Idempotencia en el cron.** Si el cron corre dos veces sobre el mismo post programado, no se publica duplicado.
- **Borrador por defecto en ads.** Toda campaña creada arranca **PAUSADA** en Meta. Activación explícita por click de Francisco.
- **Honest logging.** Cada call a Meta queda registrada con request, response y timing.
- **Timezone consistente:** `America/Argentina/Buenos_Aires` en todo el sistema (cron, UI, DB en UTC).

### 0.4. Decisiones técnicas previas (resolver antes de codear)

Estas decisiones impactan el resto del brief. El agente debe confirmarlas con Francisco antes de arrancar:

1. **Actualización de API version: v18.0 → v25.0.**
   La v18.0 ya está cerca de deprecación (Meta soporta cada versión ~2 años). v25.0 es la actual desde el 18 feb 2026. La actualización de versión va en Fase 0, antes que cualquier feature nuevo, para no acumular cambios.

2. **Tipo de token para Ads: System User Token vs Page Access Token actual.**
   El estándar para automatización server-to-server es **System User Token**. Implica:
   - Crear un "System User" en Meta Business Manager.
   - Asignarle permisos al ad account.
   - Generar token que **no expira** (vs los 60 días del Page Token actual).
   - **Recomendación:** mantener el `pageAccessToken` actual para publicaciones orgánicas (no romper nada) y agregar un `adsSystemUserToken` separado para Marketing API. Dos tokens, dos responsabilidades.

3. **Modo de acceso de la app en Meta: Development vs Advanced.**
   Para que la Marketing API funcione en producción contra el ad account de Motos Fernández, la app necesita **Advanced Access** a `ads_management` y `ads_read`. Esto requiere **App Review + Business Verification de Meta** (~1-2 semanas). Conviene **arrancar el trámite ahora**, en paralelo al desarrollo, porque el dev en Development Mode sí puede testear contra el ad account propio sin review.

---

## 1. Cambios al schema de Prisma

### 1.1. Nuevos modelos

**`ScheduledPost`** — Posts programados para publicación orgánica.

Campos:
- `id` — cuid, PK.
- `motoId` — FK a `Moto` existente.
- `platforms` — array enum `[IG, FB]` (puede ser una o ambas).
- `scheduledAt` — `DateTime` en UTC. Cuándo se debe publicar.
- `customCaption` — `String?`. Si null, se autogenera desde la moto.
- `status` — enum: `PENDING`, `PROCESSING`, `PUBLISHED`, `PARTIAL` (publicó en una red, falló en otra), `FAILED`, `CANCELLED`.
- `publishedAt` — `DateTime?`. Cuándo se publicó efectivamente.
- `publishedRefs` — `Json?`. Estructura: `{ ig: { postId, permalink, publishedAt }, fb: { postId, permalink, publishedAt } }`.
- `errorMessage` — `String?`.
- `errorCode` — `Int?` (código Meta).
- `retryCount` — `Int @default(0)`.
- `lastAttemptAt` — `DateTime?`.
- `lockedAt` — `DateTime?`. Para idempotencia del cron (ver §5.3).
- `lockedBy` — `String?`. Identificador del worker que tomó el lock.
- `createdBy` — FK a `User`.
- `createdAt`, `updatedAt` — timestamps.

Índices:
- `(status, scheduledAt)` — para query del cron.
- `(motoId, scheduledAt)` — para evitar programar dos posts iguales muy cerca.

**`AdCampaign`** — Campañas de Meta Ads.

Campos:
- `id` — cuid, PK.
- `motoId` — FK a `Moto`.
- `name` — `String`. Auto-generado: `"MF — {marca} {modelo} {año} — {fechaInicio}"`.
- `objective` — enum: `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_AWARENESS` (usar nomenclatura nueva ODAX de Meta, no las legacy `BRAND_AWARENESS` etc).
- `metaCampaignId` — `String? @unique`. ID en Meta tras creación.
- `metaAdSetId` — `String? @unique`.
- `metaAdId` — `String? @unique`.
- `metaCreativeId` — `String?`.
- `dailyBudgetCents` — `Int`. En centavos de ARS para evitar floats.
- `startDate`, `endDate` — `DateTime`.
- `status` — enum: `DRAFT` (creada en DB, no enviada a Meta), `IN_META_PAUSED` (creada en Meta, pausada), `ACTIVE`, `PAUSED_BY_USER`, `PAUSED_BY_META`, `COMPLETED`, `FAILED`, `DELETED`.
- `audienceConfig` — `Json`. Estructura validada por Zod (ver §6.5).
- `creativeImageUrl` — `String`. URL Cloudinary 1080×1080.
- `creativeCaption` — `String`. Texto del ad.
- `creativeCallToAction` — enum: `LEARN_MORE`, `MESSAGE_PAGE`, `WHATSAPP_MESSAGE`, `GET_DIRECTIONS`, etc.
- `destinationUrl` — `String?`. URL de landing (ficha de moto en la web).
- `insightsCache` — `Json?`. Estructura: `{ reach, impressions, clicks, ctr, cpm, cpc, spend, results, costPerResult, syncedAt }`.
- `lastSyncedAt` — `DateTime?`.
- `errorMessage` — `String?`.
- `errorCode` — `Int?`.
- `createdBy` — FK a `User`.
- `createdAt`, `updatedAt`.

Índices:
- `(status, endDate)` — para detectar campañas que ya terminaron y marcarlas `COMPLETED`.
- `metaCampaignId` (único, ya queda como índice).

**`MetaApiLog`** — Log estructurado de calls a Meta (para debugging y auditoría).

Campos:
- `id` — cuid.
- `direction` — enum `OUTBOUND` / `INBOUND` (webhooks futuros).
- `endpoint` — `String`.
- `method` — `String`.
- `requestBody` — `Json?`. **Hashear o redactar el access_token antes de guardar.**
- `responseStatus` — `Int?`.
- `responseBody` — `Json?`.
- `durationMs` — `Int?`.
- `errorCode` — `Int?`.
- `errorSubcode` — `Int?`.
- `relatedScheduledPostId` — `String?`.
- `relatedAdCampaignId` — `String?`.
- `createdAt` — `DateTime @default(now())`.

**Retención:** TTL 30 días. Agregar job de limpieza semanal.

### 1.2. Modificaciones a modelos existentes

**`MetaConfig` — agregar campos:**

- `adAccountId` — `String?`. Format: `act_XXXXXXXXXX`.
- `adsSystemUserId` — `String?`.
- `adsSystemUserToken` — `String?` (encriptado en reposo, ver §1.3).
- `adsTokenScopes` — `Json?`. Array de scopes activos.
- `businessId` — `String?`. Meta Business Manager ID.
- `apiVersion` — `String @default("v25.0")`. Para poder rollear versiones futuras.
- `pixelId` — `String?`. Para tracking de conversiones desde ads.
- `metaCatalogId` — `String?`. Por si en fase 2 se sube al Catálogo de Vehicles.
- `lastTokenCheckAt` — `DateTime?`. Cuándo se verificó la validez del token por última vez.

**`Moto` — verificar que tenga (agregar si no):**

- `slug` — `String @unique` (ya parece estar: `mf002`, `benelli-leoncino-150-mv54`).
- `activeForMarketing` — `Boolean @default(true)`. Bandera para excluir motos de ads/posts sin darles de baja.
- `metaCatalogProductId` — `String?`. Para fase 2.

### 1.3. Encriptación de tokens

- Los tokens (`pageAccessToken`, `adsSystemUserToken`) deben estar **encriptados en reposo** usando una clave maestra en `META_TOKEN_ENCRYPTION_KEY` (env var).
- Usar `crypto` nativo de Node con AES-256-GCM.
- Crear helpers `encryptToken(plain)` y `decryptToken(cipher)` en `lib/crypto/tokens.ts`.
- **Si actualmente los tokens están en texto plano:** agregar una migración de datos que los encripte. No solo cambiar el schema.

---

## 2. Endpoints API a crear

Todos los endpoints van bajo `/api/admin/meta/` y requieren autenticación de admin (verificar middleware actual).

### 2.1. Calendario de publicaciones programadas

| Método | Path | Propósito |
|---|---|---|
| `GET` | `/api/admin/meta/scheduled` | Listar posts programados. Query params: `from`, `to`, `status`, `motoId`. |
| `POST` | `/api/admin/meta/scheduled` | Crear post programado. |
| `GET` | `/api/admin/meta/scheduled/[id]` | Detalle. |
| `PATCH` | `/api/admin/meta/scheduled/[id]` | Editar (mover fecha, cambiar caption). Solo si `status=PENDING`. |
| `DELETE` | `/api/admin/meta/scheduled/[id]` | Cancelar. Solo si `status=PENDING`. |
| `POST` | `/api/admin/meta/scheduled/[id]/publish-now` | Bypass cron, publicar inmediatamente. |
| `POST` | `/api/admin/meta/scheduled/[id]/retry` | Reintentar manualmente un `FAILED`. |
| `POST` | `/api/admin/meta/scheduled/bulk` | Crear varios de una (útil para campañas tipo "1 post por día durante 7 días"). |

### 2.2. Meta Ads

| Método | Path | Propósito |
|---|---|---|
| `GET` | `/api/admin/meta/campaigns` | Listar campañas. Filtros por status, motoId, fechas. |
| `POST` | `/api/admin/meta/campaigns` | Crear campaña en estado `DRAFT`. |
| `POST` | `/api/admin/meta/campaigns/[id]/publish` | Empujar `DRAFT` a Meta (crea campaign + adset + ad pausados allá). |
| `POST` | `/api/admin/meta/campaigns/[id]/activate` | Activar campaña pausada en Meta. **Requiere confirmación explícita.** |
| `POST` | `/api/admin/meta/campaigns/[id]/pause` | Pausar. |
| `GET` | `/api/admin/meta/campaigns/[id]` | Detalle + insights cacheados. |
| `POST` | `/api/admin/meta/campaigns/[id]/sync` | Forzar resync de insights desde Meta. |
| `PATCH` | `/api/admin/meta/campaigns/[id]` | Editar budget o end date (otros cambios requieren recrear). |
| `DELETE` | `/api/admin/meta/campaigns/[id]` | Soft delete + pausar en Meta. |
| `GET` | `/api/admin/meta/ad-account/info` | Trae info del ad account (balance, currency, moneda configurada). |
| `GET` | `/api/admin/meta/ad-account/targeting/search` | Proxy al search de intereses de Meta (para el `<AudienceBuilder />`). |

### 2.3. OAuth & configuración

| Método | Path | Propósito |
|---|---|---|
| `GET` | `/api/admin/meta/oauth/start` | Inicia OAuth con scopes extendidos. Query: `mode=ads` o `mode=full`. |
| `GET` | `/api/admin/meta/oauth/callback` | Callback. Guarda token y scopes. |
| `POST` | `/api/admin/meta/config/system-user/setup` | Setup wizard del System User token (instrucciones + validación). |
| `GET` | `/api/admin/meta/config/health` | Healthcheck: token vigente, scopes correctos, ad account accesible. Usado por el dashboard. |

### 2.4. Cron endpoints (privados, autenticados por `CRON_SECRET`)

| Método | Path | Propósito | Frecuencia |
|---|---|---|---|
| `GET` | `/api/cron/publish-scheduled` | Procesa `ScheduledPost` con `status=PENDING AND scheduledAt <= now()`. | Cada 5 min |
| `GET` | `/api/cron/sync-ad-insights` | Refresca `insightsCache` de campañas `ACTIVE`. | Cada 6 horas |
| `GET` | `/api/cron/check-token-health` | Verifica validez de tokens, alerta si vencen en < 7 días. | 1 vez por día |
| `GET` | `/api/cron/complete-finished-campaigns` | Marca como `COMPLETED` las que pasaron su `endDate`. | 1 vez por día |
| `GET` | `/api/cron/cleanup-orphan-posts` | Detecta posts huérfanos en Meta (como el error de Benelli) y los marca. | 1 vez por día |

---

## 3. Componentes UI a crear

### 3.1. Módulo Calendario (`/admin/meta/calendario`)

- **`<CalendarPageShell />`** — layout, header, navegación entre mes/semana.
- **`<CalendarView />`** — vista principal. Usar **`@dnd-kit/core` + librería de calendar** (recomendado: `react-big-calendar` o un calendar minimal custom, evitar FullCalendar que es pesado). Drag-and-drop para mover posts entre fechas.
- **`<ScheduledPostCard />`** — tarjeta visual del post en el calendario. Estados visuales por color (PENDING gris, PUBLISHED verde, FAILED rojo).
- **`<SchedulePostModal />`** — modal de creación/edición. Steps:
  1. Selección de moto (`<MotoSelector />` con búsqueda).
  2. Plataformas (`<PlatformToggle />` IG / FB / ambas).
  3. Fecha y hora (`<DateTimePicker />` con timezone AR).
  4. Caption (`<CaptionEditor />` con preview, sugerencias auto-generadas).
  5. Confirmación.
- **`<MotoSelector />`** — combobox con búsqueda fuzzy contra el catálogo.
- **`<CaptionEditor />`** — textarea con:
  - Contador de caracteres (límite IG: 2200).
  - Botón "Generar con IA" (placeholder, conectar después al módulo `Asistente IA` existente).
  - Preview del post como se vería en IG/FB.
- **`<BulkScheduleDialog />`** — crear varios posts: "esta moto, todos los lunes a las 10 AM durante 4 semanas".
- **`<FailedPostsAlert />`** — banner arriba si hay `FAILED` sin resolver.

### 3.2. Módulo Ads (`/admin/meta/ads`)

- **`<CampaignsListView />`** — tabla con: nombre, moto, status, budget, spend, ROAS, días corridos. Filtros + búsqueda.
- **`<CreateCampaignWizard />`** — wizard multi-step:
  1. **Moto** — selector.
  2. **Objetivo** — radio cards: Tráfico (a la ficha), Mensajes (WhatsApp), Engagement, Awareness.
  3. **Audiencia** — `<AudienceBuilder />`.
  4. **Presupuesto y fechas** — `<BudgetInput />` + date pickers.
  5. **Creativo** — selector de foto + editor de caption (reutiliza componente del calendario).
  6. **Preview & confirm** — preview tipo Meta Ads + costo estimado para el período.
- **`<AudienceBuilder />`** —
  - Rango etario (slider 18-65+, default 18-55).
  - Ubicación: selector con presets de Argentina (Bahía Blanca + radio, Provincia Bs As, Argentina, custom polygon).
  - Intereses: search con autocomplete contra `/api/admin/meta/ad-account/targeting/search`.
  - Estimación de alcance: muestra el "Estimated Daily Reach" de Meta en vivo (debounce de 1.5s sobre cambios).
- **`<BudgetInput />`** — input numérico ARS. Validaciones:
  - Mínimo: `META_MIN_DAILY_BUDGET_ARS` (env var, default `1000`).
  - Aviso si está bajo el mínimo recomendado para el objetivo.
  - Conversión a total estimado del período.
- **`<CampaignDetailView />`** — página de detalle:
  - Header con status + acciones (pausar/activar/duplicar/eliminar).
  - Tarjeta de insights con métricas principales.
  - Gráfico de spend vs results por día (recharts, usar la lib que ya esté en el proyecto).
  - Log de cambios de la campaña.
- **`<CampaignsDashboardWidget />`** — widget para el dashboard principal del admin: "Campañas activas: 3 | Spend hoy: $X | Total leads: Y".
- **`<ActivateCampaignDialog />`** — modal de confirmación con doble check antes de activar (resumen + checkbox "confirmo que revisé presupuesto y audiencia" + botón rojo).

### 3.3. Configuración (`/admin/meta/config`)

- **`<MetaConfigPanel />`** — refactor del panel actual para incluir:
  - Status del Page Token (existente).
  - Status del System User Token (nuevo).
  - Ad account conectado.
  - Scopes activos.
  - Botón "Reconectar con permisos de Ads".
- **`<SystemUserSetupWizard />`** — wizard que guía a Francisco paso a paso para crear el System User en Meta Business Manager y pegar el token. Con screenshots y validación al final.

---

## 4. Cron jobs

### 4.1. Configuración `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/sync-ad-insights", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/check-token-health", "schedule": "0 9 * * *" },
    { "path": "/api/cron/complete-finished-campaigns", "schedule": "30 0 * * *" },
    { "path": "/api/cron/cleanup-orphan-posts", "schedule": "0 4 * * *" }
  ]
}
```

> **Nota:** todas las schedules en UTC. Vercel cron está en UTC siempre. El `09:00 UTC` equivale a `06:00 AR` para `check-token-health` — eso pega antes de que Francisco entre a laburar y le da tiempo a reconectar si hace falta.

### 4.2. Plan Vercel y límites

- Verificar que el plan permite la cantidad de crons necesarios. Plan Hobby permite cron diario; Pro permite hasta cada minuto.
- **Si está en Hobby:** consolidar todos los crons en uno solo que se autoenrutee. Pero esto es subóptimo. Recomendar upgrade a Pro.

### 4.3. Handler de `publish-scheduled` — lógica detallada

```
1. Verificar header `Authorization: Bearer ${CRON_SECRET}`. Si no, 401.
2. Definir cutoff = ahora.
3. SELECT scheduledPosts WHERE
     status = 'PENDING'
     AND scheduledAt <= cutoff
     AND (lockedAt IS NULL OR lockedAt < cutoff - 10min)  // recuperar locks zombies
   LIMIT 20  (procesar en batches para no exceder timeout)
4. Para cada post:
   a. UPDATE SET lockedAt = now(), lockedBy = workerId, status = 'PROCESSING'
      WHERE id = X AND lockedAt = oldValue  (optimistic locking)
   b. Si el UPDATE no afectó filas, otro worker lo agarró. Saltar.
   c. Verificar que la moto sigue `activeForMarketing = true`. Si no, status=CANCELLED.
   d. Verificar token vigente (si falla, status=FAILED con mensaje claro).
   e. Para cada plataforma en el post:
       - IG: hacer flujo de carrusel (containers → publish).
       - FB: hacer flujo de foto.
       - Guardar postId, permalink en publishedRefs.
   f. Si ambas OK: status=PUBLISHED, publishedAt=now().
   g. Si una OK y otra falla: status=PARTIAL.
   h. Si ambas fallan: status=FAILED, retryCount++.
   i. Si retryCount >= 3: dejar en FAILED, no reintentar más.
5. Loggear cada call en MetaApiLog.
6. Return JSON con counts: {processed, succeeded, partial, failed}.
```

### 4.4. Timeout y batching

- Vercel serverless: timeout default 10s en Hobby, 60s en Pro, hasta 300s en configs especiales.
- Cada publicación a Meta puede tardar 2-5s. Procesar en batches chicos (5-10 posts por ejecución) para no timeoutear.
- Si quedan posts sin procesar, el próximo cron los toma.

---

## 5. Scopes nuevos de Meta OAuth

### 5.1. Scopes actuales (probables, validar)

`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.

### 5.2. Scopes a agregar para Ads

- **`ads_management`** — crear, editar, pausar campañas, ad sets, ads.
- **`ads_read`** — leer insights, métricas.
- **`pages_manage_ads`** — necesario para crear ads que linkeen a la página.
- **`read_insights`** — métricas de página y post (útil también para el orgánico).
- **`leads_retrieval`** — si en el futuro se usan Lead Ads.

### 5.3. Estrategia OAuth

**Opción A — Reconexión única con todos los scopes (recomendada):**
- Implementar un nuevo flow OAuth que pida todos los scopes (existentes + nuevos).
- UI clara: "Para habilitar el módulo de Ads, necesitamos que reconectes tu cuenta de Meta. Va a pedirte permisos adicionales."
- Mantener compatibilidad: el módulo orgánico actual sigue funcionando con el token nuevo (es superset de scopes).
- Una sola reconexión, fin.

**Opción B — Mantener Page Token para orgánico + System User Token aparte para ads:**
- Page Token (con scopes actuales) → publicaciones orgánicas. Sin cambios.
- System User Token (configurado manualmente por Francisco en Meta Business Manager) → Marketing API.
- **Ventaja:** System User Token no expira nunca, es ideal para producción.
- **Desventaja:** Francisco tiene que hacer setup manual una vez en Meta Business Manager.

**Recomendación: arrancar con Opción A** (más simple, menos fricción) y migrar a Opción B en una fase posterior si el token de 60 días genera molestia.

---

## 6. Variables de entorno nuevas

```bash
# Meta — versionado
META_API_VERSION=v25.0
META_APP_ID=...                    # ya existente probablemente
META_APP_SECRET=...                # ya existente
META_OAUTH_REDIRECT_URI=https://motosfernandez.com.ar/api/admin/meta/oauth/callback

# Encriptación de tokens (NUEVA, crítica)
META_TOKEN_ENCRYPTION_KEY=...      # 32 bytes random base64. Generar con `openssl rand -base64 32`.

# Cron
CRON_SECRET=...                    # bearer token para autenticar Vercel cron. Generar con openssl.

# Ads (defaults configurables)
META_MIN_DAILY_BUDGET_ARS=1000     # ajustar según mínimo real de Meta para AR
META_DEFAULT_AGE_MIN=18            # nunca menos por regulación moto
META_DEFAULT_AGE_MAX=55
META_DEFAULT_GEO_RADIUS_KM=80      # radio default desde Bahía Blanca

# Locale & timezone
TZ=America/Argentina/Buenos_Aires
DEFAULT_CURRENCY=ARS

# Feature flags (NUEVAS)
FEATURE_SCHEDULED_POSTS_ENABLED=false   # arranca apagado, se prende cuando esté testeado
FEATURE_META_ADS_ENABLED=false          # idem

# Alertas (opcional pero recomendado)
ADMIN_ALERT_EMAIL=fran@motosfernandez.com.ar
SLACK_WEBHOOK_URL=...                   # opcional, para alertas críticas
```

---

## 7. Plan de migración (fase por fase)

### Fase 0 — Pre-trabajo (sin código nuevo)

**Duración estimada:** 2-3 días + tiempo de Meta App Review en paralelo.

1. Iniciar trámite de **Business Verification + App Review** en Meta (ads_management, ads_read).
2. Actualizar dependencia de Meta API client (si usa SDK) o helpers HTTP a `v25.0`.
3. **Smoke test del flujo orgánico actual con v25.0** antes de seguir. Si rompe algo, parar y arreglar.
4. Generar `META_TOKEN_ENCRYPTION_KEY` y `CRON_SECRET`, cargarlos en Vercel.
5. Implementar helpers `encryptToken` / `decryptToken` + migración que encripta el `pageAccessToken` actual.

**Checkpoint:** todo el flujo orgánico actual sigue funcionando con v25.0 y tokens encriptados.

### Fase 1 — Schema

**Duración:** 1 día.

1. Crear migración Prisma con: `ScheduledPost`, `AdCampaign`, `MetaApiLog`, nuevos campos en `MetaConfig` y `Moto`.
2. **No ejecutar nada en prod aún.** Aplicar primero en dev/staging.
3. Validar con queries manuales que los modelos quedaron bien.
4. Deploy a prod en ventana de baja carga (lunes 8 AM, antes de que Francisco entre).

**Checkpoint:** schema desplegado, app sigue funcionando idéntico (los nuevos modelos están vacíos).

### Fase 2 — Re-OAuth con scopes nuevos

**Duración:** 2 días.

1. Implementar nuevo flow OAuth con scopes extendidos.
2. UI en `/admin/meta/config` con CTA "Habilitá las nuevas funciones — reconectá tu cuenta de Meta".
3. Mantener el path viejo funcionando hasta que Francisco haga la reconexión.
4. Una vez reconectado, validar que `ads_management` y `ads_read` están en `adsTokenScopes`.

**Checkpoint:** Francisco reconectó, scopes nuevos disponibles, flujo orgánico sigue funcionando.

### Fase 3 — Calendario (feature flag OFF en prod)

**Duración:** 1 semana.

1. Endpoints CRUD de `ScheduledPost`.
2. Cron `publish-scheduled` (con feature flag, no se ejecuta si está OFF).
3. UI del calendario.
4. Tests:
   - Programar un post a 5 minutos en el futuro → verificar que se publica.
   - Programar y cancelar antes de la hora → verificar que NO se publica.
   - Forzar token vencido → verificar que el post queda FAILED con mensaje claro.
   - Programar 5 posts a la misma hora → verificar batching del cron.

**Checkpoint:** feature flag ON en prod. Francisco programa el primer post real.

### Fase 4 — Meta Ads (feature flag OFF en prod)

**Duración:** 2 semanas.

1. Helpers para Marketing API (`createCampaign`, `createAdSet`, `createAd`, etc).
2. Endpoints CRUD de `AdCampaign`.
3. UI: list view, wizard, detail view.
4. Cron `sync-ad-insights`.
5. **Tests críticos:**
   - Crear campaña en `DRAFT` → no llega nada a Meta.
   - Publicar → llega a Meta en estado pausado.
   - Activar → arranca.
   - Pausar → se pausa.
   - Forzar audiencia inválida → error claro al usuario.
   - Presupuesto bajo el mínimo → bloqueado en UI antes de llegar a Meta.

**Checkpoint:** feature flag ON. Francisco crea su primera campaña real con presupuesto chico (ej $2000/día) para una sola moto.

### Fase 5 — Hardening y monitoreo

**Duración:** 1 semana.

1. Cron `check-token-health` con alertas por email/Slack.
2. Dashboard de salud del sistema (uptime, error rate, tokens próximos a vencer).
3. Documentación interna en `/admin/meta/docs` o README.
4. Limpieza del error de Benelli (huérfano detectado en el dashboard actual).

---

## 8. Validaciones y manejo de errores

### 8.1. Validaciones en `<SchedulePostModal />` (antes de POST)

- Moto seleccionada y `activeForMarketing = true`.
- Al menos una plataforma seleccionada.
- `scheduledAt` > now + 5 minutos (para dar margen al cron).
- `scheduledAt` < now + 6 meses (límite arbitrario para evitar olvidos).
- Caption ≤ 2200 chars.
- Moto tiene al menos 1 foto subida.
- No hay otro `ScheduledPost` PENDING para la misma moto en las próximas 4 horas (configurable).

### 8.2. Validaciones en `<CreateCampaignWizard />` (antes de POST)

- Moto activa, con stock > 0, con al menos 1 foto.
- Objetivo seleccionado.
- Audiencia:
  - `ageMin` ≥ 18.
  - `ageMax` ≤ 65.
  - Al menos 1 ubicación geográfica.
- Presupuesto diario ≥ `META_MIN_DAILY_BUDGET_ARS`.
- `startDate` ≥ now + 15 minutos (Meta requiere lead time).
- `endDate` > `startDate`.
- Duración mínima: 24 horas (Meta lo exige para algunos objetivos).
- Caption ≤ 2200 chars y ≤ 125 chars para "title" si aplica al placement.
- CTA seleccionado, coherente con el objetivo.

### 8.3. Códigos de error de Meta — tabla de manejo

| Código | Subcode | Significado | UX |
|---|---|---|---|
| 190 | — | Token inválido o expirado | Banner global: "Tu conexión con Meta expiró. Reconectá." + botón. Pausar todos los crons hasta resolución. |
| 100 | 33 | Object doesn't exist | Marcar como huérfano. No reintentar. Avisar en dashboard. |
| 100 | otros | Bad parameter | Loggear request completo. Mostrar mensaje técnico al admin con link al log. |
| 4 | — | Rate limit (App-level) | Backoff exponencial: 30s, 2min, 10min, 60min. Máximo 4 retries. |
| 17 | — | Rate limit (User-level) | Idem. |
| 200 | — | Permission denied | Verificar scopes. UI: "Tu cuenta no tiene los permisos necesarios. Reconectá con todos los scopes." |
| 2635 | — | Targeting spec invalid | UI: "Tu audiencia es muy específica o tiene parámetros incompatibles. Probá ampliar el rango etario o agregar ubicaciones." |
| 1487749 | — | Ad account billing issue | UI: "Tu cuenta de Meta Ads no tiene método de pago configurado o tiene un saldo pendiente. Resolvé desde Meta Business Suite." |
| 1487048 | — | Daily budget too low | UI: "El presupuesto diario es menor al mínimo de Meta ($X ARS). Subilo." |
| 1487066 | — | End time before start | Validación frontend, no debería llegar acá. |
| 1815115 | — | Unsupported request (Advantage+ deprecated) | Caer a campaign tradicional. Loggear. |
| 368 | — | Action attempted blocked | Probable violación de política. UI: "Meta bloqueó esta acción. Revisá las políticas de contenido." |
| 506 | — | Duplicate post | Idempotencia funcionó al revés: marcar como PUBLISHED si ya está publicado. |
| 9004 | — | No permission to publish to user | Revisar que el `igUserId` y `pageId` siguen siendo válidos. |

### 8.4. Errores propios del sistema

- **DB connection lost durante publicación:** marcar post en `lockedAt` antiguo se libera con el recover en el próximo cron.
- **Cloudinary 4xx en la URL de la foto:** marcar campaña/post como FAILED con mensaje "La imagen no está disponible. Re-subila."
- **Vercel timeout:** procesar menos posts por batch.

### 8.5. Alertas críticas (al admin)

Disparar email o Slack cuando:
- Token vence en < 7 días.
- 3+ posts seguidos en `FAILED` con mismo error code.
- Cron no corre por > 30 min (deadman switch).
- Spend diario de una campaña > 2x el `dailyBudgetCents` (anomalía).
- Cualquier error 190 (token).

---

## 9. Testing

### 9.1. Unit tests obligatorios

- Helpers de Meta API (mockear fetch, testear cada caso de error de §8.3).
- `encryptToken` / `decryptToken` (roundtrip).
- Validaciones de Zod para `audienceConfig`, `ScheduledPost`, `AdCampaign`.

### 9.2. Integration tests

- Flow completo del cron `publish-scheduled` con DB en memoria.
- Optimistic locking: simular dos workers tomando el mismo post → solo uno lo procesa.

### 9.3. E2E test sugerido (Playwright)

- Login admin → crear post programado → mockear el cron → ver post en PUBLISHED → cancelar otro pendiente.

---

## 10. Roadmap futuro (no implementar ahora, dejar anotado)

1. **Catálogo de Vehicles en Meta + Dynamic Product Ads.** Auto-sincronizar las 37 motos al Catalog de Meta. Crear DPA que se actualizan solos.
2. **A/B testing de creativos.** Generar 2-3 variantes de caption con IA y comparar performance.
3. **Auto-pause de campañas con mala performance.** Si CPA > X o frecuencia > 3, pausar automáticamente.
4. **Integración con el módulo "Asistente IA" del admin.** Que sugiera qué motos promocionar según stock + leads + temporada.
5. **Reporting semanal automático.** Email los lunes con resumen de la semana anterior (posts publicados, campañas activas, métricas, top performers).
6. **Migración a System User Token** si los renewals de 60 días se vuelven una molestia.

---

## 11. Checklist de arranque para el agente

Antes de empezar a codear, el agente Claude Code debe:

- [ ] Confirmar versión actual de Graph API en uso (verificar en el código actual).
- [ ] Confirmar plan de Vercel (Hobby vs Pro) — afecta los crons.
- [ ] Listar dependencias actuales de `package.json` relevantes (Prisma version, calendario lib si hay, validación lib).
- [ ] Verificar si los tokens en `MetaConfig` están en texto plano o ya encriptados.
- [ ] Confirmar con Francisco si arranca con Opción A (re-OAuth único) u Opción B (System User aparte).
- [ ] Confirmar con Francisco si inicia el trámite de Business Verification (sino, queda restringido a Development Mode).
- [ ] Validar timezone del servidor Vercel y del Postgres Neon.

Una vez todo eso confirmado: **arrancar por Fase 0**, no saltearse el smoke test post-upgrade de API version.

---

**Fin del brief.**
