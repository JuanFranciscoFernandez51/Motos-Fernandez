// ==================== DATOS DEL NEGOCIO ====================

export const BUSINESS = {
  name: "Motos Fernandez",
  legalName: "Motos Fernandez",
  slogan: `+${new Date().getFullYear() - 1985} años de confianza sobre dos ruedas`,
  description: `Concesionaria multimarca de motocicletas, cuatriciclos, UTVs y motos de agua en Bahía Blanca. Más de ${new Date().getFullYear() - 1985} años de experiencia, financiación propia y servicio técnico.`,
  address: "Brown 1052, Bahía Blanca, Buenos Aires",
  city: "Bahía Blanca",
  province: "Buenos Aires",
  country: "Argentina",
  postalCode: "8000",
  phone: "+54 291 578 8671",
  whatsapp: "5492915788671",
  whatsappDisplay: "291 578-8671",
  email: "info@motosfernandez.com.ar",
  instagram: "@motos.fernandez",
  instagramUrl: "https://www.instagram.com/motos.fernandez",
  googleMapsUrl: "https://maps.google.com/?q=Brown+1052+Bahia+Blanca",
  coordinates: { lat: -38.7183, lng: -62.2663 },
  yearFounded: 1985,
  yearsInBusiness: new Date().getFullYear() - 1985,
} as const

// ==================== HORARIOS ====================

export const HORARIOS = {
  lunesViernes: "8:30 - 12:30 / 15:30 - 19:30",
  sabados: "9:00 - 13:00",
  domingos: "Cerrado",
} as const

// ==================== WHATSAPP ====================

// ==================== ETIQUETAS DE MODELOS ====================

export const ETIQUETAS_MODELO = [
  { value: "DISPONIBLE", label: "Disponible ya", color: "bg-emerald-500" },
  { value: "ULTIMA_UNIDAD", label: "Última unidad", color: "bg-orange-500" },
  { value: "RECIEN_INGRESADA", label: "Recién ingresada", color: "bg-blue-500" },
  { value: "CONSULTAR_STOCK", label: "Consultá stock", color: "bg-gray-500" },
  { value: "RESERVADA", label: "Reservada", color: "bg-yellow-500" },
] as const

export const ETIQUETAS_MAP: Record<string, { label: string; color: string }> = ETIQUETAS_MODELO.reduce(
  (acc, e) => ({ ...acc, [e.value]: { label: e.label, color: e.color } }),
  {}
)

export const WHATSAPP_MESSAGES = {
  general: `Hola! Estoy visitando la web de Motos Fernandez y quiero mas informacion.`,
  modelo: (opts: string | { nombre: string; marca?: string; precio?: string; slug?: string; condicion?: string }) => {
    // Compatibilidad con firma vieja (solo string)
    if (typeof opts === "string") {
      return `Hola! Estoy interesado en el modelo ${opts}. Me pasan info y disponibilidad?`
    }
    const { nombre, marca, precio, slug, condicion } = opts
    const titulo = marca ? `${marca} ${nombre}` : nombre
    const cond = condicion && condicion !== "0KM" ? ` (${condicion})` : ""
    const precioTxt = precio ? `\nPrecio que figura: ${precio}` : ""
    const link = slug ? `\nhttps://motos-fernandez.vercel.app/catalogo/${slug}` : ""
    return `Hola! Estoy interesado en el ${titulo}${cond}.${precioTxt}${link}\n\nMe pasan info y disponibilidad?`
  },
  producto: (opts: { nombre: string; precio?: string; slug?: string }) => {
    const { nombre, precio, slug } = opts
    const precioTxt = precio ? `\nPrecio que figura: ${precio}` : ""
    const link = slug ? `\nhttps://motos-fernandez.vercel.app/tienda/${slug}` : ""
    return `Hola! Quiero consultar por el producto ${nombre}.${precioTxt}${link}`
  },
  financiacion: (nombre: string) =>
    `Hola! Quiero consultar por la financiacion del ${nombre}.`,
  turno: `Hola! Quiero sacar turno para el servicio tecnico.`,
  repuestos: `Hola! Necesito consultar por repuestos.`,
} as const

