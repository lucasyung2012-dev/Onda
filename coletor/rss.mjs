// =============================================================
// rss.mjs — Leitor de feeds RSS e Atom, sem bibliotecas externas.
//
// Um feed RSS é um arquivo XML com uma lista de <item> (ou <entry>,
// no formato Atom). Cada item tem título, link, resumo, data e, às
// vezes, uma imagem. Este arquivo transforma esse XML em objetos
// JavaScript simples.
//
// Usamos expressões regulares (regex) em vez de um leitor de XML
// completo para não depender de nenhum pacote. Funciona bem para
// feeds de notícias, que têm sempre a mesma estrutura.
// =============================================================

// Entidades HTML mais comuns (&amp; vira &, etc.).
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

/** Troca entidades (&amp;, &#233; ...) pelos caracteres de verdade e tira o CDATA. */
export function decodificar(texto = '') {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (original, nome) => ENTIDADES[nome.toLowerCase()] ?? original);
}

/** Converte um trecho com HTML em texto puro, numa linha só. */
export function textoPuro(html = '') {
  // Decodifica duas vezes porque alguns feeds "escapam" o HTML duas vezes.
  const semTags = decodificar(html).replace(/<[^>]+>/g, ' ');
  return decodificar(semTags).replace(/\s+/g, ' ').trim();
}

/** Pega o conteúdo da primeira tag <nome>...</nome> do bloco. */
function tag(bloco, nome) {
  const regex = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i');
  const achou = bloco.match(regex);
  return achou ? achou[1] : '';
}

/** Pega o valor de um atributo (ex.: url="...") de uma tag. */
function atributo(tagTexto, nome) {
  const achou = tagTexto.match(new RegExp(`\\s${nome}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return achou ? decodificar(achou[1]).trim() : '';
}

/** Procura o link da notícia (RSS usa <link>texto</link>; Atom usa <link href="..."/>). */
function acharLink(bloco) {
  const rss = bloco.match(/<link>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return decodificar(rss[1]).trim();
  // Atom: prefere o link "alternate" (a página da matéria).
  const tagsLink = bloco.match(/<link\b[^>]*>/gi) || [];
  const alternativo = tagsLink.find((t) => /rel=["']alternate["']/i.test(t)) || tagsLink.find((t) => !/rel=/i.test(t));
  if (alternativo) return atributo(alternativo, 'href');
  // Último recurso: o <guid>, quando ele é um endereço.
  const guid = decodificar(tag(bloco, 'guid')).trim();
  return guid.startsWith('http') ? guid : '';
}

/** Parece endereço de imagem? (jpg, png, webp, gif) */
function pareceImagem(url) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

/** Procura a imagem do item, em vários lugares onde os feeds costumam colocá-la. */
function acharImagem(bloco) {
  // 1) <media:content url="..." medium="image"> ou com type de imagem
  for (const t of bloco.match(/<media:content\b[^>]*>/gi) || []) {
    const url = atributo(t, 'url');
    const tipo = atributo(t, 'type') + atributo(t, 'medium');
    if (url && (/image/i.test(tipo) || pareceImagem(url) || !tipo)) return url;
  }
  // 2) <media:thumbnail url="...">
  for (const t of bloco.match(/<media:thumbnail\b[^>]*>/gi) || []) {
    const url = atributo(t, 'url');
    if (url) return url;
  }
  // 3) <enclosure url="..." type="image/jpeg">
  for (const t of bloco.match(/<enclosure\b[^>]*>/gi) || []) {
    const url = atributo(t, 'url');
    if (url && (/image/i.test(atributo(t, 'type')) || pareceImagem(url))) return url;
  }
  // 4) Primeira <img src="..."> dentro do resumo ou do conteúdo
  const html = decodificar(tag(bloco, 'description') + tag(bloco, 'content:encoded') + tag(bloco, 'content') + tag(bloco, 'summary'));
  const img = html.match(/<img\b[^>]*\ssrc=["']([^"']+)["']/i);
  return img ? decodificar(img[1]) : '';
}

/** Lê a data do item. Devolve um Date válido ou null. */
function acharData(bloco) {
  for (const nome of ['pubDate', 'dc:date', 'published', 'updated', 'date']) {
    const texto = textoPuro(tag(bloco, nome));
    if (!texto) continue;
    // Alguns feeds brasileiros escrevem o dia da semana em português
    // ("Sex, 20 Nov 2026 ..."), que o JavaScript não entende. Tiramos esse pedaço.
    for (const tentativa of [texto, texto.replace(/^[^\d,]+,\s*/, '')]) {
      const data = new Date(tentativa);
      if (!Number.isNaN(data.getTime())) return data;
    }
  }
  return null;
}

/**
 * Transforma o XML de um feed numa lista de itens:
 * { titulo, link, resumo, publicadoEm (Date|null), imagem }
 */
export function lerFeed(xml) {
  const blocos = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocos
    .map((bloco) => ({
      titulo: textoPuro(tag(bloco, 'title')),
      link: acharLink(bloco),
      resumo: textoPuro(tag(bloco, 'description') || tag(bloco, 'summary') || tag(bloco, 'content')),
      publicadoEm: acharData(bloco),
      imagem: acharImagem(bloco),
    }))
    .filter((item) => item.titulo && item.link);
}
