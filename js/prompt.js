// =============================================================
// prompt.js — O botão "Copiar prompt" da "Minha análise".
//
// O prompt leva para qualquer IA (ChatGPT, Claude, Gemini...) a notícia,
// as fontes com link e TUDO que a análise precisa ter. Assim você só
// copia, cola na IA e cola a resposta de volta numa caixa de texto.
// =============================================================

import { emIngles } from './textos.js';

export function gerarPrompt(item) {
  const fontes = (item.materias || []).map((m, i) =>
    `${i + 1}. ${m.fonte} (${m.pais}) — "${m.titulo}" — ${m.link}`).join('\n');
  const palpite = item.minha?.palpite?.trim();

  // Com o app em inglês, o prompt também vai em inglês.
  if (emIngles()) {
    return `I'm a Brazilian student living in São Paulo and I want to understand how an event in the world reaches my daily life. Analyze this news story.

NEWS: ${item.titulo}
${item.resumo ? `SUMMARY: ${item.resumo}\n` : ''}SOURCES (read the ones you can open):
${fontes}
${palpite ? `\nMY GUESS (before reading your analysis): ${palpite}\nAt the end, tell me what I got right and what I got wrong.\n` : ''}
THE ANALYSIS MUST HAVE, in this order and with these headings:
1. What happened — what, where, when (the date of the EVENT, which may differ from the date of the news) and who is involved.
2. Who is directly affected — countries, companies, people.
3. What comes next — effects on the economy, politics, prices and the media (only the ones that make sense).
4. How it reaches me and Brazil — say whether the impact is direct, indirect, a potential risk or none for now.
5. Facts vs. claims — separate confirmed facts, official statements, allegations and interpretation.
6. Scores from 0 to 10, each with one sentence of justification:
   - Overall importance
   - Impact on the world
   - Impact on my daily life
   Scale: 0–2 minimal; 3–4 regional; 5–6 internationally relevant; 7–8 major event; 9 exceptional; 10 extremely rare (reshapes the world order). The three scores are independent.
7. What to watch in the coming days.

RULES:
- Use only verifiable information and say "no data" when you don't know. Don't make up numbers, dates, quotes or sources.
- Don't exaggerate the impact on Brazil. If there is no relevant impact, say so.
- Write clearly and directly, without jargon.`;
  }

  return `Sou um estudante brasileiro de São Paulo e quero entender como um acontecimento do mundo chega ao meu dia a dia. Analise esta notícia.

NOTÍCIA: ${item.titulo}
${item.resumo ? `RESUMO: ${item.resumo}\n` : ''}FONTES (leia as que conseguir abrir):
${fontes}
${palpite ? `\nMEU PALPITE (antes de ler a sua análise): ${palpite}\nNo final, diga em que eu acertei e em que eu errei.\n` : ''}
A ANÁLISE PRECISA TER, nesta ordem e com estes títulos:
1. O que aconteceu — o quê, onde, quando (a data do FATO, que pode ser diferente da data da notícia) e quem está envolvido.
2. Quem é afetado diretamente — países, empresas, pessoas.
3. Efeitos em seguida — na economia, na política, nos preços e na mídia (só os que fizerem sentido).
4. Como isso chega em mim e no Brasil — diga se o impacto é direto, indireto, um risco potencial ou se não há impacto imediato.
5. Fatos x versões — separe o que é fato confirmado, declaração oficial, alegação e interpretação.
6. Notas de 0 a 10, cada uma com uma frase de justificativa:
   - Importância geral
   - Impacto no mundo
   - Impacto no meu dia a dia
   Régua: 0–2 mínima; 3–4 regional; 5–6 internacional relevante; 7–8 grande acontecimento; 9 excepcional; 10 raríssimo (transforma a ordem mundial). As três notas são independentes.
7. O que acompanhar nos próximos dias.

REGRAS:
- Use só informações verificáveis e diga "sem dado" quando não souber. Não invente números, datas, citações ou fontes.
- Não exagere o impacto no Brasil. Se não houver impacto relevante, diga isso.
- Escreva em português, de forma clara e direta, sem jargão.`;
}
