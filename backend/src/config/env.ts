import "dotenv/config"

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.warn(`Variável de ambiente ${name} não configurada.`)
    return ""
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  databaseUrl: required("DATABASE_URL"),
}
