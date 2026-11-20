// =============================================================
// agrupar.mjs — Junta matérias que falam do MESMO fato.
//
// Por que isso importa: se BBC, Al Jazeera e DW escreveram sobre o
// mesmo acontecimento, ele é um "fato" com 3 fontes independentes.
// Quanto mais fontes diferentes, mais relevante e mais confirmado.
//
// Como funciona: comparamos as palavras importantes dos títulos.
// Se dois títulos têm pelo menos 3 palavras importantes em comum, e
// essas palavras são pelo menos metade das palavras do título menor,
// consideramos que é o mesmo fato.
//
// Limite conhecido: títulos em línguas diferentes (português x inglês)
// quase nunca se juntam. Na etapa 7, a IA resolve isso traduzindo.
// =============================================================

import { normalizar } from './classificar.mjs';

// Palavras muito comuns que não ajudam a identificar o assunto.
const PALAVRAS_VAZIAS = new Set(`
  a o as os um uma uns umas de do da dos das em no na nos nas por para pelo pela com sem sob sobre entre
  e ou mas que se ao aos como mais menos ja nao sim diz dizem afirma apos ate seu sua seus suas ele ela eles
  elas isso este esta esse essa novo nova novos novas ser sao foi era sera tem ter vai vao pode podem diz
  the a an of in on at to for from by with without and or but as is are was were be been has have had will
  would can could says said say after over into about its it this that these those new than more not his her
  their they he she we you our up out amid us
`.split(/\s+/).filter(Boolean));

/** Palavras importantes de um título (sem as vazias, com 3+ letras). */
export function palavrasChave(titulo) {
  return new Set(
    normalizar(titulo).split(' ').filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p)),
  );
}

/** Os dois títulos falam do mesmo fato? */
function mesmoFato(a, b) {
  let comuns = 0;
  for (const p of a) if (b.has(p)) comuns++;
  const menor = Math.min(a.size, b.size) || 1;
  return comuns >= 3 && comuns / menor >= 0.5;
}

/**
 * Recebe a lista de notícias e devolve uma lista de "fatos".
 * Cada fato: { id, titulo, fontes (quantas diferentes), noticias: [...] }
 * Ordem: fatos com mais fontes primeiro; empate → o mais recente primeiro.
 */
export function agrupar(noticias) {
  const grupos = []; // cada grupo: { chaves: [Set, ...], noticias: [...] }

  for (const noticia of noticias) {
    const chaves = palavrasChave(noticia.titulo);
    const grupo = grupos.find((g) => g.chaves.some((c) => mesmoFato(c, chaves)));
    if (grupo) {
      grupo.chaves.push(chaves);
      grupo.noticias.push(noticia);
    } else {
      grupos.push({ chaves: [chaves], noticias: [noticia] });
    }
  }

  const fatos = grupos.map((g) => {
    // Dentro do fato: a notícia mais recente primeiro.
    const lista = g.noticias.sort((a, b) => (b.publicadoEm || '').localeCompare(a.publicadoEm || ''));
    const fontes = new Set(lista.map((n) => n.fonte));
    // Título do fato: preferimos uma notícia em português, se houver.
    const principal = lista.find((n) => n.idioma === 'pt') || lista[0];
    // Regiões e temas do fato: a união das notícias, por frequência.
    const contar = (campo) => {
      const conta = {};
      lista.forEach((n) => n[campo].forEach((v) => { conta[v] = (conta[v] || 0) + 1; }));
      return Object.keys(conta).sort((a, b) => conta[b] - conta[a]);
    };
    return {
      id: principal.id,
      titulo: principal.titulo,
      imagem: (lista.find((n) => n.imagem) || {}).imagem || '',
      fontes: fontes.size,
      umaFonteSo: fontes.size === 1,
      regioes: contar('regioes'),
      temas: contar('temas'),
      maisRecente: lista[0].publicadoEm,
      noticias: lista.map((n) => n.id),
    };
  });

  return fatos.sort((a, b) => b.fontes - a.fontes || (b.maisRecente || '').localeCompare(a.maisRecente || ''));
}
