/**
 * Golden eval — roda o pipeline real (planner → search híbrida → synthesizer)
 * contra uma lista curada de perguntas e salva os resultados em JSON.
 *
 * O pipeline é intent-aware: o planner classifica lookup | composition |
 * recommendation, e cada intent dispara um config diferente (queries, topK,
 * modelo e prompt do synthesizer). Mantemos esse comportamento aqui.
 *
 * Uso:
 *   cd apps/web
 *   pnpm golden
 *
 * Requer: .env.local com GOOGLE_AI_API_KEY, RAG_SERVICE_URL, RAG_INTERNAL_SECRET.
 * O serviço RAG (apps/rag-service) precisa estar rodando.
 */

import { config as dotenvConfig } from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join, resolve } from "path"
import { readFileSync, writeFileSync } from "fs"
import { generateObject, generateText, type CoreMessage } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WEB_ROOT = resolve(__dirname, "..", "..")

dotenvConfig({ path: join(WEB_ROOT, ".env.local") })

import {
  PLANNER_SYSTEM_PROMPT,
  synthesizerPromptForIntent,
  buildRagContext,
  type ChatIntent,
} from "../../src/lib/ai/prompts"

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL
const RAG_INTERNAL_SECRET = process.env.RAG_INTERNAL_SECRET

if (!GOOGLE_AI_API_KEY || !RAG_SERVICE_URL || !RAG_INTERNAL_SECRET) {
  console.error("Faltam env vars (GOOGLE_AI_API_KEY, RAG_SERVICE_URL, RAG_INTERNAL_SECRET).")
  process.exit(1)
}

const googleAI = createGoogleGenerativeAI({ apiKey: GOOGLE_AI_API_KEY })

const plannerSchema = z.object({
  needsSearch: z.boolean(),
  intent: z.enum(["lookup", "composition", "recommendation"]).default("lookup"),
  queries: z.array(z.string().min(2).max(120)).max(12),
  keywords: z.array(z.string().min(2).max(60)).max(6).default([]),
  reasoning: z.string().max(500).optional(),
})

type IntentConfig = {
  topKPerQuery: number
  topKLexical: number
  maxTotalResults: number
  model: string
}

const INTENT_CONFIG: Record<ChatIntent, IntentConfig> = {
  lookup: { topKPerQuery: 8, topKLexical: 14, maxTotalResults: 24, model: "gemini-2.5-flash" },
  composition: { topKPerQuery: 14, topKLexical: 28, maxTotalResults: 56, model: "gemini-2.5-pro" },
  recommendation: { topKPerQuery: 12, topKLexical: 22, maxTotalResults: 64, model: "gemini-2.5-pro" },
}

interface RagChunk {
  content: string
  book_id: string
  book_title: string
  page_number: number | null
  chunk_index: number
  similarity_score: number
}

async function searchMultiHttp(
  queries: string[],
  keywords: string[],
  cfg: IntentConfig,
): Promise<RagChunk[]> {
  const response = await fetch(`${RAG_SERVICE_URL}/search/multi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RAG_INTERNAL_SECRET}`,
    },
    body: JSON.stringify({
      queries,
      keywords,
      top_k_per_query: cfg.topKPerQuery,
      top_k_lexical: cfg.topKLexical,
      max_total_results: cfg.maxTotalResults,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`RAG ${response.status}: ${text}`)
  }
  const data = (await response.json()) as { chunks: RagChunk[] }
  return data.chunks
}

interface GoldenItem {
  id: string
  category: string
  question: string
  expected: string
  notes?: string
}

interface Result extends GoldenItem {
  answer: string
  planner: {
    needsSearch: boolean
    intent: ChatIntent
    queries: string[]
    keywords: string[]
  }
  retrieval: {
    chunkCount: number
    topChunks: { book: string; page: number | null; score: number; preview: string }[]
  }
  synthesizerModel: string
  elapsedMs: number
  error?: string
}

