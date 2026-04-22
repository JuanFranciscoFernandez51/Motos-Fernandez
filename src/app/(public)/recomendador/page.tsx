"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bike,
  MapPin,
  Truck,
  Mountain,
  Zap,
  Trophy,
  Award,
  Star,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react"

type Respuestas = {
  uso?: string
  experiencia?: string
  presupuesto?: string
  marca?: string
  cilindrada?: string
  financiacion?: string
}

type ModeloRec = {
  id: string
  nombre: string
  slug: string
  marca: string
  categoriaVehiculo: string
  condicion: string | null
  cilindrada: string | null
  precio: number | null
  moneda: string
  anio: number | null
  fotos: string[]
  destacado: boolean
}

type Resultado = {
  modelos: ModeloRec[]
  razonamiento: string
}

type Opcion = {
  value: string
  label: string
  descripcion?: string
  icon?: React.ReactNode
  recomendado?: boolean
}

type Pregunta = {
  key: keyof Respuestas
  titulo: string
  subtitulo?: string
  opciones: Opcion[]
}

const PREGUNTAS: Pregunta[] = [
  {
    key: "uso",
    titulo: "¿Para qué vas a usar la moto?",
    subtitulo: "Elegí el uso principal que le vas a dar",
    opciones: [
      {
        value: "ciudad",
        label: "Ciudad / Uso diario",
        descripcion: "Trabajo, estudio, trámites",
        icon: <MapPin className="size-7" />,
      },
      {
        value: "ruta",
        label: "Ruta / Viajes largos",
        descripcion: "Turismo, escapadas, rutas",
        icon: <Bike className="size-7" />,
      },
      {
        value: "trabajo",
        label: "Trabajo / Delivery",
        descripcion: "Utilitaria, reparto, reparto",
        icon: <Truck className="size-7" />,
      },
      {
        value: "offroad",
        label: "Off-road / Enduro",
        descripcion: "Aventura, tierra, enduro",
        icon: <Mountain className="size-7" />,
      },
      {
        value: "deportiva",
        label: "Deportiva / Velocidad",
        descripcion: "Superbike, track day",
        icon: <Zap className="size-7" />,
      },
    ],
  },
  {
    key: "experiencia",
    titulo: "¿Cuánta experiencia tenés en moto?",
    opciones: [
      {
        value: "principiante",
        label: "Principiante",
        descripcion: "Es mi primera moto",
      },
      {
        value: "intermedio",
        label: "Intermedio",
        descripcion: "Ya manejé algunas motos",
      },
      {
        value: "avanzado",
        label: "Avanzado",
        descripcion: "Tengo mucha experiencia",
      },
    ],
  },
  {
    key: "presupuesto",
    titulo: "¿Cuál es tu presupuesto?",
    subtitulo: "En pesos argentinos",
    opciones: [
      { value: "hasta-3m", label: "Hasta $3.000.000" },
      { value: "3m-6m", label: "$3.000.000 - $6.000.000" },
      { value: "6m-12m", label: "$6.000.000 - $12.000.000" },
      { value: "12m-20m", label: "$12.000.000 - $20.000.000" },
      { value: "mas-20m", label: "Más de $20.000.000" },
      { value: "flexible", label: "No tengo presupuesto definido" },
    ],
  },
  {
    key: "marca",
    titulo: "¿Qué preferís en marca?",
    subtitulo: "Elegí con atención, esto define mucho la calidad",
    opciones: [
      {
        value: "primera",
        label: "Primera marca (Honda, Yamaha, etc.)",
        descripcion:
          "Motos japonesas, alemanas o italianas. Mayor durabilidad, mejor tecnología y mejor valor de reventa.",
        recomendado: true,
      },
      {
        value: "economica",
        label: "Marca económica",
        descripcion: "Opciones más accesibles de entrada",
      },
      {
        value: "flexible",
        label: "No me importa la marca",
        descripcion: "Busco lo mejor por mi presupuesto",
      },
    ],
  },
  {
    key: "cilindrada",
    titulo: "¿Qué cilindrada preferís?",
    opciones: [
      {
        value: "baja",
        label: "Baja (hasta 150cc)",
        descripcion: "Ideal para ciudad y principiantes",
      },
      {
        value: "media",
        label: "Media (150cc - 300cc)",
        descripcion: "Ciudad y ruta, muy versátil",
      },
      {
        value: "alta",
        label: "Alta (300cc - 650cc)",
        descripcion: "Ideal para viajes largos",
      },
      {
        value: "muy-alta",
        label: "Muy alta (650cc o más)",
        descripcion: "Experiencia avanzada",
      },
      {
        value: "no-se",
        label: "No sé / Recomendame",
      },
    ],
  },
  {
    key: "financiacion",
    titulo: "¿Querés financiar la moto?",
    opciones: [
      {
        value: "si",
        label: "Sí, necesito plan en cuotas",
      },
      {
        value: "no",
        label: "No, compro al contado",
      },
      {
        value: "flexible",
        label: "Flexible, depende del plan",
      },
    ],
  },
]

