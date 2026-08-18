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
  fluencyDeadline: string;
  status: "complete" | "incomplete";
  lastStep: number;
  createdAt: string;
  updatedAt: string;
};

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

export default function RespostasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
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
      if (!term) return true;
      return Object.values(lead).some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [leads, search, urgencyFilter]);

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
          <a className="admin-button primary" href="/api/admin/leads/export">Baixar CSV</a>
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
          {urgencyFilter && (
            <button type="button" className="admin-button" onClick={() => setUrgencyFilter("")}>Limpar filtro</button>
          )}
        </div>
        {urgencyFilter && (
          <p className="filter-summary">{filtered.length} lead{filtered.length === 1 ? "" : "s"} com prazo &ldquo;{urgencyFilter}&rdquo;</p>
        )}
        {filtered.length ? (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Status</th><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Cenário</th><th>Ocupação</th><th>Já tentou aprender</th><th>Investiu em curso</th><th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td><span className={`lead-status ${lead.status}`}>{lead.status === "complete" ? "Concluído" : `Incompleto · ${lead.lastStep}/7`}</span></td>
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
