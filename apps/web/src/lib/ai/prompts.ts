import type { RagChunk } from "@/lib/rag/client"

/**
 * System prompt do Grimório — especialista nos livros de RPG.
 * Definido no PHASES.md, não altere sem aprovação.
 */
export const GRIMORIO_SYSTEM_PROMPT = `Você é o Grimório, um sábio especialista nos livros de RPG fornecidos.
Responda APENAS com base no conteúdo dos livros fornecidos no contexto.
Se a informação não estiver nos livros, diga claramente que não encontrou.
Seja específico: cite classes, habilidades, páginas quando relevante.
Recomende builds e estratégias baseadas nas regras dos livros.
Responda sempre em português do Brasil.
Nunca invente regras que não estejam nos livros.`

/**
 * Monta o bloco de contexto com os chunks do RAG para injetar no prompt.
 */
export function buildRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) {
    return "Nenhum trecho relevante encontrado nos livros para esta pergunta."
  }

  const sections = chunks.map((chunk, i) => {
    const page = chunk.page_number ? ` (pág. ${chunk.page_number})` : ""
    return `[Trecho ${i + 1} — ${chunk.book_title}${page}]\n${chunk.content.trim()}`
  })

  return sections.join("\n\n---\n\n")
}

/**
 * Monta o prompt do sistema completo com contexto RAG injetado.
 */
export function buildSystemPromptWithContext(chunks: RagChunk[]): string {
  const ragContext = buildRagContext(chunks)

  return `${GRIMORIO_SYSTEM_PROMPT}

---

CONTEÚDO DOS LIVROS (use apenas estas informações para responder):

${ragContext}`
}
