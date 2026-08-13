import { desc } from "drizzle-orm";
import { isAdmin } from "../../../../lib/admin-auth";
import { ensureLeadsTable, getDb } from "../../../../db";
import { leads } from "../../../../db/schema";

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  await ensureLeadsTable();
  const db = await getDb();
  const rows = await db.select({
    id: leads.id,
    name: leads.name,
    whatsapp: leads.whatsapp,
    situation: leads.situation,
    profession: leads.profession,
    englishHistory: leads.englishHistory,
    previousInvestment: leads.previousInvestment,
    fluencyDeadline: leads.fluencyDeadline,
    status: leads.status,
    lastStep: leads.lastStep,
    createdAt: leads.createdAt,
    updatedAt: leads.updatedAt,
  }).from(leads).orderBy(desc(leads.id)).limit(2000);
  return Response.json({ leads: rows });
}
