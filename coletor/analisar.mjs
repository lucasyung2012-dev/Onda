// =============================================================
// analisar.mjs — O analista do Onda (etapa 3).
//
// Roda uma vez por dia (7h de Brasília), logo depois de uma coleta.
//
//   1. SELEÇÃO: pega os fatos das últimas 24 h que têm pelo menos duas
//      fontes jornalísticas independentes (para estarem CONFIRMADOS) e
//      pede à IA para escolher o mais importante do dia — por peso
//      geopolítico, nunca por quantos sites publicaram — e mais cinco
//      que também importam.
//   2. ANÁLISE: entrega à IA as matérias do destaque e pede a análise
//      completa: o que aconteceu, por que importa, como chega em você,
//      notas, fatos x versões e o que acompanhar.
//   3. COMO CADA LADO VÊ: busca notícias sobre o mesmo fato vindas de
//      outros países e linhas editoriais e pede à IA para mostrar como
//      cada lado conta a história (sem dar razão a ninguém). Opcional.
//   4. Grava data/app/analise.json (o app lê) e guarda uma cópia em
//      data/analises/AAAA-MM-DD.json. Se rodar de novo no mesmo dia, a
//      versão anterior é mantida: nada é sobrescrito em silêncio.
//
// Regra de ouro: a IA só pode usar o que está nas matérias entregues.
// Os links e nomes das fontes vêm dos nossos dados, nunca da IA.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { perguntarIA, temIA } from './ia.mjs';
import { buscarOutrasLinhas } from './linhas.mjs';

const FUSO = 'America/Sao_Paulo';
const MAX_CANDIDATOS = 60;   // quantos fatos a IA compara
const MAX_MATERIAS = 12;     // quantas matérias do destaque a IA lê

const RAIZ = new URL('../', import.meta.url);
const arquivo = (caminho) => new URL(caminho, RAIZ);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(arquivo(c), 'utf8')); } catch { return padrao; } };
async function gravarJson(caminho, dados) {
  const destino = arquivo(caminho);
  await mkdir(new URL('./', destino), { recursive: true });
  await writeFile(destino, JSON.stringify(dados) + '\n', 'utf8');
}
const dataBrasilia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Textos que orientam a IA ----------

const REGRAS = `Você é o analista do Onda, um radar geopolítico pessoal de um estudante brasileiro que mora em São Paulo e quer entender como os acontecimentos do mundo chegam ao dia a dia dele.

Regras que nunca podem ser quebradas:
- Use SOMENTE as informações das matérias fornecidas. Não invente fatos, números, datas, citações ou fontes.
- Não confunda declaração oficial com fato comprovado. Não apresente previsão como certeza.
- Gravidade não é o mesmo que importância histórica; repercussão na mídia não é relevância estratégica.
- Não exagere o impacto no Brasil. Se não há impacto relevante no dia a dia, diga isso.
- O número de veículos que publicaram NÃO é critério de importância.
- Escreva em português do Brasil, claro e direto, para um estudante curioso. Responda apenas com JSON válido.`;

const REGUA = `Régua das notas (0 a 10): 0–2 repercussão mínima; 3–4 limitada ou regional; 5–6 internacional relevante; 7–8 grande acontecimento que mexe no equilíbrio regional ou entre potências; 9 excepcional; 10 raríssimo, transformação histórica da ordem mundial. As três notas são independentes: um fato pode ter geral 8, mundo 7 e você 1.`;

// ---------- Etapa 1: seleção ----------

function candidatos(hoje) {
  const porId = new Map(hoje.noticias.map((n) => [n.id, n]));
  return hoje.fatos
    .map((f) => {
      const materias = f.noticias.map((id) => porId.get(id)).filter(Boolean);
      const jornalisticas = materias.filter((m) => m.tipo === 'noticia');
      return { ...f, materias, fontesJornalisticas: new Set(jornalisticas.map((m) => m.fonte)).size };
    })
    // Confirmação mínima: duas fontes jornalísticas diferentes. Variedades ficam de fora.
    .filter((f) => f.fontesJornalisticas >= 2 && f.temas[0] !== 'outros')
    .slice(0, MAX_CANDIDATOS);
}

