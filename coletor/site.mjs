// =============================================================
// site.mjs — Monta a pasta _site/, que é o que vai para o GitHub Pages.
//
// Para o site ocupar o mínimo de espaço, sem perder nada:
//   1. Copia só o que o app usa (sem os robôs, a documentação e as
//      notícias brutas dos últimos dias).
//   2. Monta os arquivos do app (destaque e tema de hoje) a partir do
//      arquivo do dia (ver coletor/montar-app.mjs).
//   3. Os dias antigos (data/analises, data/temas e as versões em inglês)
//      vão só com a última versão do dia e COMPACTADOS (.json.gz): ficam
//      de 4 a 11 vezes menores. O app descompacta na hora de abrir.
//
// Roda no robô de publicação (.github/workflows/publicar.yml).
// =============================================================

import { cp, mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { gravarApp, ultimaVersao } from './montar-app.mjs';

const RAIZ = new URL('../', import.meta.url);
const SITE = new URL('_site/', RAIZ);

// 1. O que o app usa
const COPIAR = [
  'index.html', 'manifest.webmanifest', 'sw.js', '.nojekyll', 'css', 'js', 'assets',
  'data/app', 'data/fontes.json', 'data/relatorio-coleta.json',
];

await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });
for (const item of COPIAR) {
  const origem = new URL(item, RAIZ);
  if (!(await stat(origem).catch(() => null))) continue;
  await cp(origem, new URL(item, SITE), { recursive: true });
}

// 2. Os arquivos do app (destaque e tema de hoje, em português e inglês)
const montados = await gravarApp(SITE);
console.log(`App montado: ${montados.join(', ')}`);

// 3. Os dias antigos: última versão, compactada
let antes = 0;
let depois = 0;
for (const pasta of ['analises', 'temas', 'analises-en', 'temas-en']) {
  const origem = new URL(`data/${pasta}/`, RAIZ);
  const nomes = (await readdir(origem).catch(() => [])).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n));
  if (!nomes.length) continue;
  await mkdir(new URL(`data/${pasta}/`, SITE), { recursive: true });
  for (const nome of nomes) {
    const texto = await readFile(new URL(nome, origem));
    const dia = ultimaVersao(JSON.parse(texto));
    const gz = gzipSync(JSON.stringify(dia), { level: 9 });
    await writeFile(new URL(`data/${pasta}/${nome}.gz`, SITE), gz);
    antes += texto.length;
    depois += gz.length;
  }
}
console.log(`Dias antigos: ${Math.round(antes / 1024)} KB viraram ${Math.round(depois / 1024)} KB compactados.`);
