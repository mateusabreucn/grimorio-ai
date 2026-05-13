# TESTING.md — Estratégia de Testes do Grimório AI

> Como avaliar a qualidade do chat RAG sem ter o livro como ground truth disponível
> programaticamente. Honesto sobre limitações.

---

## Visão geral

O Grimório é um chat **RAG** (Retrieval-Augmented Generation). “Funciona ou não funciona”
não é binário — depende de duas perguntas distintas:

1. **O RAG trouxe os trechos certos do livro?** → problema de *retrieval*
2. **A resposta da IA é fiel aos trechos?** → problema de *faithfulness*

Quando o usuário percebe uma resposta ruim, quase sempre é uma dessas duas falhas
(às vezes ambas). Este documento descreve como detectá-las e medi-las.

---

## Os três tipos de qualidade

| Métrica | O que mede | Precisa do livro como referência? | Como avaliar |
|--------|------------|-----------------------------------|--------------|
| **Faithfulness** | A resposta usa apenas o que está nos chunks retornados? | ❌ Não | Comparar resposta vs `topChunks` no `results.json` |
| **Retrieval relevance** | Os chunks retornados respondem à pergunta? | ❌ Não | Inspecionar `topChunks` — eles contêm a info? |
| **Answer correctness** | A resposta é factualmente correta segundo o livro? | ✅ Sim | Juiz humano (você) abrindo o PDF, **OU** LLM-as-judge com PDF no contexto |

A maior parte dos problemas vistos até hoje (essência de mana não achada, salto
dimensional confundido com viagem planar, hospedagem não encontrada quando
perguntado “descansar”) foram **falhas de retrieval**, não de correctness.
Não precisava do livro para diagnosticar — só olhar os chunks retornados.

---

## Golden Test Set

### O que é

Um conjunto curado de perguntas com resposta esperada, em
`apps/web/scripts/golden/questions.json`. **Não é** ground truth absoluto — é uma
régua para:

- **Detectar regressões** (mudei X, alguma resposta piorou?)
- **Diagnosticar onde estão os gaps estruturais** (vários casos da mesma
  categoria falham → problema sistêmico no planner/synthesizer/retrieval)
- **Comparar abordagens** (com/sem busca híbrida, com/sem keywords, etc.)

### Como rodar

```bash
# Pré-requisito: RAG service rodando (porta 8000 por padrão)
pnpm dev:rag

# Em outro terminal:
cd apps/web

# Roda todas as perguntas
pnpm golden

# Roda só perguntas cujo id contém uma substring
pnpm golden essencia      # → só item-essencia-mana
pnpm golden rule-         # → todas as regras
pnpm golden casual        # → conversas casuais

# Override do RAG_SERVICE_URL (ex: se a porta 8000 está ocupada)
RAG_SERVICE_URL=http://localhost:8001 pnpm golden
```

### Saída

Cada execução gera dois arquivos em `apps/web/scripts/golden/`:

- `results-{timestamp}.json` — histórico (não commitar, está no `.gitignore`)
- `results-latest.json` — última execução (não commitar)

Estrutura de cada resultado:

```json
{
  "id": "item-essencia-mana",
  "category": "specific-item",
  "question": "Quanto custa uma essência de mana?",
  "expected": "T$ 50, 0,5 espaços, pg 156...",
  "answer": "A essência de mana custa T$ 50...",
  "planner": {
    "needsSearch": true,
    "queries": ["custo essência de mana", "..."],
    "keywords": ["essência de mana"]
  },
  "retrieval": {
    "chunkCount": 24,
    "topChunks": [
      { "book": "Tormenta 20 — Livro Básico", "page": 156, "score": 0.75, "preview": "..." }
    ]
  },
  "elapsedMs": 8511
}
```

---

## Como avaliar uma resposta

Para cada item do `results-latest.json`, faça as 4 perguntas abaixo, nesta ordem:

### 1. O planner fez sentido?
- `needsSearch` está correto? (`false` só para saudações, agradecimentos e meta-perguntas)
- `queries` cobrem múltiplos ângulos da pergunta? Misturam termos literais + sinônimos?
- `keywords` estão preenchidos quando a pergunta tem nome próprio (magia/item/divindade específica)?

**Se aqui já está ruim:** ajuste `PLANNER_SYSTEM_PROMPT` (`apps/web/src/lib/ai/prompts.ts`) com um exemplo similar ao caso falho.

### 2. O retrieval trouxe o chunk certo?
- Olhe os `topChunks[].preview` — algum deles contém literalmente a informação que a pergunta pede?
- Se sim e o modelo ainda errou → problema de **faithfulness** (synthesizer).
- Se não → problema de **retrieval** (planner gerou termos ruins, ou a busca lexical/vetorial falhou para esse caso, ou o chunk não existe no banco).

### 3. A resposta é fiel aos chunks?
- Cada afirmação técnica (preço, valor, regra, página) está presente nos chunks?
- A resposta usa **apenas** o que os chunks dizem, sem completar com conhecimento externo?
- A página citada bate com a página do chunk que tem a info?

**Se inventou:** ajuste `SYNTHESIZER_SYSTEM_PROMPT` reforçando o item violado.

### 4. A correctness é confirmada?
**Só esta exige o livro.** Se desconfiar:
- Abra o PDF do livro citado na resposta, vá até a página.
- Confira o valor/regra.
- Se diverge: o problema está no chunk (texto mal extraído do PDF) ou na resposta.

---

## Limitações honestas desta abordagem

### O golden test não cobre a long tail

