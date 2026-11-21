// =============================================================
// indicadores.mjs — Baixa os números que mostram os efeitos do mundo
// no Brasil: dólar, euro, petróleo, juros (Selic) e inflação (IPCA).
//
// Fontes oficiais e gratuitas, sem chave:
//   - Banco Central do Brasil (API do SGS): dólar, euro, Selic, IPCA
//   - Ipeadata (governo federal), com dados da EIA dos EUA: petróleo Brent
//
// Grava data/app/indicadores.json com o último valor, a variação e a
// série de 1 ano (para os gráficos). Se uma fonte falhar, as outras
// seguem e o indicador que falhou mantém os dados da rodada anterior.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);
const NAVEGADOR = 'OndaRadar/1.0 (https://github.com/lucasyung2012-dev/Onda)';

// O texto explicativo de cada indicador fica no app (js/indicadores-info.js).
export const INDICADORES = [
  { id: 'dolar', nome: 'Dólar', unidade: 'R$', casas: 2, fonte: 'Banco Central do Brasil', sgs: 1, link: 'https://www3.bcb.gov.br/sgspub/' },
  { id: 'euro', nome: 'Euro', unidade: 'R$', casas: 2, fonte: 'Banco Central do Brasil', sgs: 21619, link: 'https://www3.bcb.gov.br/sgspub/' },
  { id: 'petroleo', nome: 'Petróleo Brent', unidade: 'US$/barril', casas: 2, fonte: 'Ipeadata (dados da EIA, EUA)', ipea: 'EIA366_PBRENT366', link: 'https://www.ipeadata.gov.br/' },
  { id: 'selic', nome: 'Selic (juros do Brasil)', unidade: '% ao ano', casas: 2, fonte: 'Banco Central do Brasil', sgs: 432, link: 'https://www.bcb.gov.br/controleinflacao/taxaselic' },
  { id: 'ipca', nome: 'Inflação (IPCA, 12 meses)', unidade: '%', casas: 2, fonte: 'Banco Central do Brasil (dados do IBGE)', sgs: 13522, link: 'https://www.ibge.gov.br/explica/inflacao.php' },
];

const doisDigitos = (n) => String(n).padStart(2, '0');
const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Banco Central: devolve [[AAAA-MM-DD, valor], ...] do último ano. */
async function bcb(serie) {
  const inicio = new Date(Date.now() - 400 * 86400000);
  const dataInicial = `${doisDigitos(inicio.getUTCDate())}/${doisDigitos(inicio.getUTCMonth() + 1)}/${inicio.getUTCFullYear()}`;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${encodeURIComponent(dataInicial)}`;
  const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Banco Central respondeu HTTP ${r.status}`);
  const lista = await r.json();
  return lista
    .map(({ data, valor }) => { const [d, m, a] = data.split('/'); return [`${a}-${m}-${d}`, Number(valor)]; })
    .filter(([data, valor]) => Number.isFinite(valor) && data <= hojeISO()); // a Selic traz datas futuras (até a próxima reunião)
}

/** Ipeadata: devolve [[AAAA-MM-DD, valor], ...] do último ano. */
async function ipea(codigo) {
  const inicio = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const url = `https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${codigo}')?$filter=${encodeURIComponent(`VALDATA ge ${inicio}T00:00:00-03:00`)}`;
  const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Ipeadata respondeu HTTP ${r.status}`);
  const { value } = await r.json();
  return (value || [])
    .filter((v) => v.VALVALOR !== null)
    .map((v) => [v.VALDATA.slice(0, 10), Number(v.VALVALOR)])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/** Valor mais perto (antes) de uma data, para calcular a variação. */
function valorEm(serie, dataAlvo) {
  let achado = null;
  for (const [data, valor] of serie) { if (data <= dataAlvo) achado = valor; else break; }
  return achado;
}

const menosDias = (iso, dias) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - dias * 86400000).toISOString().slice(0, 10);
const variacao = (atual, antes) => (antes ? Math.round(((atual - antes) / antes) * 1000) / 10 : null);

async function principal() {
  const anterior = await readFile(arquivo('data/app/indicadores.json'), 'utf8').then(JSON.parse).catch(() => ({ indicadores: [] }));
  const resultado = [];
  for (const ind of INDICADORES) {
    try {
      const serie = ind.sgs ? await bcb(ind.sgs) : await ipea(ind.ipea);
      if (serie.length < 2) throw new Error('série vazia');
      const [dataUltimo, ultimo] = serie[serie.length - 1];
      resultado.push({
        ...ind,
        ultimo: { data: dataUltimo, valor: ultimo },
        // Selic e IPCA são taxas: a mudança em pontos percentuais diz mais que a variação em %.
        variacao30: ['selic', 'ipca'].includes(ind.id)
          ? { pontos: Math.round((ultimo - (valorEm(serie, menosDias(dataUltimo, 30)) ?? ultimo)) * 100) / 100 }
          : { porcento: variacao(ultimo, valorEm(serie, menosDias(dataUltimo, 30))) },
        variacao365: ['selic', 'ipca'].includes(ind.id)
          ? { pontos: Math.round((ultimo - (valorEm(serie, menosDias(dataUltimo, 365)) ?? serie[0][1])) * 100) / 100 }
          : { porcento: variacao(ultimo, valorEm(serie, menosDias(dataUltimo, 365)) ?? serie[0][1]) },
        serie: serie.filter(([data]) => data >= menosDias(dataUltimo, 365)),
        atualizadoEm: new Date().toISOString(),
      });
      console.log(`${ind.nome}: ${ultimo} em ${dataUltimo}`);
    } catch (erro) {
      console.log(`${ind.nome}: falhou (${erro.message}); mantendo os dados anteriores`);
      const velho = anterior.indicadores.find((x) => x.id === ind.id);
      if (velho) resultado.push({ ...velho, erro: erro.message });
    }
  }
  await mkdir(arquivo('data/app/'), { recursive: true });
  await writeFile(arquivo('data/app/indicadores.json'), JSON.stringify({ geradoEm: new Date().toISOString(), indicadores: resultado }) + '\n', 'utf8');
}

principal().catch((erro) => { console.error('Indicadores falharam:', erro); process.exit(1); });
