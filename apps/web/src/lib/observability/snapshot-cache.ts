/**
 * Cache LRU em memória com TTL para snapshots do pipeline.
 *
 * Cada resposta do chat gera um snapshot (queries, keywords, chunks, etc.) que
 * fica disponível por tempo limitado para o endpoint de feedback anexá-lo ao
 * registro. Best-effort — se expirar antes do voto, o feedback ainda é gravado
 * sem snapshot.
 */

import type { RagErrorType } from "@/lib/rag/client"

export interface PipelineSnapshot {
  question: string
  needs_search: boolean
  queries: string[]
  keywords: string[]
  rag: {
    chunk_count: number
    top_chunks: Array<{
      book_id: string
      book_title: string
      page: number | null
      score: number
      preview: string
    }>
    error_type?: RagErrorType
    attempts: number
    elapsed_ms: number
  }
  synthesizer: {
    used_fallback: boolean
    answer_preview: string
    elapsed_ms: number
  }
  model: string
  created_at: string
}

interface CacheEntry {
  value: PipelineSnapshot
  expiresAt: number
}

const MAX_ENTRIES = 500
const TTL_MS = 15 * 60 * 1000 // 15 minutos

const cache = new Map<string, CacheEntry>()

function evictExpired(): void {
  const now = Date.now()
  const toDelete: string[] = []
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) toDelete.push(key)
  })
  toDelete.forEach((key) => cache.delete(key))
}

function evictOldest(): void {
  // Map preserva ordem de inserção — primeira chave é a mais antiga
  const oldestKey = cache.keys().next().value
  if (oldestKey) cache.delete(oldestKey)
}

export function setSnapshot(id: string, snapshot: PipelineSnapshot): void {
  if (cache.size >= MAX_ENTRIES) {
    evictExpired()
    if (cache.size >= MAX_ENTRIES) evictOldest()
  }
  cache.set(id, {
    value: snapshot,
    expiresAt: Date.now() + TTL_MS,
  })
}

export function getSnapshot(id: string): PipelineSnapshot | null {
  const entry = cache.get(id)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(id)
    return null
  }
  return entry.value
}

export function delSnapshot(id: string): void {
  cache.delete(id)
}

/** Tamanho atual do cache — útil para debug/health. */
export function snapshotCacheSize(): number {
  return cache.size
}
