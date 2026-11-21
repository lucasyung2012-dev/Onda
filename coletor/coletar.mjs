// =============================================================
// coletar.mjs — O robô de coleta do Onda (etapa 1).
//
// Roda no GitHub Actions a cada 3 horas (veja .github/workflows/coletar.yml).
// Também dá para rodar à mão: `node coletor/coletar.mjs` (precisa do Node 24+).
//
// O que ele faz, em ordem:
//   1. Lê a lista de fontes em data/fontes.json.
//   2. Baixa o feed RSS de cada fonte (todas ao mesmo tempo).
//   3. Transforma cada item em uma "notícia" padronizada.
//   4. Descarta notícias com mais de 48 horas (notícia velha não é do dia).
//   5. Classifica cada notícia por região e tema.
//   6. Guarda tudo em data/noticias/AAAA-MM-DD.json (um arquivo por dia,
//      pela data de publicação no horário de Brasília). Nada é apagado:
//      a cada rodada, só entram as notícias novas.
//   7. Monta data/noticias/hoje.json com as notícias das últimas 24 horas,
//      já agrupadas em "fatos" (matérias de fontes diferentes sobre o mesmo
//      acontecimento).
//   8. Grava data/relatorio-coleta.json dizendo o que funcionou e o que falhou.
// =============================================================

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { lerFeed } from './rss.mjs';
import { classificar, NOMES_REGIOES, NOMES_TEMAS } from './classificar.mjs';
import { agrupar } from './agrupar.mjs';

// ---------- Configurações ----------
const FUSO = 'America/Sao_Paulo'; // horário de Brasília: referência de "hoje"
const JANELA_HOJE_HORAS = 24;      // "notícias de hoje" = últimas 24 horas
const IDADE_MAXIMA_HORAS = 48;     // mais velha que isso é descartada
const TAMANHO_RESUMO = 280;        // resumo curto (direitos autorais: só um trecho)
const TEMPO_LIMITE_MS = 20000;     // espera até 20 s por feed
const NAVEGADOR = 'Mozilla/5.0 (compatible; OndaRadar/1.0; +https://github.com/lucasyung2012-dev/Onda)';

// Caminhos dos arquivos (relativos à raiz do repositório).
const RAIZ = new URL('../', import.meta.url);
const arquivo = (caminho) => new URL(caminho, RAIZ);

// ---------- Funções de apoio ----------