17–20 perguntas curadas não representam o que usuários reais vão perguntar. O
golden test serve para:
- Catch de regressões em casos conhecidos
- Diagnóstico estrutural

Para qualidade real de produção, **você precisa de feedback de usuários reais**
(ver “Estratégia de evolução” abaixo).

### O avaliador (IA ou pessoa sem o livro fresco na cabeça) pode errar

Quando uma IA (Claude, Gemini, GPT) avalia se uma resposta está correta sem
acesso ao livro, ela usa o que “lembra” do treinamento — que pode estar
desatualizado, incompleto ou simplesmente errado. **Conhecimento de treinamento
não é fonte de verdade.**

Por isso o golden test, ao ser avaliado por LLM-as-judge, mede principalmente
**faithfulness e relevance**, não **correctness**.

### O `expected` no questions.json é uma orientação, não um gabarito

Quem criou as perguntas (eu, Claude, ou você) escreveu o que **achava** que a
resposta certa seria. Pode estar errado. Quando você bater o olho num caso
suspeito, confirme contra o PDF e atualize o `expected` se necessário.

---

## Estratégia de evolução

Aqui estão as opções para sair do “golden test manual” em ordem de custo
crescente:

### Curto prazo — só você + golden test
- Você abre o `results-latest.json`, lê os casos suspeitos, abre o PDF para
  confirmar, e me/codex aponta o caso para refino.
- Funciona bem para regressões e gaps estruturais.

### Médio prazo — feedback de usuários reais (👍/👎)
- Adicionar botão de avaliação em cada resposta do chat.
- Salvar `(pergunta, resposta, chunks_retornados, voto)` no banco.
- Periodicamente revisar os 👎: viraram amostra para refinar prompts **e**
  para expandir o golden test set.
- **É a estratégia mais escalável.** Os usuários (mestres, jogadores)
  conhecem o livro melhor que qualquer IA.

### Médio-longo prazo — LLM-as-judge com PDF no contexto
- Gemini 2.5 Pro tem janela de 2M tokens — cabem os 4 PDFs juntos.
- Script automatizado: passa cada `(pergunta, resposta)` do golden test + PDFs
  inteiros + “avalie correctness” para o Gemini, pega nota e justificativa.
- Custa por chamada, mas dá avaliação objetiva sem depender do conhecimento
  prévio do modelo.

### Longo prazo — métricas RAGAS
- Biblioteca Python `ragas` calcula automaticamente:
  - `faithfulness` (resposta vs contexto)
  - `answer_relevancy` (resposta vs pergunta)
  - `context_precision` (chunks vs pergunta)
  - `context_recall` (chunks vs resposta ideal)
- Usa LLM internamente, mas com métricas padronizadas — comparável entre
  versões do sistema.

---

## Quando refinar o prompt vs quando NÃO refinar

Você tem razão em desconfiar de “adicionar facts no prompt sempre que erra” —
seria insustentável. **Refine o prompt quando:**

✅ Você identifica um **padrão** estrutural:
- “Toda vez que o usuário usa termo coloquial, o planner não busca o termo
  canônico.” → adicionar exemplo no planner que generaliza.
- “O synthesizer está trazendo conteúdo de tabelas auxiliares como se fossem
  oficiais.” → adicionar regra geral no synthesizer.

✅ O problema é de **vocabulário/conexão** (descanso ↔ hospedagem, vida ↔ PV).

✅ O problema é de **interpretação do papel** (modelo se desculpa demais,
tom errado, expõe a infra).

**NÃO refine o prompt quando:**

❌ É um caso isolado de fact que não generaliza.
❌ O chunk certo nem foi retornado (problema de retrieval, não de prompt).
❌ O PDF foi extraído com erro (problema de ingestão).

---

## Estrutura dos arquivos de teste

```
apps/web/scripts/golden/
├── questions.json          ← perguntas curadas (commitar)
├── eval.ts                 ← runner standalone via tsx (commitar)
├── results-latest.json     ← última execução (NÃO commitar — .gitignore)
└── results-{timestamp}.json← histórico (NÃO commitar — .gitignore)
```

### Adicionar nova pergunta

1. Abra `apps/web/scripts/golden/questions.json`.
2. Adicione um objeto:

```json
{
  "id": "categoria-slug-curto",
  "category": "enumeration|specific-item|specific-spell|rules-combat|...",
  "question": "Pergunta exata como um usuário escreveria",
  "expected": "Descrição do que uma boa resposta deve conter, sem precisar ser literal",
  "notes": "Por que essa pergunta existe (opcional)"
}
```

3. Rode `pnpm golden <id-substring>` para validar.

### Adicionar `.gitignore` (se ainda não estiver)

```gitignore
# em apps/web/.gitignore ou apps/web/scripts/golden/.gitignore
results-*.json
results-latest.json
```

---

## Resumo prático

| Sintoma | Onde olhar primeiro |
|---------|---------------------|
| Modelo inventa fato | `SYNTHESIZER_SYSTEM_PROMPT` (faithfulness) |
| Modelo não acha o termo certo | `PLANNER_SYSTEM_PROMPT` — queries/keywords (retrieval) |
| Modelo confunde categorias (raça jogável vs raça de devoção) | `SYNTHESIZER_SYSTEM_PROMPT` regra 9 |
| Página citada errada | Ingestão (`page_offset` em `ingest_books.py`) |
| Tom defensivo (“não fui treinado”, “consultados”) | `SYNTHESIZER_SYSTEM_PROMPT` parte “Como você fala” |
| Pergunta casual disparou busca | `PLANNER_SYSTEM_PROMPT` — exemplos de needsSearch=false |