export function getWhatsAppUrl(message: string) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`
}

// ==================== COLORES DE MARCA ====================

export const BRAND_COLORS = {
  primary: "#6B4F7A",        // Violeta Fernandez
  primaryLight: "#8B6F9A",   // Violeta Claro
  primaryElectric: "#9B59B6", // Violeta Electrico (highlights)
  secondary: "#1A1A1A",      // Negro Motor
  grisCarbon: "#4E4B48",     // Gris Carbon
  grisPlata: "#AAA9A9",      // Gris Plata
  grisClaro: "#F0F0F0",      // Gris Claro
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#4E4B48",
} as const

// ==================== CATEGORIAS DE VEHICULOS ====================

export const CATEGORIAS_VEHICULO = [
  { value: "MOTOCICLETA", label: "Motocicletas", icon: "Bike" },
  { value: "CUATRICICLO", label: "Cuatriciclos", icon: "Car" },
  { value: "UTV", label: "UTV / Side by Side", icon: "Truck" },
  { value: "MOTO_DE_AGUA", label: "Motos de Agua", icon: "Waves" },
] as const

// ==================== SERVICIOS DE TALLER ====================

export const SERVICIOS_TALLER = [
  "Service basico (aceite + filtro)",
  "Service completo",
  "Revision general",
  "Cambio de cubiertas",
  "Frenos",
  "Embrague",
  "Electricidad",
  "Suspension",
  "Carburacion / Inyeccion",
  "Pre-VTV",
  "Otro (especificar en comentarios)",
] as const

// ==================== FORMATO PRECIO ====================

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// ==================== LABELS ====================

export const TEMPERATURA_LABELS: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  CALIENTE: { label: "Caliente", color: "bg-red-100 text-red-800" },
  TIBIO: { label: "Tibio", color: "bg-yellow-100 text-yellow-800" },
  FRIO: { label: "Frio", color: "bg-cyan-100 text-cyan-800" },
  CLIENTE: { label: "Cliente", color: "bg-green-100 text-green-800" },
  PERDIDO: { label: "Perdido", color: "bg-gray-100 text-gray-800" },
}

export const ETAPA_LABELS: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  CONTACTADO: { label: "Contactado", color: "bg-purple-100 text-purple-800" },
  PRESUPUESTADO: { label: "Presupuestado", color: "bg-yellow-100 text-yellow-800" },
  NEGOCIANDO: { label: "Negociando", color: "bg-orange-100 text-orange-800" },
  VENDIDO: { label: "Vendido", color: "bg-green-100 text-green-800" },
  PERDIDO: { label: "Perdido", color: "bg-gray-100 text-gray-800" },
}

export const ORIGEN_LABELS: Record<string, { label: string }> = {
  WEB:          { label: "Web" },
  WHATSAPP:     { label: "WhatsApp" },
  INSTAGRAM:    { label: "Instagram" },
  MARKETPLACE:  { label: "Marketplace" },
  MERCADOLIBRE: { label: "MercadoLibre" },
  TELEFONO:     { label: "Teléfono" },
  PRESENCIAL:   { label: "Presencial" },
}

export const ESTADO_PEDIDO_LABELS: Record<string, { label: string; color: string }> = {
  NUEVO: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  PAGO_CONFIRMADO: { label: "Pago confirmado", color: "bg-green-100 text-green-800" },
  PREPARANDO: { label: "Preparando", color: "bg-yellow-100 text-yellow-800" },
  ENVIADO: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
  ENTREGADO: { label: "Entregado", color: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-800" },
}

export const ESTADO_PAGO_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  APROBADO: { label: "Aprobado", color: "bg-green-100 text-green-800" },
  RECHAZADO: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  REEMBOLSADO: { label: "Reembolsado", color: "bg-gray-100 text-gray-800" },
}

export const CATEGORIA_VEHICULO_LABELS: Record<string, string> = {
  MOTOCICLETA: "Motocicleta",
  CUATRICICLO: "Cuatriciclo",
  UTV: "UTV / Side by Side",
  MOTO_DE_AGUA: "Moto de Agua",
}
