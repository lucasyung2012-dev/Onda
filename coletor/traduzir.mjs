// =============================================================
// traduzir.mjs — Versão em inglês da análise do dia e do tema do dia.
//
// Roda depois do analista e do professor. Pega os textos em português
// (data/app/analise.json e data/app/tema.json), manda para a IA em
// pedaços pequenos (o plano grátis tem limite por minuto) e grava:
//   data/app/analise-en.json   e  data/analises-en/AAAA-MM-DD.json
//   data/app/tema-en.json      e  data/temas-en/AAAA-MM-DD.json
//
// Não traduz o que não é texto para ler: links, datas, códigos de
// região e tema, nomes das fontes e manchetes originais das matérias.
// Se já existe tradução da mesma versão, não faz nada.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { perguntarIA, temIA } from './ia.mjs';

const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(arquivo(c), 'utf8')); } catch { return padrao; } };
async function gravarJson(caminho, dados) {
  const destino = arquivo(caminho);
  await mkdir(new URL('./', destino), { recursive: true });
  await writeFile(destino, JSON.stringify(dados) + '\n', 'utf8');
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const TAMANHO_PEDACO = 4500; // caracteres por pedido (cabe no limite por minuto)
const PAUSA = 65000;

// Campos que NÃO são traduzidos (dados, códigos, links e textos originais das fontes)
const NAO_TRADUZIR = new Set([
  'fatoId', 'regioes', 'temas', 'link', 'url', 'imagem', 'credito', 'dataReferencia', 'dataDoFato', 'geradoEm',
  'publicadoEm', 'camada', 'tipo', 'status', 'fuso', 'versao', 'fonte', 'provedor', 'modelo', 'formato', 'id',
  'filaConectada', 'materias', 'correta', 'ultimoErro', 'sugeridoPorVoce', 'holograma', 'lugar',
]);

/** Junta todos os textos traduzíveis com o "endereço" de cada um no objeto. */
function textos(obj, caminho = [], lista = [], pai = null) {
  if (typeof obj === 'string') {
    // Nas fontes usadas, o título é a manchete original: fica como está.
    if (!(pai === 'fontesUsadas' && caminho.at(-1) === 'titulo') && !(pai === 'fontes' && caminho.at(-1) === 'titulo') && obj.trim()) {
      lista.push({ caminho, texto: obj });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => textos(v, [...caminho, i], lista, pai));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (NAO_TRADUZIR.has(k)) continue;
      textos(v, [...caminho, k], lista, Array.isArray(v) ? k : pai);
    }
  }
  return lista;
}

function colocar(obj, caminho, valor) {
  let alvo = obj;
  for (const parte of caminho.slice(0, -1)) alvo = alvo[parte];
  alvo[caminho.at(-1)] = valor;
}

/** Traduz um objeto inteiro (cópia), em pedaços. */
async function traduzirObjeto(original) {
  const copia = structuredClone(original);
  const lista = textos(copia);
  const pedacos = [];
  let atual = [];
  let tamanho = 0;
  for (const item of lista) {
    if (tamanho + item.texto.length > TAMANHO_PEDACO && atual.length) { pedacos.push(atual); atual = []; tamanho = 0; }
    atual.push(item);
    tamanho += item.texto.length;
  }
  if (atual.length) pedacos.push(atual);

  for (let i = 0; i < pedacos.length; i++) {
    if (i > 0) await esperar(PAUSA);
    const pedaco = pedacos[i];
    console.log(`  pedaço ${i + 1}/${pedacos.length} (${pedaco.length} textos)`);
    const { resposta } = await perguntarIA({
      sistema: 'You are a professional translator. Translate Brazilian Portuguese into clear, natural English for a curious high-school student. Keep names of people, places and organizations, numbers and dates exactly. Keep line breaks (\\n). Answer only with valid JSON.',
      usuario: `Translate each string of this list into English. Return {"t": [...]} with exactly ${pedaco.length} strings, in the same order.\n\n${JSON.stringify(pedaco.map((x) => x.texto))}`,
      maxTokens: 6000,
      validar: (r) => { if (!Array.isArray(r.t) || r.t.length !== pedaco.length) throw new Error('tradução com tamanho diferente'); },
    });
    pedaco.forEach((item, k) => colocar(copia, item.caminho, String(resposta.t[k])));
  }
  // O mapa (holograma) não é traduzido nem guardado de novo: o app usa o do português.
  delete copia.holograma;
  if (copia.destaque) delete copia.destaque.holograma;
  return { ...copia, idioma: 'en' };
}

async function traduzir(nome, origem, destino, pastaArquivo) {
  const pt = await lerJson(origem, null);
  if (!pt || pt.status !== 'ok') { console.log(`${nome}: nada para traduzir.`); return false; }
  const en = await lerJson(destino, null);
  if (en?.geradoEm === pt.geradoEm) { console.log(`${nome}: tradução já está em dia.`); return false; }
  console.log(`${nome}: traduzindo…`);
  const traduzido = await traduzirObjeto(pt);
  await gravarJson(destino, traduzido);
  await gravarJson(`${pastaArquivo}/${pt.dataReferencia}.json`, traduzido);
  console.log(`${nome}: pronto.`);
  return true;
}

async function principal() {
  if (!temIA()) { console.log('Sem chave de IA: tradução não executada.'); return; }
  let houve = false;
  try { houve = await traduzir('Análise do dia', 'data/app/analise.json', 'data/app/analise-en.json', 'data/analises-en'); }
  catch (erro) { console.log(`Análise do dia: a tradução falhou (${erro.message}).`); }
  if (houve) await esperar(PAUSA);
  try { await traduzir('Tema do dia', 'data/app/tema.json', 'data/app/tema-en.json', 'data/temas-en'); }
  catch (erro) { console.log(`Tema do dia: a tradução falhou (${erro.message}).`); }
}

principal();
