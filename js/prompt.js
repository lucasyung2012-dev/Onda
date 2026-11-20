// =============================================================
// prompt.js — O botão "Copiar prompt" da "Minha análise".
//
// O prompt leva para qualquer IA (ChatGPT, Claude, Gemini...) a notícia,
// as fontes com link e TUDO que a análise precisa ter. Assim você só
// copia, cola na IA e cola a resposta de volta numa caixa de texto.
// =============================================================

export function gerarPrompt(item) {
  const fontes = (item.materias || []).map((m, i) =>
    `${i + 1}. ${m.fonte} (${m.pais}) — "${m.titulo}" — ${m.link}`).join('\n');
  const palpite = item.minha?.palpite?.trim();

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
