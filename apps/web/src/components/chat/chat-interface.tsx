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

export function ChatInterface({ conversationId, title: initialTitle, initialMessages = [], user }: ChatInterfaceProps) {
  const [supplementsEnabled, setSupplementsEnabled] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [displayTitle, setDisplayTitle] = useState(initialTitle || "Nova consulta");

  useEffect(() => {
    setActiveConversationId(conversationId);
  }, [conversationId]);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, error, reload } = useChat({
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

  // Atualiza o título dinamicamente baseado na primeira mensagem do usuário se estiver vazio
  useEffect(() => {
    if (displayTitle === "Nova consulta" || !displayTitle) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        const newTitle = firstUserMessage.content.slice(0, 60);
        setDisplayTitle(newTitle);
      }
    }
  }, [messages, displayTitle]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--amber-glow)),transparent_70%)]" />

      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-border/70 px-5 py-3 md:px-8 md:py-4">
        <div className="min-w-0 flex-1">
          <div className="font-rune mb-0.5 flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.2em] md:mb-1 md:text-[0.65rem] md:tracking-[0.25em]">
            <span className="text-primary">Consulta</span>
            <span className="h-1 w-1 rotate-45 bg-primary" />
            <span className="truncate text-[hsl(var(--ink-faint))]">Grimório AI</span>
          </div>
          <h1 
            key={displayTitle}
            className="font-display max-w-3xl truncate text-lg font-semibold uppercase leading-tight tracking-[0.04em] text-foreground md:text-2xl animate-in fade-in slide-in-from-left-4 duration-500"
          >
            {displayTitle}
          </h1>
        </div>

        {user && (
          <div className="shrink-0">
            <HeaderUserMenu user={user} />
          </div>
        )}
      </header>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
        <MessageList 
          messages={messages} 
          isLoading={isLoading} 
          onCardClick={(text) => setInput(text)}
          onReload={() => reload()}
        />
      </div>

      {error && (
        <div className="z-10 mx-auto mb-4 flex max-w-max items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          <span>Erro ao conectar com o Grimório. Tente novamente.</span>
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
