// =============================================================
// tema.mjs — O "Tema do dia": entender o mundo (versão 2, mini-aula).
//
// Não é uma notícia. É uma mini-aula sobre um assunto de fundo, de
// qualquer época, que ajuda a entender a geopolítica e como ela chega
// ao dia a dia no Brasil.
//
// Como funciona:
//   1. ESCOLHA: a IA escolhe um assunto (sem repetir os anteriores) e diz
//      quais artigos da Wikipedia procurar.
//   2. MATERIAL: o robô baixa de 3 a 6 artigos INTEIROS (português e
//      inglês), separados por seção, e a imagem principal do primeiro.
//      Sem pelo menos 2 artigos, troca de assunto.
//   3. ESCRITA EM ETAPAS: a IA escreve a aula em 5 partes, cada uma com
//      as seções de artigo que importam para ela. Assim cada parte ganha
//      profundidade sem estourar o limite de texto por pedido da IA
//      gratuita (por isso há uma pausa de ~1 minuto entre as partes).
//        a) o básico + glossário      b) a história + linha do tempo
//        c) como funciona + números   d) o que cada lado quer + debates
//        e) e hoje? + como chega em você + teste rápido
//   4. Grava data/app/tema.json, data/temas/AAAA-MM-DD.json (todas as
//      versões do dia) e o índice data/app/temas.json.
//
// Regra de ouro: a IA só usa os textos entregues; títulos e links das
// fontes vêm dos nossos dados, nunca da IA.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { perguntarIA, temIA } from './ia.mjs';

const FUSO = 'America/Sao_Paulo';
const NAVEGADOR = 'OndaRadar/1.0 (https://github.com/lucasyung2012-dev/Onda)';
const MATERIAL_POR_PARTE = 11000; // caracteres de artigo por pedido (cabe no limite grátis)
const PAUSA = 65000;              // pausa entre pedidos (limite por minuto do plano grátis)

const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(arquivo(c), 'utf8')); } catch { return padrao; } };
async function gravarJson(caminho, dados) {
  const destino = arquivo(caminho);
  await mkdir(new URL('./', destino), { recursive: true });
  await writeFile(destino, JSON.stringify(dados, null, 2) + '\n', 'utf8');
}
const dataBrasilia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const inteiro = (i, max) => Number.isInteger(i) && i >= 0 && i < max;

const REGRAS = `Você é o professor do Onda, um radar geopolítico pessoal de um estudante brasileiro de São Paulo, curioso, que quer ENTENDER O MUNDO e como ele chega ao dia a dia dele.
Regras: use SOMENTE as informações dos textos fornecidos; não invente fatos, números, datas, nomes ou citações. Separe fato de interpretação. Não exagere o impacto no Brasil.
Estilo: português do Brasil, claro, envolvente, como um bom professor de cursinho; explique termos difíceis; use exemplos concretos dos textos. Responda apenas com JSON válido.`;

// ---------- Wikipedia ----------

/** Divide o texto do artigo em seções a partir dos títulos "== Título ==". */
function secoes(texto) {
  const partes = [];
  let atual = { titulo: 'Introdução', texto: '' };
  for (const linha of texto.split('\n')) {
    const t = linha.match(/^=+\s*(.+?)\s*=+$/);
    if (t) { if (atual.texto.trim()) partes.push(atual); atual = { titulo: t[1], texto: '' }; }
    else atual.texto += `${linha}\n`;
  }
  if (atual.texto.trim()) partes.push(atual);
  // Tira seções que só têm listas de referências
  return partes.filter((s) => !/^(refer|ver também|see also|notas|notes|ligações externas|external links|bibliograf|further reading|leitura adicional)/i.test(s.titulo));
}

