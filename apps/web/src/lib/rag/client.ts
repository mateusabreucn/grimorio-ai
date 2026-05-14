/**
 * Cliente HTTP para o RAG service (FastAPI).
 * Nunca exposto ao browser — apenas server-side.
 */

import { env } from "@/lib/env"

export interface RagChunk {
  content: string
  book_id: string
  book_title: string
  page_number: number | null
  chunk_index: number
  similarity_score: number
}

export interface RagSearchResponse {
  query: string
  chunks: RagChunk[]
}

export interface RagMultiSearchResponse {
  queries: string[]
  chunks: RagChunk[]
  total_unique: number
}

export interface MultiSearchOptions {
  keywords?: string[]
  topKPerQuery?: number
  topKLexical?: number
  maxTotalResults?: number
  bookIds?: string[]
  threshold?: number
  timeoutMs?: number
}

export type RagErrorType = "timeout" | "http_5xx" | "http_4xx" | "network"

export interface MultiSearchResult {
  chunks: RagChunk[]
  error?: RagErrorType
  attempts: number
  elapsedMs: number
}

const DEFAULT_TIMEOUT_MS = 20_000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [500, 1500]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function classifyError(err: unknown): RagErrorType {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return "timeout"
    if (err.name === "TypeError") return "network"
  }
  return "network"
}

/**
 * Busca chunks relevantes no RAG service (single query, legado).
 * Mantida para compatibilidade com consumidores antigos (ex: golden eval).
 */
export async function searchChunks(
  query: string,
  topK: number = 5,
  bookIds?: string[],
): Promise<RagChunk[]> {
  const result = await searchMulti([query], {
    topKPerQuery: topK,
    topKLexical: 0,
    maxTotalResults: topK,
    bookIds,
  })
  return result.chunks
}

/**
 * Busca híbrida (vetorial + lexical) com múltiplas queries.
 *
 * Comportamento de erro:
 *  - 4xx → não retentamos (erro do nosso lado)
 *  - timeout/5xx/rede → até 3 tentativas com backoff 500ms → 1500ms
 *  - todos os caminhos retornam estrutura com `error?` quando aplicável; nunca lança
 */
export async function searchMulti(
  queries: string[],
  options: MultiSearchOptions = {},
): Promise<MultiSearchResult> {
  const startedAt = Date.now()

  if (queries.length === 0) {
    return { chunks: [], attempts: 0, elapsedMs: 0 }
  }

  const {
    keywords = [],
    topKPerQuery = 8,
    topKLexical = 12,
    maxTotalResults = 30,
    bookIds,
    threshold,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  const body = JSON.stringify({
    queries,
    keywords,
    top_k_per_query: topKPerQuery,
    top_k_lexical: topKLexical,
    max_total_results: maxTotalResults,
    book_ids: bookIds ?? null,
    threshold: threshold ?? null,
  })

  let lastError: RagErrorType | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${env.RAG_SERVICE_URL}/search/multi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RAG_INTERNAL_SECRET}`,
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (response.ok) {
        const data = (await response.json()) as RagMultiSearchResponse
        return {
          chunks: data.chunks,
          attempts: attempt,
          elapsedMs: Date.now() - startedAt,
        }
      }

      // Erro HTTP — classifica e decide se retentamos
      const errText = await response.text().catch(() => "")
      console.error(
        `[RAG] /search/multi attempt=${attempt} status=${response.status} body=${errText.slice(0, 200)}`,
      )

      if (response.status >= 500) {
        lastError = "http_5xx"
        // segue pro retry
      } else {
        // 4xx → erro do nosso lado, não adianta retentar
        return {
          chunks: [],
          error: "http_4xx",
          attempts: attempt,
          elapsedMs: Date.now() - startedAt,
        }
      }
    } catch (err) {
      lastError = classifyError(err)
      console.error(
        `[RAG] /search/multi attempt=${attempt} error=${lastError}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // Aguarda backoff antes da próxima tentativa, se houver
    if (attempt < MAX_ATTEMPTS) {
      await sleep(BACKOFF_MS[attempt - 1] ?? 1500)
    }
  }

  return {
    chunks: [],
    error: lastError ?? "network",
    attempts: MAX_ATTEMPTS,
    elapsedMs: Date.now() - startedAt,
  }
}
