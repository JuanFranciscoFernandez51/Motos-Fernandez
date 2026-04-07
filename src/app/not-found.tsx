import Link from "next/link"

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#F0F0F0" }}
    >
      <div className="text-center space-y-4 max-w-md">
        <p
          className="text-8xl font-bold font-heading leading-none"
          style={{ color: "#6B4F7A" }}
        >
          404
        </p>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">
          Página no encontrada
        </h1>
        <p className="text-gray-500">
          La página que buscás no existe o fue movida.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#6B4F7A" }}
          >
            Volver al inicio
          </Link>
          <Link
            href="/modelos"
            className="inline-flex items-center justify-center rounded-md border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-white"
            style={{ borderColor: "#6B4F7A", color: "#6B4F7A" }}
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}
