import { db } from "./db";
import { eq, and, desc, asc, sql, not, isNull, gte, lte, count } from "drizzle-orm";
import {
  reviews, chats, chatMessages, wbCabinets, settings, profiles,
  tokenBalances, aiRequestBalances, tokenTransactions, aiRequestTransactions,
  userRoles, aiConversations, aiMessages, productRecommendations, payments,
  globalSettings, telegramAuthTokens,
  type Review, type InsertReview,
  type Chat, type InsertChat,
  type ChatMessage, type InsertChatMessage,
  type WbCabinet, type InsertWbCabinet,
  type Setting,
  type Profile, type InsertProfile,
  type TokenBalance, type InsertTokenTransaction,
  type AiRequestBalance, type InsertAiRequestTransaction,
  type TokenTransaction, type AiRequestTransaction,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type ProductRecommendation, type InsertProductRecommendation,
  type Payment, type InsertPayment,
  type GlobalSetting,
} from "@shared/schema";

export class DatabaseStorage {

  async getReviews(cabinetId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.cabinetId, cabinetId)).orderBy(desc(reviews.createdDate));
  }

  async getReviewById(id: string): Promise<Review | null> {
    const rows = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insertReview(data: InsertReview): Promise<Review> {
    const rows = await db.insert(reviews).values(data).returning();
    return rows[0];
  }

  async updateReview(id: string, data: Partial<Review>): Promise<void> {
    await db.update(reviews).set(data).where(eq(reviews.id, id));
  }

  async archiveOldAnsweredReviews(daysOld: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await db
      .update(reviews)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          sql`(${reviews.status} = 'sent' OR ${reviews.status} = 'auto')`,
          lte(reviews.updatedAt, cutoff)
        )
      )
      .returning({ id: reviews.id });
    return result.length;
  }

  async archiveImportedReviews(): Promise<number> {
    const result = await db
      .update(reviews)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        sql`${reviews.status} IN ('sent', 'new', 'pending')`
      )
      .returning({ id: reviews.id });
    return result.length;
  }

  async getProductArticles(cabinetId: string): Promise<{ article: string; name: string }[]> {
    const rows = await db
      .selectDistinctOn([reviews.productArticle], {
        article: reviews.productArticle,
        name: reviews.productName,
      })
      .from(reviews)
      .where(eq(reviews.cabinetId, cabinetId));
    return rows.map((r) => ({ article: r.article ?? "", name: r.name ?? "" }));
  }

  async getPendingReviewsForCabinet(userId: string, cabinetId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          eq(reviews.cabinetId, cabinetId),
          eq(reviews.status, "pending"),
          not(isNull(reviews.aiDraft)),
        ),
      );
  }

  async getChats(cabinetId: string): Promise<Chat[]> {
    return db.select().from(chats).where(eq(chats.cabinetId, cabinetId)).orderBy(desc(chats.lastMessageAt));
  }

  async upsertChat(data: any): Promise<void> {
    await db
      .insert(chats)
      .values(data)
      .onConflictDoUpdate({
        target: chats.chatId,
        set: data,
      });
  }

  async markChatRead(chatId: string): Promise<void> {
    await db.update(chats).set({ isRead: true }).where(eq(chats.chatId, chatId));
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.chatId, chatId)).orderBy(asc(chatMessages.sentAt));
  }

  async upsertChatMessage(data: any): Promise<any> {
    const rows = await db
      .insert(chatMessages)
      .values(data)
      .onConflictDoUpdate({
        target: chatMessages.eventId,
        set: data,
      })
      .returning();
    return rows[0];
  }

  async getChatByWbId(chatId: string, userId: string): Promise<Chat | null> {
    const rows = await db
      .select()
      .from(chats)
      .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateChat(chatId: string, userId: string, data: any): Promise<void> {
    await db.update(chats).set(data).where(and(eq(chats.chatId, chatId), eq(chats.userId, userId)));
  }

  async getChatsByCabinet(userId: string, cabinetId: string): Promise<Chat[]> {
    return db
      .select()
      .from(chats)
      .where(and(eq(chats.userId, userId), eq(chats.cabinetId, cabinetId)));
  }

  async getLastMessage(chatId: string, userId: string): Promise<ChatMessage | null> {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.userId, userId)))
      .orderBy(desc(chatMessages.sentAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findDuplicateSellerMessage(
    chatId: string,
    userId: string,
    text: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<ChatMessage | null> {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatId, chatId),
          eq(chatMessages.userId, userId),
          eq(chatMessages.sender, "seller"),
          eq(chatMessages.text, text),
          gte(chatMessages.sentAt, new Date(windowStart)),
          lte(chatMessages.sentAt, new Date(windowEnd)),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async updateChatMessageEventId(id: string, eventId: string): Promise<void> {
    await db.update(chatMessages).set({ eventId }).where(eq(chatMessages.id, id));
  }

  async getCabinets(userId: string): Promise<WbCabinet[]> {
    return db.select().from(wbCabinets).where(eq(wbCabinets.userId, userId)).orderBy(asc(wbCabinets.createdAt));
  }

  async getCabinetById(id: string): Promise<WbCabinet | null> {
    const rows = await db.select().from(wbCabinets).where(eq(wbCabinets.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getActiveCabinet(userId: string): Promise<WbCabinet | null> {
    const rows = await db
      .select()
      .from(wbCabinets)
      .where(and(eq(wbCabinets.userId, userId), eq(wbCabinets.isActive, true)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createCabinet(data: InsertWbCabinet): Promise<WbCabinet> {
    const rows = await db.insert(wbCabinets).values(data).returning();
    return rows[0];
  }

  async updateCabinet(id: string, data: Partial<WbCabinet>): Promise<void> {
    await db.update(wbCabinets).set(data).where(eq(wbCabinets.id, id));
  }

  async deleteCabinet(id: string): Promise<void> {
    await db.delete(wbCabinets).where(eq(wbCabinets.id, id));
  }

  async getAllCabinetsWithApiKey(): Promise<WbCabinet[]> {
    return db.select().from(wbCabinets).where(not(isNull(wbCabinets.wbApiKey)));
  }

  async getSettings(userId: string): Promise<Setting | null> {
    const rows = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
    return rows[0] ?? null;
  }

  async updateSettings(id: string, data: Partial<Setting>): Promise<void> {
    await db.update(settings).set(data).where(eq(settings.id, id));
  }

  async insertSettings(data: { userId: string }): Promise<Setting> {
    const rows = await db.insert(settings).values(data).returning();
    return rows[0];
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    return rows[0] ?? null;
  }

  async upsertProfile(data: InsertProfile): Promise<void> {
    await db
      .insert(profiles)
      .values(data)
      .onConflictDoUpdate({
        target: profiles.id,
        set: data,
      });
  }

  async getAllProfiles(): Promise<Profile[]> {
    return db.select().from(profiles);
  }

  async getTokenBalance(userId: string): Promise<number> {
    const rows = await db
      .select({ balance: tokenBalances.balance })
      .from(tokenBalances)
      .where(eq(tokenBalances.userId, userId))
      .limit(1);
    return rows[0]?.balance ?? 0;
  }

  async getAiRequestBalance(userId: string): Promise<number> {
    const rows = await db
      .select({ balance: aiRequestBalances.balance })
      .from(aiRequestBalances)
      .where(eq(aiRequestBalances.userId, userId))
      .limit(1);
    return rows[0]?.balance ?? 0;
  }

  async updateTokenBalance(userId: string, balance: number): Promise<void> {
    await db.update(tokenBalances).set({ balance }).where(eq(tokenBalances.userId, userId));
  }

  async updateAiRequestBalance(userId: string, balance: number): Promise<void> {
    await db.update(aiRequestBalances).set({ balance }).where(eq(aiRequestBalances.userId, userId));
  }

  async upsertTokenBalance(userId: string, balance: number): Promise<void> {
    const existing = await db.select().from(tokenBalances).where(eq(tokenBalances.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(tokenBalances).set({ balance }).where(eq(tokenBalances.userId, userId));
    } else {
      await db.insert(tokenBalances).values({ userId, balance });
    }
  }

  async upsertAiRequestBalance(userId: string, balance: number): Promise<void> {
    const existing = await db.select().from(aiRequestBalances).where(eq(aiRequestBalances.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(aiRequestBalances).set({ balance }).where(eq(aiRequestBalances.userId, userId));
    } else {
      await db.insert(aiRequestBalances).values({ userId, balance });
    }
  }

  async getAllTokenBalances(): Promise<{ userId: string; balance: number }[]> {
    const rows = await db.select({ userId: tokenBalances.userId, balance: tokenBalances.balance }).from(tokenBalances);
    return rows.map((r) => ({ userId: r.userId, balance: r.balance ?? 0 }));
  }

  async getAllAiRequestBalances(): Promise<{ userId: string; balance: number }[]> {
    const rows = await db
      .select({ userId: aiRequestBalances.userId, balance: aiRequestBalances.balance })
      .from(aiRequestBalances);
    return rows.map((r) => ({ userId: r.userId, balance: r.balance ?? 0 }));
  }

  async insertTokenTransaction(data: InsertTokenTransaction): Promise<void> {
    await db.insert(tokenTransactions).values(data);
  }

  async insertAiRequestTransaction(data: InsertAiRequestTransaction): Promise<void> {
    await db.insert(aiRequestTransactions).values(data);
  }

  async getTokenTransactions(typeFilter?: string, limit_?: number): Promise<TokenTransaction[]> {
    let query = db.select().from(tokenTransactions).orderBy(desc(tokenTransactions.createdAt)).$dynamic();
    if (typeFilter && typeFilter !== "all") {
      query = query.where(eq(tokenTransactions.type, typeFilter));
    }
    if (limit_) {
      query = query.limit(limit_);
    } else {
      query = query.limit(200);
    }
    return query;
  }

  async getAiRequestTransactions(typeFilter?: string, limit_?: number): Promise<AiRequestTransaction[]> {
    let query = db.select().from(aiRequestTransactions).orderBy(desc(aiRequestTransactions.createdAt)).$dynamic();
    if (typeFilter && typeFilter !== "all") {
      query = query.where(eq(aiRequestTransactions.type, typeFilter));
    }
    if (limit_) {
      query = query.limit(limit_);
    } else {
      query = query.limit(200);
    }
    return query;
  }

  async countTokenTransactions(): Promise<number> {
    const rows = await db.select({ value: count() }).from(tokenTransactions);
    return rows[0]?.value ?? 0;
  }

  async countTodayTokenTransactions(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db
      .select({ value: count() })
      .from(tokenTransactions)
      .where(gte(tokenTransactions.createdAt, today));
    return rows[0]?.value ?? 0;
  }

  async getUserRole(userId: string): Promise<string | null> {
    const rows = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    return rows[0]?.role ?? null;
  }

  async getAllUserRoles(): Promise<{ userId: string; role: string }[]> {
    return db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles);
  }

  async getConversations(userId: string): Promise<AiConversation[]> {
    return db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.isPinned), desc(aiConversations.updatedAt));
  }

  async createConversation(data: InsertAiConversation): Promise<AiConversation> {
    const rows = await db.insert(aiConversations).values(data).returning();
    return rows[0];
  }

  async updateConversation(id: string, data: Partial<AiConversation>): Promise<void> {
    await db.update(aiConversations).set(data).where(eq(aiConversations.id, id));
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  }

  async getAiMessages(conversationId: string): Promise<AiMessage[]> {
    return db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async insertAiMessage(data: InsertAiMessage): Promise<void> {
    await db.insert(aiMessages).values(data);
  }

  async getRecommendations(sourceArticle: string, cabinetId: string): Promise<ProductRecommendation[]> {
    return db
      .select()
      .from(productRecommendations)
      .where(
        and(eq(productRecommendations.sourceArticle, sourceArticle), eq(productRecommendations.cabinetId, cabinetId)),
      )
      .orderBy(asc(productRecommendations.createdAt));
  }

  async getRecommendationsSummary(cabinetId: string): Promise<{ article: string; count: number }[]> {
    const rows = await db
      .select({
        article: productRecommendations.sourceArticle,
        count: sql<number>`count(*)::int`,
      })
      .from(productRecommendations)
      .where(eq(productRecommendations.cabinetId, cabinetId))
      .groupBy(productRecommendations.sourceArticle)
      .orderBy(productRecommendations.sourceArticle);
    return rows;
  }

  async getAllRecommendationsGrouped(cabinetId: string): Promise<ProductRecommendation[]> {
    return db
      .select()
      .from(productRecommendations)
      .where(eq(productRecommendations.cabinetId, cabinetId))
      .orderBy(asc(productRecommendations.sourceArticle), asc(productRecommendations.createdAt));
  }

  async insertRecommendation(data: InsertProductRecommendation): Promise<void> {
    await db.insert(productRecommendations).values(data);
  }

  async deleteRecommendation(id: string): Promise<void> {
    await db.delete(productRecommendations).where(eq(productRecommendations.id, id));
  }

  async getReviewByWbId(wbId: string, userId: string, cabinetId: string): Promise<Review | null> {
    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.wbId, wbId), eq(reviews.userId, userId), eq(reviews.cabinetId, cabinetId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async getReviewsByUserId(userId: string, columns?: string[]): Promise<any[]> {
    return db
      .select({
        productArticle: reviews.productArticle,
        productName: reviews.productName,
        rating: reviews.rating,
      })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdDate));
  }

  async getReviewsByUserIdAndArticle(userId: string, article: string, limit_ = 50): Promise<any[]> {
    return db
      .select({
        rating: reviews.rating,
        authorName: reviews.authorName,
        text: reviews.text,
        pros: reviews.pros,
        cons: reviews.cons,
        productName: reviews.productName,
        productArticle: reviews.productArticle,
        createdDate: reviews.createdDate,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productArticle, article)))
      .orderBy(desc(reviews.createdDate))
      .limit(limit_);
  }

  async getNegativeReviewsByUserId(userId: string, limit_ = 50): Promise<any[]> {
    return db
      .select({
        rating: reviews.rating,
        authorName: reviews.authorName,
        text: reviews.text,
        pros: reviews.pros,
        cons: reviews.cons,
        productName: reviews.productName,
        productArticle: reviews.productArticle,
        createdDate: reviews.createdDate,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), lte(reviews.rating, 3)))
      .orderBy(desc(reviews.createdDate))
      .limit(limit_);
  }

  async getPositiveReviewsByUserId(userId: string, limit_ = 50): Promise<any[]> {
    return db
      .select({
        rating: reviews.rating,
        authorName: reviews.authorName,
        text: reviews.text,
        pros: reviews.pros,
        cons: reviews.cons,
        productName: reviews.productName,
        productArticle: reviews.productArticle,
        createdDate: reviews.createdDate,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), gte(reviews.rating, 4), not(isNull(reviews.pros))))
      .orderBy(desc(reviews.createdDate))
      .limit(limit_);
  }

  async getReviewTimeStats(userId: string): Promise<{ createdDate: Date | null; rating: number }[]> {
    return db
      .select({
        createdDate: reviews.createdDate,
        rating: reviews.rating,
      })
      .from(reviews)
      .where(eq(reviews.userId, userId));
  }

  async getReviewCountByCabinet(cabinetId: string): Promise<number> {
    const rows = await db.select({ value: count() }).from(reviews).where(eq(reviews.cabinetId, cabinetId));
    return rows[0]?.value ?? 0;
  }

  async getRecommendationsByArticle(sourceArticle: string, cabinetId: string): Promise<{ targetArticle: string; targetName: string | null }[]> {
    return db
      .select({ targetArticle: productRecommendations.targetArticle, targetName: productRecommendations.targetName })
      .from(productRecommendations)
      .where(and(eq(productRecommendations.sourceArticle, sourceArticle), eq(productRecommendations.cabinetId, cabinetId)));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const rows = await db.insert(payments).values(data).returning();
    return rows[0];
  }

  async getPaymentByInvId(invId: number): Promise<Payment | null> {
    const rows = await db.select().from(payments).where(eq(payments.invId, invId)).limit(1);
    return rows[0] ?? null;
  }

  async updatePaymentStatus(id: string, status: string): Promise<void> {
    await db.update(payments).set({ status }).where(eq(payments.id, id));
  }

  async countProfiles(): Promise<number> {
    const rows = await db.select({ value: count() }).from(profiles);
    return rows[0]?.value ?? 0;
  }

  async countReviews(): Promise<number> {
    const rows = await db.select({ value: count() }).from(reviews);
    return rows[0]?.value ?? 0;
  }

  async getTableData(table: string, columns: string[]): Promise<any[]> {
    const tableMap: Record<string, any> = {
      reviews,
      chats,
      chat_messages: chatMessages,
      product_recommendations: productRecommendations,
      wb_cabinets: wbCabinets,
      token_balances: tokenBalances,
      profiles,
      settings,
      token_transactions: tokenTransactions,
      ai_request_transactions: aiRequestTransactions,
      ai_request_balances: aiRequestBalances,
      ai_conversations: aiConversations,
      ai_messages: aiMessages,
      payments,
      user_roles: userRoles,
    };
    const tbl = tableMap[table];
    if (!tbl) return [];
    return db.select().from(tbl);
  }

  async getGlobalSetting(key: string): Promise<string | null> {
    const rows = await db.select().from(globalSettings).where(eq(globalSettings.key, key)).limit(1);
    return rows[0]?.value ?? null;
  }

  async getAllGlobalSettings(): Promise<GlobalSetting[]> {
    return db.select().from(globalSettings);
  }

  async upsertGlobalSetting(key: string, value: string): Promise<void> {
    await db
      .insert(globalSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async createTelegramAuthToken(token: string, userId: string, cabinetId: string, expiresAt: Date): Promise<void> {
    await db.insert(telegramAuthTokens).values({ token, userId, cabinetId, expiresAt });
  }

  async validateAndConsumeTelegramAuthToken(token: string): Promise<{ userId: string; cabinetId: string } | null> {
    const results = await db.select().from(telegramAuthTokens).where(eq(telegramAuthTokens.token, token)).limit(1);
    if (results.length === 0) return null;
    const authToken = results[0];
    await db.delete(telegramAuthTokens).where(eq(telegramAuthTokens.token, token));
    if (new Date() > authToken.expiresAt) return null;
    return { userId: authToken.userId, cabinetId: authToken.cabinetId };
  }

  async getCabinetByTelegramChatId(chatId: string): Promise<WbCabinet | null> {
    const results = await db.select().from(wbCabinets).where(eq(wbCabinets.telegramChatId, chatId)).limit(1);
    return results[0] || null;
  }

  async getCabinetsByTelegramChatId(chatId: string): Promise<WbCabinet[]> {
    return await db.select().from(wbCabinets).where(eq(wbCabinets.telegramChatId, chatId));
  }

  async cleanupExpiredTelegramTokens(): Promise<void> {
    await db.delete(telegramAuthTokens).where(sql`${telegramAuthTokens.expiresAt} < NOW()`);
  }
}

export const storage = new DatabaseStorage();
