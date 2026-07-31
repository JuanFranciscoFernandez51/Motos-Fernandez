import { prisma } from "@/lib/prisma"
import { QrAdmin } from "./qr-admin"
import { QR_BASE_URL } from "@/lib/qr-config"

export const dynamic = "force-dynamic"

export default async function QrAdminPage() {
  const [shortlinks, modelos] = await Promise.all([
    prisma.qrShortlink.findMany({
      orderBy: [{ activo: "desc" }, { codigo: "asc" }],
      include: {
        modelo: { select: { id: true, nombre: true, slug: true, marca: true } },
      },
    }),
    prisma.modelo.findMany({
      where: { activo: true, vendida: false },
      select: { id: true, nombre: true, slug: true, marca: true, condicion: true },
      orderBy: [{ marca: "asc" }, { nombre: "asc" }],
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Shortlinks</h1>
        <p className="text-sm text-gray-500 mt-1">
          URLs cortas inmutables para imprimir en acrílicos / folletos. Cada QR
          apunta a <code className="font-mono text-xs bg-gray-100 px-1 rounded">
            {QR_BASE_URL}/m/&lt;código&gt;
          </code>{" "}
          y vos controlás a qué modelo redirige.
        </p>
      </div>

      <QrAdmin
        initial={shortlinks.map((s) => ({
          id: s.id,
          codigo: s.codigo,
          modeloId: s.modeloId,
          modeloNombre: s.modelo?.nombre || null,
          modeloMarca: s.modelo?.marca || null,
          modeloSlug: s.modelo?.slug || null,
          urlCustom: s.urlCustom,
          descripcion: s.descripcion,
          activo: s.activo,
          protegido: s.protegido,
          scans: s.scans,
          ultimoScan: s.ultimoScan,
        }))}
        modelos={modelos.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          slug: m.slug,
          marca: m.marca,
          esUsado: m.condicion === "USADA",
        }))}
        baseUrl={QR_BASE_URL}
      />
    </div>
  )
}
