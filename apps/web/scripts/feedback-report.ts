/**
 * Relatório de feedbacks negativos do Grimório AI.
 *
 * Lê a tabela message_feedback (vote='down') e imprime um resumo com:
 *   - pergunta original
 *   - comentário do usuário (se houver)
 *   - intent classificado, queries geradas, top chunks recuperados
 *
 * Sem IA — apenas SQL + formatação.
 *
 * Uso:
 *   cd apps/web
 *   pnpm tsx scripts/feedback-report.ts
 *   pnpm tsx scripts/feedback-report.ts --limit 20
 *   pnpm tsx scripts/feedback-report.ts --intent composition
 */

import { config as dotenvConfig } from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join, resolve } from "path"
import postgres from "postgres"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WEB_ROOT = resolve(__dirname, "..")
dotenvConfig({ path: join(WEB_ROOT, ".env.local") })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL no .env.local")
  process.exit(1)
}

// ─── Flags ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 50

const intentArg = args.find((a) => a.startsWith("--intent="))
const INTENT_FILTER = intentArg ? intentArg.split("=")[1] : null

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TopChunk {
  book_title: string
  page: number | null
  score: number
}

interface PipelineSnapshot {
  question: string
  intent: string
  queries: string[]
  keywords: string[]
  rag: {
    chunk_count: number
    top_chunks: TopChunk[]
    error_type?: string
    attempts: number
    elapsed_ms: number
  }
  synthesizer: {
    used_fallback: boolean
    mode: string
    answer_preview: string
    elapsed_ms: number
  }
  model: string
  created_at: string
}

interface FeedbackRow {
  id: string
  vote: string
  comment: string | null
  pipeline_snapshot: PipelineSnapshot | null
  created_at: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(s: string, n: number) {
  return s.length >= n ? s : s + " ".repeat(n - s.length)
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…"
}

function formatDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 })

  try {
    // Conta totais por intent
    const counts = await sql<{ intent: string; total: number }[]>`
      SELECT
        COALESCE(pipeline_snapshot->>'intent', 'desconhecido') AS intent,
        COUNT(*)::int AS total
      FROM message_feedback
      WHERE vote = 'down'
      GROUP BY 1
      ORDER BY 2 DESC
    `

    const total = counts.reduce((s, r) => s + r.total, 0)
    const totalUp = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM message_feedback WHERE vote = 'up'
    `

    console.log("\n" + "─".repeat(72))
    console.log("  GRIMÓRIO AI — Relatório de Feedbacks")
    console.log("─".repeat(72))
    console.log(`  👍 positivos : ${totalUp[0].n}`)
    console.log(`  👎 negativos : ${total}`)
    if (counts.length > 0) {
      console.log(`\n  Por intent:`)
      for (const row of counts) {
        console.log(`    ${pad(row.intent, 16)} ${row.total}`)
      }
    }
    console.log("─".repeat(72) + "\n")

    if (total === 0) {
      console.log("  Nenhum feedback negativo registrado ainda.\n")
      return
    }

    // Busca os feedbacks negativos
    const rows = await sql<FeedbackRow[]>`
      SELECT
        id,
        vote,
        comment,
        pipeline_snapshot,
        created_at
      FROM message_feedback
      WHERE vote = 'down'
        ${INTENT_FILTER ? sql`AND pipeline_snapshot->>'intent' = ${INTENT_FILTER}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${LIMIT}
    `

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const snap = row.pipeline_snapshot
      const num = String(i + 1).padStart(2, "0")

      console.log(`[${num}] ${formatDate(row.created_at)}  id: ${row.id.slice(0, 8)}…`)

      if (snap) {
        console.log(`     Pergunta : ${truncate(snap.question, 70)}`)
        console.log(`     Intent   : ${snap.intent}  |  modelo: ${snap.model}`)
        console.log(`     Chunks   : ${snap.rag.chunk_count}  |  ${snap.rag.elapsed_ms}ms RAG`)

        if (snap.keywords.length > 0) {
          console.log(`     Keywords : ${snap.keywords.join(", ")}`)
        }

        if (snap.rag.top_chunks.length > 0) {
          const tops = snap.rag.top_chunks
            .slice(0, 3)
            .map((c) => `${c.book_title.replace("Tormenta 20 — ", "")} p.${c.page ?? "?"} (${c.score.toFixed(2)})`)
            .join("  ·  ")
          console.log(`     Top chunks: ${tops}`)
        }

        if (snap.rag.error_type) {
          console.log(`     ⚠ RAG erro: ${snap.rag.error_type}`)
        }
      } else {
        console.log(`     (snapshot expirado — pergunta não disponível)`)
      }

      if (row.comment) {
        console.log(`     💬 "${truncate(row.comment, 65)}"`)
      }

      console.log()
    }

    if (rows.length === LIMIT) {
      console.log(`  (mostrando os ${LIMIT} mais recentes — use --limit=N para ver mais)\n`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
