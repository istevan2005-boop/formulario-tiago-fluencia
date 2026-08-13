import { and, eq } from "drizzle-orm";
import { ensureLeadsTable, getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getRuntimeValue } from "../../../lib/runtime";

const allowed = {
  situation: ["Já moro fora", "Vou morar fora em breve", "Viajo a trabalho", "Vou viajar em breve"],
  profession: ["Empresário(a)", "Liberal ou autônomo(a)", "CLT", "Estudante"],
  englishHistory: ["Sim, várias vezes", "Sim, mas parei no caminho", "Estou estudando atualmente", "Não, seria minha primeira vez"],
  previousInvestment: ["Sim, mais de uma vez", "Sim, uma vez", "Ainda não, mas quero", "Nunca foi prioridade"],
  fluencyDeadline: ["O mais rápido possível", "Em algumas semanas", "Até 3 meses", "Até 1 ano", "Sem prazo definido"],
};

function text(body: Record<string, unknown>, key: string, max = 160) {
  return typeof body[key] === "string" ? body[key].trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (text(body, "website")) return Response.json({ ok: true }, { status: 201 });

    const name = text(body, "name", 120);
    const whatsapp = text(body, "whatsapp", 32);
    const situation = text(body, "situation");
    const profession = text(body, "profession");
    const englishHistory = text(body, "englishHistory");
    const previousInvestment = text(body, "previousInvestment");
    const fluencyDeadline = text(body, "fluencyDeadline");

    const contactIsValid = name.length >= 2 && whatsapp.replace(/\D/g, "").length >= 10;
    const answersAreValid =
      (!situation || allowed.situation.includes(situation)) &&
      (!profession || allowed.profession.includes(profession)) &&
      (!englishHistory || allowed.englishHistory.includes(englishHistory)) &&
      (!previousInvestment || allowed.previousInvestment.includes(previousInvestment)) &&
      (!fluencyDeadline || allowed.fluencyDeadline.includes(fluencyDeadline));

    if (!contactIsValid || !answersAreValid) {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const isComplete = Boolean(situation && profession && englishHistory && previousInvestment && fluencyDeadline);
    const requestedStep = typeof body.lastStep === "number" ? Math.trunc(body.lastStep) : 2;
    const lastStep = isComplete ? 7 : Math.max(2, Math.min(6, requestedStep));
    const now = new Date().toISOString();

    await ensureLeadsTable();
    const db = await getDb();
    const leadId = typeof body.leadId === "number" ? Math.trunc(body.leadId) : 0;
    const updateToken = text(body, "updateToken", 120);

    let savedId = leadId;
    let savedToken = updateToken;

    if (leadId && updateToken) {
      const [updated] = await db.update(leads).set({
        name,
        whatsapp,
        situation,
        profession,
        englishHistory,
        previousInvestment,
        fluencyDeadline,
        status: isComplete ? "complete" : "incomplete",
        lastStep,
        updatedAt: now,
      }).where(and(eq(leads.id, leadId), eq(leads.updateToken, updateToken))).returning({ id: leads.id });

      if (!updated) return Response.json({ error: "Cadastro não encontrado." }, { status: 404 });
    } else {
      savedToken = crypto.randomUUID();
      const [created] = await db.insert(leads).values({
        name,
        whatsapp,
        situation,
        profession,
        englishHistory,
        previousInvestment,
        fluencyDeadline,
        status: isComplete ? "complete" : "incomplete",
        lastStep,
        updateToken: savedToken,
        updatedAt: now,
      }).returning({ id: leads.id });
      savedId = created.id;
    }

    const configuredGroupUrl = isComplete ? await getRuntimeValue("WHATSAPP_GROUP_URL") : "";
    const groupUrl = configuredGroupUrl.startsWith("https://chat.whatsapp.com/") ? configuredGroupUrl : "";

    return Response.json({
      ok: true,
      leadId: savedId,
      updateToken: savedToken,
      status: isComplete ? "complete" : "incomplete",
      groupUrl,
    }, { status: leadId ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return Response.json({ error: message }, { status: 500 });
  }
}
