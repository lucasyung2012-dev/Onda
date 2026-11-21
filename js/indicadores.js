// =============================================================
// indicadores.js — O painel de indicadores no app.
//
// Os números vêm de data/app/indicadores.json, que o robô atualiza a
// cada 3 horas a partir do Banco Central e do Ipeadata. Plano B: se o
// arquivo faltar ou estiver velho (mais de 3 dias), o app busca direto
// nas fontes oficiais (elas permitem a leitura pelo navegador).
//
// Os textos explicam cada indicador como CONTEXTO das notícias: o que
// é, por que o mundo mexe nele e como chega no seu dia a dia.
// =============================================================

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
  petroleo: {
    oQueE: 'O preço internacional do barril de petróleo tipo Brent (do Mar do Norte), a principal referência do mundo, em dólares.',
    mundo: 'Sobe com guerras e tensões no Oriente Médio, cortes de produção da OPEP+ e sanções a grandes produtores (como Rússia e Irã); cai quando a economia mundial esfria.',
    voce: 'A Petrobras usa o preço internacional como referência: isso chega na gasolina, no diesel, no frete dos caminhões e, por tabela, no preço dos alimentos.',
    palavras: ['petroleo', 'oil', 'opep', 'opec', 'brent', 'barril', 'barrel', 'gasolina', 'petrobras', 'ormuz', 'hormuz'],
  },
  selic: {
    oQueE: 'A taxa básica de juros do Brasil, definida pelo Banco Central a cada cerca de 45 dias, nas reuniões do Copom.',
    mundo: 'Choques lá fora que fazem o dólar subir e os preços aumentarem (guerras, petróleo caro, juros altos nos EUA) podem levar o Banco Central a subir a Selic para segurar a inflação.',
    voce: 'Juros altos deixam mais caros o crédito, o parcelamento e os financiamentos, e costumam frear a economia e o emprego.',
    palavras: ['juros', 'interest rate', 'banco central', 'central bank', 'copom', 'selic'],
  },
  ipca: {
    oQueE: 'A inflação oficial do Brasil, medida pelo IBGE: quanto os preços subiram, em média, nos últimos 12 meses.',
    mundo: 'Guerras, secas, petróleo caro e dólar alto encarecem alimentos, energia e transporte no mundo todo — e isso aparece aqui.',
    voce: 'É quanto o seu dinheiro passa a comprar a menos: a mesma compra no mercado fica mais cara.',
    palavras: ['inflacao', 'inflation', 'precos', 'prices', 'alimentos', 'food prices'],
  },
};

const tresDias = 3 * 86400000;

/** Busca direto nas fontes oficiais (plano B, se o arquivo do robô faltar). */
async function buscarDireto() {
  const doisDigitos = (n) => String(n).padStart(2, '0');
  const inicio = new Date(Date.now() - 400 * 86400000);
  const dataBR = `${doisDigitos(inicio.getDate())}/${doisDigitos(inicio.getMonth() + 1)}/${inicio.getFullYear()}`;
  const hoje = new Date().toISOString().slice(0, 10);
  const bcb = async (s) => (await (await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s}/dados?formato=json&dataInicial=${encodeURIComponent(dataBR)}`)).json())
    .map(({ data, valor }) => { const [d, m, a] = data.split('/'); return [`${a}-${m}-${d}`, Number(valor)]; })
    .filter(([d, v]) => Number.isFinite(v) && d <= hoje);
  const ipea = async (c) => ((await (await fetch(`https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${c}')?$filter=${encodeURIComponent(`VALDATA ge ${inicio.toISOString().slice(0, 10)}T00:00:00-03:00`)}`)).json()).value || [])
    .filter((v) => v.VALVALOR !== null).map((v) => [v.VALDATA.slice(0, 10), Number(v.VALVALOR)]).sort((a, b) => a[0].localeCompare(b[0]));
  const lista = [
    { id: 'dolar', nome: 'Dólar', unidade: 'R$', fonte: 'Banco Central do Brasil', link: 'https://www3.bcb.gov.br/sgspub/', ler: () => bcb(1) },
    { id: 'euro', nome: 'Euro', unidade: 'R$', fonte: 'Banco Central do Brasil', link: 'https://www3.bcb.gov.br/sgspub/', ler: () => bcb(21619) },
    { id: 'petroleo', nome: 'Petróleo Brent', unidade: 'US$/barril', fonte: 'Ipeadata (dados da EIA, EUA)', link: 'https://www.ipeadata.gov.br/', ler: () => ipea('EIA366_PBRENT366') },
    { id: 'selic', nome: 'Selic (juros do Brasil)', unidade: '% ao ano', fonte: 'Banco Central do Brasil', link: 'https://www.bcb.gov.br/controleinflacao/taxaselic', ler: () => bcb(432) },
    { id: 'ipca', nome: 'Inflação (IPCA, 12 meses)', unidade: '%', fonte: 'Banco Central do Brasil (dados do IBGE)', link: 'https://www.ibge.gov.br/explica/inflacao.php', ler: () => bcb(13522) },
  ];
  const resultado = [];
  for (const ind of lista) {
    try {
      const serie = await ind.ler();
      const [data, valor] = serie[serie.length - 1];
      const ref = (dias) => { const alvo = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10); let v = serie[0][1]; for (const [d, x] of serie) if (d <= alvo) v = x; return v; };
      const taxa = ['selic', 'ipca'].includes(ind.id);
      const muda = (dias) => (taxa ? { pontos: Math.round((valor - ref(dias)) * 100) / 100 } : { porcento: Math.round(((valor - ref(dias)) / ref(dias)) * 1000) / 10 });
      // O Ipeadata manda o histórico inteiro (desde 1986): o gráfico mostra só o último ano.
      const umAnoAtras = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      resultado.push({ id: ind.id, nome: ind.nome, unidade: ind.unidade, fonte: ind.fonte, link: ind.link, ultimo: { data, valor }, variacao30: muda(30), variacao365: muda(365), serie: serie.filter(([d]) => d >= umAnoAtras) });
    } catch { /* se uma fonte falhar, mostra as outras */ }
  }
  return { geradoEm: new Date().toISOString(), indicadores: resultado, direto: true };
}

/** Carrega os indicadores (do robô; se faltar ou estiver velho, direto das fontes). */
export async function carregarIndicadores() {
  try {
    const r = await fetch('data/app/indicadores.json', { cache: 'no-cache' });
    if (r.ok) {
      const dados = await r.json();
      if (Date.now() - new Date(dados.geradoEm).getTime() < tresDias && dados.indicadores?.length) return dados;
    }
  } catch { /* segue para o plano B */ }
  try { return await buscarDireto(); } catch { return null; }
}
