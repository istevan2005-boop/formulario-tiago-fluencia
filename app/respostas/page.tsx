"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Lead = {
  id: number;
  name: string;
  whatsapp: string;
  situation: string;
  profession: string;
  englishHistory: string;
  previousInvestment: string;
  investmentBudget: string;
  fluencyDeadline: string;
  status: "complete" | "incomplete";
  contactStatus: string;
  lastStep: number;
  createdAt: string;
  updatedAt: string;
};

const CONTACT_STATUS_OPTIONS = [
  "Já chamei",
  "Número inválido",
  "Call marcada",
  "Tinha interesse",
  "Sem interesse",
];

const BUDGET_OPTIONS = [
  "Até R$600",
  "Entre R$600 e R$1.200",
  "Entre R$1.200 e R$2.400",
  "Acima de R$2.400 (quero o acompanhamento mais completo com o Tiago)",
];

function parseDate(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized);
}

function dateLabel(value: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadLeadsCsv(rows: Lead[]) {
  const header = ["ID", "Status", "Contato", "Última etapa", "Data", "Última atualização", "Nome", "WhatsApp", "Cenário", "Ocupação", "Histórico com inglês", "Investimento em curso", "Orçamento disposto", "Prazo para fluência"];
  const lines = rows.map((lead) =>
    [
      lead.id,
      lead.status === "complete" ? "Concluído" : "Incompleto",
      lead.contactStatus || "",
      `${lead.lastStep}/8`,
      lead.createdAt,
      lead.updatedAt || lead.createdAt,
      lead.name,
      lead.whatsapp,
      lead.situation,
      lead.profession,
      lead.englishHistory,
      lead.previousInvestment,
      lead.investmentBudget,
      lead.fluencyDeadline,
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = `﻿${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `respostas-tiago-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function RespostasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLeads() {
    const response = await fetch("/api/admin/leads", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (!response.ok) throw new Error("Não foi possível carregar as respostas.");
    const result = (await response.json()) as { leads: Lead[] };
    setLeads(result.leads);
    setAuthenticated(true);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/leads", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setAuthenticated(false);
          return;
        }
        if (!response.ok) throw new Error("Não foi possível carregar as respostas.");
        const result = (await response.json()) as { leads: Lead[] };
        if (active) {
          setLeads(result.leads);
          setAuthenticated(true);
        }
      })
      .catch((loadError) => {
        if (!active) return;
        setAuthenticated(false);
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar.");
      });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      setPassword("");
      await loadLeads();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLeads([]);
    setAuthenticated(false);
  }

  async function updateContactStatus(id: number, contactStatus: string) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, contactStatus } : lead)));
    try {
      const response = await fetch("/api/admin/leads/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, contactStatus }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setLeads(previous);
      setError("Não foi possível salvar essa marcação. Tenta de novo.");
    }
  }

  const urgencyOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const lead of leads) {
      if (lead.fluencyDeadline) seen.add(lead.fluencyDeadline);
    }
    return Array.from(seen);
  }, [leads]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return leads.filter((lead) => {
      if (urgencyFilter && lead.fluencyDeadline !== urgencyFilter) return false;
      if (budgetFilter && lead.investmentBudget !== budgetFilter) return false;
      if (contactFilter && !(contactFilter === "Sem marcação" ? !lead.contactStatus : lead.contactStatus === contactFilter)) return false;
      if (!term) return true;
      return Object.values(lead).some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [leads, search, urgencyFilter, contactFilter, budgetFilter]);

  const completedCount = useMemo(() => leads.filter((lead) => lead.status === "complete").length, [leads]);
  const incompleteCount = leads.length - completedCount;

  if (authenticated !== true) {
    return (
      <main className="admin-shell">
        <form className="admin-login" onSubmit={login}>
          <div className="brand-mark">TF</div>
          <h1>Área de respostas</h1>
          <p>Digite a senha de administrador para consultar os leads.</p>
          <input type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="submit-button" type="submit" disabled={loading || authenticated === null}>
            {authenticated === null ? "Carregando..." : loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-title">
          <h1>Respostas do formulário</h1>
          <p>Leads e segmentação do público do Tiago.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button primary" onClick={() => downloadLeadsCsv(filtered)}>
            Baixar CSV {(urgencyFilter || contactFilter || budgetFilter || search) ? `(${filtered.length} filtrados)` : ""}
          </button>
          <button className="admin-button" type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      <section className="admin-stats">
        <div className="stat-card"><span>Total de leads</span><strong>{leads.length}</strong></div>
        <div className="stat-card"><span>Concluíram</span><strong>{completedCount}</strong></div>
        <div className="stat-card"><span>Incompletos</span><strong>{incompleteCount}</strong></div>
      </section>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <input className="admin-search" type="search" placeholder="Buscar por nome, WhatsApp ou resposta..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="admin-filter" value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)}>
            <option value="">Todos os prazos</option>
            {urgencyOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="admin-filter" value={contactFilter} onChange={(event) => setContactFilter(event.target.value)}>
            <option value="">Todos os contatos</option>
            <option value="Sem marcação">Sem marcação</option>
            {CONTACT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="admin-filter" value={budgetFilter} onChange={(event) => setBudgetFilter(event.target.value)}>
            <option value="">Todos os orçamentos</option>
            {BUDGET_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {(urgencyFilter || contactFilter || budgetFilter) && (
            <button type="button" className="admin-button" onClick={() => { setUrgencyFilter(""); setContactFilter(""); setBudgetFilter(""); }}>Limpar filtros</button>
          )}
        </div>
        {(urgencyFilter || contactFilter || budgetFilter) && (
          <p className="filter-summary">{filtered.length} lead{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}</p>
        )}
        {filtered.length ? (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Status</th><th>Contato</th><th>Orçamento</th><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Cenário</th><th>Ocupação</th><th>Já tentou aprender</th><th>Investiu em curso</th><th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td><span className={`lead-status ${lead.status}`}>{lead.status === "complete" ? "Concluído" : `Incompleto · ${lead.lastStep}/8`}</span></td>
                    <td>
                      <select
                        className={`contact-select ${lead.contactStatus ? `tag-${CONTACT_STATUS_OPTIONS.indexOf(lead.contactStatus)}` : ""}`}
                        value={lead.contactStatus}
                        onChange={(event) => void updateContactStatus(lead.id, event.target.value)}
                      >
                        <option value="">Marcar...</option>
                        {CONTACT_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {lead.investmentBudget ? (
                        <span className={`budget-tag ${lead.investmentBudget === BUDGET_OPTIONS[3] ? "budget-high" : ""}`}>{lead.investmentBudget}</span>
                      ) : "—"}
                    </td>
                    <td>{dateLabel(lead.createdAt)}</td>
                    <td><strong>{lead.name}</strong></td>
                    <td><a href={whatsappLink(lead.whatsapp)} target="_blank" rel="noreferrer">{lead.whatsapp}</a></td>
                    <td>{lead.situation || "—"}</td>
                    <td>{lead.profession || "—"}</td>
                    <td>{lead.englishHistory || "—"}</td>
                    <td>{lead.previousInvestment || "—"}</td>
                    <td>{lead.fluencyDeadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">{search ? "Nenhuma resposta encontrada." : "Ainda não há respostas."}</div>
        )}
      </section>
    </main>
  );
}