async function runOne(item: GoldenItem): Promise<Result> {
  const t0 = Date.now()
  const messages: CoreMessage[] = [{ role: "user", content: item.question }]

  // 1. Planner
  let plan: z.infer<typeof plannerSchema>
  try {
    const { object } = await generateObject({
      model: googleAI("gemini-2.5-flash"),
      schema: plannerSchema,
      system: PLANNER_SYSTEM_PROMPT,
      messages,
      temperature: 0,
    })
    plan = object
  } catch (err) {
    return {
      ...item,
      answer: "",
      planner: { needsSearch: false, intent: "lookup", queries: [], keywords: [] },
      retrieval: { chunkCount: 0, topChunks: [] },
      synthesizerModel: "n/a",
      elapsedMs: Date.now() - t0,
      error: `Planner falhou: ${(err as Error).message}`,
    }
  }

  const cfg = INTENT_CONFIG[plan.intent]

  // 2. Retrieval híbrido (intent-aware)
  let chunks: RagChunk[] = []
  if (plan.needsSearch && plan.queries.length > 0) {
    try {
      chunks = await searchMultiHttp(plan.queries, plan.keywords, cfg)
    } catch (err) {
      return {
        ...item,
        answer: "",
        planner: {
          needsSearch: plan.needsSearch,
          intent: plan.intent,
          queries: plan.queries,
          keywords: plan.keywords,
        },
        retrieval: { chunkCount: 0, topChunks: [] },
        synthesizerModel: cfg.model,
        elapsedMs: Date.now() - t0,
        error: `RAG falhou: ${(err as Error).message}`,
      }
    }
  }

  // 3. Synthesizer (não-streaming para captar texto completo)
  const synthMessages: CoreMessage[] = [
    {
      role: "user",
      content: plan.needsSearch
        ? `${item.question}\n\n${buildRagContext(chunks)}`
        : item.question,
    },
  ]

  let answer = ""
  try {
    const { text } = await generateText({
      model: googleAI(cfg.model),
      system: synthesizerPromptForIntent(plan.intent),
      messages: synthMessages,
      temperature: 0,
    })
    answer = text
  } catch (err) {
    return {
      ...item,
      answer: "",
      planner: {
        needsSearch: plan.needsSearch,
        intent: plan.intent,
        queries: plan.queries,
        keywords: plan.keywords,
      },
      retrieval: {
        chunkCount: chunks.length,
        topChunks: chunks.slice(0, 5).map((c) => ({
          book: c.book_title,
          page: c.page_number,
          score: Number(c.similarity_score.toFixed(3)),
          preview: c.content.slice(0, 140).replace(/\n/g, " "),
        })),
      },
      synthesizerModel: cfg.model,
      elapsedMs: Date.now() - t0,
      error: `Synthesizer falhou: ${(err as Error).message}`,
    }
  }

  return {
    ...item,
    answer,
    planner: {
      needsSearch: plan.needsSearch,
      intent: plan.intent,
      queries: plan.queries,
      keywords: plan.keywords,
    },
    retrieval: {
      chunkCount: chunks.length,
      topChunks: chunks.slice(0, 5).map((c) => ({
        book: c.book_title,
        page: c.page_number,
        score: Number(c.similarity_score.toFixed(3)),
        preview: c.content.slice(0, 140).replace(/\n/g, " "),
      })),
    },
    synthesizerModel: cfg.model,
    elapsedMs: Date.now() - t0,
  }
}

async function main() {
  const questionsPath = join(__dirname, "questions.json")
  const items: GoldenItem[] = JSON.parse(readFileSync(questionsPath, "utf-8"))

  console.log(`\nGolden Eval — ${items.length} perguntas\n`)

  const filterId = process.argv[2]
  const filtered = filterId ? items.filter((i) => i.id.includes(filterId)) : items
  if (filtered.length === 0) {
    console.error(`Nenhuma pergunta com id contendo "${filterId}".`)
    process.exit(1)
  }

  const results: Result[] = []
  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i]
    const prefix = `[${i + 1}/${filtered.length}] ${item.id}`
    process.stdout.write(`${prefix.padEnd(38)} ${item.question.slice(0, 50)}...`)
    const result = await runOne(item)
    results.push(result)
    const tag = result.error
      ? `✗ ${result.error.slice(0, 40)}`
      : `✓ ${result.elapsedMs}ms (${result.planner.intent}, ${result.retrieval.chunkCount} chunks)`
    console.log(`  ${tag}`)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const outPath = join(__dirname, `results-${ts}.json`)
  const latestPath = join(__dirname, "results-latest.json")
  const payload = JSON.stringify(results, null, 2)
  writeFileSync(outPath, payload, "utf-8")
  writeFileSync(latestPath, payload, "utf-8")
  console.log(`\nResultados:\n  ${outPath}\n  ${latestPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
