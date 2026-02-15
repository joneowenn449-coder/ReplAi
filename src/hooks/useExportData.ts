import { useState } from "react";
import { objectsToCsv, downloadCsv } from "@/lib/exportCsv";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportAll = async () => {
    setIsExporting(true);
    try {
      const [reviews, chats, chatMessages, recommendations, cabinets, tokenBalances, profiles] =
        await Promise.all([
          apiRequest("/api/export/reviews"),
          apiRequest("/api/export/chats"),
          apiRequest("/api/export/chat_messages"),
          apiRequest("/api/export/product_recommendations"),
          apiRequest("/api/export/wb_cabinets"),
          apiRequest("/api/export/token_balances"),
          apiRequest("/api/export/profiles"),
        ]);

      const files = [
        { name: "reviews.csv", data: reviews },
        { name: "chats.csv", data: chats },
        { name: "chat_messages.csv", data: chatMessages },
        { name: "recommendations.csv", data: recommendations },
        { name: "wb_cabinets.csv", data: cabinets },
        { name: "token_balances.csv", data: tokenBalances },
        { name: "profiles.csv", data: profiles },
      ];

      let downloaded = 0;
      for (const file of files) {
        if (file.data.length > 0) {
          downloadCsv(file.name, objectsToCsv(file.data));
          downloaded++;
        }
      }

      toast.success(`Экспорт завершён: ${downloaded} файл(ов) скачано`);
    } catch (e: any) {
      console.error("Export error:", e);
      toast.error("Ошибка при экспорте: " + (e.message || "Неизвестная ошибка"));
    } finally {
      setIsExporting(false);
    }
  };

  return { exportAll, isExporting };
}
