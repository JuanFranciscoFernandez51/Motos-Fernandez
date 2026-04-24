import fs from "fs"
import path from "path"

// Lee el logo del filesystem para embeberlo en los PDFs.
// Se cachea en memoria la primera vez.
let cachedLogo: Buffer | null = null

export function getLogoBuffer(): Buffer {
  if (cachedLogo) return cachedLogo
  const logoPath = path.join(
    process.cwd(),
    "public/images/logo-clasico-transparente.png"
  )
  cachedLogo = fs.readFileSync(logoPath)
  return cachedLogo
}
