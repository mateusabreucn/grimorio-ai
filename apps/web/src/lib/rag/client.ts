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
  bookId?: string
  threshold?: number
}

/**
 * Busca chunks relevantes no RAG service.
 * Retorna [] em caso de erro para não bloquear o chat.
 */
export async function searchChunks(
  query: string,
  topK: number = 5,
  bookId?: string,
): Promise<RagChunk[]> {
  try {
    const response = await fetch(`${env.RAG_SERVICE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RAG_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({ query, top_k: topK, book_id: bookId ?? null }),
      // Timeout de 10s para não bloquear o stream do chat
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      console.error("[RAG] Search failed:", response.status, await response.text())
      return []
    }

    const data: RagSearchResponse = await response.json()
    return data.chunks
  } catch (err) {
    console.error("[RAG] Search error:", err)
    return []
  }
}

/**
 * Busca chunks com múltiplas queries em paralelo (deduplicado server-side).
 * Ideal para perguntas amplas, enumerações ou quando o termo do usuário não
 * bate com o vocabulário do livro.
 */
export async function searchMulti(
  queries: string[],
  options: MultiSearchOptions = {},
): Promise<RagChunk[]> {
  if (queries.length === 0) return []

  const {
    keywords = [],
    topKPerQuery = 8,
    topKLexical = 12,
    maxTotalResults = 30,
    bookId,
    threshold,
  } = options

  try {
    const response = await fetch(`${env.RAG_SERVICE_URL}/search/multi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RAG_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({
        queries,
        keywords,
        top_k_per_query: topKPerQuery,
        top_k_lexical: topKLexical,
        max_total_results: maxTotalResults,
        book_id: bookId ?? null,
        threshold: threshold ?? null,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      console.error("[RAG] Multi-search failed:", response.status, await response.text())
      return []
    }

    const data: RagMultiSearchResponse = await response.json()
    return data.chunks
  } catch (err) {
    console.error("[RAG] Multi-search error:", err)
    return []
  }
}
