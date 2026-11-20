// =============================================================
// tema.mjs — O "Tema do dia": entender o mundo.
//
// Não é uma notícia. É a explicação de um assunto de fundo, de
// qualquer época, que ajuda a entender a geopolítica e o dia a dia
// no Brasil (ex.: "Por que o petróleo ainda manda na economia?").
//
// Como funciona:
//   1. A IA escolhe um assunto (sem repetir os anteriores) e diz o que
//      procurar na Wikipedia. Pode, se fizer sentido, ligar o assunto
//      às notícias de hoje.
//   2. O robô busca os artigos na Wikipedia (português e inglês).
//      Se não achar pelo menos 2 artigos, troca de assunto.
//   3. A IA escreve a explicação usando SÓ esses artigos (e as notícias
//      ligadas). As fontes aparecem no app, com link.
//   4. Grava data/app/tema.json, data/temas/AAAA-MM-DD.json (todas as
//      versões do dia) e o índice data/app/temas.json.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { perguntarIA, temIA } from './ia.mjs';

const FUSO = 'America/Sao_Paulo';
const NAVEGADOR = 'OndaRadar/1.0 (https://github.com/lucasyung2012-dev/Onda)';
const TAMANHO_ARTIGO = 3500; // caracteres de cada artigo entregues à IA

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

const REGRAS = `Você é o explicador do Onda, um radar geopolítico pessoal de um estudante brasileiro de São Paulo que quer entender como o mundo funciona e como isso chega ao dia a dia dele.
Regras: use SOMENTE as informações dos textos fornecidos; não invente fatos, números, datas ou citações. Separe fato de interpretação. Não exagere o impacto no Brasil. Escreva em português do Brasil, claro, para um estudante curioso. Responda apenas com JSON válido.`;

// ---------- Wikipedia ----------

async function wikipedia(idioma, termo) {
  const base = `https://${idioma}.wikipedia.org/w/api.php`;
  const busca = await fetch(`${base}?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(termo)}`, {
    headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20000),
  }).then((r) => r.json());
  const titulo = busca?.query?.search?.[0]?.title;
  if (!titulo) return null;
  const pagina = await fetch(`${base}?action=query&prop=extracts|info&inprop=url&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(titulo)}`, {
    headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20000),
  }).then((r) => r.json());
  const p = Object.values(pagina?.query?.pages || {})[0];
  if (!p?.extract || p.extract.length < 500) return null;
  return {
    fonte: `Wikipedia (${idioma === 'pt' ? 'português' : 'inglês'})`,
    titulo: p.title,
    link: p.fullurl,
    texto: p.extract.replace(/\n{2,}/g, '\n').slice(0, TAMANHO_ARTIGO),
  };
}

async function buscarArtigos(buscas) {
  const artigos = [];
  const vistos = new Set();
  for (const { idioma, termo } of buscas) {
    if (artigos.length >= 3) break;
    try {
      const a = await wikipedia(idioma === 'en' ? 'en' : 'pt', termo);
      if (a && !vistos.has(a.link)) { artigos.push(a); vistos.add(a.link); }
    } catch (erro) {
      console.log(`  Wikipedia (${termo}): ${erro.message}`);
    }
  }
  return artigos;
}

// ---------- Etapa 1: escolher o assunto ----------

