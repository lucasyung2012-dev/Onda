// =============================================================
// indicadores.js — O painel de indicadores no app.
//
// Os números vêm de data/app/indicadores.json, que o robô atualiza a
// cada 3 horas. Plano B: se o arquivo faltar ou estiver velho (mais de
// 3 dias), o app busca direto nas fontes oficiais, com as mesmas regras
// do robô (js/fontes-indicadores.js).
//
// Os textos explicam cada indicador como CONTEXTO das notícias: o que
// é, o que mexe nele e como chega no seu dia a dia.
// =============================================================

import { INDICADORES, baixarSerie, montar } from './fontes-indicadores.js';

export const EXPLICACOES = {
  dolar: {
    oQueE: 'Quanto custa 1 dólar americano em reais (cotação de venda do Banco Central).',
    mundo: 'O dólar costuma subir quando o mundo fica com medo — guerras, crises, eleições tensas — e quando os juros nos EUA sobem, porque o dinheiro corre para lá.',
    voce: 'Dólar alto encarece celulares, eletrônicos, remédios, viagens e até alimentos e a gasolina, que dependem de coisas cotadas em dólar.',
    palavras: ['dolar', 'dollar', 'fed', 'federal reserve', 'cambio', 'currency', 'tarifa', 'tariff'],
  },
  euro: {
    oQueE: 'Quanto custa 1 euro em reais. O euro é a moeda de 20 países da União Europeia.',
    mundo: 'Mexe com a economia europeia, a guerra na Ucrânia, a energia na Europa e as decisões do Banco Central Europeu.',
    voce: 'Pesa em viagens e em produtos europeus (carros, máquinas, remédios) e no comércio do Brasil com a Europa.',
    palavras: ['euro', 'uniao europeia', 'european union', 'bce', 'ecb', 'eurozone'],
  },
  selic: {
    oQueE: 'A taxa básica de juros do Brasil, definida pelo Banco Central a cada cerca de 45 dias, nas reuniões do Copom.',
    mundo: 'Choques lá fora que fazem o dólar subir e os preços aumentarem (guerras, petróleo caro, juros altos nos EUA) podem levar o Banco Central a subir a Selic para segurar a inflação.',
    voce: 'Juros altos deixam mais caros o crédito, o parcelamento e os financiamentos, e costumam frear a economia e o emprego.',
    palavras: ['juros', 'banco central', 'copom', 'selic'],
  },
  ipca: {
    oQueE: 'A inflação oficial do Brasil, medida pelo IBGE: quanto os preços subiram, em média, nos últimos 12 meses.',
    mundo: 'Guerras, secas, petróleo caro e dólar alto encarecem alimentos, energia e transporte no mundo todo — e isso aparece aqui.',
    voce: 'É quanto o seu dinheiro passa a comprar a menos: a mesma compra no mercado fica mais cara.',
    palavras: ['inflacao', 'precos', 'alimentos'],
  },
  petroleo: {
    oQueE: 'O preço internacional do barril de petróleo tipo Brent (do Mar do Norte), a principal referência do mundo, em dólares.',
    mundo: 'Sobe com guerras e tensões no Oriente Médio, cortes de produção da OPEP+ e sanções a grandes produtores (como Rússia e Irã); cai quando a economia mundial esfria.',
    voce: 'A Petrobras usa o preço internacional como referência: isso chega na gasolina, no diesel, no frete dos caminhões e, por tabela, no preço dos alimentos.',
    palavras: ['petroleo', 'oil', 'opep', 'opec', 'brent', 'barril', 'barrel', 'gasolina', 'petrobras', 'ormuz', 'hormuz'],
  },
  wti: {
    oQueE: 'O preço do barril de petróleo produzido nos EUA (West Texas Intermediate), a outra grande referência mundial, em dólares.',
    mundo: 'Acompanha o Brent, mas reage mais à produção e aos estoques dos EUA, hoje o maior produtor de petróleo do mundo.',
    voce: 'Junto com o Brent, ajuda a entender para onde vão os combustíveis e o frete no Brasil.',
    palavras: ['petroleo', 'oil', 'wti', 'shale', 'barril', 'barrel', 'opep', 'opec'],
  },
  juroseua: {
    oQueE: 'Quanto o governo dos EUA paga por ano para pegar dinheiro emprestado por 10 anos. É o "juro de referência" do mundo.',
    mundo: 'Sobe quando o Federal Reserve (o banco central dos EUA) aperta os juros ou quando se espera mais inflação e mais dívida americana; cai em momentos de medo, quando todos correm para os títulos dos EUA.',
    voce: 'Juros altos nos EUA puxam dinheiro do mundo para lá: o dólar sobe frente ao real e o Brasil tende a manter os juros altos também.',
    palavras: ['fed', 'federal reserve', 'treasury', 'juros', 'interest rate', 'powell', 'yields'],
  },
  yuan: {
    oQueE: 'Quantos yuans (a moeda da China) valem 1 dólar, pela cotação de referência do Banco Central Europeu.',
    mundo: 'Mexe com a guerra comercial entre EUA e China, as exportações chinesas e as decisões do governo chinês, que controla de perto a sua moeda.',
    voce: 'A China é o maior parceiro comercial do Brasil: compra soja, minério e petróleo e vende eletrônicos e máquinas. Um yuan fraco barateia produtos chineses e mexe com o que o Brasil exporta.',
    palavras: ['china', 'chines', 'chinese', 'yuan', 'pequim', 'beijing', 'xi jinping'],
  },
  commodities: {
    oQueE: 'Um índice do Banco Central que acompanha os preços internacionais (convertidos em reais) das matérias-primas que o Brasil produz: soja, milho, carne, minério de ferro, petróleo, café, açúcar.',
    mundo: 'Sobe com guerras que travam a produção ou o transporte, secas, demanda forte da China e dólar alto; cai quando a economia mundial esfria.',
    voce: 'Commodities caras trazem mais dinheiro para o Brasil exportador, mas encarecem a comida e os combustíveis aqui dentro.',
    palavras: ['commodit', 'soja', 'soy', 'minerio', 'iron ore', 'trigo', 'wheat', 'milho', 'corn', 'cafe', 'coffee', 'acucar', 'sugar'],
  },
  pibmundo: {
    oQueE: 'Quanto a economia do mundo inteiro cresceu em um ano (o PIB mundial), pelos dados do Banco Mundial.',
    mundo: 'Guerras, pandemias, crises financeiras e juros altos freiam o crescimento; acordos de comércio e estabilidade ajudam.',
    voce: 'Um mundo crescendo compra mais do Brasil (soja, minério, carne), o que ajuda empregos e renda aqui; um mundo freando faz o contrário.',
    palavras: ['economia mundial', 'world economy', 'global growth', 'recessao', 'recession', 'fmi', 'imf', 'banco mundial', 'world bank'],
  },
  inflacaomundo: {
    oQueE: 'Quanto os preços subiram, em média, no planeta todo em um ano, pelos dados do Banco Mundial.',
    mundo: 'Sobe com choques globais: guerras, petróleo e gás caros, falta de alimentos, problemas nas rotas de navios.',
    voce: 'Inflação alta no mundo costuma chegar aqui pelos importados, pelos combustíveis e pelos alimentos.',
    palavras: ['inflation', 'inflacao', 'prices', 'precos', 'food prices', 'custo de vida', 'cost of living'],
  },
};

