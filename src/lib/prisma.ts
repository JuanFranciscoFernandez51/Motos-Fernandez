import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

// Driver serverless de Neon: conexión por WebSocket que despierta y conecta la
// base casi al instante (incluso si Neon se suspendió por inactividad),
// eliminando el "cold start" de 2-3s que tenía el driver TCP clásico.
//
// El runtime Node de Vercel no trae WebSocket global, así que se lo damos.
neonConfig.webSocketConstructor = ws

// El parámetro `channel_binding=require` (libpq) no lo soporta el driver
// serverless y puede romper la conexión: lo sacamos del connection string.
const connectionString = (process.env.DATABASE_URL || "").replace(
  /[?&]channel_binding=require/,
  (m) => (m.startsWith("?") ? "?" : "")
)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function crearPrisma() {
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? crearPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
