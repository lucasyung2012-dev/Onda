// =============================================================
// anp.mjs — Preço da gasolina, da ANP (Agência Nacional do Petróleo).
//
// A ANP publica toda semana o preço médio do litro nos postos, numa
// planilha do Excel (.xlsx). Um .xlsx é um arquivo .zip com várias
// páginas em XML dentro. Este arquivo abre o .zip com o "zlib" que já
// vem no Node (sem instalar nada) e lê a primeira aba da planilha.
//
// Planilhas usadas (gratuitas, públicas):
//   semanal-brasil-desde-2013.xlsx   → média do Brasil
//   semanal-estados-desde-2013.xlsx  → média de cada estado (usamos São Paulo)
// =============================================================

import { inflateRawSync } from 'node:zlib';

const BASE = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/semanal/';

/** Abre um .zip na memória e devolve o conteúdo (texto) de um arquivo de dentro. */
function arquivoDoZip(zip, nome) {
  // O "diretório central" do zip fica no fim; ele diz onde está cada arquivo.
  let fim = zip.length - 22;
  while (fim >= 0 && zip.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error('não é um arquivo zip');
  const total = zip.readUInt16LE(fim + 10);
  let p = zip.readUInt32LE(fim + 16);
  for (let i = 0; i < total; i++) {
    const metodo = zip.readUInt16LE(p + 10);
    const tamanho = zip.readUInt32LE(p + 20);
    const tamNome = zip.readUInt16LE(p + 28);
    const tamExtra = zip.readUInt16LE(p + 30);
    const tamComent = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nomeAtual = zip.toString('utf8', p + 46, p + 46 + tamNome);
    if (nomeAtual === nome) {
      const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const dados = zip.subarray(inicio, inicio + tamanho);
      return (metodo === 0 ? dados : inflateRawSync(dados)).toString('utf8');
    }
    p += 46 + tamNome + tamExtra + tamComent;
  }
  throw new Error(`${nome} não está no arquivo`);
}

const texto = (xml) => xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Lê a 1ª aba do .xlsx e devolve as linhas como listas de valores (texto ou número). */
function linhasDaPlanilha(zip) {
  const textos = [...arquivoDoZip(zip, 'xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texto(m[1]));
  const aba = arquivoDoZip(zip, 'xl/worksheets/sheet1.xml');
  const linhas = [];
  for (const [, conteudo] of aba.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const linha = [];
    for (const [, ref, atributos, corpo] of conteudo.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const coluna = [...ref].reduce((s, c) => s * 26 + c.charCodeAt(0) - 64, 0) - 1;
      const v = corpo?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (v === undefined) continue;
      linha[coluna] = /t="s"/.test(atributos) ? textos[Number(v)] : Number(v);
    }
    linhas.push(linha);
  }
  return linhas;
}

/** Número de série do Excel (dias desde 30/12/1899) → AAAA-MM-DD */
const dataExcel = (n) => new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);

/**
 * Série semanal do preço médio da gasolina comum (R$/litro).
 * estado = null → Brasil; estado = 'SAO PAULO' → só São Paulo.
 */
export async function gasolina(estado = null) {
  const url = BASE + (estado ? 'semanal-estados-desde-2013.xlsx' : 'semanal-brasil-desde-2013.xlsx');
  const resposta = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!resposta.ok) throw new Error(`ANP respondeu HTTP ${resposta.status}`);
  const linhas = linhasDaPlanilha(Buffer.from(await resposta.arrayBuffer()));

  // Acha a linha do cabeçalho e as colunas pelo nome (mais seguro que pela posição)
  const iCab = linhas.findIndex((l) => l.includes('PRODUTO') && l.includes('PREÇO MÉDIO REVENDA'));
  if (iCab < 0) throw new Error('cabeçalho da planilha da ANP não encontrado');
  const cab = linhas[iCab];
  const col = (nome) => cab.indexOf(nome);
  const [cData, cProduto, cPreco, cEstado] = [col('DATA FINAL'), col('PRODUTO'), col('PREÇO MÉDIO REVENDA'), col('ESTADO')];

  const inicio = new Date(Date.now() - 5 * 366 * 86400000).toISOString().slice(0, 10);
  return linhas.slice(iCab + 1)
    .filter((l) => l[cProduto] === 'GASOLINA COMUM' && typeof l[cData] === 'number' && typeof l[cPreco] === 'number')
    .filter((l) => !estado || String(l[cEstado]).toUpperCase() === estado)
    .map((l) => [dataExcel(l[cData]), Math.round(l[cPreco] * 100) / 100])
    .filter(([d]) => d >= inicio)
    .sort((a, b) => a[0].localeCompare(b[0]));
}