async function escolherAssunto(anteriores, manchetes, evitar) {
  const usuario = `Escolha o "Tema do dia" do Onda: um assunto de fundo para ENTENDER O MUNDO. Não é uma notícia: é a explicação de algo de qualquer época (história, economia, instituições, geografia, recursos, tecnologia, alianças, conflitos antigos ou atuais) que ajuda a entender a geopolítica e como ela chega ao dia a dia no Brasil.
Prefira assuntos de fundo e duradouros (ex.: como funciona a OTAN, por que o petróleo pesa tanto na economia, a história do Oriente Médio, o que é o FMI). NÃO transforme a notícia do dia ou um fato da última semana no tema: ligar o tema às manchetes é opcional e serve só para a seção "E hoje?".

Temas já feitos (não repita nem faça um muito parecido):
${anteriores.length ? anteriores.map((t) => `- ${t}`).join('\n') : '- (nenhum ainda)'}
${evitar.length ? `\nTambém evite (não deram certo): ${evitar.join('; ')}` : ''}

Manchetes de hoje (use só se quiser ligar o tema a algo atual; não é obrigatório):
${manchetes.map((m, i) => `[${i}] ${m}`).join('\n')}

Responda neste formato JSON:
{"titulo": "<nome curto do tema, ex.: 'O petróleo e o seu bolso'>",
 "pergunta": "<a pergunta que o tema responde, ex.: 'Por que o petróleo ainda manda na economia mundial?'>",
 "buscas": [{"idioma": "pt", "termo": "<título provável de um artigo da Wikipedia em português>"}, {"idioma": "en", "termo": "<título provável em inglês>"}, {"idioma": "pt", "termo": "<outro artigo relacionado>"}],
 "manchetesLigadas": [<índices das manchetes de hoje ligadas ao tema, ou lista vazia>]}`;

  return perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 1500,
    validar: (r) => {
      if (!r.titulo || !r.pergunta || !Array.isArray(r.buscas) || r.buscas.length < 2) throw new Error('escolha de tema incompleta');
      r.manchetesLigadas = (r.manchetesLigadas || []).filter((i) => Number.isInteger(i) && i >= 0 && i < manchetes.length).slice(0, 4);
    },
  });
}

// ---------- Etapa 2: escrever a explicação ----------

const CAMADAS = ['economia', 'precos', 'energia', 'politica', 'seguranca', 'tecnologia', 'midia', 'sociedade', 'brasil'];

async function escrever(escolha, artigos, noticias) {
  const fontes = [
    ...artigos.map((a) => ({ fonte: a.fonte, titulo: a.titulo, link: a.link, texto: a.texto })),
    ...noticias.map((n) => ({ fonte: n.fonteNome, titulo: n.titulo, link: n.link, texto: `${n.titulo}. ${n.resumo || ''} (publicada em ${n.publicadoEm})` })),
  ];
  const texto = fontes.map((f, i) => `[${i}] ${f.fonte} — "${f.titulo}"\n${f.texto}`).join('\n\n');

  const usuario = `Tema: ${escolha.titulo}
Pergunta: ${escolha.pergunta}

Use somente estes textos:
${texto}

Responda neste formato JSON (todos os campos obrigatórios):
{
 "titulo": "<nome do tema>",
 "pergunta": "<a pergunta que o tema responde>",
 "emUmaFrase": "<a resposta em uma frase>",
 "explicacao": "<3 a 5 parágrafos curtos separados por \\n\\n, didáticos, do começo até hoje>",
 "linhaDoTempo": [{"quando": "<ano ou data>", "oQue": "<o que aconteceu>", "fonte": <índice do texto>}],
 "atores": [{"nome": "<país, organização ou grupo>", "papel": "<o papel dele no tema, 1 frase>"}],
 "cadeia": [{"passo": "<elo de causa e efeito até o Brasil/você>", "camada": "<uma de: ${CAMADAS.join(', ')}>"}],
 "chegaEmVoce": {"tipo": "<direto, indireto, risco ou nenhum>", "texto": "<como isso aparece no dia a dia de quem vive no Brasil>"},
 "eHoje": "<como o tema aparece nas notícias de hoje, ou string vazia se não houver notícia ligada>",
 "paraPensar": "<uma pergunta para o leitor refletir>",
 "fontesUsadas": [<índices dos textos realmente usados>]
}
Linha do tempo: 3 a 7 itens, só com datas que estão nos textos, focando na história do assunto (o que é recente vai em "eHoje"). Cadeia: 3 a 5 passos. Atores: 2 a 5.`;

  const { resposta, provedor, modelo } = await perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 5000,
    validar: (r) => {
      for (const c of ['titulo', 'pergunta', 'emUmaFrase', 'explicacao']) if (!r[c]) throw new Error(`tema sem "${c}"`);
      if (!Array.isArray(r.cadeia) || r.cadeia.length < 2) throw new Error('tema sem cadeia');
      r.cadeia = r.cadeia.filter((c) => c.passo).map((c) => ({ passo: c.passo, camada: CAMADAS.includes(c.camada) ? c.camada : 'sociedade' }));
      r.linhaDoTempo = (r.linhaDoTempo || []).filter((l) => l.quando && l.oQue);
      r.atores = (r.atores || []).filter((a) => a.nome).slice(0, 5);
      if (!['direto', 'indireto', 'risco', 'nenhum'].includes(r.chegaEmVoce?.tipo)) r.chegaEmVoce = { tipo: 'indireto', texto: r.chegaEmVoce?.texto || '' };
      const usadas = (r.fontesUsadas || []).filter((i) => Number.isInteger(i) && i >= 0 && i < fontes.length);
      r.fontesUsadas = usadas.length ? usadas : fontes.map((_, i) => i);
    },
  });

  // Fontes saem dos NOSSOS dados (título e link reais), não da IA.
  resposta.fontes = resposta.fontesUsadas.map((i) => ({ fonte: fontes[i].fonte, titulo: fontes[i].titulo, link: fontes[i].link }));
  resposta.linhaDoTempo = resposta.linhaDoTempo.map((l) => ({ ...l, fonte: Number.isInteger(l.fonte) && fontes[l.fonte] ? fontes[l.fonte].fonte : '' }));
  delete resposta.fontesUsadas;
  return { tema: resposta, provedor, modelo };
}

