// Bot pending states — persistent storage (replaces in-memory Maps)
//
// State types:
//   onboarding     — user entering API key during /start (targetId = JSON {userId, cabinetId})
//   edit           — user editing a draft reply (targetId = reviewId)
//   api_key_update — user updating API key for cabinet (targetId = cabinetId)
//   new_cabinet    — user adding new cabinet (targetId = userId)

import { db } from "../db";
import { eq, and, lt } from "drizzle-orm";
import { botPendingStates } from "@shared/schema";

export type PendingStateType = "onboarding" | "edit" | "api_key_update" | "new_cabinet";

// ── SET (upsert: one state per chatId+type) ──

export async function setPendingState(
  chatId: string,
  type: PendingStateType,
  targetId: string,
): Promise<void> {
  // Delete existing state of this type for this chat, then insert
  await db.delete(botPendingStates).where(
    and(eq(botPendingStates.chatId, chatId), eq(botPendingStates.type, type)),
  );
  await db.insert(botPendingStates).values({ chatId, type, targetId });
}

// ── GET ──

export async function getPendingState(
  chatId: string,
  type: PendingStateType,
): Promise<string | null> {
  const rows = await db
    .select({ targetId: botPendingStates.targetId })
    .from(botPendingStates)
    .where(and(eq(botPendingStates.chatId, chatId), eq(botPendingStates.type, type)))
    .limit(1);
  return rows[0]?.targetId ?? null;
}

// ── DELETE ──

export async function clearPendingState(
  chatId: string,
  type: PendingStateType,
): Promise<void> {
  await db.delete(botPendingStates).where(
    and(eq(botPendingStates.chatId, chatId), eq(botPendingStates.type, type)),
  );
}

// ── CLEAR ALL for a chatId ──

export async function clearAllPendingStates(chatId: string): Promise<void> {
  await db.delete(botPendingStates).where(eq(botPendingStates.chatId, chatId));
}

// ── AUTO-EXPIRE: delete states older than 24 hours ──

export async function expireOldPendingStates(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db
    .delete(botPendingStates)
    .where(lt(botPendingStates.createdAt, cutoff))
    .returning({ id: botPendingStates.id });
  return result.length;
}

// ── Convenience helpers for onboarding (stores JSON payload) ──

export interface OnboardingContext {
  userId: string;
  cabinetId: string;
}

export async function setPendingOnboarding(
  chatId: string,
  ctx: OnboardingContext,
): Promise<void> {
  await setPendingState(chatId, "onboarding", JSON.stringify(ctx));
}

export async function getPendingOnboarding(
  chatId: string,
): Promise<OnboardingContext | null> {
  const raw = await getPendingState(chatId, "onboarding");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingContext;
  } catch {
    return null;
  }
}

export async function clearPendingOnboarding(chatId: string): Promise<void> {
  await clearPendingState(chatId, "onboarding");
}