async function artigoWikipedia(idioma, termo) {
  const base = `https://${idioma}.wikipedia.org/w/api.php`;
  const opcoes = { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20000) };
  const busca = await fetch(`${base}?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(termo)}`, opcoes).then((r) => r.json());
  const titulo = busca?.query?.search?.[0]?.title;
  if (!titulo) return null;
  const url = `${base}?action=query&format=json&redirects=1&prop=extracts|info|pageimages&explaintext=1&exsectionformat=wiki&inprop=url&piprop=thumbnail|name&pithumbsize=1200&titles=${encodeURIComponent(titulo)}`;
  const pagina = await fetch(url, opcoes).then((r) => r.json());
  const p = Object.values(pagina?.query?.pages || {})[0];
  if (!p?.extract || p.extract.length < 1500) return null;
  return {
    fonte: `Wikipedia (${idioma === 'pt' ? 'português' : 'inglês'})`,
    titulo: p.title,
    link: p.fullurl,
    secoes: secoes(p.extract.slice(0, 60000)),
    imagem: p.thumbnail?.source
      ? { url: p.thumbnail.source, credito: 'Wikimedia Commons, via Wikipedia', link: `https://${idioma}.wikipedia.org/wiki/File:${encodeURIComponent(p.pageimage || '')}` }
      : null,
  };
}

async function buscarArtigos(buscas) {
  const artigos = [];
  const vistos = new Set();
  for (const { idioma, termo } of buscas) {
    if (artigos.length >= 6) break;
    try {
      const a = await artigoWikipedia(idioma === 'en' ? 'en' : 'pt', termo);
      if (a && !vistos.has(a.link)) { artigos.push(a); vistos.add(a.link); }
    } catch (erro) {
      console.log(`  Wikipedia (${termo}): ${erro.message}`);
    }
  }
  return artigos;
}

/**
 * Monta o material de uma parte da aula: a introdução de cada artigo e
 * as seções cujo título combina com o assunto da parte, revezando entre
 * os artigos até encher o limite. Cada trecho leva o índice da fonte [n].
 */
function material(artigos, palavras, { soIntro = false, limite = MATERIAL_POR_PARTE } = {}) {
  const regex = palavras ? new RegExp(palavras, 'i') : null;
  const filas = artigos.map((a, indice) => {
    const escolhidas = a.secoes.filter((s, i) => i === 0 || (!soIntro && regex && regex.test(s.titulo)));
    return escolhidas.map((s) => ({ indice, texto: `[${indice}] ${a.titulo} — ${s.titulo}\n${s.texto.trim()}` }));
  });
  const trechos = [];
  let total = 0;
  for (let rodada = 0; filas.some((f) => f[rodada]); rodada++) {
    for (const fila of filas) {
      const t = fila[rodada];
      if (!t) continue;
      const pedaco = t.texto.slice(0, Math.max(0, Math.min(3500, limite - total)));
      if (pedaco.length < 300) continue;
      trechos.push(pedaco);
      total += pedaco.length;
    }
  }
  return trechos.join('\n\n');
}

// ---------- 1. Escolher o assunto ----------

async function escolherAssunto(anteriores, manchetes, evitar) {
  const usuario = `Escolha o "Tema do dia" do Onda: uma MINI-AULA para entender o mundo. Não é uma notícia: é a explicação de algo de qualquer época (história, economia, instituições, geografia, recursos, tecnologia, alianças, conflitos) que ajuda a entender a geopolítica e como ela chega ao dia a dia no Brasil.
Prefira assuntos de fundo e duradouros (ex.: como funciona a OTAN, por que o petróleo pesa tanto na economia, a história do Oriente Médio, o que é o FMI). NÃO transforme a notícia do dia no tema.

Temas já feitos (não repita nem faça um muito parecido):
${anteriores.length ? anteriores.map((t) => `- ${t}`).join('\n') : '- (nenhum ainda)'}
${evitar.length ? `\nTambém evite (não deu para achar material): ${evitar.join('; ')}` : ''}

Manchetes de hoje (só para a seção "E hoje?", se houver ligação):
${manchetes.map((m, i) => `[${i}] ${m}`).join('\n')}

Responda neste formato JSON:
{"titulo": "<nome curto do tema>",
 "pergunta": "<a grande pergunta que a aula responde>",
 "buscas": [<5 ou 6 itens {"idioma": "pt" ou "en", "termo": "<título provável de um artigo da Wikipedia>"}: o artigo principal em português e em inglês e artigos sobre a história, o funcionamento e os principais atores do tema>],
 "manchetesLigadas": [<índices das manchetes ligadas ao tema, ou lista vazia>]}`;

  return perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 1500,
    validar: (r) => {
      if (!r.titulo || !r.pergunta || !Array.isArray(r.buscas) || r.buscas.length < 2) throw new Error('escolha de tema incompleta');
      r.manchetesLigadas = (r.manchetesLigadas || []).filter((i) => inteiro(i, manchetes.length)).slice(0, 4);
    },
  });
}

