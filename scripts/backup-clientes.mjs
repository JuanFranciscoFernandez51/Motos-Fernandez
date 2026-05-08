// Backup de la tabla Cliente antes de importar.
// Lee DATABASE_URL del .env.local y exporta a tmp/backup-clientes-pre-import.json
import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import { config } from "dotenv"
config({ path: ".env.local" })

const prisma = new PrismaClient()

try {
  const count = await prisma.cliente.count()
  console.log(`Clientes actuales en DB: ${count}`)
  if (count > 0) {
    const todos = await prisma.cliente.findMany()
    fs.mkdirSync("tmp", { recursive: true })
    fs.writeFileSync(
      "tmp/backup-clientes-pre-import.json",
      JSON.stringify(todos, null, 2)
    )
    console.log("✅ Backup guardado en tmp/backup-clientes-pre-import.json")
  } else {
    console.log("(DB vacía, no hace falta backup)")
  }
} catch (e) {
  console.error("Error:", e.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
