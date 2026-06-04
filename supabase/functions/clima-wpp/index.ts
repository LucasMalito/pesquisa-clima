// clima-wpp — agente WhatsApp da Pesquisa de Clima.
// Usa os secrets já existentes no projeto (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID).
// Ações: info (diagnóstico do número), send (texto livre, exige janela 24h),
//        template (mensagem template aprovada, ex hello_world), link (manda o link da pesquisa).
// Secrets dedicados do clima (número BR de produção). Fallback pros do Caixa de Paz.
const TOKEN = Deno.env.get("CLIMA_WPP_TOKEN") ?? Deno.env.get("WHATSAPP_TOKEN") ?? "";
const PHONE_ID = Deno.env.get("CLIMA_WPP_PHONE_ID") ?? Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const b = await req.json().catch(() => ({}));
    const acao = b.acao ?? "info";

    if (acao === "info") {
      const r = await fetch(`${GRAPH}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating&access_token=${TOKEN}`);
      return new Response(JSON.stringify({ phone_id_tail: PHONE_ID.slice(-4), meta: await r.json() }), { headers: CORS });
    }

    if (acao === "template") {
      const r = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: b.to, type: "template",
          template: { name: b.template ?? "hello_world", language: { code: b.lang ?? "en_US" } } }),
      });
      return new Response(JSON.stringify(await r.json()), { headers: CORS, status: r.status });
    }

    if (acao === "send" || acao === "link") {
      const texto = acao === "link"
        ? `Oi! 👋 A *Pesquisa de Clima* tá pronta. Responde rapidinho aqui (2 min):\n${b.url ?? ""}`
        : (b.text ?? "Oi! Mensagem de teste do agente de clima 🤖");
      const r = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: b.to, type: "text", text: { body: texto, preview_url: true } }),
      });
      return new Response(JSON.stringify(await r.json()), { headers: CORS, status: r.status });
    }

    return new Response(JSON.stringify({ error: "acao desconhecida" }), { headers: CORS, status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: CORS, status: 500 });
  }
});
