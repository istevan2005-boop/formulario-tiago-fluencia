import { eq } from "drizzle-orm";
import { isAdmin } from "../../../../../lib/admin-auth";
import { ensureLeadsTable, getDb } from "../../../../../db";
import { leads } from "../../../../../db/schema";

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "number" ? Math.trunc(body.id) : 0;
    if (!id) return Response.json({ error: "Dados inválidos." }, { status: 400 });

    await ensureLeadsTable();
    const db = await getDb();
    const [deleted] = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });

    if (!deleted) return Response.json({ error: "Lead não encontrado." }, { status: 404 });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return Response.json({ error: message }, { status: 500 });
  }
}
