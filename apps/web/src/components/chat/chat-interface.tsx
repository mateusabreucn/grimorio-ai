"use client";

import { useEffect, useState } from "react";
import { useChat } from "ai/react";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { BookOpen, Sparkles } from "lucide-react";
import { HeaderUserMenu } from "@/components/shared/header-user-menu";

interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  title?: string;
  initialMessages?: InitialMessage[];
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function ChatInterface({ conversationId, title, initialMessages = [], user }: ChatInterfaceProps) {
  const [supplementsEnabled, setSupplementsEnabled] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);

  useEffect(() => {
    setActiveConversationId(conversationId);
  }, [conversationId]);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    initialMessages,
    body: {
      conversationId: activeConversationId,
      supplementsEnabled,
    },
    onResponse(response) {
      const createdConversationId = response.headers.get("x-conversation-id");

      if (!activeConversationId && createdConversationId) {
        setActiveConversationId(createdConversationId);
        window.history.replaceState(null, "", `/chat/${createdConversationId}`);
      }
    },
  });

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--amber-glow)),transparent_70%)]" />

      <header className="relative flex shrink-0 items-center justify-between gap-6 border-b border-border/70 px-5 py-5 md:px-8 md:py-6">
        <div className="min-w-0">
          <div className="font-rune mb-2 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.28em]">
            <span className="text-primary">Consulta</span>
            <span className="h-1 w-1 rotate-45 bg-primary" />
            <span className="truncate text-[hsl(var(--ink-faint))]">Grimório AI — Especialista em Tormenta 20</span>
          </div>
          <h1 className="font-display max-w-3xl truncate text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-foreground md:text-4xl">
            {title || "Nova consulta aos tomos"}
          </h1>
        </div>

        {user && (
          <div className="hidden shrink-0 md:block">
            <HeaderUserMenu user={user} />
          </div>
        )}
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <MessageList 
          messages={messages} 
          isLoading={isLoading} 
          onCardClick={(text) => setInput(text)}
        />
      </div>

      {error && (
        <div className="relative mx-8 mb-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao conectar com o Grimório. Tente novamente.
        </div>
      )}

      {messages.length > 0 && (
        <div className="pointer-events-none absolute right-8 top-28 hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary lg:flex">
          <BookOpen className="mr-2 h-3.5 w-3.5" />
          <span className="font-rune text-[0.65rem] uppercase tracking-[0.2em]">fontes ativas</span>
        </div>
      )}

      {isLoading && (
        <div className="pointer-events-none absolute left-1/2 top-28 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-border/70 bg-[hsl(var(--panel-raised))]/90 px-3 py-1.5 text-muted-foreground backdrop-blur md:flex">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-rune text-[0.65rem] uppercase tracking-[0.18em]">consultando tomos</span>
        </div>
      )}

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        supplementsEnabled={supplementsEnabled}
        onSupplementsToggle={setSupplementsEnabled}
      />
    </div>
  );
}
