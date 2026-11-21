// =============================================================
// linhas.mjs — Notícias de várias linhas editoriais.
//
// Para mostrar "como cada lado vê" (no destaque) e "as vertentes" (no
// tema), não basta ler as matérias que vieram juntas: muitas vezes elas
// são todas do mesmo lado. Este módulo procura, nas notícias dos últimos
// dias (de todas as fontes do Onda), as que falam do mesmo assunto e
// escolhe as de países e linhas editoriais DIFERENTES.
//
// Usado por coletor/tema.mjs e coletor/analisar.mjs.
// =============================================================

import { readFile } from 'node:fs/promises';

const RAIZ = new URL('../', import.meta.url);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(new URL(c, RAIZ), 'utf8')); } catch { return padrao; } };

export const semAcento = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Procura notícias sobre o assunto (pelas palavras) vindas de outras linhas.
 *   palavras      nomes e termos do assunto, em português e inglês
 *   jaUsadas      links que já estão na análise (não repete)
 *   fontesVistas  fontes que já estão na análise (busca outras)
 *   paisesVistos  países que já estão na análise (dá preferência a outros)
 *   dias          quantos dias para trás olhar (máx. 7, o que a coleta guarda)
 *   minimo        quantas palavras a notícia precisa conter para valer
 */
export async function buscarOutrasLinhas(palavras, {
  jaUsadas = [], fontesVistas = [], paisesVistos = [], maximo = 12, dias = 7, minimo = 1,
} = {}) {
  const limpas = [...new Set((palavras || []).map((p) => semAcento(p).trim()).filter((p) => p.length >= 3))];
  if (!limpas.length) return [];
  // Palavra inteira: "otan" acha "a OTAN decidiu", mas não "botanica".
  const regras = limpas.map((p) => new RegExp(`(^|[^a-z0-9])${escaparRegex(p)}([^a-z0-9]|$)`));

  const indice = await lerJson('data/noticias/indice.json', { dias: [] });
  const vistos = new Set(jaUsadas);
  const achadas = [];
  for (const dia of indice.dias.slice(0, dias)) {
    const { noticias = [] } = await lerJson(`data/noticias/${dia}.json`, { noticias: [] });
    for (const n of noticias) {
      if (!n.link || vistos.has(n.link)) continue;
      const texto = semAcento(`${n.titulo} ${n.resumo || ''}`);
      const pontos = regras.filter((r) => r.test(texto)).length;
      if (pontos >= minimo) { vistos.add(n.link); achadas.push({ ...n, pontos }); }
    }
  }
  achadas.sort((a, b) => b.pontos - a.pontos || (b.publicadoEm || '').localeCompare(a.publicadoEm || ''));

  // Variedade: uma notícia por fonte; na 1ª rodada, só países ainda não vistos.
  const escolhidas = [];
  const fontes = new Set(fontesVistas);
  const paises = new Set(paisesVistos);
  for (const rodada of [1, 2]) {
    for (const n of achadas) {
      if (escolhidas.length >= maximo) break;
      if (fontes.has(n.fonte) || (rodada === 1 && paises.has(n.pais))) continue;
      escolhidas.push(n);
      fontes.add(n.fonte);
      paises.add(n.pais);
    }
  }
  return escolhidas;
}
