// =============================================================
// ia.mjs — Conversa com uma IA gratuita.
//
// O Onda não depende de um único serviço: tenta o primeiro da lista
// e, se ele falhar (fora do ar, limite do dia, chave ausente), tenta
// o próximo. Todos usam o mesmo "formato OpenAI" de conversa.
//
// As chaves ficam nos "Secrets" do GitHub (Settings → Secrets and
// variables → Actions), nunca no código:
//   GROQ_API_KEY        → Groq (principal)
//   OPENROUTER_API_KEY  → OpenRouter (reserva)
// Sem nenhuma chave, a análise simplesmente não roda e o app avisa.
// =============================================================

const PROVEDORES = [
  {
    nome: 'Groq',
    chave: () => process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    modelo: process.env.GROQ_MODELO || 'openai/gpt-oss-120b',
    extras: { reasoning_effort: 'medium' }, // os modelos gpt-oss "pensam" antes de responder
  },
  {
    nome: 'OpenRouter',
    chave: () => process.env.OPENROUTER_API_KEY,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    modelo: process.env.OPENROUTER_MODELO || 'openrouter/free', // escolhe um modelo gratuito disponível
    extras: {},
  },
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Há pelo menos uma chave configurada? */
export function temIA() {
  return PROVEDORES.some((p) => p.chave());
}

/** Faz um pedido a um provedor. Devolve o texto da resposta. */
async function pedir(provedor, mensagens, maxTokens) {
  const corpo = {
    model: provedor.modelo,
    messages: mensagens,
    temperature: 0.3,              // respostas mais estáveis, menos "criativas"
    max_completion_tokens: maxTokens,
    response_format: { type: 'json_object' }, // pede a resposta em JSON
    ...provedor.extras,
  };
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const resposta = await fetch(provedor.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provedor.chave()}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'Onda',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(120000),
    });
    if (resposta.status === 429) {
      // Limite por minuto: espera o tempo que o serviço pedir (ou 60 s) e tenta de novo.
      const segundos = Number(resposta.headers.get('retry-after')) || 60;
      console.log(`  ${provedor.nome}: limite por minuto, esperando ${segundos} s…`);
      await esperar(Math.min(segundos, 120) * 1000);
      continue;
    }
    if (!resposta.ok) throw new Error(`${provedor.nome} respondeu HTTP ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
    const dados = await resposta.json();
    const texto = dados.choices?.[0]?.message?.content;
    if (!texto) throw new Error(`${provedor.nome} devolveu uma resposta vazia`);
    return { texto, modelo: dados.model || provedor.modelo };
  }
  throw new Error(`${provedor.nome}: limite de uso atingido`);
}

/** Tira o JSON de dentro da resposta (alguns modelos cercam com ```json). */
function lerJson(texto) {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const inicio = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  return JSON.parse(limpo.slice(inicio, fim + 1));
}

/**
 * Pergunta à IA e devolve { resposta (objeto JSON), provedor, modelo }.
 * `validar` é uma função que lança erro se a resposta não servir;
 * nesse caso tentamos de novo (uma vez) e depois o próximo provedor.
 */
export async function perguntarIA({ sistema, usuario, maxTokens = 4000, validar = () => {} }) {
  const erros = [];
  for (const provedor of PROVEDORES) {
    if (!provedor.chave()) continue;
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const { texto, modelo } = await pedir(provedor, [
          { role: 'system', content: sistema },
          { role: 'user', content: usuario },
        ], maxTokens);
        const resposta = lerJson(texto);
        validar(resposta);
        return { resposta, provedor: provedor.nome, modelo };
      } catch (erro) {
        console.log(`  ${provedor.nome} (tentativa ${tentativa}): ${erro.message}`);
        erros.push(`${provedor.nome}: ${erro.message}`);
      }
    }
  }
  throw new Error(erros.length ? erros.join(' | ') : 'nenhuma chave de IA configurada');
}
