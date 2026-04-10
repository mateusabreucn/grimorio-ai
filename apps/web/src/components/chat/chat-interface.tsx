"use client";

import { useRef } from "react";
import { useChat } from "ai/react";
import { useRouter } from "next/navigation";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: InitialMessage[];
}

export function ChatInterface({ conversationId, initialMessages = [] }: ChatInterfaceProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { conversationId },
    onError: (err: Error) => {
      console.error("[chat] Erro:", err);
    },
    onFinish: async (message) => {
      // Salvar no banco após resposta completa (apenas usuários logados com endpoint /api/chat)
      if (!conversationId) {
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMsg) {
          try {
            const res = await fetch("/api/chat/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userMessage: lastUserMsg.content,
                assistantMessage: message.content,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.conversationId && !redirectedRef.current) {
                redirectedRef.current = true;
                router.push(`/chat/${data.conversationId}`);
                router.refresh();
              }
            }
          } catch (err) {
            console.error("[chat] Erro ao salvar:", err);
          }
        }
      } else {
        // Conversa existente — salva e atualiza sidebar
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMsg) {
          try {
            await fetch("/api/chat/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId,
                userMessage: lastUserMsg.content,
                assistantMessage: message.content,
              }),
            });
            router.refresh();
          } catch {
            // Silencioso — não bloqueia a UX
          }
        }
      }
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Erro ao conectar com o Grimório. Tente novamente.
        </div>
      )}

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
