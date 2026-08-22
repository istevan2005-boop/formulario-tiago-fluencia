import { eq } from "drizzle-orm";
import { isAdmin } from "../../../../../lib/admin-auth";
import { ensureLeadsTable, getDb } from "../../../../../db";
import { leads } from "../../../../../db/schema";

const ALLOWED_STATUSES = [
  "",
  "Já chamei",
  "Número inválido",
  "Call marcada",
  "Tinha interesse",
  "Sem interesse",
];

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "number" ? Math.trunc(body.id) : 0;
    const contactStatus = typeof body.contactStatus === "string" ? body.contactStatus : "";

    if (!id || !ALLOWED_STATUSES.includes(contactStatus)) {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }

    await ensureLeadsTable();
    const db = await getDb();
    const [updated] = await db
      .update(leads)
      .set({ contactStatus })
      .where(eq(leads.id, id))
      .returning({ id: leads.id });

    if (!updated) return Response.json({ error: "Lead não encontrado." }, { status: 404 });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return Response.json({ error: message }, { status: 500 });
  }
}
