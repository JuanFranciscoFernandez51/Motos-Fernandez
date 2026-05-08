import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getMLStatus } from "@/lib/ml/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Link as LinkIcon, ExternalLink, RefreshCw } from "lucide-react"
import { formatDate, formatMoney } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function MLAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { ok, error } = await searchParams
  const status = await getMLStatus()

  // Lista de motos con estado de ML
  const motos = await prisma.modelo.findMany({
    where: { activo: true, vendida: false },
    orderBy: [{ mlListingId: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      nombre: true,
      marca: true,
      precio: true,
      moneda: true,
      mlListingId: true,
      mlPermalink: true,
      mlEstado: true,
      mlUltimaSync: true,
      mlError: true,
      fotos: true,
    },
  })

  const publicadas = motos.filter((m) => m.mlListingId && m.mlEstado === "active")
  const pausadas = motos.filter((m) => m.mlListingId && m.mlEstado === "paused")
  const cerradas = motos.filter((m) => m.mlListingId && m.mlEstado === "closed")
  const sinPublicar = motos.filter((m) => !m.mlListingId)
  const conError = motos.filter((m) => m.mlError)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LinkIcon className="size-6 text-[#FFE600]" />
          Mercado Libre
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sincronización del catálogo con tu cuenta de Mercado Libre Argentina.
        </p>
      </div>

      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-300">¡Conexión exitosa!</p>
            <p className="text-sm text-green-800 dark:text-green-300/80">
              La cuenta de Mercado Libre se vinculó correctamente.
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

      {/* Estado de la conexión */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de la conexión</CardTitle>
        </CardHeader>
        <CardContent>
          {!status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                <AlertCircle className="size-5" />
                <span className="font-medium">No conectado a Mercado Libre</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Para empezar a publicar motos en ML, necesitás autorizar la app
                con tu cuenta. Hacé click en el botón de abajo y aprobá los
                permisos en la pantalla de Mercado Libre.
              </p>
              <Button render={<a href="/api/admin/ml/connect" />} className="bg-[#FFE600] text-[#2D3277] hover:bg-[#fff04d]">
                Conectar mi cuenta de Mercado Libre
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                <CheckCircle2 className="size-5" />
                <span className="font-medium">Conectado como {status.nickname || status.userId}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Usuario ML</p>
                  <p className="font-mono">{status.nickname || status.userId}</p>
                </div>
                {status.email && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Email</p>
                    <p>{status.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Token vence</p>
                  <p className="text-xs">{status.expiresAt ? formatDate(status.expiresAt) : "—"}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<a href="/api/admin/ml/connect" />}
                className="text-xs"
              >
                <RefreshCw className="size-3 mr-1.5" />
                Reconectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {status.connected && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total catálogo" value={motos.length} color="text-gray-700" />
          <StatCard label="Publicadas" value={publicadas.length} color="text-green-700 dark:text-green-300" />
          <StatCard label="Pausadas" value={pausadas.length} color="text-amber-700 dark:text-amber-300" />
          <StatCard label="Cerradas" value={cerradas.length} color="text-gray-500 dark:text-gray-400" />
          <StatCard label="Sin publicar" value={sinPublicar.length} color="text-blue-700 dark:text-blue-300" />
        </div>
      )}

      {/* Errores */}
      {conError.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300">Motos con error en la última sincronización ({conError.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conError.map((m) => (
                <div key={m.id} className="rounded border border-red-200 bg-red-50 dark:bg-red-950/30 p-3">
                  <Link href={`/admin/modelos/${m.id}`} className="font-medium text-sm hover:underline">
                    {m.marca} {m.nombre} <span className="font-mono text-xs text-gray-500 dark:text-gray-400">({m.slug})</span>
                  </Link>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-all">{m.mlError}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de motos con su estado en ML */}
      {status.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Motos del catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr className="border-b">
                    <th className="text-left px-2 py-2">Moto</th>
                    <th className="text-right px-2 py-2">Precio</th>
                    <th className="text-left px-2 py-2">Estado ML</th>
                    <th className="text-left px-2 py-2">Última sync</th>
                    <th className="text-right px-2 py-2 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {motos.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 dark:border-neutral-900 last:border-0">
                      <td className="px-2 py-2">
                        <Link href={`/admin/modelos/${m.id}`} className="hover:underline">
                          <p className="font-medium">{m.marca} {m.nombre}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{m.slug}</p>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {m.precio ? formatMoney(m.precio, m.moneda) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {m.mlListingId ? (
                          <Badge variant="secondary" className={
                            m.mlEstado === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : m.mlEstado === "paused"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300"
                          }>
                            {m.mlEstado === "active" ? "Activa" : m.mlEstado === "paused" ? "Pausada" : m.mlEstado === "closed" ? "Cerrada" : m.mlEstado}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No publicada</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {m.mlUltimaSync ? formatDate(m.mlUltimaSync) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {m.mlPermalink && (
                            <a
                              href={m.mlPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center size-7 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                              title="Ver en ML"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                          <PublishButton modeloId={m.id} yaPublicada={!!m.mlListingId} />
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
          <li>Para que una moto se pueda publicar necesita: <strong>precio cargado</strong> y <strong>al menos 1 foto</strong>.</li>
          <li>Click en <strong>Publicar / Actualizar</strong> en cada fila para sincronizar.</li>
          <li>Cuando marcás una moto como vendida acá, en próximas sesiones también se va a despublicar de ML automáticamente.</li>
          <li>Las preguntas de ML van a llegar como Leads al CRM (en próximas sesiones).</li>
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

// Boton client-side que llama al endpoint POST
function PublishButton({ modeloId, yaPublicada }: { modeloId: string; yaPublicada: boolean }) {
  return (
    <form action={async () => {
      "use server"
      // Ejecutamos el publish en server action para no necesitar JS
      const baseUrl = process.env.NEXTAUTH_URL || "https://www.motosfernandez.com.ar"
      await fetch(`${baseUrl}/api/admin/ml/publish/${modeloId}`, { method: "POST" })
        .catch(() => null)
    }}>
      <button
        type="submit"
        className="text-xs px-2.5 py-1 rounded-md bg-[#FFE600] text-[#2D3277] hover:bg-[#fff04d] font-medium"
      >
        {yaPublicada ? "Actualizar" : "Publicar"}
      </button>
    </form>
  )
}