// ---------- 2. Escrever a aula em partes ----------

const CAMADAS = ['economia', 'precos', 'energia', 'politica', 'seguranca', 'tecnologia', 'midia', 'sociedade', 'brasil'];
const PALAVRAS = {
  historia: 'hist|origem|origin|background|antecedent|funda|founding|forma[cç]|evolu|cronolog|timeline|guerra|war|s[eé]culo|century|per[ií]odo|period|era\\b',
  funcionamento: 'estrutura|structure|organiza|funcion|function|membr|member|govern|economi|econom|opera|produ[cç]|production|mercado|market|or[cç]amento|budget|militar|military|com[eé]rcio|trade|recurso|resource|financ|reserv|export|import',
  atores: 'cr[ií]tic|critic|controv|debate|pol[ií]tic|politic|rela[cç]|relation|rival|conflit|dispute|percep|opini|reform|futur|desafi|challenge|influ|interes|strateg|estrat',
};

async function parte(nome, usuario, maxTokens, validar) {
  console.log(`  Parte: ${nome}…`);
  const { resposta, provedor, modelo } = await perguntarIA({ sistema: REGRAS, usuario, maxTokens, validar });
  return { resposta, provedor, modelo };
}

async function escreverAula(escolha, artigos, noticias, anteriores) {
  // Lista única de fontes: artigos primeiro, depois notícias. Os índices [n] valem para todas as partes.
  const fontes = [
    ...artigos.map((a) => ({ fonte: a.fonte, titulo: a.titulo, link: a.link })),
    ...noticias.map((n) => ({ fonte: n.fonteNome, titulo: n.titulo, link: n.link })),
  ];
  const textoNoticias = noticias.map((n, i) => `[${artigos.length + i}] ${n.fonteNome} (${n.publicadoEm.slice(0, 10)}): ${n.titulo}. ${n.resumo || ''}`).join('\n');
  const cabecalho = `Tema: ${escolha.titulo}\nGrande pergunta: ${escolha.pergunta}`;
  const fonteValida = (i) => inteiro(i, fontes.length);
  const aula = { formato: 2 };
  let ia = null;

  // a) O básico + glossário + ligações com temas anteriores
  const a = await parte('o básico', `${cabecalho}

Textos (introduções dos artigos):
${material(artigos, null, { soIntro: true })}

Temas anteriores do Onda (para ligações): ${anteriores.length ? anteriores.join('; ') : '(nenhum)'}

Escreva a abertura da aula. JSON:
{"titulo": "<nome do tema>", "pergunta": "<a grande pergunta>",
 "emUmaFrase": "<a resposta em uma frase>",
 "paraComecar": "<3 a 4 parágrafos separados por \\n\\n que expliquem o assunto do zero, para quem nunca ouviu falar>",
 "glossario": [{"termo": "<termo difícil>", "definicao": "<explicação simples>"}],
 "ligacoes": ["<títulos de temas anteriores relacionados, copiados exatamente da lista, ou lista vazia>"]}
Glossário: 4 a 8 termos.`, 3500, (r) => {
    for (const c of ['titulo', 'pergunta', 'emUmaFrase', 'paraComecar']) if (!r[c]) throw new Error(`abertura sem "${c}"`);
    r.glossario = (r.glossario || []).filter((g) => g.termo && g.definicao).slice(0, 8);
    r.ligacoes = (r.ligacoes || []).filter((l) => anteriores.includes(l));
  });
  Object.assign(aula, a.resposta);
  ia = { provedor: a.provedor, modelo: a.modelo };

  // As outras partes são opcionais: se uma falhar, a aula sai sem ela.
  const tentar = async (nome, fn) => {
    await esperar(PAUSA);
    try { Object.assign(aula, (await fn()).resposta); } catch (erro) { console.log(`  ${nome} ficou de fora: ${erro.message}`); }
  };

  // b) História + linha do tempo
  await tentar('história', () => parte('a história', `${cabecalho}

Textos sobre a história:
${material(artigos, PALAVRAS.historia)}

Conte como chegamos até aqui. JSON:
{"historia": "<4 a 6 parágrafos separados por \\n\\n, em ordem cronológica, como capítulos de uma história>",
 "linhaDoTempo": [{"quando": "<ano ou data que está nos textos>", "oQue": "<o que aconteceu>", "fonte": <índice [n] do texto>}]}
Linha do tempo: 6 a 12 marcos, só com datas que aparecem nos textos.`, 4000, (r) => {
    if (!r.historia) throw new Error('sem história');
    r.linhaDoTempo = (r.linhaDoTempo || []).filter((l) => l.quando && l.oQue).map((l) => ({ ...l, fonte: fonteValida(l.fonte) ? l.fonte : null }));
  }));

  // c) Como funciona + números
  await tentar('funcionamento', () => parte('como funciona', `${cabecalho}

Textos sobre a estrutura e o funcionamento:
${material(artigos, PALAVRAS.funcionamento)}

Explique como o tema funciona por dentro. JSON:
{"comoFunciona": "<3 a 5 parágrafos separados por \\n\\n: regras, quem decide, quem paga, quem manda, como as peças se encaixam>",
 "numeros": [{"valor": "<número exatamente como nos textos, com unidade>", "significado": "<o que ele mostra>", "fonte": <índice [n]>}]}
Números: 3 a 6, só os que aparecem nos textos.`, 3500, (r) => {
    if (!r.comoFunciona) throw new Error('sem funcionamento');
    r.numeros = (r.numeros || []).filter((n) => n.valor && n.significado && fonteValida(n.fonte)).slice(0, 6);
  }));

  // d) O que cada lado quer + debates + mitos
  await tentar('atores', () => parte('o que cada lado quer', `${cabecalho}

Textos sobre política, relações e controvérsias:
${material(artigos, PALAVRAS.atores, { limite: MATERIAL_POR_PARTE - 2000 })}
${textoNoticias ? `\nNotícias recentes:\n${textoNoticias}` : ''}

Mostre os interesses e os debates. JSON:
{"atores": [{"nome": "<país, organização ou grupo>", "quer": "<o que ele quer>", "porque": "<por que quer isso>"}],
 "debate": [{"visao": "<uma posição sobre o tema>", "quemDefende": "<quem defende>", "argumento": "<o principal argumento>"}],
 "mitos": [{"mito": "<ideia comum, mas errada ou incompleta>", "verdade": "<o que os textos mostram>"}]}
Atores: 3 a 6. Debate: 2 a 4 posições diferentes, apresentadas com equilíbrio. Mitos: 0 a 3 (só se os textos permitirem).`, 3500, (r) => {
    r.atores = (r.atores || []).filter((x) => x.nome && x.quer).slice(0, 6);
    r.debate = (r.debate || []).filter((x) => x.visao).slice(0, 4);
    r.mitos = (r.mitos || []).filter((x) => x.mito && x.verdade).slice(0, 3);
    if (!r.atores.length) throw new Error('sem atores');
  }));

  // e) E hoje? + como chega em você + teste rápido
  await tentar('fechamento', () => parte('e hoje + teste', `${cabecalho}

Resumo do que a aula já explicou:
${aula.emUmaFrase}
${(aula.paraComecar || '').slice(0, 1500)}
${(aula.historia || '').slice(0, 1500)}
${(aula.comoFunciona || '').slice(0, 1200)}
${textoNoticias ? `\nNotícias recentes ligadas ao tema:\n${textoNoticias}` : '\n(Não há notícias de hoje ligadas a este tema.)'}

Feche a aula. JSON:
{"eHoje": "<como o tema aparece nas notícias recentes; string vazia se não houver notícia ligada>",
 "cadeia": [{"passo": "<elo de causa e efeito, do tema até o Brasil>", "camada": "<uma de: ${CAMADAS.join(', ')}>"}],
 "chegaEmVoce": {"tipo": "<direto, indireto, risco ou nenhum>", "texto": "<como isso aparece no dia a dia de quem vive no Brasil; sem exagero>"},
 "paraPensar": "<uma pergunta para o leitor refletir>",
 "teste": [{"pergunta": "<pergunta sobre a aula>", "opcoes": ["<a>", "<b>", "<c>", "<d>"], "correta": <0 a 3>, "explicacao": "<por que essa é a certa>"}]}
Cadeia: 3 a 5 passos. Teste: 3 perguntas, cuja resposta esteja no texto da aula.`, 3500, (r) => {
    if (!Array.isArray(r.cadeia) || r.cadeia.length < 2) throw new Error('sem cadeia');
    r.cadeia = r.cadeia.filter((c) => c.passo).map((c) => ({ passo: c.passo, camada: CAMADAS.includes(c.camada) ? c.camada : 'sociedade' }));
    if (!['direto', 'indireto', 'risco', 'nenhum'].includes(r.chegaEmVoce?.tipo)) r.chegaEmVoce = { tipo: 'indireto', texto: r.chegaEmVoce?.texto || '' };
    r.teste = (r.teste || []).filter((q) => q.pergunta && Array.isArray(q.opcoes) && q.opcoes.length >= 2 && inteiro(q.correta, q.opcoes.length)).slice(0, 3);
  }));

  // Fontes reais (dos nossos dados) e trocando índices por nomes de fonte
  const nomeFonte = (i) => (fonteValida(i) ? fontes[i].fonte : '');
  aula.linhaDoTempo = (aula.linhaDoTempo || []).map((l) => ({ ...l, fonte: nomeFonte(l.fonte) }));
  aula.numeros = (aula.numeros || []).map((n) => ({ ...n, fonte: nomeFonte(n.fonte), link: fonteValida(n.fonte) ? fontes[n.fonte].link : '' }));
  aula.fontes = fontes;
  aula.imagem = (artigos.find((x) => x.imagem) || {}).imagem || null;
  return { aula, ia };
}

