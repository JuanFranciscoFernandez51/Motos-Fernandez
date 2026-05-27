#!/usr/bin/env node
/**
 * Programa 15 publicaciones (1 por día) en el calendario de ScheduledPost.
 *
 * Selección: motos con foto + precio correcto + descripción, mezclando
 * marcas, condiciones (0KM/USADA) y categorías para no saturar el feed.
 *
 * Horario: 19:30 hora Argentina (UTC-3) → en UTC se guarda como 22:30.
 * Esa franja es pico de engagement orgánico en IG/FB para Argentina.
 *
 * Captions: templates rotativos según condición + categoría, con CTA
 * a WhatsApp + hashtags relevantes.
 *
 * Uso (una sola vez): node scripts/programar-15-dias.cjs
 *   Si ya hay posts PENDING para esas fechas, los salteamos para no
 *   duplicar. Idempotente.
 */

require("dotenv").config({ path: ".env.local" })
const { PrismaClient } = require("@prisma/client")

// Selección curada: motos con precio coherente + ≥2 fotos + descripción.
// Codigo → caption "fingerprint" para rastrear cuáles ya programamos.
const SELECCION = [
  { codigo: "MF-0041",      template: "destacada_usada"   }, // Honda XR 150
  { codigo: "MF-0KM-0017",  template: "0km_adventure"     }, // CF Moto 450 MT
  { codigo: "MF-0036",      template: "destacada_usada"   }, // Suzuki DR 650
  { codigo: "MF-0KM-0007",  template: "0km_scooter"       }, // Aprilia GT 200
  { codigo: "MF-0032",      template: "deportiva"         }, // KTM Duke 390
  { codigo: "MF-0058",      template: "solo_web"          }, // Benelli Leoncino 150 — EN_DOMICILIO
  { codigo: "MF-0033",      template: "adventure_usada"   }, // Kawasaki Versys 650
  { codigo: "MF-0KM-0008",  template: "0km_premium"       }, // Piaggio Beverly 400
  { codigo: "MF-0017",      template: "clasica_usada"     }, // Honda XR 250 Tornado
  { codigo: "MF-0KM-0006",  template: "0km_scooter"       }, // Aprilia SXR 160
  { codigo: "MF-0KM-0016",  template: "0km_naked"         }, // Kawasaki Z500
  { codigo: "MF-0030",      template: "custom_usada"      }, // Benelli 502 C
  { codigo: "MF-0010",      template: "adventure_usada"   }, // Kawasaki Versys 300
  { codigo: "MF-0KM-0014",  template: "0km_offroad"       }, // Kawasaki KLX 300
  { codigo: "MF-0019",      template: "clasica_usada"     }, // Honda XR 250 Tornado
]

// Horarios variados para no parecer bot — todos en franja de engagement
// (19:00-20:30 hora AR = 22:00-23:30 UTC).
const HORARIOS_AR = ["19:00", "19:30", "20:00", "19:15", "19:45"]

function formatPrecio(n, moneda) {
  if (!n) return "Consultá precio"
  const fmt = "$" + n.toLocaleString("es-AR")
  return moneda === "USD" ? "USD " + n.toLocaleString("es-AR") : fmt
}

function hashtagsBase(moto) {
  const tags = ["#motosfernandez", "#bahiablanca", "#motos", "#motoargentina"]
  const marca = (moto.marca || "").toLowerCase().replace(/\s+/g, "")
  if (marca) tags.push("#" + marca)
  if (moto.condicion === "0KM") tags.push("#moto0km")
  if (moto.categoriaVehiculo === "CUATRICICLO") tags.push("#cuatris")
  if (moto.categoriaVehiculo === "UTV") tags.push("#utv")
  return tags.slice(0, 8).join(" ")
}

