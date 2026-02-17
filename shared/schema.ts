import { pgSchema, uuid, text, boolean, timestamp, integer, jsonb, numeric, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const replaiSchema = pgSchema("replai");

export const appRoleEnum = replaiSchema.enum("app_role", ["admin", "user"]);

export const aiConversations = replaiSchema.table("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").default(""),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiMessages = replaiSchema.table("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id),
  role: text("role").default("user"),
  content: text("content").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiRequestBalances = replaiSchema.table("ai_request_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  balance: integer("balance").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiRequestTransactions = replaiSchema.table("ai_request_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").default("usage"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = replaiSchema.table("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: text("chat_id").notNull(),
  eventId: text("event_id").notNull(),
  sender: text("sender").default("client"),
  text: text("text"),
  attachments: jsonb("attachments"),
  userId: text("user_id"),
  cabinetId: uuid("cabinet_id"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = replaiSchema.table("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  userId: text("user_id"),
  clientName: text("client_name").default(""),
  productName: text("product_name").default(""),
  productNmId: integer("product_nm_id"),
  lastMessageText: text("last_message_text"),
  lastMessageAt: timestamp("last_message_at"),
  replySign: text("reply_sign"),
  isRead: boolean("is_read").default(false),
  cabinetId: uuid("cabinet_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = replaiSchema.table("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount").notNull(),
  tokens: integer("tokens").notNull(),
  invId: serial("inv_id"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productRecommendations = replaiSchema.table("product_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  cabinetId: uuid("cabinet_id").notNull(),
  sourceArticle: text("source_article").notNull(),
  targetArticle: text("target_article").notNull(),
  targetName: text("target_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authUsers = replaiSchema.table("auth_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = replaiSchema.table("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at"),
  adminNotes: text("admin_notes"),
});

export const reviews = replaiSchema.table("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  wbId: text("wb_id").notNull(),
  userId: text("user_id"),
  cabinetId: uuid("cabinet_id"),
  rating: integer("rating").notNull(),
  authorName: text("author_name").default(""),
  brandName: text("brand_name").default(""),
  productName: text("product_name").default(""),
  productArticle: text("product_article").default(""),
  text: text("text"),
  pros: text("pros"),
  cons: text("cons"),
  photoLinks: jsonb("photo_links"),
  hasVideo: boolean("has_video").default(false),
  isEdited: boolean("is_edited").default(false),
  status: text("status").default("new"),
  aiDraft: text("ai_draft"),
  sentAnswer: text("sent_answer"),
  createdDate: timestamp("created_date").defaultNow(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = replaiSchema.table("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  wbApiKey: text("wb_api_key"),
  brandName: text("brand_name").default(""),
  aiPromptTemplate: text("ai_prompt_template").default(""),
  autoReplyEnabled: boolean("auto_reply_enabled").default(false),
  replyModes: jsonb("reply_modes").default({}),
  lastSyncAt: timestamp("last_sync_at"),
});

export const tokenBalances = replaiSchema.table("token_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  balance: integer("balance").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokenTransactions = replaiSchema.table("token_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").default("usage"),
  description: text("description"),
  reviewId: uuid("review_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalSettings = replaiSchema.table("global_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = replaiSchema.table("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  role: appRoleEnum("role").notNull(),
});

export const wbCabinets = replaiSchema.table("wb_cabinets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").default(""),
  brandName: text("brand_name").default(""),
  wbApiKey: text("wb_api_key"),
  aiPromptTemplate: text("ai_prompt_template").default(""),
  replyModes: jsonb("reply_modes").default({}),
  isActive: boolean("is_active").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  telegramChatId: text("telegram_chat_id"),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  tgNotifyType: text("tg_notify_type").default("all"),
});

export const telegramAuthTokens = replaiSchema.table("telegram_auth_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  cabinetId: uuid("cabinet_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthUserSchema = createInsertSchema(authUsers).omit({ id: true, createdAt: true });
export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({ id: true, createdAt: true });
export const insertAiRequestBalanceSchema = createInsertSchema(aiRequestBalances).omit({ id: true, updatedAt: true });
export const insertAiRequestTransactionSchema = createInsertSchema(aiRequestTransactions).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, sentAt: true, createdAt: true });
export const insertChatSchema = createInsertSchema(chats).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, invId: true, createdAt: true, updatedAt: true });
export const insertProductRecommendationSchema = createInsertSchema(productRecommendations).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, fetchedAt: true, updatedAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).omit({ id: true, updatedAt: true });
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({ id: true, createdAt: true });
export const insertGlobalSettingSchema = createInsertSchema(globalSettings).omit({ id: true, updatedAt: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export const insertWbCabinetSchema = createInsertSchema(wbCabinets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTelegramAuthTokenSchema = createInsertSchema(telegramAuthTokens).omit({ createdAt: true });

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiRequestBalance = typeof aiRequestBalances.$inferSelect;
export type InsertAiRequestBalance = z.infer<typeof insertAiRequestBalanceSchema>;
export type AiRequestTransaction = typeof aiRequestTransactions.$inferSelect;
export type InsertAiRequestTransaction = z.infer<typeof insertAiRequestTransactionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type ProductRecommendation = typeof productRecommendations.$inferSelect;
export type InsertProductRecommendation = z.infer<typeof insertProductRecommendationSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type TokenBalance = typeof tokenBalances.$inferSelect;
export type InsertTokenBalance = z.infer<typeof insertTokenBalanceSchema>;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = z.infer<typeof insertGlobalSettingSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type WbCabinet = typeof wbCabinets.$inferSelect;
export type InsertWbCabinet = z.infer<typeof insertWbCabinetSchema>;
export type TelegramAuthToken = typeof telegramAuthTokens.$inferSelect;
export type InsertTelegramAuthToken = z.infer<typeof insertTelegramAuthTokenSchema>;
export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
