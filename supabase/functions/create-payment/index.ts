import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function md5(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ROBOKASSA_LOGIN = Deno.env.get("ROBOKASSA_LOGIN");
    const ROBOKASSA_PASSWORD1 = Deno.env.get("ROBOKASSA_PASSWORD1");

    if (!ROBOKASSA_LOGIN || !ROBOKASSA_PASSWORD1) {
      return new Response(
        JSON.stringify({ error: "Оплата пока не настроена. Ключи Робокассы не добавлены." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, tokens } = await req.json();
    if (!amount || !tokens) {
      return new Response(JSON.stringify({ error: "amount and tokens are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payment record
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({ user_id: user.id, amount, tokens, status: "pending" })
      .select("inv_id")
      .single();

    if (paymentError || !payment) {
      console.error("[create-payment] Error creating payment:", paymentError);
      return new Response(JSON.stringify({ error: "Failed to create payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outSum = Number(amount).toFixed(2);
    const invId = payment.inv_id;

    // MD5: MerchantLogin:OutSum:InvId:Password1
    const signatureString = `${ROBOKASSA_LOGIN}:${outSum}:${invId}:${ROBOKASSA_PASSWORD1}`;
    const signature = await md5(signatureString);

    // Test mode enabled by default
    const robokassaUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${ROBOKASSA_LOGIN}&OutSum=${outSum}&InvId=${invId}&SignatureValue=${signature}&IsTest=1`;

    console.log(`[create-payment] Created payment inv_id=${invId} for user=${user.id}, amount=${outSum}, tokens=${tokens}`);

    return new Response(
      JSON.stringify({ url: robokassaUrl, inv_id: invId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-payment] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