// ---------- Programa principal ----------

async function principal() {
  const agora = new Date();
  const hojeData = dataBrasilia(agora);
  if (!temIA()) { console.log('Sem chave de IA: tema do dia não executado.'); return; }

  const indice = await lerJson('data/app/temas.json', { temas: [] });
  const anteriores = indice.temas.filter((t) => t.data !== hojeData).map((t) => t.titulo);
  const hoje = await lerJson('data/noticias/hoje.json', { fatos: [], noticias: [] });
  const porId = new Map(hoje.noticias.map((n) => [n.id, n]));
  const fatos = hoje.fatos.filter((f) => f.fontes >= 2 && f.temas[0] !== 'outros').slice(0, 25);
  const manchetes = fatos.map((f) => f.titulo);

  let escolhido = null;
  const evitar = [];
  for (let tentativa = 1; tentativa <= 3 && !escolhido; tentativa++) {
    console.log(`Tema do dia — escolha (tentativa ${tentativa})…`);
    const { resposta } = await escolherAssunto(indice.temas.map((t) => t.titulo), manchetes, evitar);
    console.log(`  Assunto: ${resposta.titulo}`);
    const artigos = await buscarArtigos(resposta.buscas);
    console.log(`  Artigos achados: ${artigos.map((a) => a.titulo).join(' | ') || 'nenhum'}`);
    if (artigos.length >= 2) escolhido = { escolha: resposta, artigos };
    else { evitar.push(resposta.titulo); await esperar(30000); }
  }
  if (!escolhido) throw new Error('não achei fontes suficientes para nenhum tema');

  const noticias = escolhido.escolha.manchetesLigadas.map((i) => porId.get(fatos[i].noticias[0])).filter(Boolean);
  await esperar(PAUSA);
  console.log('Escrevendo a aula em partes…');
  const { aula, ia } = await escreverAula(escolhido.escolha, escolhido.artigos, noticias, anteriores);

  const edicao = {
    status: 'ok',
    geradoEm: new Date().toISOString(),
    dataReferencia: hojeData,
    ia: { ...ia, aviso: 'Aula gerada por IA a partir das fontes listadas. Pode conter erros: confira nas fontes.' },
    ...aula,
  };

  const doDia = await lerJson(`data/temas/${hojeData}.json`, { data: hojeData, versoes: [] });
  doDia.versoes.push(edicao);
  await gravarJson(`data/temas/${hojeData}.json`, doDia);
  await gravarJson('data/app/tema.json', edicao);

  indice.temas = indice.temas.filter((t) => t.data !== hojeData);
  indice.temas.unshift({ data: hojeData, titulo: aula.titulo, pergunta: aula.pergunta });
  indice.temas.sort((x, y) => y.data.localeCompare(x.data));
  await gravarJson('data/app/temas.json', indice);
  console.log(`Tema do dia gravado: ${aula.titulo}`);
}

principal().catch((erro) => {
  console.error('O tema do dia falhou:', erro.message);
  process.exit(1);
});
