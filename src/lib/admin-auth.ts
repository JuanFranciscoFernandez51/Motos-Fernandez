import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session || session.user?.role !== "admin") {
    return null
  }

  return session
}
