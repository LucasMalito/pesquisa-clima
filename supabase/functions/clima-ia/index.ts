// clima-ia — cérebro Claude da Pesquisa de Clima.
// Ações: gerar_perguntas | extrair_contatos (foto/pdf) | analisar | resumir
const KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-haiku-4-5-20251001";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };

async function claude(messages: unknown, system: string, max = 1500) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: max, system, messages }),
  });
  const j = await r.json();
  return j?.content?.[0]?.text ?? "";
}
function pickJSON(s: string) {
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  const c = s.indexOf("["), d = s.lastIndexOf("]");
  const cand = (c > -1 && (c < a || a === -1)) ? s.slice(c, d + 1) : s.slice(a, b + 1);
  try { return JSON.parse(cand); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const b = await req.json().catch(() => ({}));
    const acao = b.acao;

    // ---- GERAR PERGUNTAS ----
    if (acao === "gerar_perguntas") {
      const sys = `Você cria pesquisas de CLIMA para bares/restaurantes no Brasil. Gere perguntas curtas, diretas, em português coloquial, que um garçom/cozinheiro entenda fácil. Devolva SÓ um JSON array. Cada item: {"tipo":"escala|enps|aberta","pilar":"<id>","texto":"..."}. Use "escala" (carinha 1-5) na maioria; inclua EXATAMENTE 1 "enps" (recomendaria trabalhar aqui, 0-10) e 1 "aberta" no fim. Pilares possíveis: lideranca, reconhecimento, ambiente, escala, remuneracao, comunicacao, crescimento, orgulho, condicoes, seguranca.`;
      const u = `Contexto da casa: tipo="${b.contexto?.tipo || ""}"; quer descobrir="${b.contexto?.descobrir || ""}"; temas de foco=${JSON.stringify(b.focos || [])}. Gere ${b.qtd || 6} perguntas no total (contando o eNPS e a aberta).`;
      const txt = await claude([{ role: "user", content: u }], sys, 1500);
      const arr = pickJSON(txt);
      return new Response(JSON.stringify({ perguntas: Array.isArray(arr) ? arr : [] }), { headers: CORS });
    }

    // ---- EXTRAIR CONTATOS (foto / pdf) ----
    if (acao === "extrair_contatos") {
      const sys = `Você extrai uma lista de funcionários de um documento (foto de lista, planilha ou PDF). Devolva SÓ um JSON array de objetos {"nome":"Nome Completo","telefone":"só dígitos, com DDD, ex 11999998888 ou vazio"}. Ignore cabeçalhos. Se não houver telefone, deixe "". Não invente dados.`;
      const block = b.mime === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b.dataB64 } }
        : { type: "image", source: { type: "base64", media_type: b.mime || "image/jpeg", data: b.dataB64 } };
      const txt = await claude([{ role: "user", content: [block, { type: "text", text: "Extraia nome e telefone de cada pessoa." }] }], sys, 2000);
      const arr = pickJSON(txt);
      return new Response(JSON.stringify({ contatos: Array.isArray(arr) ? arr : [] }), { headers: CORS });
    }

    // ---- ANALISAR (panorama personalizado pro dono) ----
    if (acao === "analisar" || acao === "resumir") {
      const curto = acao === "resumir";
      const sys = `Você é um consultor de RH analisando uma pesquisa de clima de um bar/restaurante chamado "${b.empresa || "a casa"}". Fale direto com o DONO, em português simples, sem jargão. ${curto ? "Seja MUITO curto (2-3 frases + 1 ação)." : "Dê um panorama em 4 blocos curtos: (1) Resumo geral, (2) Pontos fortes, (3) Pontos de atenção, (4) 3 ações práticas pra esta semana."} Use os comentários dos funcionários pra dar profundidade. Responda em HTML simples (use <b>, <br>, <ul><li>). Não invente números que não estão nos dados.`;
      const dados = `Métricas: ${JSON.stringify(b.metricas || {})}. Comentários dos funcionários: ${JSON.stringify((b.metricas?.comentarios) || b.comentarios || [])}.`;
      const txt = await claude([{ role: "user", content: dados }], sys, curto ? 400 : 1200);
      return new Response(JSON.stringify({ texto: txt }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "acao desconhecida" }), { headers: CORS, status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: CORS, status: 500 });
  }
});