// Os mesmos textos em inglês (as palavras-chave das notícias continuam as de cima).
const EN = {
  dolar: {
    oQueE: 'How much 1 US dollar costs in Brazilian reais (Central Bank selling rate).',
    mundo: 'The dollar tends to rise when the world gets scared — wars, crises, tense elections — and when US interest rates go up, because money flows there.',
    voce: 'A strong dollar makes phones, electronics, medicine, travel and even food and gasoline more expensive, since they depend on things priced in dollars.',
  },
  euro: {
    oQueE: 'How much 1 euro costs in Brazilian reais. The euro is the currency of 20 European Union countries.',
    mundo: 'It moves with the European economy, the war in Ukraine, energy in Europe and the decisions of the European Central Bank.',
    voce: 'It weighs on travel, on European products (cars, machines, medicine) and on Brazil’s trade with Europe.',
  },
  selic: {
    oQueE: 'Brazil’s basic interest rate, set by the Central Bank about every 45 days at the Copom meetings.',
    mundo: 'Shocks abroad that push the dollar and prices up (wars, expensive oil, high US rates) can lead the Central Bank to raise the Selic to hold inflation back.',
    voce: 'High rates make credit, installments and loans more expensive and usually slow down the economy and jobs.',
  },
  ipca: {
    oQueE: 'Brazil’s official inflation, measured by IBGE: how much prices rose, on average, over the last 12 months.',
    mundo: 'Wars, droughts, expensive oil and a strong dollar make food, energy and transport more expensive worldwide — and it shows up here.',
    voce: 'It is how much less your money buys: the same grocery shopping costs more.',
  },
  petroleo: {
    oQueE: 'The international price of a barrel of Brent crude (from the North Sea), the world’s main benchmark, in dollars.',
    mundo: 'It rises with wars and tension in the Middle East, OPEC+ production cuts and sanctions on big producers (like Russia and Iran); it falls when the world economy cools down.',
    voce: 'Petrobras uses the international price as a reference: it reaches gasoline, diesel, truck freight and, through them, food prices.',
  },
  wti: {
    oQueE: 'The price of a barrel of US oil (West Texas Intermediate), the world’s other big benchmark, in dollars.',
    mundo: 'It follows Brent but reacts more to US production and stocks — the US is now the world’s largest oil producer.',
    voce: 'Together with Brent, it helps show where fuel and freight prices in Brazil are heading.',
  },
  juroseua: {
    oQueE: 'What the US government pays per year to borrow money for 10 years. It is the world’s “benchmark interest rate”.',
    mundo: 'It rises when the Federal Reserve tightens or when more inflation and more US debt are expected; it falls in moments of fear, when everyone rushes to US bonds.',
    voce: 'High US rates pull money from the world to the US: the dollar gets stronger against the real and Brazil tends to keep its own rates high.',
  },
  yuan: {
    oQueE: 'How many yuan (China’s currency) are worth 1 US dollar, by the European Central Bank reference rate.',
    mundo: 'It moves with the US–China trade war, Chinese exports and decisions by the Chinese government, which closely manages its currency.',
    voce: 'China is Brazil’s largest trading partner: it buys soy, iron ore and oil and sells electronics and machines. A weak yuan makes Chinese goods cheaper and affects what Brazil exports.',
  },
  commodities: {
    oQueE: 'A Central Bank index that tracks the international prices (converted into reais) of the raw materials Brazil produces: soy, corn, meat, iron ore, oil, coffee, sugar.',
    mundo: 'It rises with wars that block production or shipping, droughts, strong demand from China and a strong dollar; it falls when the world economy cools down.',
    voce: 'Expensive commodities bring more money to Brazil as an exporter, but make food and fuel more expensive at home.',
  },
  pibmundo: {
    oQueE: 'How much the whole world economy grew in a year (world GDP), according to the World Bank.',
    mundo: 'Wars, pandemics, financial crises and high interest rates slow growth down; trade deals and stability help.',
    voce: 'A growing world buys more from Brazil (soy, iron ore, meat), which helps jobs and income here; a slowing world does the opposite.',
  },
  inflacaomundo: {
    oQueE: 'How much prices rose, on average, across the whole planet in a year, according to the World Bank.',
    mundo: 'It rises with global shocks: wars, expensive oil and gas, food shortages, disruptions on shipping routes.',
    voce: 'High inflation abroad usually reaches Brazil through imports, fuel and food.',
  },
};

