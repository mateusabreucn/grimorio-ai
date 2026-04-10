# Grimório AI — Frontend (Next.js)

## Setup Local

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha as variáveis:

```bash
cp .env.example .env.local
```

**Essencial para Fase 1:**
- `DATABASE_URL` — Connection Pooler do Supabase (Transaction mode, port 6543)
- `NEXTAUTH_SECRET` — Já gerado automaticamente
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — Do Google Cloud Console

### 2. Banco de Dados

Aplique as migrations ao Supabase:

```bash
pnpm db:migrate
```

### 3. Instalação e Desenvolvimento

```bash
# Instalar dependências (já feito no root)
pnpm install

# Rodar em desenvolvimento
pnpm dev
```

O app estará em `http://localhost:3000`

## Fluxo de Autenticação (Fase 1)

- **Rotas protegidas:** `/chat`, `/journal` (redirecionam para `/login` se não autenticado)
- **Rotas públicas:** `/login`, `/register`, `/` (redireciona para `/chat` se logado)
- **Auth:** NextAuth.js v5 com JWT + Credentials + Google OAuth

## Build & Deploy (Vercel)

```bash
# Build para produção
pnpm build

# Teste local
pnpm start
```

No Vercel, configure variáveis de ambiente em **Settings → Environment Variables**:
- Use o Connection Pooler do Supabase (não a URL direta do banco)
- `NEXTAUTH_URL` deve ser `https://seu-dominio.vercel.app`
- Adicione Google OAuth redirect URI em `https://seu-dominio.vercel.app/api/auth/callback/google`

## Checklist Fase 1

- [x] Setup monorepo pnpm
- [x] Projeto Next.js 14 + TypeScript strict
- [x] Tailwind CSS + shadcn/ui
- [x] Drizzle ORM + schema do banco
- [x] NextAuth.js v5 (Credentials + Google)
- [x] Middleware de proteção
- [x] Layout base (Navbar + Sidebar)
- [x] Páginas login/register funcionales
- [ ] Migration aplicada ao Supabase (aguardando Connection Pooler)
- [ ] Deploy na Vercel

## Próximas Fases

- **Fase 2:** RAG Service (FastAPI) + ingestão de PDFs
- **Fase 3:** Chat com IA (Gemini 2.5 Flash) + streaming
- **Fase 4:** Journal de Campanha
- **Fase 5:** Polish + segurança + deploy final