/** Devuelve un caption según template. Cada uno con personalidad distinta. */
function captionFor(template, moto) {
  const titulo = `${moto.marca} ${moto.nombre}`
  const anio = moto.anio ? moto.anio : ""
  const km = moto.kilometros ? `${moto.kilometros.toLocaleString("es-AR")} km` : ""
  const cilindrada = moto.cilindrada ? moto.cilindrada : ""
  const precio = formatPrecio(moto.precio, moto.moneda)
  const hashtags = hashtagsBase(moto)

  const templates = {
    destacada_usada: () => `🏍 ${titulo} ${anio}

🔥 ¡Una de nuestras destacadas! ${km ? "Con " + km + " " : ""}y estado impecable.

💰 ${precio}
💳 Financiación propia hasta 12 cuotas + tarjeta hasta 24
🛡 Documentación al día · garantía Motos Fernández

📍 Brown 1052, Bahía Blanca
📲 Consultá por WhatsApp ➡️ +54 9 291 578-8671

${hashtags}`,

    "0km_adventure": () => `🚀 ¡NUEVA en el local!
${titulo} 0KM ${anio || ""}

⛰ Adventure ${cilindrada} lista para la ruta y el off-road.
🎯 Entrega inmediata

💰 ${precio}
💳 Hasta 24 cuotas con tarjeta · financiación propia disponible
✅ Garantía oficial

📲 Coordinamos prueba por WhatsApp +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags} #adventure`,

    "0km_scooter": () => `🏙 ${titulo} 0KM
La compañera perfecta para moverte en la ciudad.

✓ Automática · Práctica · Cómoda
✓ Bajo consumo · Espacio bajo el asiento
${cilindrada ? "✓ " + cilindrada + " ideal urbano\n" : ""}
💰 ${precio}
💳 Hasta 24 cuotas con tarjeta

📲 WhatsApp +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags} #scooter #urbano`,

    "deportiva": () => `⚡ ${titulo} ${anio}

🏁 Performance ${cilindrada} con todo el carácter de la marca.
${km ? "📏 " + km + " · estado impecable\n" : ""}
💰 ${precio}
💳 Financiación a medida — propia o con tarjeta
🛡 Documentación impecable

📲 Consultá por WhatsApp · coordinamos prueba
📍 Brown 1052, Bahía Blanca

${hashtags} #deportiva`,

    "solo_web": () => `🆕 ¡Acabamos de sumar al catálogo!
${titulo} ${anio}

📲 Disponible solo por consulta — coordinamos visita o prueba con el titular
${km ? "📏 " + km + "\n" : ""}${cilindrada ? "🔧 " + cilindrada + "\n" : ""}
💰 ${precio}
💳 Aceptamos permuta y financiación

📲 WhatsApp +54 9 291 578-8671 — te coordinamos visita
🏠 No está en el local, pero la operación la gestionamos nosotros 100%

${hashtags}`,

    "adventure_usada": () => `🌎 Hecha para la ruta
${titulo} ${anio}

⛰ Adventure ${cilindrada}
${km ? "📏 " + km + " · cuidada por su único dueño\n" : ""}🛠 Servicios al día · documentación impecable

💰 ${precio}
💳 Permuta + financiación

📲 Por WhatsApp coordinamos prueba · +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags} #adventure #ruta`,

    "0km_premium": () => `✨ NUEVA · ${titulo} 0KM ${anio || ""}

🏆 Premium ${cilindrada} con la tecnología más actual.
🎁 Entrega inmediata
🛡 Garantía oficial

💰 ${precio}
💳 Plan canje + financiación a medida

📲 WhatsApp +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags} #0km #premium`,

    "clasica_usada": () => `🏍 ${titulo} ${anio}
Un clásico que nunca falla.

${km ? "📏 " + km + " · " : ""}${cilindrada ? cilindrada : ""}
🛠 Estado impecable · documentación al día

💰 ${precio}
💳 Financiación propia + plan canje

📲 WhatsApp +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags}`,

    "0km_naked": () => `🔥 ${titulo} 0KM ${anio || ""}

⚡ Naked ${cilindrada} con la mejor relación precio/performance
🎯 Entrega inmediata · garantía oficial

💰 ${precio}
💳 Hasta 24 cuotas con tarjeta

📲 Consultanos por WhatsApp · coordinamos prueba
📍 Brown 1052, Bahía Blanca

${hashtags} #naked #0km`,

    "custom_usada": () => `🛣 ${titulo} ${anio}
Estilo, carretera y carácter.

${km ? "📏 " + km + " · cuidada\n" : ""}${cilindrada ? "🔧 " + cilindrada + "\n" : ""}🎨 Lista para rodar

💰 ${precio}
💳 Permuta + financiación a medida

📲 WhatsApp +54 9 291 578-8671
📍 Brown 1052, Bahía Blanca

${hashtags} #custom #cruiser`,

    "0km_offroad": () => `⛰ ${titulo} 0KM ${anio || ""}

🏔 Off-road ${cilindrada} para los que no se quedan en el asfalto.
🎯 Entrega inmediata
🛡 Garantía oficial Kawasaki

💰 ${precio}
💳 Financiación a medida

📲 WhatsApp +54 9 291 578-8671 · coordinamos prueba
📍 Brown 1052, Bahía Blanca

${hashtags} #offroad #enduro`,
  }

  return (templates[template] || templates.clasica_usada)()
}

