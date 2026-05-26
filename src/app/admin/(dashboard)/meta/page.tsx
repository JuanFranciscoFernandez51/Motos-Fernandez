import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getMetaStatus } from "@/lib/meta/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Megaphone,
} from "lucide-react"
import { InstagramIcon, FacebookIcon } from "@/components/icons/social"
import { formatDate, formatMoney } from "@/lib/admin-helpers"
import { MetaPublishButton } from "./publish-button"
import { MetaClearErrorsButton } from "./clear-errors-button"
import { MetaBulkPublishButton } from "./bulk-publish-button"

export const dynamic = "force-dynamic"

export default async function MetaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { ok, error } = await searchParams
  const status = await getMetaStatus()

  const motos = await prisma.modelo.findMany({
    where: { activo: true, vendida: false },
    orderBy: [{ igPostId: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      nombre: true,
      marca: true,
      anio: true,
      precio: true,
      moneda: true,
      igPostId: true,
      igPermalink: true,
      fbPostId: true,
      fbPermalink: true,
      igUltimaSync: true,
      igError: true,
      fotos: true,
    },
  })

  const publicadas = motos.filter((m) => m.igPostId)
  const sinPublicar = motos.filter((m) => !m.igPostId)
  const conError = motos.filter((m) => m.igError)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <InstagramIcon className="size-6 text-pink-500" />
          Instagram + Facebook
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Publicaciones automáticas en IG (carrusel) y Facebook Page.
        </p>
      </div>

      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-300">¡Conexión exitosa!</p>
            <p className="text-sm text-green-800 dark:text-green-300/80">
              La cuenta de Meta se vinculó correctamente.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Error al conectar</p>
            <p className="text-sm text-red-800 dark:text-red-300/80 break-all">{error}</p>
          </div>
        </div>
      )}

      {/* Conexión */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de la conexión</CardTitle>
        </CardHeader>
        <CardContent>
          {!status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                <AlertCircle className="size-5" />
                <span className="font-medium">No conectado a Meta</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Para publicar motos en IG/FB hace falta conectar la página de
                Facebook (debe tener la cuenta de Instagram Business vinculada).
                Hacé click abajo y aprobá los permisos en la pantalla de Facebook.
              </p>
              <Button
                render={<a href="/api/admin/meta/connect" />}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
              >
                <InstagramIcon className="size-4 mr-2" />
                Conectar Facebook + Instagram
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                <CheckCircle2 className="size-5" />
                <span className="font-medium">Conectado como {status.userName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FacebookIcon className="size-3" />
                    Página FB
                  </p>
                  <p>{status.pageName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <InstagramIcon className="size-3" />
                    Cuenta IG
                  </p>
                  <p>@{status.igUsername || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Token vence</p>
                  <p className="text-xs">
                    {status.expiresAt ? formatDate(status.expiresAt) : "—"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<a href="/api/admin/meta/connect" />}
                className="text-xs"
              >
                <RefreshCw className="size-3 mr-1.5" />
                Reconectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banner Ads — informativo. Meta Ads requiere habilitar Marketing
          API en la app de Meta antes de poder pedir los scopes. Mientras
          tanto, el módulo de Calendario sí funciona con los scopes
          orgánicos que ya tenés. */}
      {status.connected && !status.adsReady && (
        <Card className="border-[#6B4F7A]/40 bg-gradient-to-r from-[#6B4F7A]/10 via-purple-50/40 to-transparent dark:from-[#6B4F7A]/20 dark:via-purple-950/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="size-10 rounded-full bg-[#6B4F7A]/15 flex items-center justify-center shrink-0">
                <Sparkles className="size-5 text-[#6B4F7A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2 flex-wrap">
                  Meta Ads — habilitación pendiente
                  <Badge variant="secondary" className="bg-[#6B4F7A]/15 text-[#6B4F7A] text-[10px] font-bold">
                    BLOQUEADO POR META
                  </Badge>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Para crear campañas pagas desde acá, la app de Meta
                  necesita tener <strong>Marketing API</strong> agregada
                  como producto y los scopes (
                  <code className="text-[10px]">ads_management</code>,{" "}
                  <code className="text-[10px]">ads_read</code>) aprobados.
                  Sin eso, Meta los rechaza con &quot;Invalid Scopes&quot;.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                  <strong>Pasos:</strong> entrá a{" "}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6B4F7A] underline font-medium"
                  >
                    developers.facebook.com/apps
                  </a>{" "}
                  → tu app &quot;Motos Fernandez admin&quot; → Add Product
                  → <strong>Marketing API</strong> → completá Business
                  Verification + App Review (1-2 semanas). Cuando esté
                  aprobado, tocás &quot;Reconectar con Ads&quot; abajo y
                  Meta te deja autorizar los scopes nuevos.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                  Mientras tanto, el módulo de <strong>Calendario de
                  publicaciones</strong> (Fase 3) sí va a funcionar con
                  los scopes orgánicos que ya tenés. Lo arrancamos en
                  paralelo.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                render={<a href="/api/admin/meta/connect?withAds=1" />}
                className="border-[#6B4F7A] text-[#6B4F7A] hover:bg-[#6B4F7A]/10 shrink-0"
                title="Solo tocar después de habilitar Marketing API en Meta App Dashboard"
              >
                <Megaphone className="size-4 mr-1.5" />
                Reconectar con Ads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status.connected && status.adsReady && (
        <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" />
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
              Meta Ads habilitado ✓
            </span>
            <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70 ml-1">
              ({status.scopesGuardados.length} scopes activos)
            </span>
          </CardContent>
        </Card>
      )}

      {status.connected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total catálogo" value={motos.length} color="text-gray-700" />
          <StatCard label="Publicadas" value={publicadas.length} color="text-green-700 dark:text-green-300" />
          <StatCard label="Sin publicar" value={sinPublicar.length} color="text-blue-700 dark:text-blue-300" />
          <StatCard label="Con error" value={conError.length} color="text-red-700 dark:text-red-300" />
        </div>
      )}

      {/* Errores */}
      {conError.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-red-700 dark:text-red-300">
                Motos con error en la última publicación ({conError.length})
              </CardTitle>
              <MetaClearErrorsButton count={conError.length} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conError.map((m) => (
                <div key={m.id} className="rounded border border-red-200 bg-red-50 dark:bg-red-950/30 p-3">
                  <Link href={`/admin/modelos/${m.id}`} className="font-medium text-sm hover:underline">
                    {m.marca} {m.nombre}{m.anio ? ` ${m.anio}` : ""} <span className="font-mono text-xs text-gray-500 dark:text-gray-400">({m.slug})</span>
                  </Link>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-all">{m.igError}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {status.connected && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Motos del catálogo</CardTitle>
              {sinPublicar.length > 0 && (
                <MetaBulkPublishButton
                  pendientes={sinPublicar.map((m) => ({
                    id: m.id,
                    marca: m.marca,
                    nombre: m.nombre,
                    anio: m.anio,
                  }))}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr className="border-b">
                    <th className="text-left px-2 py-2">Moto</th>
                    <th className="text-right px-2 py-2">Precio</th>
                    <th className="text-left px-2 py-2">Estado</th>
                    <th className="text-left px-2 py-2">Última pub.</th>
                    <th className="text-right px-2 py-2 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {motos.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 dark:border-neutral-900 last:border-0">
                      <td className="px-2 py-2">
                        <Link href={`/admin/modelos/${m.id}`} className="hover:underline">
                          <p className="font-medium">{m.marca} {m.nombre}{m.anio ? ` ${m.anio}` : ""}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{m.slug}</p>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {m.precio ? formatMoney(m.precio, m.moneda) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {m.igPostId ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            Publicada
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No publicada</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {m.igUltimaSync ? formatDate(m.igUltimaSync) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {m.igPermalink && (
                            <a
                              href={m.igPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center size-7 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                              title="Ver en Instagram"
                            >
                              <InstagramIcon className="size-3.5" />
                            </a>
                          )}
                          {m.fbPermalink && (
                            <a
                              href={m.fbPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center size-7 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                              title="Ver en Facebook"
                            >
                              <FacebookIcon className="size-3.5" />
                            </a>
                          )}
                          <MetaPublishButton modeloId={m.id} yaPublicada={!!m.igPostId} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm">
        <p className="font-semibold mb-2">📌 Cómo funciona</p>
        <ul className="space-y-1 text-blue-900 dark:text-blue-300/80 list-disc list-inside">
          <li>El caption se genera con IA (marca, modelo, año, precio, hashtags relevantes).</li>
          <li>En Instagram se publica un <strong>carrusel</strong> con hasta 10 fotos.</li>
          <li>En Facebook se hace cross-post de la primera foto + caption.</li>
          <li>Si la moto ya estaba publicada, podés crear un POST NUEVO con el botón ↺ (el viejo queda igual).</li>
          <li>Por ahora el bot funciona en modo desarrollador — solo el admin que creó la app puede publicar.</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
