import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      permisos: string[]
    }
  }

  interface User {
    role: string
    permisos: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    permisos: string[]
  }
}
