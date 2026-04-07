import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  // ========== MODELOS ==========
  const modelos = [
    { nombre: "Honda XR 150L", slug: "honda-xr-150l", marca: "Honda", categoriaVehiculo: "MOTOCICLETA" as const, cilindrada: "150cc", precio: 3200000, descripcion: "La moto trail mas vendida de Argentina. Ideal para ciudad y caminos de tierra.", specs: { Motor: "149.1cc monocilindrico OHC", Potencia: "12.8 HP @ 8000 rpm", Torque: "12.5 Nm @ 5500 rpm", Transmision: "5 velocidades", Frenos: "Disco / Tambor", Peso: "128 kg", Tanque: "12 litros" }, destacado: true, orden: 1 },
    { nombre: "Yamaha YZF-R3", slug: "yamaha-yzf-r3", marca: "Yamaha", categoriaVehiculo: "MOTOCICLETA" as const, cilindrada: "321cc", precio: 8500000, descripcion: "Deportiva de entrada con motor bicilindrico. Perfecta para adrenalina con seguridad.", specs: { Motor: "321cc bicilindrico DOHC", Potencia: "42 HP @ 10750 rpm", Transmision: "6 velocidades", Frenos: "Disco / Disco", Peso: "170 kg" }, destacado: true, orden: 2 },
    { nombre: "Kawasaki Z400", slug: "kawasaki-z400", marca: "Kawasaki", categoriaVehiculo: "MOTOCICLETA" as const, cilindrada: "399cc", precio: 9800000, descripcion: "Naked deportiva con motor bicilindrico de 399cc.", specs: { Motor: "399cc bicilindrico DOHC", Potencia: "45 HP @ 10000 rpm", Transmision: "6 velocidades", Peso: "167 kg" }, destacado: false, orden: 3 },
    { nombre: "Honda TRX 250", slug: "honda-trx-250", marca: "Honda", categoriaVehiculo: "CUATRICICLO" as const, cilindrada: "229cc", precio: 12500000, descripcion: "Cuatriciclo utilitario ideal para campo y recreacion.", specs: { Motor: "229cc monocilindrico", Traccion: "2WD", Transmision: "Automatica", Peso: "191 kg" }, destacado: true, orden: 10 },
    { nombre: "Yamaha Raptor 700", slug: "yamaha-raptor-700", marca: "Yamaha", categoriaVehiculo: "CUATRICICLO" as const, cilindrada: "686cc", precio: 22000000, descripcion: "El cuatriciclo deportivo mas potente del mercado.", specs: { Motor: "686cc monocilindrico", Potencia: "50+ HP", Transmision: "5 velocidades + reversa" }, destacado: true, orden: 11 },
    { nombre: "CF Moto CForce 520", slug: "cfmoto-cforce-520", marca: "CF Moto", categoriaVehiculo: "CUATRICICLO" as const, cilindrada: "495cc", precio: 15800000, descripcion: "Cuatriciclo 4x4 con direccion asistida.", specs: { Motor: "495cc", Traccion: "4x4 seleccionable", Direccion: "Asistida EPS" }, destacado: false, orden: 12 },
    { nombre: "CF Moto ZForce 950", slug: "cfmoto-zforce-950", marca: "CF Moto", categoriaVehiculo: "UTV" as const, cilindrada: "963cc", precio: 35000000, descripcion: "Side by Side deportivo con motor V-Twin de 963cc.", specs: { Motor: "963cc V-Twin", Potencia: "90 HP", Traccion: "4x4", Capacidad: "2 personas" }, destacado: true, orden: 20 },
    { nombre: "Honda Pioneer 520", slug: "honda-pioneer-520", marca: "Honda", categoriaVehiculo: "UTV" as const, cilindrada: "518cc", precio: 28000000, descripcion: "UTV utilitario compacto ideal para campo y trabajo.", specs: { Motor: "518cc", Transmision: "Automatica DCT", Traccion: "4WD", Carga: "450 kg" }, destacado: false, orden: 21 },
    { nombre: "Segway Villain SX10", slug: "segway-villain-sx10", marca: "Segway", categoriaVehiculo: "UTV" as const, cilindrada: "998cc", precio: 42000000, descripcion: "El UTV mas tecnologico del mercado.", specs: { Motor: "998cc bicilindrico", Potencia: "100 HP", Suspension: "FOX 2.5 Podium", Pantalla: "10.1 pulgadas" }, destacado: true, orden: 22 },
    { nombre: "Yamaha VX Cruiser", slug: "yamaha-vx-cruiser", marca: "Yamaha", categoriaVehiculo: "MOTO_DE_AGUA" as const, cilindrada: "1049cc", precio: 18000000, descripcion: "Moto de agua recreativa ideal para paseos en familia.", specs: { Motor: "1049cc 3 cilindros", Potencia: "110 HP", Capacidad: "3 personas", Tanque: "70 litros" }, destacado: true, orden: 30 },
    { nombre: "Sea-Doo Spark 90", slug: "seadoo-spark-90", marca: "Sea-Doo", categoriaVehiculo: "MOTO_DE_AGUA" as const, cilindrada: "900cc", precio: 14500000, descripcion: "La moto de agua mas liviana y divertida.", specs: { Motor: "899cc Rotax", Potencia: "90 HP", Peso: "185 kg" }, destacado: false, orden: 31 },
    { nombre: "Kawasaki Ultra 310X", slug: "kawasaki-ultra-310x", marca: "Kawasaki", categoriaVehiculo: "MOTO_DE_AGUA" as const, cilindrada: "1498cc", precio: 32000000, descripcion: "La moto de agua mas potente del mundo. 310 HP supercargados.", specs: { Motor: "1498cc supercargado", Potencia: "310 HP", Capacidad: "3 personas", Tanque: "72 litros" }, destacado: true, orden: 32 },
  ]

  for (const m of modelos) {
    await prisma.modelo.create({
      data: { ...m, fotos: [], activo: true },
    })
    console.log("Modelo:", m.nombre)
  }

  // ========== CATEGORIAS TIENDA ==========
  const cascos = await prisma.categoria.create({ data: { nombre: "Cascos", slug: "cascos", orden: 1 } })
  const indu = await prisma.categoria.create({ data: { nombre: "Indumentaria", slug: "indumentaria", orden: 2 } })
  const acce = await prisma.categoria.create({ data: { nombre: "Accesorios", slug: "accesorios", orden: 3 } })
  const repu = await prisma.categoria.create({ data: { nombre: "Repuestos", slug: "repuestos", orden: 4 } })
  const lube = await prisma.categoria.create({ data: { nombre: "Lubricantes", slug: "lubricantes", orden: 5 } })
  console.log("Categorias creadas: 5")

  // ========== PRODUCTOS ==========
  const prods = [
    { nombre: "Casco Integral LS2 FF800 Storm", slug: "casco-ls2-ff800-storm", precio: 185000, precioOferta: 165000, stock: 8, catId: cascos.id, talles: ["S","M","L","XL"], stockPorTalle: { S: 2, M: 3, L: 2, XL: 1 }, descripcion: "Casco integral con ventilacion avanzado. Visor antifog." },
    { nombre: "Casco Abierto Hawk RS9", slug: "casco-hawk-rs9", precio: 75000, stock: 15, catId: cascos.id, talles: ["S","M","L","XL"], stockPorTalle: { S: 4, M: 5, L: 4, XL: 2 }, descripcion: "Casco abierto con visera. Liviano y comodo." },
    { nombre: "Casco Motocross Just1 J38", slug: "casco-just1-j38", precio: 220000, stock: 5, catId: cascos.id, descripcion: "Casco off-road fibra de vidrio. Ventilacion premium." },
    { nombre: "Campera Alpinestars T-GP", slug: "campera-alpinestars-tgp", precio: 320000, precioOferta: 289000, stock: 6, catId: indu.id, talles: ["M","L","XL","XXL"], stockPorTalle: { M: 2, L: 2, XL: 1, XXL: 1 }, descripcion: "Campera textil con protecciones CE. Impermeable." },
    { nombre: "Guantes Nine To One Cafe", slug: "guantes-nine-to-one-cafe", precio: 45000, stock: 20, catId: indu.id, talles: ["S","M","L","XL"], stockPorTalle: { S: 5, M: 6, L: 5, XL: 4 }, descripcion: "Guantes cortos cuero con proteccion nudillos." },
    { nombre: "Botas Forma Adventure", slug: "botas-forma-adventure", precio: 280000, stock: 4, catId: indu.id, talles: ["40","41","42","43","44"], stockPorTalle: { "40": 1, "41": 1, "42": 1, "43": 1 }, descripcion: "Botas touring impermeables con suela Vibram." },
    { nombre: "Baul Trasero GIVI E300N2", slug: "baul-givi-e300n2", precio: 125000, stock: 10, catId: acce.id, descripcion: "Baul 30 litros con cerradura. Montaje universal." },
    { nombre: "Cargador USB Doble Moto", slug: "cargador-usb-doble-moto", precio: 18000, stock: 25, catId: acce.id, descripcion: "Cargador USB doble 12V resistente al agua." },
    { nombre: "Candado Cadena OnGuard 120cm", slug: "candado-onguard-120cm", precio: 65000, stock: 12, catId: acce.id, descripcion: "Cadena de seguridad acero endurecido anti corte." },
    { nombre: "Kit Arrastre Honda XR 150", slug: "kit-arrastre-honda-xr150", precio: 42000, stock: 18, catId: repu.id, motoCompatible: "Honda XR 150L, Honda XR 190L", descripcion: "Corona, pinon y cadena DID reforzada." },
    { nombre: "Pastillas Freno EBC Delanteras", slug: "pastillas-freno-ebc", precio: 28000, stock: 30, catId: repu.id, motoCompatible: "Honda, Yamaha, Kawasaki - varios modelos", descripcion: "Pastillas sinterizadas de alto rendimiento." },
    { nombre: "Filtro Aire K&N Universal", slug: "filtro-aire-kn-universal", precio: 55000, stock: 8, catId: repu.id, descripcion: "Filtro reutilizable de alto flujo. Lavable." },
    { nombre: "Aceite Motul 7100 10W40 1L", slug: "aceite-motul-7100-10w40", precio: 22000, stock: 40, catId: lube.id, descripcion: "Aceite 100% sintetico para motos 4T." },
    { nombre: "Aceite Castrol Power1 10W50 1L", slug: "aceite-castrol-power1-10w50", precio: 18000, stock: 35, catId: lube.id, descripcion: "Aceite semi-sintetico para motos 4T." },
    { nombre: "Spray Cadena Motorex 500ml", slug: "spray-cadena-motorex-500ml", precio: 15000, stock: 22, catId: lube.id, descripcion: "Lubricante cadena resistente al agua." },
  ]

  for (const p of prods) {
    await prisma.producto.create({
      data: {
        nombre: p.nombre,
        slug: p.slug,
        precio: p.precio,
        precioOferta: p.precioOferta ?? null,
        stock: p.stock,
        talles: p.talles ?? [],
        stockPorTalle: p.stockPorTalle ?? undefined,
        descripcion: p.descripcion,
        motoCompatible: p.motoCompatible ?? null,
        fotos: [],
        activo: true,
        categoriaId: p.catId,
      },
    })
    console.log("Producto:", p.nombre)
  }

  console.log("\n=== SEED COMPLETO ===")
  console.log("12 modelos + 5 categorias + 15 productos")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
