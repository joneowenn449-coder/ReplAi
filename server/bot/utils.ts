// Shared utility functions for the Telegram bot

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

export function ratingStars(rating: number): string {
  const filled = Math.min(Math.max(rating, 0), 5);
  return "⭐".repeat(filled) + "☆".repeat(5 - filled);
}

export function ratingStarsCompact(rating: number): string {
  return `${"⭐".repeat(Math.min(Math.max(rating, 0), 5))} ${rating}/5`;
}

export function ratingEmoji(rating: number): string {
  if (rating <= 2) return "🔴";
  if (rating === 3) return "🟡";
  return "🟢";
}

export function formatReplyModes(replyModes: Record<string, string> | null): string {
  const modes = replyModes && Object.keys(replyModes).length > 0
    ? replyModes
    : { "1": "manual", "2": "manual", "3": "manual", "4": "auto", "5": "auto" };

  const modeLabel = (m: string) => m === "auto" ? "Авто" : "Ручной";

  const high = modes["4"] || modes["5"] || "auto";
  const low = modes["1"] || modes["2"] || modes["3"] || "manual";

  return `⭐4-5 → ${modeLabel(high)}\n⭐1-3 → ${modeLabel(low)}`;
}
