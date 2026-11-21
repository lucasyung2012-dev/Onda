// =============================================================
// montar-app.mjs — Monta os arquivos do app a partir do arquivo do dia.
//
// Por quê: antes, o destaque e o tema eram gravados DUAS vezes no
// repositório (o arquivo do dia, em data/analises/, e uma cópia para o
// app, em data/app/), e de novo em inglês. Agora só o arquivo do dia é
// guardado; a cópia do app é montada na hora:
//   - no robô do destaque (antes de rodar, para os outros robôs lerem);
//   - na publicação do site (coletor/site.mjs).
//
// Monta:
//   data/app/analise.json     (última versão do destaque mais recente)
//   data/app/analise-en.json  (o mesmo em inglês, com o mapa do português)
//   data/app/tema.json  e  data/app/tema-en.json
//
// Uso: node coletor/montar-app.mjs [pasta de destino]   (padrão: o próprio repositório)
// =============================================================

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);
const lerJson = async (c, padrao = null) => { try { return JSON.parse(await readFile(new URL(c, RAIZ), 'utf8')); } catch { return padrao; } };

/** O arquivo de dia mais recente de uma pasta (ex.: data/analises/2026-11-21.json). */
async function maisRecente(pasta) {
  const nomes = (await readdir(new URL(`${pasta}/`, RAIZ)).catch(() => []))
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  return nomes.length ? lerJson(`${pasta}/${nomes.at(-1)}`) : null;
}

/** Arquivo do dia em português: guarda todas as versões; vale a última. */
export const ultimaVersao = (doDia) => (doDia?.versoes ? doDia.versoes.at(-1) : doDia);

/** Onde mora o mapa: no destaque (análise) ou no próprio tema. */
const alvoDoMapa = (pasta, obj) => (pasta === 'analises' ? obj?.destaque : obj);

/** Monta os quatro arquivos do app. Devolve { 'analise.json': {...}, ... }. */
export async function montarApp() {
  const saida = {};
  for (const [pasta, nome] of [['analises', 'analise'], ['temas', 'tema']]) {
    const doDia = await maisRecente(`data/${pasta}`);
    if (!doDia) continue;
    const pt = { ...ultimaVersao(doDia) };
    if (pasta === 'analises') pt.versao = doDia.versoes?.length || 1;
    saida[`${nome}.json`] = pt;

    // Inglês: a tradução não guarda o mapa (para não duplicar); usa o do português.
    const en = await maisRecente(`data/${pasta}-en`);
    if (en) {
      const copia = { ...en };
      const mapa = alvoDoMapa(pasta, pt)?.holograma;
      if (mapa && en.dataReferencia === pt.dataReferencia) {
        if (pasta === 'analises') copia.destaque = { ...copia.destaque, holograma: mapa };
        else copia.holograma = mapa;
      }
      saida[`${nome}-en.json`] = copia;
    }
  }

  // Erro do robô do destaque (se o de hoje falhou), para a Saúde do Onda.
  const situacao = await lerJson('data/app/situacao.json', {});
  const a = saida['analise.json'];
  if (a && situacao.ultimoErro && situacao.ultimoErro.em > a.geradoEm) a.ultimoErro = situacao.ultimoErro;
  return saida;
}

/** Grava os arquivos montados em <destino>/data/app/. */
export async function gravarApp(destino = RAIZ) {
  const pasta = new URL('data/app/', destino);
  await mkdir(pasta, { recursive: true });
  const arquivos = await montarApp();
  for (const [nome, dados] of Object.entries(arquivos)) await writeFile(new URL(nome, pasta), JSON.stringify(dados) + '\n', 'utf8');
  return Object.keys(arquivos);
}

// Rodando direto pelo terminal (no robô do destaque)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const feitos = await gravarApp();
  console.log(`Arquivos do app montados: ${feitos.join(', ') || 'nenhum (ainda não há destaque nem tema)'}`);
}