async function selecionar(lista) {
  const linhas = lista.map((f, i) => {
    const titulos = [...new Set(f.materias.map((m) => m.titulo))].slice(0, 2).join(' || ');
    return `[${i}] ${titulos} (região: ${f.regioes.slice(0, 2).join(', ')}; tema: ${f.temas.slice(0, 2).join(', ')})`;
  });
  const usuario = `Abaixo estão os acontecimentos confirmados (com pelo menos duas fontes independentes) das últimas 24 horas. A ordem da lista não significa nada.

${linhas.join('\n')}

Tarefa:
1. Escolha o ÚNICO acontecimento geopolítico mais importante do dia. Compare: importância estratégica, quantidade e peso dos países envolvidos, consequências militares, diplomáticas e econômicas, impacto regional e internacional, potencial de mudar a ordem mundial, consequências imediatas e futuras. Não privilegie guerras automaticamente: um acordo histórico pode valer mais que um confronto isolado. Ignore esportes, celebridades, crimes comuns e curiosidades.
2. Escolha mais 5 acontecimentos que também importam hoje, de preferência de regiões e temas diferentes do destaque. Eles precisam ser acontecimentos DIFERENTES do destaque e diferentes entre si: não repita o mesmo encontro, guerra ou negociação visto de outro ângulo. Também não escolha um fato que é só o contexto ou um desdobramento do destaque (ex.: se o destaque é um míssil russo na Polônia, um exercício militar na Polônia ligado à mesma guerra não entra).

Responda neste formato JSON:
{"destaque": {"indice": <número>, "tituloPt": "<título curto em português>", "criterio": "<1 frase com o principal motivo da escolha, sem citar quantidade de fontes>",
   "palavras": [<6 a 10 nomes e termos específicos do destaque, em português E em inglês, para achar outras notícias sobre ele (ex.: "Polônia", "Poland", "míssil", "missile", "Tusk"); nada genérico como "governo">]},
 "tambemImporta": [{"indice": <número>, "tituloPt": "<título curto em português>", "porQueImporta": "<1 frase: por que importa. Só ligue ao Brasil se a ligação for real e clara; senão, explique por que importa para o mundo>"}]}`;

  return perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 3000,
    validar: (r) => {
      const ok = (i) => Number.isInteger(i) && i >= 0 && i < lista.length;
      if (!r.destaque || !ok(r.destaque.indice) || !r.destaque.tituloPt) throw new Error('seleção sem destaque válido');
      if (!Array.isArray(r.tambemImporta)) throw new Error('seleção sem "tambemImporta"');
      r.tambemImporta = r.tambemImporta.filter((t) => ok(t.indice) && t.indice !== r.destaque.indice && t.tituloPt).slice(0, 5);
      r.destaque.palavras = (r.destaque.palavras || []).filter((p) => typeof p === 'string' && p.trim().length >= 3).slice(0, 10);
    },
  });
}

// ---------- Etapa 2: análise do destaque ----------

const CAMADAS = ['economia', 'precos', 'energia', 'politica', 'seguranca', 'tecnologia', 'midia', 'sociedade', 'brasil'];
const TIPOS_AFIRMACAO = ['fato', 'declaracao', 'alegacao', 'nao_confirmado', 'analise'];
const TIPOS_IMPACTO = ['direto', 'indireto', 'risco', 'nenhum'];

