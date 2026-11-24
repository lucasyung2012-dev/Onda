// =============================================================
// externas.mjs — Fontes de referência FORA da Wikipedia, para conferir
// os dados da aula do tema.
//
// A aula continua usando a Wikipedia como base (ela é ampla e bem
// organizada), mas qualquer pessoa pode editá-la. Por isso, os números,
// datas e curiosidades da aula são conferidos em outras fontes:
// sites oficiais (da organização ou do governo), centros de análise
// (ex.: Council on Foreign Relations), a ONU, o CIA World Factbook e
// reportagens explicativas de jornais.
//
// Quem indica as páginas é a IA, na escolha do tema. O robô abre cada
// uma; a que não abrir, ou não falar do assunto, fica de fora.
// =============================================================

import { textoPuro } from './rss.mjs';

const NAVEGADOR = 'Mozilla/5.0 (compatible; OndaRadar/1.0; +https://github.com/lucasyung2012-dev/Onda)';
const POR_PAGINA = 15000; // caracteres guardados de cada página

/** Endereço válido e que não seja Wikipedia (nem Wikimedia). */
const permitido = (url) => {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && !/(^|\.)(wikipedia|wikimedia|wikidata|wiktionary)\.org$/i.test(u.hostname);
  } catch { return false; }
};

/** Tira o texto dos parágrafos (<p>) de uma página. */
function paragrafos(html) {
  const ps = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || [])
    .map((p) => textoPuro(p))
    .filter((p) => p.length > 60);
  return ps.join('\n').slice(0, POR_PAGINA);
}

/**
 * Abre as páginas indicadas e devolve só as que funcionaram e falam do
 * assunto: [{ nome, url, texto }].
 */
export async function lerFontesExternas(lista, palavrasDoTema = []) {
  const termos = palavrasDoTema.map((p) => p.toLowerCase()).filter((p) => p.length >= 4);
  const boas = [];
  const falhas = []; // o motivo de cada página que ficou de fora (fica anotado na aula)
  for (const { nome, url } of (lista || []).slice(0, 6)) {
    if (!nome || !permitido(url)) continue;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!r.ok) { console.log(`  Fonte externa fora do ar: ${nome} (${r.status})`); falhas.push(`${nome}: respondeu ${r.status}`); continue; }
      const texto = paragrafos(await r.text());
      const fala = termos.filter((t) => texto.toLowerCase().includes(t)).length;
      if (texto.length < 800 || (termos.length && fala < Math.min(2, termos.length))) {
        console.log(`  Fonte externa sem conteúdo sobre o tema: ${nome}`);
        falhas.push(`${nome}: sem conteúdo sobre o tema`);
        continue;
      }
      boas.push({ nome, url: r.url || url, texto });
      console.log(`  Fonte externa lida: ${nome} (${Math.round(texto.length / 1000)} mil caracteres)`);
    } catch (erro) {
      console.log(`  Fonte externa não abriu: ${nome} (${erro.message})`);
      falhas.push(`${nome}: não abriu (${erro.message})`);
    }
  }
  boas.falhas = falhas;
  return boas;
}
