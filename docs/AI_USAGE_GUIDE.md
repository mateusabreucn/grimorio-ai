# AI_USAGE_GUIDE.md — Qual IA usar para cada tarefa

> Guia de decisão para economizar tokens e usar a IA certa na tarefa certa.
> Baseado no plano PRO do Claude.ai com acesso ao Claude Code.

---

## 🧠 REGRA GERAL

```
Haiku 4.5    → tarefas simples, repetitivas, mecânicas
Sonnet 4.6   → 80% do trabalho — padrão para código
Opus 4.6     → apenas arquitetura complexa ou debugging difícil
Gemini 2.5 Flash → runtime da aplicação (usuário final)
Gemini 2.5 Pro   → runtime apenas se Flash não der conta
```

---

## 📊 TABELA DE DECISÃO

| Tarefa | IA recomendada | Motivo |
|--------|---------------|--------|
| Criar componente React simples | **Sonnet 4.6** | padrão, boa qualidade |
| Criar componente complexo (ex: chat com streaming) | **Sonnet 4.6** | contexto suficiente |
| Refatorar arquivo grande | **Sonnet 4.6** | contexto longo |
| Arquitetura de um módulo novo | **Opus 4.6** | raciocínio profundo |
| Debug de erro difícil (>30min sem resolver) | **Opus 4.6** | vale o custo |
| Escrever tipos TypeScript repetitivos | **Haiku 4.5** (via API) | mecânico |
| Gerar migration SQL do schema | **Sonnet 4.6** | precisa de contexto |
| Escrever testes unitários simples | **Sonnet 4.6** | padrão |
| Escrever testes E2E Playwright | **Sonnet 4.6** | padrão |
| Pipeline RAG (complexo) | **Opus 4.6** | crítico, vale o custo |
| CSS/Tailwind ajustes de UI | **Sonnet 4.6** | padrão |
| Documentação/comentários | **Haiku 4.5** | mecânico |
| Security review de código | **Opus 4.6** | crítico |
| Resposta do chat (runtime) | **Gemini 2.5 Flash** | gratuito, rápido |
| Embeddings (runtime) | **text-embedding-004** | gratuito, eficiente |

---

## 🔧 CLAUDE CODE — CONFIGURAÇÃO DE MODELO POR TAREFA

No `settings.json` do Claude Code, o modelo padrão é Sonnet 4.6.
Para tarefas específicas, use flags ou edite temporariamente:

```bash
# Padrão (80% do tempo)
claude  # usa Sonnet 4.6

# Para arquitetura ou debug difícil
claude --model claude-opus-4-6

# Para tarefas mecânicas (economiza tokens)
claude --model claude-haiku-4-5-20251001
```

---

## 💡 ESTRATÉGIAS DE ECONOMIA DE TOKENS

### 1. Use `/compact` frequentemente
Quando o contexto ficar longo, rode `/compact` para resumir.
Faça isso ao trocar de arquivo ou de assunto.

### 2. Seja específico nos prompts
```
❌ "Crie o sistema de auth"
✅ "Crie o arquivo apps/web/src/lib/auth.ts com NextAuth v5,
   usando Drizzle adapter, suportando Google OAuth e Credentials.
   Siga exatamente o schema em docs/DATABASE_SCHEMA.md."
```

### 3. Divida tarefas grandes
```
❌ "Implemente toda a Fase 1"
✅ "Implemente apenas o schema Drizzle da Fase 1 (apps/web/src/lib/db/schema.ts)"
   → confirma → 
✅ "Agora crie a migration baseada nesse schema"
```

### 4. Use comandos slash customizados
```
/phase-status    → mostra fase atual sem reler tudo
/security-check  → roda checklist de segurança no arquivo atual
/db-migrate      → gera e aplica migration
```

### 5. Feche contextos desnecessários
Não deixe arquivos abertos no editor que não são relevantes à tarefa atual.

### 6. Use o Gemini 2.5 Pro via Antigravity para tarefas longas de análise
Se precisar analisar os PDFs dos livros inteiros, use o Gemini 2.5 Pro
(contexto de 1M tokens) gratuitamente. NÃO use Claude para isso.

---

## 🌐 USANDO GEMINI VIA ANTIGRAVITY (alternativa gratuita)

Para tarefas onde Claude estaria consumindo muitos tokens de análise:

### Casos de uso do Gemini via Antigravity
- Analisar PDFs grandes dos livros de RPG
- Gerar o dataset inicial de chunks para validação
- Comparar outputs do RAG com o conteúdo real do livro
- Revisar documentação longa

### Como acessar
1. Acesse o Google AI Studio: https://aistudio.google.com
2. Use `gemini-2.5-pro` para contextos longos
3. Use `gemini-2.5-flash` para tarefas rápidas (mais barato)

### Modelos disponíveis (Google AI Studio gratuito)
```
gemini-2.5-pro      → contexto 1M tokens, ideal para PDFs inteiros
gemini-2.5-flash    → rápido, 1M contexto, ideal para chat runtime
gemma-3             → open source, pode rodar localmente (14B)
```

### Para rodar Gemma 3 localmente (até 14B)
```bash
# Via Ollama
ollama pull gemma3:12b
ollama run gemma3:12b

# Use para: testes locais do RAG sem gastar API calls
```

---

## 📋 PROTOCOLO DE SESSÃO DE TRABALHO

Siga este ritual no início de cada sessão com Claude Code:

```
1. Abra o Claude Code
2. Rode: /read CLAUDE.md
3. Rode: /read docs/PHASES.md
4. Confirme a fase ativa
5. Defina UM objetivo claro para a sessão
6. Trabalhe nesse objetivo até concluir
7. Ao concluir: atualize PHASES.md manualmente
8. Faça commit com mensagem descritiva
```

---

## 🚨 SINAIS DE QUE VOCÊ PRECISA TROCAR DE IA

### Troque para Opus 4.6 quando:
- Sonnet está dando soluções erradas na terceira tentativa
- O problema envolve múltiplos sistemas interagindo
- É uma decisão de arquitetura que afetará o projeto todo
- Bug difícil com comportamento inesperado

### Troque para Haiku quando:
- A tarefa é puramente mecânica (gerar boilerplate, formatar código)
- Você já sabe exatamente o que quer e só precisa da execução
- São mais de 10 arquivos similares para criar

### Volte para Sonnet quando:
- A tarefa de Opus foi concluída
- Haiku começou a cometer erros por falta de contexto