async function analisar(fato, hojeData) {
  // Prioriza matérias de fontes diferentes, para a IA ver vários olhares.
  const vistas = new Set();
  const materias = [];
  for (const m of fato.materias) if (!vistas.has(m.fonte)) { vistas.add(m.fonte); materias.push(m); }
  for (const m of fato.materias) if (materias.length < MAX_MATERIAS && !materias.includes(m)) materias.push(m);
  const usadas = materias.slice(0, MAX_MATERIAS);

  const texto = usadas.map((m, i) =>
    `[${i}] ${m.fonteNome} (${m.pais}; ${m.visao}${m.estatal ? '; VEÍCULO ESTATAL' : ''}) — publicada em ${m.publicadoEm}\nTítulo: ${m.titulo}\nResumo: ${m.resumo || '(sem resumo)'}`).join('\n\n');

  const usuario = `Hoje é ${hojeData} (horário de Brasília). Analise o acontecimento abaixo, usando apenas estas matérias:

${texto}

${REGUA}

Responda neste formato JSON (todos os campos são obrigatórios):
{
 "titulo": "<título claro em português, até 90 caracteres>",
 "emUmaFrase": "<uma frase que diga como isso pode chegar ao dia a dia de quem vive no Brasil, sem exagero>",
 "emTrintaSegundos": {"oQue": "<o que aconteceu, em UMA frase curta, até 110 caracteres>", "porQue": "<por que importa, em UMA frase curta, até 110 caracteres>", "voce": "<o que muda para quem vive no Brasil, em UMA frase curta, até 110 caracteres; diga se não muda nada agora>"},
 "fatosRapidos": {"onde": "<lugar curto, ex.: 'Leste da Polônia'>", "quando": "<data curta, ex.: '20/11', ou 'sem data clara'>", "quem": "<os principais envolvidos, até 3, separados por vírgula>"},
 "lugar": "<o lugar principal para marcar no mapa, o mais específico que as matérias permitem (cidade, província ou país), sempre com o país, ex.: 'Rzeszów, Polônia'>",
 "quemDisse": [{"quem": "<nome da pessoa ou instituição>", "cargo": "<cargo e país, ex.: 'primeiro-ministro da Polônia'>", "disse": "<o que disse, resumido em 1 frase>", "literal": <true SÓ se essa frase exata aparece entre aspas numa matéria; senão false>, "fontes": [<índices das matérias>]}],
 "oQueAconteceu": "<2 a 4 parágrafos curtos separados por \\n\\n: o quê, onde, quando, quem está envolvido, antecedentes necessários>",
 "dataDoFato": "<AAAA-MM-DD em que o fato ocorreu, ou null se as matérias não deixam claro>",
 "dataDoFatoObs": "<explique se o fato é de hoje, de antes (só noticiado hoje) ou se não dá para saber>",
 "porQueImporta": "<1 a 2 parágrafos: por que este é o acontecimento geopolítico mais importante do dia; NÃO cite quantidade de fontes>",
 "cadeia": [{"passo": "<um elo da cadeia de efeitos, frase curta>", "camada": "<uma de: ${CAMADAS.join(', ')}>"}],
 "chegaEmVoce": {"tipo": "<um de: ${TIPOS_IMPACTO.join(', ')}>", "texto": "<como isso pode afetar o dia a dia no Brasil/São Paulo: preços, combustível, dólar, empregos, tecnologia...; diga claramente se é direto, indireto, risco potencial ou sem impacto imediato>"},
 "notas": {"geral": {"nota": <0-10>, "porque": "<1 frase>"}, "mundo": {"nota": <0-10>, "porque": "<1 frase>"}, "voce": {"nota": <0-10>, "porque": "<1 frase>"}},
 "afirmacoes": [{"tipo": "<um de: ${TIPOS_AFIRMACAO.join(', ')}>", "texto": "<afirmação curta>", "fontes": [<índices das matérias que sustentam>]}],
 "oQueNaoSabemos": "<o que ainda não está claro>",
 "oQueAcompanhar": ["<o que observar nos próximos dias>"]
}
A "cadeia" deve ter de 3 a 6 passos, do fato até o Brasil/você. A cadeia, "chegaEmVoce" e "emUmaFrase" precisam ser coerentes entre si. Efeito que as matérias não confirmam (ex.: alta de preço) deve ser descrito como risco potencial, com "pode", nunca como fato. Em "afirmacoes", coloque de 4 a 8 itens.
Cuidados (erros que já aconteceram):
- "fato" só quando pelo menos DUAS matérias de fontes diferentes dizem a mesma coisa. Com uma fonte só, use "nao_confirmado".
- Números de mortos, de armas destruídas ou de ataques ditos por um lado do conflito (governo, exército ou imprensa daquele país) são "alegacao", não "fato", a menos que fontes independentes confirmem.
- Copie os números exatamente como estão nas matérias (se a matéria diz "3 lançadores atingidos", não escreva "1 lançador destruído").
- Em "porQueImporta" e na "cadeia", não diga que algo JÁ está acontecendo (ex.: "já afeta o mercado de energia") se as matérias não dizem isso.
- Toda afirmação, inclusive "analise", precisa citar as matérias em que se apoia.`;

  const { resposta, provedor, modelo } = await perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 6000,
    validar: (r) => {
      for (const campo of ['titulo', 'emUmaFrase', 'oQueAconteceu', 'porQueImporta', 'oQueNaoSabemos']) {
        if (typeof r[campo] !== 'string' || !r[campo].trim()) throw new Error(`análise sem "${campo}"`);
      }
      for (const n of ['geral', 'mundo', 'voce']) {
        const nota = Number(r.notas?.[n]?.nota);
        if (!Number.isFinite(nota) || nota < 0 || nota > 10) throw new Error(`nota "${n}" inválida`);
        r.notas[n].nota = Math.round(nota);
      }
      if (!Array.isArray(r.cadeia) || r.cadeia.length < 2) throw new Error('cadeia curta demais');
      r.cadeia = r.cadeia.filter((c) => c.passo).map((c) => ({ passo: c.passo, camada: CAMADAS.includes(c.camada) ? c.camada : 'sociedade' }));
      if (!TIPOS_IMPACTO.includes(r.chegaEmVoce?.tipo)) r.chegaEmVoce = { tipo: 'indireto', texto: r.chegaEmVoce?.texto || '' };
      r.afirmacoes = (r.afirmacoes || [])
        .filter((a) => a.texto && TIPOS_AFIRMACAO.includes(a.tipo))
        .map((a) => ({ ...a, fontes: [...new Set((a.fontes || []).filter((i) => Number.isInteger(i) && i >= 0 && i < usadas.length))] }))
        // Garantia no código: "fato" com uma fonte só vira "não confirmado".
        .map((a) => (a.tipo === 'fato' && new Set(a.fontes.map((i) => usadas[i].fonte)).size < 2 ? { ...a, tipo: 'nao_confirmado' } : a))
        // Afirmação sem nenhuma matéria que a sustente fica de fora.
        .filter((a) => a.fontes.length);
      r.oQueAcompanhar = (r.oQueAcompanhar || []).filter(Boolean).slice(0, 5);
      if (r.dataDoFato && !/^\d{4}-\d{2}-\d{2}$/.test(r.dataDoFato)) r.dataDoFato = null;
      // Resumo de 30 segundos: opcional (sem ele, o app usa a 1ª frase de cada parte).
      const r30 = r.emTrintaSegundos || {};
      r.emTrintaSegundos = r30.oQue && r30.porQue && r30.voce ? { oQue: r30.oQue, porQue: r30.porQue, voce: r30.voce } : null;
      // Fatos rápidos, lugar no mapa e quem disse o quê: opcionais.
      const fr = r.fatosRapidos || {};
      r.fatosRapidos = fr.onde || fr.quando || fr.quem ? { onde: fr.onde || '', quando: fr.quando || '', quem: fr.quem || '' } : null;
      r.lugar = typeof r.lugar === 'string' ? r.lugar.trim() : '';
      r.quemDisse = (Array.isArray(r.quemDisse) ? r.quemDisse : [])
        .map((q) => ({ ...q, literal: q.literal === true, fontes: [...new Set((q.fontes || []).filter((i) => Number.isInteger(i) && i >= 0 && i < usadas.length))] }))
        .filter((q) => q.quem && q.disse && q.fontes.length) // sem matéria que confirme, não entra
        .slice(0, 4);
    },
  });

  // As fontes citadas vêm dos NOSSOS dados (nome, link, data), não da IA.
  const fontesUsadas = usadas.map((m) => ({
    id: m.fonte, fonte: m.fonteNome, pais: m.pais, visao: m.visao, estatal: m.estatal,
    titulo: m.titulo, link: m.link, publicadoEm: m.publicadoEm,
  }));
  return { analise: resposta, fontesUsadas, provedor, modelo };
}

