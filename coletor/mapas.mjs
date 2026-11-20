// =============================================================
// mapas.mjs — Desenha o mapa de cada região (para a aba Explorar).
//
// Usa o mapa-múndi público e gratuito "Natural Earth" (pacote
// world-atlas) e gera um SVG por região em assets/regioes/.
// Roda pelo robô .github/workflows/mapas.yml (só precisa rodar
// quando mudarmos as regiões).
//
// Como cada país cai numa região: algumas listas fixas (Brasil, EUA,
// Oriente Médio...) e, para o resto, a posição do país no globo.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { geoEqualEarth, geoMercator, geoPath, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const mundo = JSON.parse(await readFile(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const paises = feature(mundo, mundo.objects.countries).features.filter((p) => p.properties.name !== 'Antarctica');

const AMERICA_NORTE = ['United States of America', 'Canada', 'Greenland'];
const ORIENTE_MEDIO = ['Israel', 'Palestine', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran', 'Saudi Arabia', 'Yemen', 'Oman',
  'United Arab Emirates', 'Qatar', 'Kuwait', 'Egypt'];
const EUROPA_EXTRA = ['Russia', 'Georgia', 'Armenia', 'Azerbaijan', 'Turkey', 'Cyprus', 'N. Cyprus', 'Iceland'];

function regiaoDoPais(p) {
  const nome = p.properties.name;
  if (nome === 'Brazil') return 'brasil';
  if (AMERICA_NORTE.includes(nome)) return 'america-norte';
  if (ORIENTE_MEDIO.includes(nome)) return 'oriente-medio';
  if (EUROPA_EXTRA.includes(nome)) return 'europa';
  const [lon, lat] = geoCentroid(p);
  if (lon < -25) return 'america-latina';
  if (lon >= -25 && lon <= 45 && lat >= 35) return 'europa';
  if (lon >= -25 && lon <= 55 && lat < 37) return 'africa';
  return 'asia-pacifico';
}

/** Desenha um conjunto de países ajustado a uma caixa de 240 x 160. */
function svg(features, projecao) {
  const colecao = { type: 'FeatureCollection', features };
  projecao.fitExtent([[6, 6], [234, 154]], colecao);
  const caminho = geoPath(projecao);
  const d = features.map((f) => caminho(f)).filter(Boolean).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><path d="${d}" fill="#ffffff" stroke="#ffffff" stroke-width="0.6" stroke-linejoin="round"/></svg>\n`;
}

await mkdir(new URL('../assets/regioes/', import.meta.url), { recursive: true });
const grupos = {};
for (const p of paises) (grupos[regiaoDoPais(p)] ||= []).push(p);

for (const [regiao, lista] of Object.entries(grupos)) {
  const projecao = ['europa', 'asia-pacifico', 'africa', 'america-latina'].includes(regiao) ? geoEqualEarth() : geoMercator();
  await writeFile(new URL(`../assets/regioes/${regiao}.svg`, import.meta.url), svg(lista, projecao));
  console.log(`${regiao}: ${lista.length} países`);
}
// "Mundo" e "Organismos globais": o planeta inteiro.
const mapaMundo = svg(paises, geoEqualEarth());
await writeFile(new URL('../assets/regioes/mundo.svg', import.meta.url), mapaMundo);
await writeFile(new URL('../assets/regioes/global.svg', import.meta.url), mapaMundo);
console.log('mundo e global: planeta inteiro');
