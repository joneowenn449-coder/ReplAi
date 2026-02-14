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
    const ROBOKASSA_PASSWORD2 = Deno.env.get("ROBOKASSA_PASSWORD2");
    if (!ROBOKASSA_PASSWORD2) {
      console.error("[robokassa-webhook] ROBOKASSA_PASSWORD2 not configured");
      return new Response("Configuration error", { status: 503 });
    }

    // Robokassa sends POST with form data or query params
    let outSum: string, invId: string, signatureValue: string;

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        outSum = formData.get("OutSum") as string;
        invId = formData.get("InvId") as string;
        signatureValue = formData.get("SignatureValue") as string;
      } else {
        const body = await req.json();
        outSum = body.OutSum;
        invId = body.InvId;
        signatureValue = body.SignatureValue;
      }
    } else {
      const url = new URL(req.url);
      outSum = url.searchParams.get("OutSum")!;
      invId = url.searchParams.get("InvId")!;
      signatureValue = url.searchParams.get("SignatureValue")!;
    }

    if (!outSum || !invId || !signatureValue) {
      console.error("[robokassa-webhook] Missing required params");
      return new Response("bad request", { status: 400 });
    }

    // Verify signature: MD5(OutSum:InvId:Password2)
    const expectedSignature = await md5(`${outSum}:${invId}:${ROBOKASSA_PASSWORD2}`);
    if (signatureValue.toLowerCase() !== expectedSignature.toLowerCase()) {
      console.error(`[robokassa-webhook] Invalid signature for InvId=${invId}`);
      return new Response("bad sign", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find payment
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("inv_id", Number(invId))
      .single();

    if (fetchError || !payment) {
      console.error(`[robokassa-webhook] Payment not found for InvId=${invId}`, fetchError);
      return new Response("payment not found", { status: 404 });
    }

    if (payment.status === "completed") {
      console.log(`[robokassa-webhook] Payment InvId=${invId} already completed`);
      return new Response(`OK${invId}`, { status: 200 });
    }

    // Update payment status
    await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("inv_id", Number(invId));

    // Add tokens to user balance
    const { data: existingBalance } = await supabase
      .from("token_balances")
      .select("balance")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    if (existingBalance) {
      await supabase
        .from("token_balances")
        .update({ balance: existingBalance.balance + payment.tokens })
        .eq("user_id", payment.user_id);
    } else {
      await supabase
        .from("token_balances")
        .insert({ user_id: payment.user_id, balance: payment.tokens });
    }

    // Log transaction
    await supabase.from("token_transactions").insert({
      user_id: payment.user_id,
      amount: payment.tokens,
      type: "purchase",
      description: `Покупка ${payment.tokens} токенов (${outSum} ₽)`,
    });

    console.log(`[robokassa-webhook] Payment InvId=${invId} completed. Added ${payment.tokens} tokens to user ${payment.user_id}`);

    // Robokassa expects OK{InvId}
    return new Response(`OK${invId}`, { status: 200 });
  } catch (err) {
    console.error("[robokassa-webhook] Unexpected error:", err);
    return new Response("internal error", { status: 500 });
  }
});