// ---------- Etapa 3: como cada lado vê ----------
// Junta as matérias do destaque com notícias sobre o mesmo fato vindas de
// OUTROS países e linhas editoriais (buscadas nos últimos 3 dias) e pede à
// IA para mostrar como cada lado conta a história. Sem dar razão a ninguém.

async function comoCadaLadoVe(analise, fontesUsadas, palavras) {
  const outras = await buscarOutrasLinhas(palavras, {
    jaUsadas: fontesUsadas.map((f) => f.link),
    fontesVistas: fontesUsadas.map((f) => f.id),
    paisesVistos: fontesUsadas.map((f) => f.pais),
    dias: 3, maximo: 8, minimo: palavras.length >= 4 ? 2 : 1,
  });
  console.log(`  Outros olhares achados: ${outras.length} (${outras.map((n) => `${n.fonteNome}/${n.pais}`).join(', ') || 'nenhum'})`);
  const todas = [
    ...fontesUsadas,
    ...outras.map((n) => ({ id: n.fonte, fonte: n.fonteNome, pais: n.pais, visao: n.visao, estatal: n.estatal, titulo: n.titulo, link: n.link, publicadoEm: n.publicadoEm, resumo: n.resumo })),
  ];
  const texto = todas.map((m, i) =>
    `[${i}] ${m.fonte} (${m.pais}; linha: ${m.visao || 'sem descrição'}${m.estatal ? '; VEÍCULO ESTATAL' : ''}): ${m.titulo}. ${(m.resumo || '').slice(0, 300)}`).join('\n');

  const usuario = `O destaque do dia é: ${analise.titulo}
Resumo: ${analise.oQueAconteceu.slice(0, 1200)}

Matérias sobre ele, de vários países e linhas editoriais:
${texto}

Mostre COMO CADA LADO VÊ este acontecimento. JSON:
{"lados": [{"lado": "<quem é esse olhar, ex.: 'Governo e imprensa da Rússia', 'Polônia e aliados da OTAN', 'Imprensa da Ásia'>",
   "comoConta": "<como esse lado conta o fato, em 1 ou 2 frases>",
   "destaca": "<o que esse lado enfatiza>",
   "deixaDeFora": "<o que esse lado não menciona e outros mencionam; só se der para ver comparando as matérias; string vazia se não der>",
   "fontes": [<índices [n] das matérias desse lado>]}],
 "ondeConcordam": "<o que todos os lados aceitam (costuma ser o fato em si); string vazia se não houver>",
 "ondeDivergem": "<o ponto central em que as versões se separam; string vazia se não houver>",
 "faltaOlhar": "<se um lado importante do fato não aparece nas matérias (ex.: o governo acusado), diga qual; string vazia se todos aparecem>"}
Regras:
- Agrupe as matérias por olhar (país, governo, linha editorial), não por veículo. Mostre todos os olhares que existem de verdade nas matérias, nem mais nem menos: podem ser 2, podem ser 5. Nunca invente um lado sem matéria.
- Se todas as matérias contam do mesmo jeito, devolva "lados": [] e explique em "faltaOlhar" que não há outro olhar nas fontes.
- Apresente cada lado com equilíbrio, sem dar razão a nenhum e sem adjetivos de julgamento.
- Veículo estatal mostra a posição daquele governo, não um fato comprovado.
- Use só o que está nas matérias: não invente declarações nem omissões.`;

  const { resposta } = await perguntarIA({
    sistema: REGRAS,
    usuario,
    maxTokens: 3000,
    validar: (r) => {
      const ok = (i) => Number.isInteger(i) && i >= 0 && i < todas.length;
      r.lados = (Array.isArray(r.lados) ? r.lados : [])
        .map((l) => ({ ...l, fontes: [...new Set((l.fontes || []).filter(ok))] }))
        .filter((l) => l.lado && l.comoConta && l.fontes.length)
        .slice(0, 6);
      if (r.lados.length < 2) r.lados = []; // um lado só não é comparação
    },
  });
  // As fontes de cada lado vêm dos NOSSOS dados (nome, país, linha, link).
  return {
    lados: resposta.lados.map((l) => ({
      lado: l.lado, comoConta: l.comoConta, destaca: l.destaca || '', deixaDeFora: l.deixaDeFora || '',
      fontes: l.fontes.map((i) => ({ fonte: todas[i].fonte, pais: todas[i].pais, visao: todas[i].visao, estatal: todas[i].estatal, link: todas[i].link })),
    })),
    ondeConcordam: resposta.lados.length ? resposta.ondeConcordam || '' : '',
    ondeDivergem: resposta.lados.length ? resposta.ondeDivergem || '' : '',
    faltaOlhar: resposta.faltaOlhar || '',
  };
}

