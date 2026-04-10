# DATABASE_SCHEMA.md — Schema do PostgreSQL

> Fonte da verdade para o banco de dados.
> Qualquer alteração aqui REQUER migration correspondente via Drizzle.
> Claude Code NUNCA altera este schema sem avisar o humano.

---

## EXTENSÕES NECESSÁRIAS (rodar uma vez no Supabase)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## SCHEMA DRIZZLE ORM (TypeScript)

```typescript
// apps/web/src/lib/db/schema.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";
import { relations } from "drizzle-orm";

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"), // null para usuários OAuth
    provider: text("provider").notNull().default("credentials"), // "credentials" | "google"
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

// ─── NEXTAUTH TABLES (obrigatórias para Drizzle Adapter) ─────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    providerIdx: uniqueIndex("accounts_provider_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Nova conversa"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("conversations_user_idx").on(table.userId),
  }),
);

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(
      table.conversationId,
    ),
  }),
);

// ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    sessionDate: timestamp("session_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("journal_entries_user_idx").on(table.userId),
  }),
);

// ─── JOURNAL MESSAGES (chat do journal) ───────────────────────────────────────

export const journalMessages = pgTable(
  "journal_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    journalEntryIdx: index("journal_messages_entry_idx").on(
      table.journalEntryId,
    ),
  }),
);

// ─── DOCUMENT CHUNKS (RAG) ────────────────────────────────────────────────────
// Esta tabela é gerenciada pelo rag-service, não pelo Next.js
// O Next.js NÃO deve escrever nesta tabela diretamente

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: text("book_id").notNull(), // "book_1" | "book_2"
    bookTitle: text("book_title").notNull(),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    chunkIndex: integer("chunk_index").notNull(),
    metadata: text("metadata"), // JSON string
    embedding: vector("embedding", { dimensions: 768 }).notNull(), // text-embedding-004
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    bookIdx: index("document_chunks_book_idx").on(table.bookId),
    // Index de vetor para busca por similaridade coseno
    // Criado via SQL após a migration:
    // CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  }),
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  conversations: many(conversations),
  journalEntries: many(journalEntries),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    user: one(users, {
      fields: [journalEntries.userId],
      references: [users.id],
    }),
    messages: many(journalMessages),
  }),
);

export const journalMessagesRelations = relations(
  journalMessages,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalMessages.journalEntryId],
      references: [journalEntries.id],
    }),
  }),
);
```

---

## SQL PARA CRIAR O INDEX DE VETOR

Execute este SQL no Supabase depois da migration inicial:

```sql
-- Cria index IVFFlat para busca vetorial eficiente (cosine similarity)
-- Ajuste 'lists' conforme o número de chunks: sqrt(total_chunks)
-- Para ~1000 chunks: lists = 32; Para ~10000: lists = 100
CREATE INDEX ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 64);
```

---

## REGRAS DE EVOLUÇÃO DO SCHEMA

1. **Nunca** altere uma coluna existente diretamente — crie nova e migre dados
2. **Sempre** use `drizzle-kit generate` para criar migrations automáticas
3. **Nunca** delete migration files do histórico
4. **Sempre** teste a migration em desenvolvimento antes de aplicar em produção
5. Colunas novas devem ser `.nullable()` ou ter `.default()` para não quebrar dados existentes
