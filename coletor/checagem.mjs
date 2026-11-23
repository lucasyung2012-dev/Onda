// =============================================================
// checagem.mjs — O fato é verdade? Checagem por confirmação independente.
//
// Ninguém garante 100% de verdade. O que dá para medir é o que os
// checadores profissionais medem: fontes INDEPENDENTES, de vários
// países, contam o mesmo fato? Alguma agência de checagem desmentiu?
//
// Três conferências, todas gratuitas e sem Wikipedia:
//   1. As fontes do Onda (cerca de 70 veículos de vários países): em
//      quantos países diferentes o fato aparece nos últimos 3 dias.
//   2. GDELT: banco público que acompanha jornais do mundo inteiro;
//      diz em quantos veículos e países o fato saiu.
//   3. Agências de checagem (Lupa, Aos Fatos, Comprova, Boatos.org,
//      Maldita, Full Fact, Snopes, FactCheck.org, Lead Stories): se
//      alguma desmentiu o assunto.
//
// O resultado é um selo:
//   confirmado     vários países e fontes independentes
//   provavel       confirmado, mas com pouca cobertura independente
//   nao_confirmado só um lado ou poucas fontes
//   contestado     uma agência de checagem desmentiu ou contesta
// =============================================================

import { lerFeed } from './rss.mjs';
import { buscarOutrasLinhas, semAcento } from './linhas.mjs';

const NAVEGADOR = 'OndaRadar/1.0 (https://github.com/lucasyung2012-dev/Onda)';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export const CHECADORES = [
  { nome: 'Lupa', pais: 'Brasil', feed: 'https://lupa.uol.com.br/feed' },
  { nome: 'Aos Fatos', pais: 'Brasil', feed: 'https://www.aosfatos.org/noticias/feed/' },
  { nome: 'Comprova', pais: 'Brasil', feed: 'https://projetocomprova.com.br/feed/' },
  { nome: 'Boatos.org', pais: 'Brasil', feed: 'https://www.boatos.org/feed' },
  { nome: 'Maldita', pais: 'Espanha', feed: 'https://maldita.es/feed/' },
  { nome: 'Full Fact', pais: 'Reino Unido', feed: 'https://fullfact.org/feed/' },
  { nome: 'Snopes', pais: 'EUA', feed: 'https://www.snopes.com/feed/' },
  { nome: 'FactCheck.org', pais: 'EUA', feed: 'https://www.factcheck.org/feed/' },
  { nome: 'Lead Stories', pais: 'EUA', feed: 'https://leadstories.com/atom.xml' },
];

// Palavras que, no título de uma checagem, indicam que algo foi desmentido.
const DESMENTIDO = /\b(falso|falsa|fake|enganos[oa]|boato|sem provas|n[ãa]o [ée] verdade|montagem|tirad[oa] de contexto|bulo|false|misleading|fabricated|hoax|no evidence|not true|incorrect|doctored|altered)\b/i;

/** Lê os feeds dos checadores uma vez por execução. Feed que falhar fica de fora. */
export async function carregarChecadores() {
  const itens = [];
  await Promise.all(CHECADORES.map(async (c) => {
    try {
      const r = await fetch(c.feed, { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) return;
      for (const i of lerFeed(await r.text())) itens.push({ ...i, checador: c.nome, pais: c.pais });
    } catch { /* checador fora do ar: segue sem ele */ }
  }));
  console.log(`  Checadores lidos: ${new Set(itens.map((i) => i.checador)).size} de ${CHECADORES.length} (${itens.length} checagens recentes)`);
  return itens;
}

/** Procura o fato no GDELT (últimos 3 dias). Devolve veículos e países. */
async function noGdelt(busca) {
  if (!busca) return null;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json&maxrecords=75&timespan=3d&query=${encodeURIComponent(busca)}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const texto = await r.text();
    if (!texto.trim().startsWith('{')) return null; // o GDELT responde texto quando a busca é inválida
    const artigos = JSON.parse(texto).articles || [];
    return {
      artigos: artigos.length,
      veiculos: new Set(artigos.map((a) => a.domain)).size,
      paises: [...new Set(artigos.map((a) => a.sourcecountry).filter(Boolean))],
    };
  } catch {
    return null;
  } finally {
    await esperar(6000); // o GDELT pede no máximo 1 pedido a cada 5 segundos
  }
}

/**
 * Checa um fato. Recebe as matérias que já temos, as palavras do assunto
 * (português e inglês) e uma busca curta em inglês para o GDELT.
 */
export async function checarFato({ materias = [], palavras = [], buscaEn = '' }, checagens = []) {
  // 1. Fontes do Onda: as matérias do fato + outras sobre ele nos últimos 3 dias
  const extras = await buscarOutrasLinhas(palavras, {
    jaUsadas: materias.map((m) => m.link), dias: 3, maximo: 40, minimo: palavras.length >= 4 ? 2 : 1,
  }).catch(() => []);
  const todas = [...materias, ...extras];
  const paisesOnda = [...new Set(todas.map((m) => m.pais).filter(Boolean))];
  const veiculosOnda = new Set(todas.map((m) => m.fonteNome || m.fonte)).size;

  // 2. GDELT
  const gdelt = await noGdelt(buscaEn);

  // 3. Checadores: alguma checagem recente fala desse assunto?
  const limpas = [...new Set(palavras.map((p) => semAcento(p).trim()).filter((p) => p.length >= 4))];
  const ligadas = checagens
    .filter((c) => limpas.filter((p) => semAcento(`${c.titulo} ${c.resumo || ''}`).includes(p)).length >= 2)
    .slice(0, 3)
    .map((c) => ({ checador: c.checador, titulo: c.titulo, link: c.link, desmente: DESMENTIDO.test(c.titulo) }));

  // O selo
  const paisesGdelt = gdelt?.paises.length || 0;
  let nivel;
  if (ligadas.some((c) => c.desmente)) nivel = 'contestado';
  else if (paisesOnda.length >= 3 || (paisesOnda.length >= 2 && paisesGdelt >= 4)) nivel = 'confirmado';
  else if (paisesOnda.length >= 2 || paisesGdelt >= 3) nivel = 'provavel';
  else nivel = 'nao_confirmado';

  return {
    nivel,
    paises: paisesOnda.slice(0, 20), // em português (o GDELT entra só na contagem)
    onda: { veiculos: veiculosOnda, paises: paisesOnda.length },
    gdelt: gdelt ? { artigos: gdelt.artigos, veiculos: gdelt.veiculos, paises: paisesGdelt } : null,
    checagens: ligadas,
    em: new Date().toISOString(),
  };
}

/** Passa no filtro do destaque? (só fato confirmado ou provável vira destaque) */
export const passa = (checagem) => ['confirmado', 'provavel'].includes(checagem?.nivel);