// ---------- Programa principal ----------

async function principal() {
  const agora = new Date();
  const hojeData = dataBrasilia(agora);

  if (!temIA()) {
    console.log('Nenhuma chave de IA configurada (GROQ_API_KEY ou OPENROUTER_API_KEY). Análise não executada.');
    const atual = await lerJson('data/app/analise.json', null);
    if (!atual) await gravarJson('data/app/analise.json', { status: 'sem-chave', geradoEm: agora.toISOString() });
    return;
  }

  // Destaque TRAVADO: se o destaque de hoje já saiu, ele fica até amanhã,
  // como a capa de um jornal. Só muda se alguém pedir "refazer o destaque".
  const jaTemHoje = (await lerJson(`data/analises/${hojeData}.json`, { versoes: [] })).versoes.length > 0;
  if (jaTemHoje && process.env.REFAZER_DESTAQUE !== 'sim') {
    console.log(`O destaque de ${hojeData} já saiu e está travado. Nada a fazer (para refazer, use "refazer o destaque").`);
    return;
  }

  const hoje = await lerJson('data/noticias/hoje.json', null);
  if (!hoje) throw new Error('data/noticias/hoje.json não existe: rode a coleta antes.');

  const lista = candidatos(hoje);
  console.log(`Candidatos confirmados: ${lista.length}`);
  if (lista.length === 0) throw new Error('nenhum fato confirmado por duas fontes nas últimas 24 h');

  console.log('1/2 Escolhendo o destaque…');
  const selecao = await selecionar(lista);
  const destaque = lista[selecao.resposta.destaque.indice];
  console.log(`  Destaque: ${selecao.resposta.destaque.tituloPt}`);

  await esperar(65000); // respeita o limite de uso por minuto do plano gratuito
  console.log('2/2 Analisando o destaque…');
  const { analise, fontesUsadas, provedor, modelo } = await analisar(destaque, hojeData);

  // Etapa 3 (opcional): se falhar, o destaque sai do mesmo jeito, sem os lados.
  let lados = null;
  try {
    await esperar(65000);
    console.log('3/3 Como cada lado vê…');
    lados = await comoCadaLadoVe(analise, fontesUsadas, selecao.resposta.destaque.palavras || []);
    console.log(`  Lados: ${lados.lados.map((l) => l.lado).join(' | ') || 'nenhum'}`);
  } catch (erro) {
    console.log(`  Como cada lado vê ficou de fora: ${erro.message}`);
  }

  const edicao = {
    status: 'ok',
    geradoEm: agora.toISOString(),
    dataReferencia: hojeData,
    fuso: FUSO,
    ia: { provedor, modelo, aviso: 'Análise gerada por IA a partir das matérias listadas. Pode conter erros: confira nas fontes.' },
    destaque: {
      fatoId: destaque.id,
      regioes: destaque.regioes,
      temas: destaque.temas,
      imagem: (destaque.materias.find((m) => m.imagem) || {}).imagem || '',
      credito: (destaque.materias.find((m) => m.imagem) || {}).fonteNome || '',
      criterio: selecao.resposta.destaque.criterio || '',
      ...analise,
      fontesUsadas,
      comoCadaLadoVe: lados,
    },
    tambemImporta: selecao.resposta.tambemImporta.map((t) => {
      const f = lista[t.indice];
      const comImagem = f.materias.find((m) => m.imagem);
      return {
        fatoId: f.id, tituloPt: t.tituloPt, porQueImporta: t.porQueImporta || '',
        regioes: f.regioes, temas: f.temas, imagem: comImagem?.imagem || '', credito: comImagem?.fonteNome || '',
        // As matérias ficam guardadas junto, para a edição poder ser relida
        // no histórico mesmo depois que a notícia sair do "hoje".
        resumo: (f.materias.find((m) => m.resumo) || {}).resumo || '',
        materias: [...new Map(f.materias.map((m) => [m.link, m])).values()].slice(0, 8).map((m) => ({
          fonte: m.fonteNome, pais: m.pais, visao: m.visao, estatal: m.estatal, tipo: m.tipo,
          titulo: m.titulo, link: m.link, publicadoEm: m.publicadoEm,
        })),
      };
    }),
  };

  // Arquivo do dia com TODAS as versões (a primeira nunca é apagada).
  const doDia = await lerJson(`data/analises/${hojeData}.json`, { data: hojeData, versoes: [] });
  doDia.versoes.push(edicao);
  await gravarJson(`data/analises/${hojeData}.json`, doDia);
  await gravarJson('data/app/analise.json', { ...edicao, versao: doDia.versoes.length });

  // Índice das edições (para a tela "Edições anteriores").
  const indice = await lerJson('data/app/edicoes.json', { edicoes: [] });
  indice.edicoes = indice.edicoes.filter((e) => e.data !== hojeData);
  indice.edicoes.unshift({
    data: hojeData,
    titulo: analise.titulo,
    regiao: destaque.regioes[0],
    imagem: edicao.destaque.imagem,
    notas: { geral: analise.notas.geral.nota, mundo: analise.notas.mundo.nota, voce: analise.notas.voce.nota },
    outros: edicao.tambemImporta.map((t) => t.tituloPt),
  });
  indice.edicoes.sort((a, b) => b.data.localeCompare(a.data));
  await gravarJson('data/app/edicoes.json', indice);

  console.log(`Análise gravada (versão ${doDia.versoes.length} do dia, via ${provedor} / ${modelo}).`);
}

principal().catch(async (erro) => {
  console.error('A análise falhou:', erro.message);
  // Mantém a última análise boa; só registra o problema para o app avisar.
  const atual = await lerJson('data/app/analise.json', {});
  const ultimoErro = { em: new Date().toISOString(), mensagem: erro.message };
  await gravarJson('data/app/analise.json', { ...atual, ultimoErro });
  // analise.json não vai para o repositório (é montado na publicação); o erro vai
  // num arquivo pequeno, que o montador junta de volta (coletor/montar-app.mjs).
  await gravarJson('data/app/situacao.json', { ultimoErro });
  process.exit(1);
});
