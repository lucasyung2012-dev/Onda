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

// ---------- As fontes que a própria Wikipedia cita ----------
// Os endereços que a IA sugere muitas vezes não existem (24–27/11: quase
// todos deram 404). As referências citadas nos artigos da Wikipedia, ao
// contrário, são endereços reais: reportagens, sites oficiais, documentos.
// Conferir o dado na fonte citada é o que um checador faz.

// Ignorados: redes sociais, catálogos de biblioteca e a própria Wikimedia (as cópias do
// Internet Archive ficam: guardam fontes antigas que já saíram do ar).
const IGNORAR = /(^|\.)(x|twitter|facebook|instagram|linkedin|youtube|youtu|tiktok|viaf|worldcat|loc|d-nb|bnf|idref|isni|orcid|doi|jstor|books\.google|google|wikipedia|wikimedia|wikidata|wiktionary)\.(com|org|net|gov|fr|de|be)$/i;
// Preferidos: grandes jornais e agências, sites oficiais e de organismos internacionais.
const CONFIAVEIS = /(^|\.)(bbc\.(com|co\.uk)|reuters\.com|apnews\.com|theguardian\.com|dw\.com|aljazeera\.com|france24\.com|lemonde\.fr|elpais\.com|nytimes\.com|washingtonpost\.com|economist\.com|ft\.com|npr\.org|pbs\.org|cnn\.com|folha\.uol\.com\.br|estadao\.com\.br|g1\.globo\.com|oglobo\.globo\.com|valor\.globo\.com|agenciabrasil\.ebc\.com\.br|nexojornal\.com\.br|un\.org|who\.int|worldbank\.org|imf\.org|nato\.int|europa\.eu|oecd\.org|wto\.org|cfr\.org|brookings\.edu|chathamhouse\.org|britannica\.com)$|\.(gov|gov\.br|int|edu|edu\.br|leg\.br|jus\.br)$/i;

const nomeDoSite = (host) => host.replace(/^www\d?\./, '');

/**
 * Lista os links que os artigos da Wikipedia citam, já filtrados e em
 * ordem: primeiro os confiáveis, depois os outros. Devolve [{ nome, url }].
 */
export async function linksCitados(artigos, maximo = 14) {
  const vistos = new Set();
  const confiaveis = [];
  const outros = [];
  for (const a of artigos || []) {
    try {
      const u = new URL(a.link);
      const titulo = decodeURIComponent(u.pathname.split('/wiki/')[1] || '');
      if (!titulo) continue;
      const api = `${u.origin}/w/api.php?action=parse&page=${encodeURIComponent(titulo)}&prop=externallinks&format=json&formatversion=2&redirects=1`;
      const r = await fetch(api, { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20000) });
      const links = (await r.json())?.parse?.externallinks || [];
      for (const link of links) {
        let host;
        try { host = new URL(link).hostname; } catch { continue; }
        if (IGNORAR.test(host) || vistos.has(link) || /\.(pdf|jpg|png)(\?|$)/i.test(link)) continue;
        vistos.add(link);
        (CONFIAVEIS.test(host) ? confiaveis : outros).push({ nome: nomeDoSite(host), url: link, citada: true });
      }
    } catch { /* artigo sem lista de links: segue */ }
  }
  // Variedade: no máximo 2 links do mesmo site
  const porSite = {};
  return [...confiaveis, ...outros].filter((l) => (porSite[l.nome] = (porSite[l.nome] || 0) + 1) <= 2).slice(0, maximo);
}

/** Tira o texto dos parágrafos (<p>) de uma página. */
function paragrafos(html) {
  const ps = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || [])
    .map((p) => textoPuro(p))
    .filter((p) => p.length > 60);
  const texto = ps.join('\n');
  if (texto.length >= 400) return texto.slice(0, POR_PAGINA);
  // Página sem parágrafos comuns: pega o texto do <article> ou do <main>
  const miolo = (html.match(/<(article|main)[\s>][\s\S]*?<\/\1>/i) || [])[0] || '';
  const limpo = textoPuro(miolo.replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, ' '));
  return (limpo.length > texto.length ? limpo : texto).slice(0, POR_PAGINA);
}

/**
 * Abre as páginas indicadas e devolve só as que funcionaram e falam do
 * assunto: [{ nome, url, texto }].
 */
export async function lerFontesExternas(lista, palavrasDoTema = [], { quantas = 4 } = {}) {
  const termos = palavrasDoTema.map((p) => p.toLowerCase()).filter((p) => p.length >= 4);
  const boas = [];
  const falhas = []; // o motivo de cada página que ficou de fora (fica anotado na aula)
  for (const { nome, url, citada } of (lista || []).slice(0, 18)) {
    if (boas.length >= quantas) break; // já temos o bastante
    if (!nome || !permitido(url)) continue;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
      if (!r.ok) { console.log(`  Fonte externa fora do ar: ${nome} (${r.status})`); falhas.push(`${nome}: respondeu ${r.status}`); continue; }
      const texto = paragrafos(await r.text());
      const fala = termos.filter((t) => texto.toLowerCase().includes(t)).length;
      // A referência citada pela Wikipedia fala de um dado específico, não do tema
      // inteiro: não precisa repetir as palavras-chave (28/11: todas tinham sido
      // descartadas por isso). A sugerida pela IA precisa citar pelo menos uma.
      if (texto.length < (citada ? 400 : 800) || (!citada && termos.length && fala < 1)) {
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