function formatPrice(precio: number | null, moneda: string): string {
  if (!precio) return "Consultar"
  if (moneda === "USD") return `USD ${precio.toLocaleString("es-AR")}`
  return `$${precio.toLocaleString("es-AR")}`
}

export default function RecomendadorPage() {
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalPasos = PREGUNTAS.length
  const preguntaActual = PREGUNTAS[paso]
  const progreso = ((paso + 1) / totalPasos) * 100

  const handleSeleccionar = (value: string) => {
    const nueva = { ...respuestas, [preguntaActual.key]: value }
    setRespuestas(nueva)

    // Auto avanzar al siguiente paso con un pequeño delay para ver la selección
    setTimeout(() => {
      if (paso < totalPasos - 1) {
        setPaso(paso + 1)
      } else {
        enviarQuiz(nueva)
      }
    }, 250)
  }

  const enviarQuiz = async (data: Respuestas) => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch("/api/recomendador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas: data }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "No pudimos generar tu recomendación")
      }

      const json: Resultado = await res.json()
      if (!json.modelos || json.modelos.length === 0) {
        throw new Error("No se encontraron modelos para recomendarte")
      }
      setResultado(json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Algo salió mal"
      setError(msg)
    } finally {
      setCargando(false)
    }
  }

  const reintentar = () => {
    setError(null)
    enviarQuiz(respuestas)
  }

  const reiniciar = () => {
    setPaso(0)
    setRespuestas({})
    setResultado(null)
    setError(null)
    setCargando(false)
  }

  const volverPaso = () => {
    if (paso > 0) setPaso(paso - 1)
  }

  // ============ VISTA: RESULTADO ============
  if (resultado) {
    return (
      <main className="min-h-screen bg-[#F8F5FA] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-[#6B4F7A] to-[#9B59B6] mb-5 shadow-lg">
              <Sparkles className="size-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] font-heading">
              Las 3 motos que te recomendamos
            </h1>
            <p className="mt-3 text-gray-500 font-body max-w-xl mx-auto">
              Elegidas especialmente según tus respuestas
            </p>
          </div>

          {/* Razonamiento */}
          {resultado.razonamiento && (
            <div className="mb-10 mx-auto max-w-3xl rounded-2xl bg-white border border-[#6B4F7A]/20 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 rounded-xl bg-[#6B4F7A]/10 flex items-center justify-center text-[#6B4F7A]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6B4F7A] uppercase tracking-wider mb-1">
                    Por qué elegimos estas motos
                  </p>
                  <p className="text-sm text-gray-700 font-body leading-relaxed">
                    {resultado.razonamiento}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards de modelos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {resultado.modelos.map((modelo, idx) => (
              <Link
                key={modelo.id}
                href={`/catalogo/${modelo.slug}`}
                className="group relative flex flex-col rounded-2xl bg-white overflow-hidden border border-gray-100 hover:border-[#6B4F7A]/40 hover:shadow-xl hover:shadow-[#6B4F7A]/10 transition-all duration-300"
              >
                {/* Badge numero de recomendación */}
                <div
                  className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-md ${
                    idx === 0
                      ? "bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] text-white"
                      : "bg-white text-[#6B4F7A] border border-[#6B4F7A]/30"
                  }`}
                >
                  {idx === 0 ? (
                    <>
                      <Trophy className="size-3 fill-current" />
                      RECOMENDACIÓN #1
                    </>
                  ) : (
                    <>
                      <Award className="size-3" />
                      OPCIÓN #{idx + 1}
                    </>
                  )}
                </div>

                {/* Foto */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {modelo.fotos && modelo.fotos[0] ? (
                    <Image
                      src={modelo.fotos[0]}
                      alt={modelo.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-200">
                      <Bike className="size-16" />
                    </div>
                  )}
                  <span
                    className={`absolute bottom-3 right-3 rounded-md px-2 py-1 text-[10px] font-bold shadow ${
                      (modelo.condicion || "0KM") === "0KM"
                        ? "bg-emerald-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {(modelo.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col p-5">
                  <p className="text-[11px] font-semibold text-[#8B6F9A] uppercase tracking-wider">
                    {modelo.marca}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#1A1A1A] font-heading leading-tight">
                    {modelo.nombre}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    {modelo.cilindrada && <span>{modelo.cilindrada}</span>}
                    {modelo.cilindrada && modelo.anio && <span> · </span>}
                    {modelo.anio && <span>{modelo.anio}</span>}
                  </p>
                  <div className="mt-auto pt-4">
                    <p className="text-lg font-bold text-[#6B4F7A]">
                      {formatPrice(modelo.precio, modelo.moneda)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <span className="text-xs font-semibold text-[#6B4F7A] group-hover:text-[#9B59B6] transition-colors">
                        Ver detalle
                      </span>
                      <ArrowRight className="size-4 text-[#6B4F7A] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5a4267] transition-colors shadow-md"
            >
              Ver todo el catálogo
              <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={reiniciar}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white px-6 py-3 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 transition-colors"
            >
              <RefreshCw className="size-4" />
              Hacer quiz de nuevo
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ============ VISTA: CARGANDO ============
  if (cargando) {
    return (
      <main className="min-h-screen bg-[#F8F5FA] flex items-center justify-center py-14">
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-[#6B4F7A] to-[#9B59B6] mb-5 shadow-lg animate-pulse">
            <Sparkles className="size-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] font-heading">
            Analizando tus respuestas...
          </h2>
          <p className="mt-2 text-gray-500 font-body">
            Estamos eligiendo las 3 motos ideales para vos
          </p>
          <Loader2 className="size-8 text-[#6B4F7A] animate-spin mx-auto mt-6" />
        </div>
      </main>
    )
  }

  // ============ VISTA: ERROR ============
  if (error) {
    return (
      <main className="min-h-screen bg-[#F8F5FA] flex items-center justify-center py-14">
        <div className="max-w-md text-center px-6">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-red-100 mb-5">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] font-heading">
            Ups, algo salió mal
          </h2>
          <p className="mt-2 text-gray-600 font-body">{error}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reintentar}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5a4267] transition-colors shadow-md"
            >
              <RefreshCw className="size-4" />
              Reintentar
            </button>
            <button
              onClick={reiniciar}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white px-6 py-3 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ============ VISTA: QUIZ ============
  return (
    <main className="min-h-screen bg-[#F8F5FA] py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-[#6B4F7A] to-[#9B59B6] mb-4 shadow-lg">
            <Sparkles className="size-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] font-heading">
            ¿Qué moto te conviene?
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-body">
            Contestá unas preguntas rápidas y te recomendamos las 3 motos ideales para vos
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B4F7A] uppercase tracking-wider">
              Paso {paso + 1} de {totalPasos}
            </span>
            <span className="text-xs text-gray-400">
              {Math.round(progreso)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] transition-all duration-500 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div
          key={paso}
          className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm animate-fadeIn"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-heading text-center">
            {preguntaActual.titulo}
          </h2>
          {preguntaActual.subtitulo && (
            <p className="mt-2 text-sm text-gray-500 font-body text-center">
              {preguntaActual.subtitulo}
            </p>
          )}

          {/* Opciones */}
          <div
            className={`mt-6 grid gap-3 ${
              preguntaActual.opciones.some((o) => o.icon)
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            }`}
          >
            {preguntaActual.opciones.map((opcion) => {
              const seleccionada = respuestas[preguntaActual.key] === opcion.value
              return (
                <button
                  key={opcion.value}
                  onClick={() => handleSeleccionar(opcion.value)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    seleccionada
                      ? "border-[#6B4F7A] bg-[#6B4F7A]/5 shadow-md"
                      : "border-gray-200 bg-white hover:border-[#6B4F7A]/40"
                  }`}
                >
                  {opcion.recomendado && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                      <Star className="size-2.5 fill-current" />
                      RECOMENDADO
                    </span>
                  )}
                  {opcion.icon && (
                    <div
                      className={`mb-3 inline-flex items-center justify-center size-12 rounded-xl ${
                        seleccionada
                          ? "bg-[#6B4F7A] text-white"
                          : "bg-[#6B4F7A]/10 text-[#6B4F7A]"
                      } transition-colors`}
                    >
                      {opcion.icon}
                    </div>
                  )}
                  <p
                    className={`font-semibold font-heading ${
                      seleccionada ? "text-[#6B4F7A]" : "text-[#1A1A1A]"
                    }`}
                  >
                    {opcion.label}
                  </p>
                  {opcion.descripcion && (
                    <p className="mt-1 text-xs text-gray-500 font-body leading-relaxed">
                      {opcion.descripcion}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navegación */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={volverPaso}
            disabled={paso === 0}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-[#6B4F7A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="size-4" />
            Anterior
          </button>
          <button
            onClick={() => {
              const r = respuestas[preguntaActual.key]
              if (!r) return
              if (paso < totalPasos - 1) setPaso(paso + 1)
              else enviarQuiz(respuestas)
            }}
            disabled={!respuestas[preguntaActual.key]}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a4267] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {paso === totalPasos - 1 ? "Ver resultado" : "Siguiente"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.35s ease-out;
        }
      `}</style>
    </main>
  )
}
