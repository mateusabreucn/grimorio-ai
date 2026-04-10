import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import type { AdapterAccountType } from "next-auth/adapters"

// ─── USERS ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    name:          text("name"),
    email:         text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image:         text("image"),
    passwordHash:  text("password_hash"),       // null para usuários OAuth
    provider:      text("provider").notNull().default("credentials"),
    createdAt:     timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
)

// ─── NEXTAUTH TABLES ──────────────────────────────────────────────────────────
// Property names DEVEM seguir a convenção do @auth/drizzle-adapter

export const accounts = pgTable(
  "accounts",
  {
    userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").$type<AdapterAccountType>().notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token:     text("refresh_token"),
    access_token:      text("access_token"),
    expires_at:        integer("expires_at"),
    token_type:        text("token_type"),
    scope:             text("scope"),
    id_token:          text("id_token"),
    session_state:     text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
)

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title:     text("title").notNull().default("Nova conversa"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("conversations_user_idx").on(table.userId),
  })
)

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role:           text("role").notNull(), // "user" | "assistant"
    content:        text("content").notNull(),
    createdAt:      timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  })
)

// ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

export const journalEntries = pgTable(
  "journal_entries",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title:       text("title").notNull(),
    content:     text("content").notNull().default(""),
    sessionDate: timestamp("session_date", { mode: "date" }),
    createdAt:   timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:   timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("journal_entries_user_idx").on(table.userId),
  })
)

// ─── JOURNAL MESSAGES ─────────────────────────────────────────────────────────

export const journalMessages = pgTable(
  "journal_messages",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    role:           text("role").notNull(), // "user" | "assistant"
    content:        text("content").notNull(),
    createdAt:      timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    journalEntryIdx: index("journal_messages_entry_idx").on(table.journalEntryId),
  })
)

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts:       many(accounts),
  sessions:       many(sessions),
  conversations:  many(conversations),
  journalEntries: many(journalEntries),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user:     one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  user:     one(users, { fields: [journalEntries.userId], references: [users.id] }),
  messages: many(journalMessages),
}))

export const journalMessagesRelations = relations(journalMessages, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalMessages.journalEntryId],
    references: [journalEntries.id],
  }),
}))