// ---------- Programa principal ----------

async function principal() {
  const agora = new Date();
  const hojeData = dataBrasilia(agora);
  if (!temIA()) { console.log('Sem chave de IA: tema do dia não executado.'); return; }

  const indice = await lerJson('data/app/temas.json', { temas: [] });
  const anteriores = indice.temas.map((t) => t.titulo);
  const hoje = await lerJson('data/noticias/hoje.json', { fatos: [], noticias: [] });
  const porId = new Map(hoje.noticias.map((n) => [n.id, n]));
  const fatos = hoje.fatos.filter((f) => f.fontes >= 2 && f.temas[0] !== 'outros').slice(0, 25);
  const manchetes = fatos.map((f) => f.titulo);

  let escolhido = null;
  const evitar = [];
  for (let tentativa = 1; tentativa <= 3 && !escolhido; tentativa++) {
    console.log(`Tema do dia — escolha (tentativa ${tentativa})…`);
    const { resposta } = await escolherAssunto(anteriores, manchetes, evitar);
    console.log(`  Assunto: ${resposta.titulo}`);
    const artigos = await buscarArtigos(resposta.buscas);
    console.log(`  Artigos da Wikipedia achados: ${artigos.length}`);
    if (artigos.length >= 2) escolhido = { escolha: resposta, artigos };
    else { evitar.push(resposta.titulo); await esperar(30000); }
  }
  if (!escolhido) throw new Error('não achei fontes suficientes para nenhum tema');

  const noticias = escolhido.escolha.manchetesLigadas.map((i) => porId.get(fatos[i].noticias[0])).filter(Boolean);
  await esperar(65000); // limite de uso por minuto do plano gratuito
  console.log('Escrevendo a explicação…');
  const { tema, provedor, modelo } = await escrever(escolhido.escolha, escolhido.artigos, noticias);

  const edicao = {
    status: 'ok',
    geradoEm: agora.toISOString(),
    dataReferencia: hojeData,
    ia: { provedor, modelo, aviso: 'Explicação gerada por IA a partir das fontes listadas. Pode conter erros: confira nas fontes.' },
    ...tema,
  };

  const doDia = await lerJson(`data/temas/${hojeData}.json`, { data: hojeData, versoes: [] });
  doDia.versoes.push(edicao);
  await gravarJson(`data/temas/${hojeData}.json`, doDia);
  await gravarJson('data/app/tema.json', edicao);

  indice.temas = indice.temas.filter((t) => t.data !== hojeData);
  indice.temas.unshift({ data: hojeData, titulo: tema.titulo, pergunta: tema.pergunta });
  indice.temas.sort((a, b) => b.data.localeCompare(a.data));
  await gravarJson('data/app/temas.json', indice);
  console.log(`Tema do dia gravado: ${tema.titulo}`);
}

principal().catch((erro) => {
  console.error('O tema do dia falhou:', erro.message);
  process.exit(1);
});
