// =============================================================
// holograma.mjs — O "holograma" do lugar do fato: três mapas
// (mundo, país e região) com o ponto onde aconteceu.
//
// Como funciona:
//   1. Pega o lugar que a IA indicou (ex.: "Rzeszów, Polônia"). Se não
//      houver, pergunta à IA numa frase curta.
//   2. Acha as coordenadas no OpenStreetMap (Nominatim, gratuito).
//   3. Desenha, com o mapa-múndi público do Natural Earth:
//        mundo  = um globo girado para o lugar ficar na frente;
//        país   = o país inteiro, com os vizinhos apagados;
//        região = uns 600 km em volta do ponto.
//   4. Grava o desenho (só os traços, já recortados e arredondados,
//      para ficar leve) dentro de data/app/analise.json e tema.json.
//      O app só anima: mundo → país → região.
//
// Roda no robô do destaque, depois do destaque e do tema.
// Se algo falhar, o destaque e o tema saem do mesmo jeito, sem mapa.
// =============================================================

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { geoOrthographic, geoMercator, geoPath, geoGraticule10, geoContains, geoCentroid } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';
import { perguntarIA, temIA } from './ia.mjs';

const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(arquivo(c), 'utf8')); } catch { return padrao; } };
const gravarJson = (c, dados) => writeFile(arquivo(c), JSON.stringify(dados) + '\n', 'utf8');
const NAVEGADOR = 'OndaRadar/1.0 (https://github.com/lucasyung2012-dev/Onda)';

const require = createRequire(import.meta.url);
const carregarTopo = async (nome) => JSON.parse(await readFile(require.resolve(`world-atlas/${nome}`), 'utf8'));
// O mapa-múndi vem em "topologia": as fronteiras são guardadas uma vez só.
// "presimplify" calcula a importância de cada ponto; depois dá para tirar
// os menos importantes até o desenho ficar leve.
const PRE110 = presimplify(await carregarTopo('countries-110m.json'));
const PRE50 = presimplify(await carregarTopo('countries-50m.json'));
const base = (t) => ({
  paises: feature(t, t.objects.countries).features,
  terra: feature(t, t.objects.land),
  fronteiras: mesh(t, t.objects.countries, (a, b) => a !== b),
});
const GLOBO = base(simplify(structuredClone(PRE110), 1)); // o globo é pequeno: traço bem simples basta
// Do mais detalhado ao mais simples (0 = sem simplificar)
const NIVEIS = [0, 0.002, 0.01, 0.05, 0.2, 1].map((q) => ({ q, ...base(q ? simplify(structuredClone(PRE50), q) : PRE50) }));
const LIMITE = 6000; // tamanho máximo de cada escala, em caracteres: o mapa todo fica em ~20 KB (~6 KB compactado)

const L = 240; // tamanho do desenho (quadrado)

// ---------- 1 e 2: o lugar e as coordenadas ----------

