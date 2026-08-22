import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não está definida. Configure a variável de ambiente com a connection string do Postgres (Vercel Postgres / Neon) antes de usar o banco."
    );
  }
  return url;
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const sql = neon(getConnectionString());
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

let schemaReady: Promise<unknown> | null = null;

export async function ensureLeadsTable() {
  const sql = neon(getConnectionString());

  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        situation TEXT NOT NULL,
        profession TEXT NOT NULL,
        english_history TEXT DEFAULT 'Não informado' NOT NULL,
        previous_investment TEXT NOT NULL,
        fluency_deadline TEXT NOT NULL,
        status TEXT DEFAULT 'complete' NOT NULL,
        contact_status TEXT DEFAULT '' NOT NULL,
        last_step INTEGER DEFAULT 7 NOT NULL,
        update_token TEXT DEFAULT '' NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT '' NOT NULL
      )
    `;

    const columns = (await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'
    `) as { column_name: string }[];
    const names = new Set(columns.map((c) => c.column_name));

    if (!names.has("english_history")) await sql`ALTER TABLE leads ADD COLUMN english_history TEXT DEFAULT 'Não informado' NOT NULL`;
    if (!names.has("status")) await sql`ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'complete' NOT NULL`;
    if (!names.has("contact_status")) await sql`ALTER TABLE leads ADD COLUMN contact_status TEXT DEFAULT '' NOT NULL`;
    if (!names.has("last_step")) await sql`ALTER TABLE leads ADD COLUMN last_step INTEGER DEFAULT 7 NOT NULL`;
    if (!names.has("update_token")) await sql`ALTER TABLE leads ADD COLUMN update_token TEXT DEFAULT '' NOT NULL`;
    if (!names.has("updated_at")) await sql`ALTER TABLE leads ADD COLUMN updated_at TEXT DEFAULT '' NOT NULL`;
  })();

  await schemaReady;
}
