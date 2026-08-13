# Formulário Tiago

Formulário de captação de leads (pesquisa rápida sobre inglês) construído em
Next.js, com banco Postgres via Drizzle ORM. Pronto para deploy na Vercel.

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Drizzle ORM + Postgres (Neon serverless driver)

## Rodando localmente

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env.local` (ou configure na Vercel) com:

- `DATABASE_URL` — connection string do Postgres (Vercel Postgres / Neon)
- `ADMIN_PASSWORD` — senha de acesso ao painel `/respostas`
- `WHATSAPP_GROUP_URL` — link do grupo de WhatsApp para onde o lead é redirecionado ao concluir o formulário (precisa começar com `https://chat.whatsapp.com/`)

## Banco de dados

Depois de definir `DATABASE_URL`, gere e aplique as migrations:

```bash
npm run db:generate
npm run db:push
```

A tabela `leads` também é criada automaticamente (`ensureLeadsTable`) na
primeira requisição à API, então `db:push` é opcional para o primeiro deploy.

## Estrutura

- `app/page.tsx` — formulário público (7 perguntas)
- `app/respostas/page.tsx` — painel admin com a lista de leads (protegido por senha)
- `app/api/leads` — recebe as respostas do formulário
- `app/api/admin/*` — login/logout do painel e listagem/exportação de leads
- `db/` — schema e conexão com o Postgres
