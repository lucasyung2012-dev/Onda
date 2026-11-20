// =============================================================
// prompt.js — O botão "Copiar prompt" e o "Colar resposta da IA".
//
// O prompt leva a notícia, as fontes e as regras do Onda para qualquer
// IA (ChatGPT, Claude, Gemini...). Pedimos a resposta em seções com
// títulos fixos; assim o Onda consegue colar cada parte no campo certo.
// Você revisa e ajusta antes de marcar como pronta.
// =============================================================

const SECOES = [
  ['oQueAconteceu', 'O QUE ACONTECEU'],
  ['afetados', 'QUEM É AFETADO DIRETAMENTE'],
  ['economia', 'EFEITOS NA ECONOMIA'],
  ['politica', 'EFEITOS NA POLÍTICA'],
  ['precos', 'EFEITOS NOS PREÇOS'],
  ['midia', 'EFEITOS NA MÍDIA'],
  ['outros', 'OUTROS EFEITOS'],
  ['chegaEmMim', 'COMO CHEGA EM MIM'],
  ['impacto', 'TIPO DE IMPACTO'],
  ['notaGeral', 'NOTA IMPORTÂNCIA GERAL'],
  ['notaMundo', 'NOTA IMPACTO MUNDIAL'],
  ['notaVoce', 'NOTA IMPACTO NO MEU DIA A DIA'],
];

/** Monta o texto para colar numa IA. */
export function gerarPrompt(item) {
  const fontes = (item.materias || []).map((m, i) =>
    `${i + 1}. ${m.fonte} (${m.pais}) — "${m.titulo}" — ${m.link}`).join('\n');
  return `Sou um estudante brasileiro de São Paulo e quero entender como um acontecimento do mundo chega ao meu dia a dia. Faça um RASCUNHO da cadeia de efeitos desta notícia, que eu vou revisar.

NOTÍCIA: ${item.titulo}
${item.resumo ? `RESUMO: ${item.resumo}\n` : ''}FONTES (leia as que conseguir abrir):
${fontes}

REGRAS:
- Use só informações verificáveis; diga "sem dado" quando não souber. Não invente números, datas ou citações.
- Separe o que é fato confirmado do que é declaração, alegação ou interpretação.
- Diferencie a data do fato da data da publicação.
- Não exagere o impacto no Brasil. Se não houver impacto relevante, diga isso.
- Notas de 0 a 10: 0–2 mínima; 3–4 regional; 5–6 internacional relevante; 7–8 grande acontecimento; 9 excepcional; 10 raríssimo (transforma a ordem mundial). As três notas são independentes.

RESPONDA EXATAMENTE NESTE FORMATO, com estes títulos em maiúsculas, um por linha:
${SECOES.map(([, titulo]) => `${titulo}: ...`).join('\n')}

Em TIPO DE IMPACTO, escreva só uma palavra: direto, indireto, risco ou nenhum. Nas NOTAS, escreva só o número.`;
}

/** Tira acentos e deixa maiúsculo (para achar os títulos mesmo com pequenas diferenças). */
// Troca letra por letra, para o texto continuar com o mesmo tamanho
// (assim as posições achadas valem também no texto original).
const normal = (t) => t.split('').map((c) => c.normalize('NFD')[0].toUpperCase()[0] || c).join('');

/**
 * Lê a resposta colada da IA e devolve os campos encontrados.
 * Ex.: { oQueAconteceu: '...', notaGeral: 7, impacto: 'indireto' }
 */
export function lerResposta(texto) {
  const textoNormal = normal(texto);
  const posicoes = SECOES
    .map(([campo, titulo]) => ({ campo, titulo, inicio: textoNormal.indexOf(normal(titulo)) }))
    .filter((s) => s.inicio >= 0)
    .sort((a, b) => a.inicio - b.inicio);

  const campos = {};
  posicoes.forEach((s, i) => {
    const fim = i + 1 < posicoes.length ? posicoes[i + 1].inicio : texto.length;
    // Pula o título e o ":" e limpa marcações como ** de negrito.
    let valor = texto.slice(s.inicio + s.titulo.length, fim).replace(/^[\s:*#-]+/, '').replace(/\*\*/g, '').trim();
    if (s.campo.startsWith('nota')) {
      const n = parseInt(valor.match(/\d+/)?.[0], 10);
      if (Number.isFinite(n)) campos[s.campo] = Math.max(0, Math.min(10, n));
    } else if (s.campo === 'impacto') {
      const v = normal(valor);
      campos.impacto = v.includes('INDIRETO') ? 'indireto' : v.includes('DIRETO') ? 'direto' : v.includes('RISCO') ? 'risco' : v.includes('NENHUM') ? 'nenhum' : undefined;
    } else if (valor) {
      campos[s.campo] = valor;
    }
  });
  return campos;
}
