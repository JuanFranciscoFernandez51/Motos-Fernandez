/**
 * Clasificador automático de "tipo de moto" (segmento) por nombre/marca.
 * Se usa al crear/editar una moto para que el filtro público se complete solo,
 * sin que nadie tenga que cargarlo a mano. Solo aplica a MOTOCICLETA; para
 * otros vehículos (cuatri/UTV/agua) devuelve null.
 *
 * Reglas ordenadas: la primera que matchea gana.
 */
const REGLAS: [string, RegExp][] = [
  ["Eléctrica", /electr|e-scooter|\(electrica\)|\bev\b|cx-2e|cx-5e|ae6|ae8/],
  ["Scooter", /vespa|nmax|nm-x|\bpcx\b|sr 160|sxr|gt 200|c 400|mp3|beverly|fascino|rayzr|burgman|scooter|sh50|\bgts?\b|vxl|primavera|\bforza\b|xmax/],
  ["Enduro/Cross", /\bkx\b|\bkx ?\d|\byz ?\d|\byz\b|klx|tt-?r|mini cross|\bcross\b|\bmx\b|\bxr ?\d|xr\d|tornado/],
  ["Touring", /r1200rt|\brt\b|goldwing|k1600|\bfjr\b|tracer|650gt|touring|\bgt\b/],
  ["Deportiva", /ninja|\bzx-?\d|zx-|rs 457|\brr\b|r 1000 rr|r7\b|\br1\b|\br3\b|\br6\b|\bcbr|yzf|\bh2\b|panigale|sr-r|\d{3}sr\b|\bsupersport|daytona|rc390|gsx-?r/],
  ["Trail", /\bgs\b|gs adventure|tenere|t[eé]n[eé]r[eé]|versys|africa|crf ?1\d{3}|crf1100|tuareg|\btrk\b|himalayan|\bklr\b|nc ?750|nx ?650|adventure|\brally\b|xtz|v-?strom|transalp|\d ?mt\b|\dmt-|790 adventure|\bmt\b(?!-)|himalaya|\d{3,4} xr\b/],
  ["Custom", /vulcan|xg ?750|\bstreet\b|502 ?c\b|classic|heritage|meteor|rebel|\biron\b|forty|bonneville|\bv7\b|chopper|cruiser/],
  ["Naked", /\bduke\b|\bmt-\d|nk\b|\bz ?\d{3}|\bz\b|zh2|z h2|\bfz\b|cb ?\d|twister|tuono|hornet|cl-x|monster|svartpilen|\bmt\b|502 c/],
  ["Urbana", /\bbiz\b|\bwave\b|milano|\bcub\b|smash|\bmint\b|chappy|lb80|blitz|econo|\bcg\b|\b110\b|\b125\b/],
]

export function clasificarSegmento(
  marca: string | null | undefined,
  nombre: string | null | undefined,
  categoriaVehiculo: string | null | undefined
): string | null {
  // El segmento solo tiene sentido para motos.
  if (categoriaVehiculo && categoriaVehiculo !== "MOTOCICLETA") return null
  const s = `${marca || ""} ${nombre || ""}`.toLowerCase()
  for (const [seg, re] of REGLAS) if (re.test(s)) return seg
  return null
}
