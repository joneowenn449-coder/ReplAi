import { supabase } from "@/integrations/supabase/client";

export async function fetchAllRows(table: string, select: string = "*") {
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
