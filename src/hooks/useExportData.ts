import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { objectsToCsv, downloadCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

async function fetchAllRows(table: string, select: string = "*") {
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase
      .from(table as any)
      .select(select)
      .range(from, from + PAGE - 1) as any);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportAll = async () => {
    setIsExporting(true);
    try {
      const [reviews, chats, chatMessages, recommendations, cabinets, tokenBalances, profiles] =
        await Promise.all([
          fetchAllRows("reviews", "wb_id,rating,author_name,text,pros,cons,product_name,product_article,status,ai_draft,sent_answer,created_date"),
          fetchAllRows("chats", "chat_id,client_name,product_name,last_message_text,last_message_at,is_read"),
          fetchAllRows("chat_messages", "chat_id,sender,text,sent_at"),
          fetchAllRows("product_recommendations", "source_article,target_article,target_name"),
          fetchAllRows("wb_cabinets", "id,name,brand_name,wb_api_key,ai_prompt_template,reply_modes,is_active,last_sync_at"),
          fetchAllRows("token_balances", "user_id,balance,updated_at"),
          fetchAllRows("profiles", "id,display_name,phone,created_at"),
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
