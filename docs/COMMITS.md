# COMMITS.md — Convenção de Commits do Grimório AI

> Guia para quem (Codex, Gemini, humano) for criar commits neste repositório.
> Padrão observado nos commits anteriores — siga sempre.

---

## Formato da mensagem

```
tipo(escopo): descrição em português, sem corpo, sem trailers
```

- **Uma linha só.** Sem corpo explicativo, sem `Co-Authored-By`, sem `Signed-off-by`.
- **Português do Brasil**, imperativo no presente (“adicionar”, “corrigir”, “remover”), minúsculo após os dois-pontos.
- **Sem ponto final.**
- **Até 72 caracteres**, idealmente; mensagens curtas e objetivas.

### Exemplos reais do projeto

```
feat(chat): RAG via tool calling com múltiplas buscas por resposta
fix(chat): remover StreamData para evitar crash no pipe
refactor(rag): migrar embeddings de Ollama/qwen3 para Voyage AI
style(web): redesign temático do chat e sidebar
docs: atualizar documentação para Voyage AI e status das fases
```

---

## Tipos (prefixos)

Use um destes, e só estes:

| Tipo       | Quando usar |
|------------|-------------|
| `feat`     | Funcionalidade nova (endpoint novo, componente novo, fluxo novo) |
| `fix`      | Correção de bug — incluindo regressões e edge cases |
| `refactor` | Mudança de código sem alterar comportamento externo (rename, extrair função, troca de implementação interna) |
| `style`    | Mudança visual/CSS/tema/layout sem alterar lógica. Também: formatação de código (linter, prettier) |
| `docs`     | Apenas arquivos `.md`, comentários ou documentação |
| `chore`    | Mexer em config (lockfile, deps, scripts npm, CI) sem mudar código de aplicação |
| `test`     | Adicionar/ajustar testes (golden test, unit tests) |
| `perf`     | Otimização de performance demonstrável |

Não use `wip`, `update`, `misc`, `init` — eles não explicam o que mudou.

---

## Escopos (parênteses)

Sempre obrigatório quando aplicável. Escopos válidos:

| Escopo     | Cobre |
|------------|-------|
| `chat`     | Pipeline de conversa: `apps/web/src/app/api/chat/`, `lib/ai/prompts.ts`, `route.ts` |
| `rag`      | Tudo em `apps/rag-service/` (Python, FastAPI, ingestão, pgvector) |
| `web`      | Frontend Next.js geral — UI, components, layout, autenticação, sidebar |
| `auth`     | Especificamente autenticação (NextAuth, middleware) |
| `db`       | Schema Drizzle, migrations, conexão |
| `scripts`  | Scripts de manutenção (`pnpm db:*`, `pnpm rag:ingest`, `pnpm golden`) |
| `journal`  | Funcionalidade Journal (a partir da Fase 4) |
| `tests`    | Golden test set ou testes unitários |
| `deps`     | Atualizações de dependência |

Quando a mudança não tem escopo claro (ex: atualizar README na raiz), pode-se omitir: `docs: ...`.

Quando uma mudança toca dois domínios (ex: `chat` + `rag` ao mesmo tempo), **prefira dividir em dois commits**. Se for impossível (mudança coordenada que quebraria isolada), use o escopo do domínio principal e mencione o outro na descrição.

---

## Divisão de arquivos em commits

**Regra geral: um commit = uma intenção lógica.** Não bundle alterações sem relação.

### Por funcionalidade (não por arquivo)

Errado:
```
feat(chat): editar route.ts
feat(chat): editar prompts.ts
feat(chat): editar client.ts
```

Certo:
```
feat(chat): pipeline 2-step planner → busca híbrida → synthesizer
```
(esse único commit toca `route.ts` + `prompts.ts` + `client.ts` porque os três mudam em conjunto para entregar a mesma feature)

### Por domínio quando independente

Se você fez 3 coisas independentes, divida:
```
feat(rag): endpoint /search/multi com busca híbrida vetorial + lexical
feat(chat): consumir /search/multi com queries e keywords do planner
docs: atualizar RAG_PIPELINE.md com fluxo 2-step
```

### Quando NÃO juntar
- Mudanças em domínios diferentes (`chat` + `rag`) que poderiam ser desacopladas
- Refactor + feature na mesma área (faça o refactor antes, depois a feature em cima)
- Style/format + lógica (faça o format isolado primeiro)
- Bug fix + nova funcionalidade

### Quando JUNTAR está OK
- Várias arquivos que materializam **uma** mudança lógica (a feature do pipeline 2-step toca 3 arquivos e faz sentido junta)
- Migration + código que depende dela (não pode merger meio)
- Renomeação que atravessa o repo

---

## Princípios práticos

1. **Atomicidade**: cada commit deve poder ser revertido isoladamente sem quebrar o build.
2. **Bisect-friendly**: idealmente o repo deve compilar em qualquer commit do histórico.
3. **Não commitar segredos**: `.env*`, chaves, `.DS_Store`, `node_modules/`, lockfiles fora dos esperados.
4. **Lockfile junto da feature**: se `package.json` mudou e gerou novo `pnpm-lock.yaml`, ambos vão no mesmo commit.
5. **Arquivos gerados ficam de fora**: `results-*.json` do golden test, `.next/`, `dist/` — todos via `.gitignore`.

---

## O que NÃO incluir

- `Co-Authored-By: ...` — preferência explícita do mantenedor.
- `🤖 Generated with Claude Code` ou equivalente — preferência explícita do mantenedor.
- Corpo longo com motivação/contexto — vai no PR/issue, não no commit.
- Mensagens em inglês — projeto é em português.
- Verbos no passado (“adicionei X”) — use imperativo (“adicionar X”).

---

## Resumo visual

```
✅ feat(rag): busca lexical complementar à vetorial em /search/multi
✅ fix(chat): planner gera keywords além de queries para nomes próprios
✅ refactor(rag): extrair offset de página para config por livro
✅ docs: documentar pipeline 2-step e estratégia de retrieval
✅ chore(deps): adicionar tsx para rodar scripts TS standalone

❌ update stuff
❌ feat: changes (sem escopo + inglês)
❌ feat(rag): adiciona endpoint e corrige bug do tema (dois assuntos)
❌ fix(chat): corrige tudo
```