/** Explicações no idioma escolhido (mantendo as palavras-chave). */
export function explicacoesNoIdioma(ingles) {
  if (!ingles) return EXPLICACOES;
  return Object.fromEntries(Object.entries(EXPLICACOES).map(([id, ex]) => [id, { ...ex, ...(EN[id] || {}) }]));
}

const tresDias = 3 * 86400000;

/** Busca direto nas fontes oficiais (plano B, se o arquivo do robô faltar). */
async function buscarDireto() {
  const resultado = await Promise.all(INDICADORES.map(async (ind) => {
    try { return montar(ind, await baixarSerie(ind)); } catch { return null; } // se uma fonte falhar, mostra as outras
  }));
  return { geradoEm: new Date().toISOString(), indicadores: resultado.filter(Boolean), direto: true };
}

/** Carrega os indicadores (do robô; se faltar, estiver velho ou no formato antigo, direto das fontes). */
export async function carregarIndicadores() {
  try {
    const r = await fetch('data/app/indicadores.json', { cache: 'no-cache' });
    if (r.ok) {
      const dados = await r.json();
      const novo = dados.indicadores?.[0]?.comparacao; // formato com "de → para"
      if (novo && Date.now() - new Date(dados.geradoEm).getTime() < tresDias) return dados;
    }
  } catch { /* segue para o plano B */ }
  try { return await buscarDireto(); } catch { return null; }
}
