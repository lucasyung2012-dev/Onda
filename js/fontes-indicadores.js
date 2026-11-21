// =============================================================
// fontes-indicadores.js — De onde vem cada indicador e como baixar.
//
// Este arquivo é usado em DOIS lugares:
//   - pelo robô (coletor/indicadores.mjs), a cada 3 horas;
//   - pelo app, como plano B, se o arquivo do robô faltar.
// Assim a regra de cada fonte fica escrita uma vez só.
//
// Todas as fontes são oficiais, gratuitas e sem chave:
//   Banco Central do Brasil · Ipeadata (dados da EIA, EUA) ·
//   Tesouro dos EUA · Banco Central Europeu (via Frankfurter) · Banco Mundial
// =============================================================

const ANOS = 5; // histórico guardado (para comparar com datas antigas)

export const INDICADORES = [
  // ---- Brasil ----
  { id: 'dolar', grupo: 'brasil', nome: 'Dólar', unidade: 'R$', prefixo: 'R$ ', frequencia: 'diaria', fonte: 'Banco Central do Brasil', link: 'https://www3.bcb.gov.br/sgspub/', origem: { bcb: 1 } },
  { id: 'euro', grupo: 'brasil', nome: 'Euro', unidade: 'R$', prefixo: 'R$ ', frequencia: 'diaria', fonte: 'Banco Central do Brasil', link: 'https://www3.bcb.gov.br/sgspub/', origem: { bcb: 21619 } },
  { id: 'selic', grupo: 'brasil', nome: 'Selic (juros do Brasil)', unidade: '% ao ano', sufixo: '%', taxa: true, frequencia: 'diaria', fonte: 'Banco Central do Brasil', link: 'https://www.bcb.gov.br/controleinflacao/taxaselic', origem: { bcb: 432 } },
  { id: 'gasolina', grupo: 'brasil', nome: 'Gasolina (São Paulo)', unidade: 'R$ por litro', prefixo: 'R$ ', frequencia: 'semanal', fonte: 'ANP (Agência Nacional do Petróleo)', link: 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas', origem: { anp: 'SAO PAULO' } },
  { id: 'gasolina-br', grupo: 'brasil', oculto: true, nome: 'Gasolina (Brasil)', unidade: 'R$ por litro', prefixo: 'R$ ', frequencia: 'semanal', fonte: 'ANP (Agência Nacional do Petróleo)', link: 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas', origem: { anp: 'BRASIL' } },
  { id: 'ipca', grupo: 'brasil', nome: 'Inflação (IPCA, 12 meses)', unidade: '%', sufixo: '%', taxa: true, frequencia: 'mensal', fonte: 'Banco Central do Brasil (dados do IBGE)', link: 'https://www.ibge.gov.br/explica/inflacao.php', origem: { bcb: 13522 } },
  // ---- Mundo ----
  { id: 'petroleo', grupo: 'mundo', nome: 'Petróleo Brent', unidade: 'US$/barril', prefixo: 'US$ ', frequencia: 'diaria', fonte: 'Ipeadata (dados da EIA, EUA)', link: 'https://www.ipeadata.gov.br/', origem: { ipea: 'EIA366_PBRENT366' } },
  { id: 'wti', grupo: 'mundo', nome: 'Petróleo WTI (EUA)', unidade: 'US$/barril', prefixo: 'US$ ', frequencia: 'diaria', fonte: 'Ipeadata (dados da EIA, EUA)', link: 'https://www.ipeadata.gov.br/', origem: { ipea: 'EIA366_PWTI366' } },
  { id: 'juroseua', grupo: 'mundo', nome: 'Juros dos EUA (10 anos)', unidade: '% ao ano', sufixo: '%', taxa: true, frequencia: 'diaria', fonte: 'Tesouro dos EUA', link: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates', origem: { tesouro: '10 Yr' } },
  { id: 'yuan', grupo: 'mundo', nome: 'Yuan da China (por dólar)', unidade: 'yuans por US$ 1', prefixo: '¥ ', frequencia: 'diaria', fonte: 'Banco Central Europeu (via Frankfurter)', link: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', origem: { moeda: 'CNY' } },
  { id: 'commodities', grupo: 'mundo', nome: 'Commodities (índice)', unidade: 'pontos (índice do Banco Central)', frequencia: 'mensal', fonte: 'Banco Central do Brasil (IC-Br)', link: 'https://www.bcb.gov.br/estatisticas/indicecommoditiesbrasil', origem: { bcb: 27574 } },
  { id: 'pibmundo', grupo: 'mundo', nome: 'Economia mundial (crescimento)', unidade: '% no ano', sufixo: '%', taxa: true, frequencia: 'anual', fonte: 'Banco Mundial', link: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=1W', origem: { bancoMundial: 'NY.GDP.MKTP.KD.ZG' } },
  { id: 'inflacaomundo', grupo: 'mundo', nome: 'Inflação no mundo', unidade: '% no ano', sufixo: '%', taxa: true, frequencia: 'anual', fonte: 'Banco Mundial', link: 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=1W', origem: { bancoMundial: 'FP.CPI.TOTL.ZG' } },
];

const dd = (n) => String(n).padStart(2, '0');
const hojeISO = () => new Date().toISOString().slice(0, 10);
const inicioISO = (anos) => new Date(Date.now() - anos * 366 * 86400000).toISOString().slice(0, 10);
const tempo = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(40000) } : {});

async function json(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, ...tempo() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---------- Cada tipo de fonte devolve [[AAAA-MM-DD, valor], ...] em ordem ----------

async function bcb(serie) {
  const ini = new Date(`${inicioISO(ANOS)}T12:00:00Z`);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${encodeURIComponent(`${dd(ini.getUTCDate())}/${dd(ini.getUTCMonth() + 1)}/${ini.getUTCFullYear()}`)}`;
  return (await json(url))
    .map(({ data, valor }) => { const [d, m, a] = data.split('/'); return [`${a}-${m}-${d}`, Number(valor)]; })
    .filter(([d, v]) => Number.isFinite(v) && d <= hojeISO()); // a Selic traz datas futuras (até a próxima reunião)
}

async function ipea(codigo) {
  // O Ipeadata ignora filtros de data: vem o histórico inteiro e cortamos aqui.
  const { value } = await json(`https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${codigo}')`);
  const inicio = inicioISO(ANOS);
  return (value || []).filter((v) => v.VALVALOR !== null).map((v) => [v.VALDATA.slice(0, 10), Number(v.VALVALOR)])
    .filter(([d]) => d >= inicio).sort((a, b) => a[0].localeCompare(b[0]));
}

async function tesouro(coluna) {
  // O Tesouro dos EUA publica um arquivo por ano.
  const anoAtual = new Date().getUTCFullYear();
  const serie = [];
  for (let ano = anoAtual - ANOS; ano <= anoAtual; ano++) {
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${ano}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${ano}&page&_format=csv`;
    const r = await fetch(url, tempo());
    if (!r.ok) continue;
    const [cabeca, ...linhas] = (await r.text()).trim().split('\n');
    const col = cabeca.split(',').map((c) => c.replace(/"/g, '')).indexOf(coluna);
    for (const linha of linhas) {
      const partes = linha.split(',');
      const [m, d, a] = partes[0].split('/');
      const valor = Number(partes[col]);
      if (Number.isFinite(valor) && partes[col] !== '') serie.push([`${a}-${m}-${d}`, valor]);
    }
  }
  if (!serie.length) throw new Error('Tesouro dos EUA sem dados');
  return serie.sort((x, y) => x[0].localeCompare(y[0]));
}

async function moeda(codigo) {
  const dados = await json(`https://api.frankfurter.dev/v1/${inicioISO(ANOS)}..${hojeISO()}?base=USD&symbols=${codigo}`);
  return Object.entries(dados.rates || {}).map(([d, taxas]) => [d, Number(taxas[codigo])]).sort((a, b) => a[0].localeCompare(b[0]));
}

async function bancoMundial(indicador) {
  const [, lista] = await json(`https://api.worldbank.org/v2/country/WLD/indicator/${indicador}?format=json&per_page=30`);
  return (lista || []).filter((x) => x.value !== null).map((x) => [`${x.date}-12-31`, Math.round(x.value * 100) / 100])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/** Baixa a série de um indicador. */
export async function baixarSerie(ind) {
  const o = ind.origem;
  if (o.anp) throw new Error('a gasolina (planilha da ANP) só é lida pelo robô');
  if (o.bcb) return bcb(o.bcb);
  if (o.ipea) return ipea(o.ipea);
  if (o.tesouro) return tesouro(o.tesouro);
  if (o.moeda) return moeda(o.moeda);
  return bancoMundial(o.bancoMundial);
}

/** Valor mais recente até uma data (para comparar). */
export function valorEm(serie, dataAlvo) {
  let achado = null;
  for (const ponto of serie) { if (ponto[0] <= dataAlvo) achado = ponto; else break; }
  return achado;
}

const menosDias = (iso, dias) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - dias * 86400000).toISOString().slice(0, 10);

/**
 * Monta o indicador para o app: último valor e a comparação "de → para"
 * (30 dias atrás; nos anuais, o ano anterior). Taxas mudam em pontos
 * percentuais (p.p.); preços e moedas, em %.
 */
export function montar(ind, serie) {
  const [data, valor] = serie[serie.length - 1];
  const anterior = ind.frequencia === 'anual' ? serie[serie.length - 2] : valorEm(serie, menosDias(data, 30));
  const base = anterior || serie[0];
  const { origem, ...semOrigem } = ind;
  return {
    ...semOrigem,
    ultimo: { data, valor },
    comparacao: {
      de: { data: base[0], valor: base[1] },
      periodo: ind.frequencia === 'anual' ? 'ano anterior' : '30 dias',
      ...(ind.taxa ? { pontos: Math.round((valor - base[1]) * 100) / 100 } : { porcento: Math.round(((valor - base[1]) / base[1]) * 1000) / 10 }),
    },
    serie,
  };
}