async function main() {
  const p = new PrismaClient()
  try {
    // 1) Resolver códigos → motoIds
    const motos = await p.modelo.findMany({
      where: { codigo: { in: SELECCION.map((s) => s.codigo) } },
      select: {
        id: true, codigo: true, marca: true, nombre: true, anio: true,
        kilometros: true, cilindrada: true, condicion: true, precio: true,
        moneda: true, categoriaVehiculo: true, fotos: true, activeForMarketing: true,
        vendida: true,
      },
    })
    const byCodigo = Object.fromEntries(motos.map((m) => [m.codigo, m]))

    // 2) Generar las 15 fechas (próximos 15 días desde mañana)
    const ahora = new Date()
    const arrancarMañana = new Date(ahora)
    arrancarMañana.setUTCDate(ahora.getUTCDate() + 1)

    const programados = []
    const saltados = []

    for (let i = 0; i < SELECCION.length; i++) {
      const item = SELECCION[i]
      const moto = byCodigo[item.codigo]
      if (!moto) {
        saltados.push({ codigo: item.codigo, motivo: "no encontrada" })
        continue
      }
      if (moto.vendida || !moto.activeForMarketing || moto.fotos.length === 0) {
        saltados.push({ codigo: item.codigo, motivo: "no publicable (vendida/inactiva/sin foto)" })
        continue
      }

      // Fecha = arrancarMañana + i días, a la hora HORARIOS_AR[i % len]
      const fecha = new Date(arrancarMañana)
      fecha.setUTCDate(arrancarMañana.getUTCDate() + i)
      const [hh, mm] = HORARIOS_AR[i % HORARIOS_AR.length].split(":").map(Number)
      // AR es UTC-3 → hora UTC = hora AR + 3
      fecha.setUTCHours(hh + 3, mm, 0, 0)

      // Idempotencia: si ya hay PENDING para esta moto en ±4 horas, saltar.
      const ventana = 4 * 60 * 60 * 1000
      const overlap = await p.scheduledPost.findFirst({
        where: {
          motoId: moto.id,
          status: { in: ["PENDING", "PROCESSING"] },
          scheduledAt: {
            gte: new Date(fecha.getTime() - ventana),
            lte: new Date(fecha.getTime() + ventana),
          },
        },
      })
      if (overlap) {
        saltados.push({ codigo: item.codigo, motivo: "ya hay post programado cerca" })
        continue
      }

      const caption = captionFor(item.template, moto)
      const post = await p.scheduledPost.create({
        data: {
          motoId: moto.id,
          platforms: ["IG", "FB"],
          scheduledAt: fecha,
          customCaption: caption,
          status: "PENDING",
        },
      })
      programados.push({
        codigo: item.codigo,
        fecha_ar: fecha.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
        id: post.id,
        template: item.template,
      })
    }

    console.log("\n=== PROGRAMADOS ===")
    programados.forEach((p) => console.log(`  ${p.fecha_ar} · ${p.codigo} (${p.template})`))
    console.log(`\nTotal programados: ${programados.length}`)
    if (saltados.length) {
      console.log("\nSaltados:")
      saltados.forEach((s) => console.log(`  ${s.codigo} — ${s.motivo}`))
    }
  } finally {
    await p.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})
