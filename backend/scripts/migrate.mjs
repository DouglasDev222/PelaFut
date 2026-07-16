import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "pg"
import "dotenv/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, "../../supabase/migrations")

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL não configurada em backend/.env")
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(
    "create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())"
  )

  const applied = new Set(
    (await client.query("select name from public._migrations")).rows.map((r) => r.name)
  )

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`(já aplicada) ${file}`)
      continue
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8")
    console.log(`aplicando ${file}...`)
    await client.query("begin")
    try {
      await client.query(sql)
      await client.query("insert into public._migrations (name) values ($1)", [file])
      await client.query("commit")
      console.log(`  ok: ${file}`)
    } catch (err) {
      await client.query("rollback")
      throw err
    }
  }

  console.log("Migrations em dia.")
} catch (err) {
  console.error("Erro ao migrar:", err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
