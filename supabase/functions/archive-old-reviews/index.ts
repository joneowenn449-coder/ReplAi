import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find reviews with status 'sent' or 'auto' where updated_at is older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`Archiving reviews older than ${cutoffDate}`);

    const { data: reviewsToArchive, error: selectError } = await supabase
      .from("reviews")
      .select("id")
      .in("status", ["sent", "auto"])
      .lt("updated_at", cutoffDate);

    if (selectError) {
      throw new Error(`Select error: ${selectError.message}`);
    }

    const count = reviewsToArchive?.length || 0;

    if (count === 0) {
      console.log("No reviews to archive");
      return new Response(
        JSON.stringify({ success: true, archived: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = reviewsToArchive!.map((r: any) => r.id);

    // Update in batches of 100 to avoid issues with large sets
    let totalArchived = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error: updateError } = await supabase
        .from("reviews")
        .update({ status: "archived" })
        .in("id", batch);

      if (updateError) {
        console.error(`Batch update error at offset ${i}:`, updateError);
        throw new Error(`Update error: ${updateError.message}`);
      }
      totalArchived += batch.length;
    }

    console.log(`Archived ${totalArchived} reviews`);

    return new Response(
      JSON.stringify({ success: true, archived: totalArchived }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("archive-old-reviews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