async function coordenadas(lugar) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&q=${encodeURIComponent(lugar)}`;
  const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR } });
  if (!r.ok) throw new Error(`Nominatim respondeu ${r.status}`);
  const [achado] = await r.json();
  if (!achado) throw new Error(`lugar não encontrado: ${lugar}`);
  const [s, n, o, l] = achado.boundingbox.map(Number); // sul, norte, oeste, leste
  return { lat: Number(achado.lat), lon: Number(achado.lon), caixa: { s, n, o, l }, tipo: achado.type };
}

/**
 * Tenta achar o lugar; se o OpenStreetMap não achar (ex.: "sudeste da
 * Polônia"), tenta nomes mais simples: sem "sudeste da", só "cidade, país",
 * e por fim só o país.
 */
async function coordenadasComReserva(lugar) {
  const partes = lugar.split(',').map((s) => s.trim()).filter(Boolean);
  const semDirecao = (s) => s.replace(/^(o |a )?(norte|sul|leste|oeste|nordeste|noroeste|sudeste|sudoeste|centro|interior|litoral|regi[aã]o|arredores|perto|fronteira)( d[aeo]s?| de)?\s+/i, '');
  const tentativas = [...new Set([lugar, partes.map(semDirecao).join(', '), partes.slice(-2).map(semDirecao).join(', '), semDirecao(partes.at(-1) || '')])].filter(Boolean);
  let ultimoErro = null;
  for (const t of tentativas) {
    try { return await coordenadas(t); } catch (erro) { ultimoErro = erro; console.log(`  não achei "${t}"; tentando mais simples…`); }
    await new Promise((r) => setTimeout(r, 1100)); // 1 pedido por segundo
  }
  throw ultimoErro;
}

async function perguntarLugar(titulo, resumo) {
  if (!temIA()) return '';
  const { resposta } = await perguntarIA({
    sistema: 'Você ajuda a pôr notícias e aulas num mapa. Responda só com JSON válido.',
    usuario: `Assunto: ${titulo}\n${(resumo || '').slice(0, 800)}\n\nQual é o lugar principal, para marcar num mapa? O mais específico que o texto permitir, com o NOME de um lugar que existe no mapa (cidade, província ou país), nunca uma descrição como "sudeste da Polônia"; sempre com o país. JSON: {"lugar": "<ex.: 'Rzeszów, Polônia' ou 'Bruxelas, Bélgica'; string vazia se não houver um lugar>"}`,
    maxTokens: 300,
    validar: (r) => { if (typeof r.lugar !== 'string') throw new Error('sem lugar'); },
  });
  return resposta.lugar.trim();
}

// ---------- 3: os desenhos ----------

/**
 * Escreve o traço de um jeito mais curto: em vez de cada ponto inteiro
 * ("L123,45L125,47"), só quanto ele andou desde o anterior ("l2,2").
 * O desenho é o mesmo; o texto fica bem menor (e o repositório também).
 */
function compactar(d) {
  let saida = ''; let x = 0; let y = 0; let x0 = 0; let y0 = 0; let ultimo = '';
  for (const [, cmd, args] of (d || '').matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (cmd === 'Z') { saida += 'z'; x = x0; y = y0; ultimo = 'z'; continue; }
    const [a, b] = args.split(',').map((n) => Math.round(Number(n)));
    if (cmd === 'M') { saida += `M${a},${b}`; x = x0 = a; y = y0 = b; ultimo = 'M'; continue; }
    const dx = a - x; const dy = b - y;
    if (!dx && !dy) continue; // ponto repetido: não precisa
    saida += `${ultimo === 'l' ? ' ' : 'l'}${dx},${dy}`;
    x = a; y = b; ultimo = 'l';
  }
  return saida;
}
const caminho = (projecao) => { const p = geoPath(projecao).digits(0); return (geo) => compactar(p(geo)); };

/** Uma escala: terra, fronteiras, o país em destaque e o ponto. */
function escala(nome, projecao, b, ponto, extra = '') {
  const p = caminho(projecao);
  const pais = b.paises.find((f) => geoContains(f, ponto)) || null;
  const [x, y] = projecao(ponto);
  return {
    nome,
    terra: p(b.terra) || '',
    fronteiras: p(b.fronteiras) || '',
    destaque: pais ? p(pais) || '' : '',
    extra,
    ponto: [Math.round(x), Math.round(y)],
  };
}

/** A mesma escala com o máximo de detalhe que cabe no LIMITE. */
function escalaLeve(nome, fazerProjecao, ponto) {
  let ultima = null;
  for (const nivel of NIVEIS) {
    ultima = escala(nome, fazerProjecao(nivel), nivel, ponto);
    const tamanho = ultima.terra.length + ultima.fronteiras.length + ultima.destaque.length;
    if (tamanho <= LIMITE) return ultima;
  }
  return ultima; // nem o mais simples coube: vai assim mesmo
}

function desenhar({ lat, lon, caixa }) {
  const ponto = [lon, lat];
  const paisGlobo = GLOBO.paises.find((f) => geoContains(f, ponto)) || null;

  // Mundo: globo girado para o lugar ficar na frente
  const globo = geoOrthographic().rotate([-lon, -lat * 0.7]).fitExtent([[8, 8], [L - 8, L - 8]], { type: 'Sphere' }).clipAngle(90);
  const grade = caminho(globo)(geoGraticule10()) || '';
  const contorno = caminho(globo)({ type: 'Sphere' }) || '';
  const mundo = escala('mundo', globo, GLOBO, ponto, `${contorno}|${grade}`);

  // País: o país inteiro (girado para não cortar países grandes, como a Rússia)
  let pais = null;
  if (paisGlobo) {
    pais = escalaLeve('pais', (nivel) => {
      const alvo = nivel.paises.find((f) => geoContains(f, ponto)) || paisGlobo;
      const [clon] = geoCentroid(alvo);
      return geoMercator().rotate([-clon, 0]).fitExtent([[14, 14], [L - 14, L - 14]], alvo).clipExtent([[0, 0], [L, L]]);
    }, ponto);
  }

  // Região: uns 600 km em volta do ponto (ou a área do lugar, se for maior)
  const meia = Math.max(3, Math.min(8, Math.max(caixa.n - caixa.s, caixa.l - caixa.o) / 2 + 1));
  const area = { type: 'Polygon', coordinates: [[[lon - meia, lat - meia], [lon - meia, lat + meia], [lon + meia, lat + meia], [lon + meia, lat - meia], [lon - meia, lat - meia]]] };
  const regiao = escalaLeve('regiao', () => geoMercator().rotate([-lon, 0]).fitExtent([[0, 0], [L, L]], area).clipExtent([[0, 0], [L, L]]), ponto);

  return {
    tamanho: L,
    pais: paisGlobo?.properties?.name || '',
    escalas: [mundo, pais, regiao].filter(Boolean),
  };
}

// ---------- 4: pôr no destaque e no tema ----------

async function montar(nome, caminhoArquivo, pegar) {
  const dados = await lerJson(caminhoArquivo, null);
  if (!dados || dados.status !== 'ok') { console.log(`${nome}: nada para desenhar.`); return; }
  const alvo = pegar(dados);
  if (!alvo) return;
  let lugar = alvo.lugar || alvo.fatosRapidos?.onde || '';
  if (alvo.holograma?.lugar && alvo.holograma.lugar === lugar) { console.log(`${nome}: holograma já está em dia.`); return; }
  if (!lugar) lugar = await perguntarLugar(alvo.titulo, alvo.oQueAconteceu || alvo.emUmaFrase);
  if (!lugar) { console.log(`${nome}: sem lugar para o mapa.`); return; }
  console.log(`${nome}: lugar "${lugar}"…`);
  const c = await coordenadasComReserva(lugar);
  alvo.holograma = { lugar, lat: c.lat, lon: c.lon, ...desenhar(c) };
  await gravarJson(caminhoArquivo, dados);
  // Guarda também no arquivo do dia (histórico), na versão mais recente.
  const dia = dados.dataReferencia;
  const pasta = caminhoArquivo.includes('tema') ? 'temas' : 'analises';
  const doDia = await lerJson(`data/${pasta}/${dia}.json`, null);
  const ultima = doDia?.versoes?.at(-1);
  if (ultima && ultima.geradoEm === dados.geradoEm) {
    const alvoDia = pegar(ultima);
    if (alvoDia) { alvoDia.holograma = alvo.holograma; await gravarJson(`data/${pasta}/${dia}.json`, doDia); }
  }
  const kb = Math.round(JSON.stringify(alvo.holograma).length / 1024);
  console.log(`${nome}: holograma pronto (${c.lat.toFixed(2)}, ${c.lon.toFixed(2)}; ${alvo.holograma.pais || 'sem país'}; ${kb} KB).`);
}

for (const [nome, caminhoArquivo, pegar] of [
  ['Destaque', 'data/app/analise.json', (d) => d.destaque],
  ['Tema', 'data/app/tema.json', (d) => d],
]) {
  try { await montar(nome, caminhoArquivo, pegar); } catch (erro) { console.log(`${nome}: holograma ficou de fora (${erro.message}).`); }
  await new Promise((r) => setTimeout(r, 1500)); // o Nominatim pede no máximo 1 pedido por segundo
}
