import { desc } from "drizzle-orm";
import { isAdmin } from "../../../../../lib/admin-auth";
import { ensureLeadsTable, getDb } from "../../../../../db";
import { leads } from "../../../../../db/schema";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  await ensureLeadsTable();
  const db = await getDb();
  const rows = await db.select().from(leads).orderBy(desc(leads.id));
  const header = ["ID", "Status", "Contato", "Última etapa", "Data", "Última atualização", "Nome", "WhatsApp", "Cenário", "Ocupação", "Histórico com inglês", "Investimento em curso", "Prazo para fluência"];
  const lines = rows.map((lead) => [lead.id, lead.status === "complete" ? "Concluído" : "Incompleto", lead.contactStatus || "", `${lead.lastStep}/7`, lead.createdAt, lead.updatedAt || lead.createdAt, lead.name, lead.whatsapp, lead.situation, lead.profession, lead.englishHistory, lead.previousInvestment, lead.fluencyDeadline].map(csvCell).join(","));
  const csv = `\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="respostas-tiago-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
