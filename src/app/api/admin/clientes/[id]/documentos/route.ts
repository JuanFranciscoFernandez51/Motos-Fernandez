import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import cloudinary from "@/lib/cloudinary"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"
export const maxDuration = 60

// Tamaño máximo: 10MB por archivo
const MAX_BYTES = 10 * 1024 * 1024

const CATEGORIAS_VALIDAS = [
  "documentacion",
  "domicilio",
  "trabajo",
  "garantia",
  "otros",
] as const

type Categoria = (typeof CATEGORIAS_VALIDAS)[number]

type Documento = {
  id: string
  nombre: string
  categoria: Categoria
  url: string
  publicId: string
  resourceType: "image" | "raw" | "video"
  mimeType: string
  tamano: number
  notas: string | null
  uploadedAt: string
}

function genId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Sube un documento a Cloudinary y lo asocia al cliente.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id: clienteId } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const categoriaRaw = (formData.get("categoria") as string | null) || "otros"
    const notas = (formData.get("notas") as string | null) || null

    if (!file) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `El archivo es muy grande. Máximo ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }
    const categoria = (
      CATEGORIAS_VALIDAS.includes(categoriaRaw as Categoria) ? categoriaRaw : "otros"
    ) as Categoria

    // Verificar cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { documentos: true },
    })
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Determinar resource_type para Cloudinary
    const isImage = file.type.startsWith("image/")
    const resourceType: "image" | "raw" = isImage ? "image" : "raw"

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir a Cloudinary
    const folder = `motos-fernandez/clientes/${clienteId}/${categoria}`
    const upload = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            // Para PDFs y otros, mantener nombre original como filename
            filename_override: file.name,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error || !result) reject(error)
            else resolve({ secure_url: result.secure_url, public_id: result.public_id })
          }
        )
        stream.end(buffer)
      }
    )

    // Construir el nuevo documento
    const nuevoDoc: Documento = {
      id: genId(),
      nombre: file.name,
      categoria,
      url: upload.secure_url,
      publicId: upload.public_id,
      resourceType,
      mimeType: file.type,
      tamano: file.size,
      notas: notas?.trim() || null,
      uploadedAt: new Date().toISOString(),
    }

    // Concatenar al array existente
    const docsExistentes = Array.isArray(cliente.documentos)
      ? (cliente.documentos as unknown as Documento[])
      : []
    const docsNuevos = [...docsExistentes, nuevoDoc]

    await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        documentos: docsNuevos as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ ok: true, documento: nuevoDoc })
  } catch (e) {
    console.error("[admin/clientes/documentos] Error:", e)
    const msg = e instanceof Error ? e.message : "Error al subir"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Elimina un documento del cliente (también del Cloudinary).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id: clienteId } = await params
    const url = new URL(request.url)
    const docId = url.searchParams.get("docId")
    if (!docId) {
      return NextResponse.json({ error: "Falta docId" }, { status: 400 })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { documentos: true },
    })
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const docs = Array.isArray(cliente.documentos)
      ? (cliente.documentos as unknown as Documento[])
      : []
    const doc = docs.find((d) => d.id === docId)
    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    // Eliminar de Cloudinary (best-effort)
    try {
      await cloudinary.uploader.destroy(doc.publicId, {
        resource_type: doc.resourceType,
      })
    } catch (e) {
      console.warn("[documentos] Error al borrar de Cloudinary:", e)
    }

    // Eliminar del array
    const docsNuevos = docs.filter((d) => d.id !== docId)
    await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        documentos:
          docsNuevos.length > 0
            ? (docsNuevos as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[admin/clientes/documentos] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}