/** Data no horário de Brasília, no formato AAAA-MM-DD. Calculada na hora, nunca fixa. */
function dataBrasilia(data) {
  // 'en-CA' é o idioma que formata datas como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

/** Identificador curto e estável para cada notícia, a partir do link. */
function gerarId(link) {
  return createHash('sha1').update(link).digest('hex').slice(0, 12);
}

/** Corta o texto no tamanho máximo, sem quebrar palavra no meio. */
function cortar(texto, maximo) {
  if (texto.length <= maximo) return texto;
  const espaco = texto.lastIndexOf(' ', maximo);
  const fim = espaco > maximo * 0.6 ? espaco : maximo; // sem espaço perto? corta seco
  return texto.slice(0, fim).replace(/[,;:.\s]+$/, '') + '…';
}

/** Lê um JSON do disco; se o arquivo não existir, devolve o valor padrão. */
async function lerJson(caminho, padrao) {
  try {
    return JSON.parse(await readFile(arquivo(caminho), 'utf8'));
  } catch {
    return padrao;
  }
}

/**
 * Grava um JSON no disco, criando a pasta se precisar. Os arquivos grandes
 * vão compactados (sem espaços), para o repositório não crescer à toa.
 */
async function gravarJson(caminho, dados, { compacto = false } = {}) {
  const destino = arquivo(caminho);
  await mkdir(new URL('./', destino), { recursive: true });
  await writeFile(destino, (compacto ? JSON.stringify(dados) : JSON.stringify(dados, null, 2)) + '\n', 'utf8');
}

/**
 * Baixa o feed de uma fonte e devolve o texto XML.
 * Alguns feeds brasileiros usam a codificação antiga ISO-8859-1 em vez
 * de UTF-8; por isso lemos os bytes e escolhemos a codificação certa.
 */
async function baixarFeed(url) {
  const resposta = await fetch(url, {
    headers: { 'User-Agent': NAVEGADOR, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resposta.ok) throw new Error(`o site respondeu HTTP ${resposta.status}`);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  const inicio = new TextDecoder('latin1').decode(bytes.slice(0, 200));
  const codificacao =
    (resposta.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] ||
    inicio.match(/encoding=["']([\w-]+)["']/i)?.[1] ||
    'utf-8';
  try {
    return new TextDecoder(codificacao).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Escolhe o DESTAQUE provisório do dia.
 * Até a IA chegar (etapa 7), a regra é simples e transparente:
 * o fato coberto pelo maior número de fontes diferentes, contando só
 * notícias (não análises) e ignorando o tema "outros" (variedades).
 */
function escolherDestaque(fatos, porId) {
  const candidatos = fatos.filter((f) => {
    const noticias = f.noticias.map((id) => porId.get(id)).filter((n) => n.tipo === 'noticia');
    return new Set(noticias.map((n) => n.fonte)).size >= 2 && f.temas[0] !== 'outros';
  });
  return candidatos[0] || fatos[0] || null;
}

/** Monta o arquivo enxuto que o app lê. */
function montarParaApp(agora, hoje, fatos, recentes) {
  const porId = new Map(recentes.map((n) => [n.id, n]));
  const destaque = escolherDestaque(fatos, porId);
  return {
    geradoEm: agora.toISOString(),
    dataReferencia: hoje,
    fuso: FUSO,
    totalNoticias: recentes.length,
    totalFontes: new Set(recentes.map((n) => n.fonte)).size,
    nomesRegioes: NOMES_REGIOES,
    nomesTemas: NOMES_TEMAS,
    destaque: destaque
      ? { id: destaque.id, motivo: `Coberto por ${destaque.fontes} fontes diferentes nas últimas ${JANELA_HOJE_HORAS} horas. Critério provisório: a partir da etapa 7, a escolha passa a ser feita por análise.` }
      : null,
    fatos: fatos.map((f) => {
      const materias = f.noticias.map((id) => porId.get(id));
      const principal = materias.find((m) => m.id === f.id) || materias[0];
      const comImagem = materias.find((m) => m.imagem);
      return {
        id: f.id,
        titulo: f.titulo,
        resumo: principal.resumo,
        imagem: comImagem ? comImagem.imagem : '',
        credito: comImagem ? comImagem.fonteNome : '',
        regioes: f.regioes,
        temas: f.temas,
        fontes: f.fontes,
        paises: new Set(materias.map((m) => m.pais)).size,
        maisRecente: f.maisRecente,
        materias: materias.map((m) => ({
          fonte: m.fonteNome,
          pais: m.pais,
          visao: m.visao,
          estatal: m.estatal,
          tipo: m.tipo,
          idioma: m.idioma,
          titulo: m.titulo,
          link: m.link,
          publicadoEm: m.publicadoEm,
          semData: m.semData,
        })),
      };
    }),
  };
}

// ---------- Programa principal ----------

async function principal() {
  const agora = new Date();
  const hoje = dataBrasilia(agora);
  console.log(`Onda — coleta de ${agora.toISOString()} (hoje em Brasília: ${hoje})`);

  // 1. Fontes
  const { fontes } = await lerJson('data/fontes.json', { fontes: [] });

  // 2. Baixa todos os feeds ao mesmo tempo. Se um falhar, os outros seguem.
  const resultados = await Promise.all(
    fontes.map(async (fonte) => {
      try {
        const itens = lerFeed(await baixarFeed(fonte.feed));
        if (itens.length === 0) throw new Error('o feed veio vazio ou num formato desconhecido');
        return { fonte, itens, erro: null };
      } catch (erro) {
        return { fonte, itens: [], erro: erro.name === 'TimeoutError' ? 'demorou demais para responder' : erro.message };
      }
    }),
  );

  // 3 a 5. Padroniza, filtra as velhas e classifica.
  const limiteIdade = agora.getTime() - IDADE_MAXIMA_HORAS * 3600 * 1000;
  const novas = [];
  const relatorio = [];

  for (const { fonte, itens, erro } of resultados) {
    let aceitas = 0;
    let antigas = 0;
    let comImagem = 0;
    for (const item of itens) {
      // Data de publicação. Sem data, ou com data no futuro (erro do feed),
      // usamos a hora da coleta e marcamos "semData" para ficar transparente.
      let publicado = item.publicadoEm;
      const semData = !publicado || publicado.getTime() > agora.getTime() + 3600 * 1000;
      if (semData) publicado = agora;
      if (publicado.getTime() < limiteIdade) { antigas++; continue; }

      const resumoLimpo = item.resumo.startsWith(item.titulo) ? item.resumo.slice(item.titulo.length).trim() : item.resumo;
      const { regioes, temas } = classificar(item.titulo, resumoLimpo);
      novas.push({
        id: gerarId(item.link),
        titulo: item.titulo,
        resumo: cortar(resumoLimpo, TAMANHO_RESUMO),
        link: item.link,
        fonte: fonte.id,
        fonteNome: fonte.nome,
        pais: fonte.pais,
        visao: fonte.visao,
        idioma: fonte.idioma,
        estatal: fonte.estatal,
        tipo: fonte.tipo || 'noticia',
        publicadoEm: publicado.toISOString(),
        dataPublicacao: dataBrasilia(publicado),
        semData,
        // A data do FATO pode ser diferente da data da publicação.
        // Ela só é confirmada na análise (etapa 4 e etapa 7).
        dataFato: null,
        imagem: item.imagem,
        imagemCredito: item.imagem ? fonte.nome : '',
        regioes,
        temas,
        coletadoEm: agora.toISOString(),
      });
      aceitas++;
      if (item.imagem) comImagem++;
    }
    relatorio.push({
      id: fonte.id,
      nome: fonte.nome,
      status: erro ? 'erro' : 'ok',
      erro: erro || undefined,
      itensNoFeed: itens.length,
      aceitas,
      descartadasPorIdade: antigas,
      comImagem,
    });
  }

  // 6. Junta com o que já estava salvo em cada dia (sem repetir).
  const porDia = {};
  for (const noticia of novas) (porDia[noticia.dataPublicacao] ||= []).push(noticia);

  const indice = await lerJson('data/noticias/indice.json', { dias: [] });
  let totalNovas = 0;
  for (const [dia, lista] of Object.entries(porDia)) {
    const salvo = await lerJson(`data/noticias/${dia}.json`, { data: dia, noticias: [] });
    const jaTem = new Set(salvo.noticias.map((n) => n.id));
    for (const noticia of lista) {
      if (jaTem.has(noticia.id)) continue; // já guardada numa rodada anterior
      salvo.noticias.push(noticia);
      jaTem.add(noticia.id);
      totalNovas++;
    }
    salvo.atualizadoEm = agora.toISOString();
    salvo.noticias.sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
    await gravarJson(`data/noticias/${dia}.json`, salvo, { compacto: true });
    if (!indice.dias.includes(dia)) indice.dias.push(dia);
  }
  indice.dias.sort().reverse();
  // Guarda as notícias brutas só dos últimos 7 dias (é o que o robô usa).
  // Edições, temas e indicadores (o que você relê) ficam para sempre.
  for (const velho of indice.dias.slice(7)) await rm(arquivo(`data/noticias/${velho}.json`), { force: true });
  indice.dias = indice.dias.slice(0, 7);
  indice.atualizadoEm = agora.toISOString();
  await gravarJson('data/noticias/indice.json', indice);

  // 7. Notícias das últimas 24 horas, agrupadas em fatos.
  //    Lemos dos arquivos dos dias (e não só da rodada atual) para não perder
  //    notícias que já saíram do feed, mas foram coletadas antes.
  const limiteHoje = new Date(agora.getTime() - JANELA_HOJE_HORAS * 3600 * 1000).toISOString();
  const doisDias = indice.dias.slice(0, 2);
  const recentes = [];
  const vistos = new Set();
  for (const dia of doisDias) {
    const { noticias } = await lerJson(`data/noticias/${dia}.json`, { noticias: [] });
    for (const n of noticias) {
      if (n.publicadoEm >= limiteHoje && !vistos.has(n.id)) { recentes.push(n); vistos.add(n.id); }
    }
  }
  recentes.sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
  const fatos = agrupar(recentes);

  await gravarJson('data/noticias/hoje.json', {
    geradoEm: agora.toISOString(),
    fuso: FUSO,
    dataReferencia: hoje,
    janelaHoras: JANELA_HOJE_HORAS,
    totalNoticias: recentes.length,
    totalFatos: fatos.length,
    totalFontes: new Set(recentes.map((n) => n.fonte)).size,
    nomesRegioes: NOMES_REGIOES,
    nomesTemas: NOMES_TEMAS,
    fatos,
    noticias: recentes,
  });

  // 7b. Versão enxuta para o app (data/app/hoje.json).
  //     O hoje.json completo passa de 2 MB, pesado para o celular. O app só
  //     precisa do essencial de cada fato, com as matérias já embutidas.
  await gravarJson('data/app/hoje.json', montarParaApp(agora, hoje, fatos, recentes), { compacto: true });

  // 8. Relatório da coleta.
  const comErro = relatorio.filter((r) => r.status === 'erro');
  await gravarJson('data/relatorio-coleta.json', {
    geradoEm: agora.toISOString(),
    fontesOk: relatorio.length - comErro.length,
    fontesComErro: comErro.length,
    noticiasNovasNestaRodada: totalNovas,
    porFonte: relatorio,
  });

  // Resumo no log do GitHub Actions.
  console.log(`Fontes ok: ${relatorio.length - comErro.length} de ${relatorio.length}`);
  for (const r of comErro) console.log(`  ✗ ${r.nome}: ${r.erro}`);
  console.log(`Notícias novas nesta rodada: ${totalNovas}`);
  console.log(`Últimas 24 h: ${recentes.length} notícias em ${fatos.length} fatos`);
  console.log('Fatos com mais fontes:');
  for (const f of fatos.slice(0, 5)) console.log(`  [${f.fontes} fontes] ${f.titulo}`);
}

principal().catch((erro) => {
  console.error('A coleta falhou:', erro);
  process.exit(1);
});
