// =============================================================
// revisor.mjs — Confere se o TEXTO da IA está fiel às fontes.
//
// Quem escreve não é quem revisa. Depois que a IA escreve o destaque
// (ou a aula do tema), o robô confere em duas etapas:
//   1. Sem IA: todo número e toda data do texto aparece nas fontes?
//      O que não aparece vira "suspeito".
//   2. Uma segunda IA, no papel de revisor, recebe as fontes e o texto
//      e aponta: afirmação sem fonte, número errado, exagero,
//      contradição ou coisa pouco verossímil, já com a correção.
// As correções são aplicadas sozinhas, sempre do jeito mais cauteloso:
// o que tem fonte mas parece estranho fica, marcado "não confirmado".
// O app mostra o resultado no selo de checagem.
// =============================================================

import { perguntarIA } from './ia.mjs';

const TIPOS = ['sem_fonte', 'numero_errado', 'exagero', 'contradicao', 'implausivel', 'brasil_forcado'];

/** Os números de um texto (ex.: "400", "2,5", "1949"), sem pontuação. */
const numeros = (texto) => [...new Set((String(texto || '').match(/\d+(?:[.,]\d+)?/g) || []).filter((n) => n.length >= 2 || Number(n) >= 10))];

/** Números do texto que NÃO aparecem nas fontes. */
export function numerosSuspeitos(texto, fontesTexto) {
  const fontes = String(fontesTexto || '').replace(/(\d)[.\s](?=\d{3}\b)/g, '$1'); // "1.200" = "1200"
  return numeros(texto).filter((n) => !fontes.includes(n.replace(/(\d)[.](?=\d{3}\b)/g, '$1')) && !fontes.includes(n.replace(',', '.')));
}

/** Pega e troca um valor por "endereço" (ex.: "afirmacoes[2].texto"). */
function pegar(obj, caminho) {
  return caminho.split('.').reduce((o, parte) => {
    const m = parte.match(/^(\w+)\[(\d+)\]$/);
    return o == null ? o : m ? o[m[1]]?.[Number(m[2])] : o[parte];
  }, obj);
}

/**
 * Aplica as correções do revisor no objeto. Devolve o que foi mudado.
 * `listas` diz quais campos são listas de itens que podem sair inteiros
 * (ex.: afirmacoes, cadeia) e qual o campo de texto de cada item.
 */
function aplicar(obj, problemas, listas) {
  const feitos = [];
  const remover = {}; // campo -> índices a tirar (tirados no fim, para não bagunçar os índices)
  for (const p of problemas) {
    const onde = String(p.onde || '').trim();
    const m = onde.match(/^(\w+)\[(\d+)\]/);
    const antes = String(p.trecho || '').trim();
    const depois = typeof p.correcao === 'string' ? p.correcao.trim() : '';
    if (m && Array.isArray(obj[m[1]])) {
      // Item de uma lista (afirmação, passo da cadeia, citação, curiosidade...)
      const [campo, i] = [m[1], Number(m[2])];
      const item = obj[campo][i];
      if (item == null) continue;
      const chave = listas[campo] || 'texto';
      const atual = typeof item === 'string' ? item : String(item[chave] ?? '');
      // Troca só o trecho, se ele estiver no texto; senão, o texto todo
      const sem = (s) => s.replace(/^\(\w+\)\s*/, ''); // "(fato) ..." vira "..."
      const novo = depois ? (antes && atual.includes(sem(antes)) ? atual.replace(sem(antes), sem(depois)) : sem(depois)) : '';
      if (p.tipo === 'implausivel' && campo === 'afirmacoes') {
        item.tipo = 'nao_confirmado'; // tem fonte mas parece estranho: fica, marcado
      } else if (!novo) {
        (remover[campo] ||= new Set()).add(i);
      } else if (typeof item === 'string') {
        obj[campo][i] = novo;
      } else {
        item[chave] = novo;
      }
      const marcado = p.tipo === 'implausivel' && campo === 'afirmacoes';
      feitos.push({ onde, tipo: p.tipo, explicacao: p.explicacao || '', antes: atual, depois: marcado ? '(marcado como não confirmado)' : novo || '(removido)' });
    } else {
      // Trecho dentro de um texto corrido: troca só o trecho
      const campo = onde.split(/[.[]/)[0];
      const texto = pegar(obj, onde) ?? obj[campo];
      if (typeof texto !== 'string' || !antes || !texto.includes(antes)) continue;
      const novo = texto.replace(antes, depois).replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
      if (onde.includes('.')) {
        const partes = onde.split('.');
        const pai = pegar(obj, partes.slice(0, -1).join('.'));
        if (pai) pai[partes.at(-1)] = novo;
      } else obj[campo] = novo;
      feitos.push({ onde, tipo: p.tipo, explicacao: p.explicacao || '', antes, depois: depois || '(removido)' });
    }
  }
  for (const [campo, indices] of Object.entries(remover)) obj[campo] = obj[campo].filter((_, i) => !indices.has(i));
  return feitos;
}

const hojeBrasilia = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

const PEDIDO = (fontes, texto, suspeitos, extra) => `Você é o REVISOR do Onda. Outra IA escreveu o texto abaixo a partir das fontes. Seu trabalho é conferir, afirmação por afirmação, se o texto está fiel às fontes e se é verossímil.

ATENÇÃO: hoje é ${hojeBrasilia()}. Muitos fatos são MAIS NOVOS que o seu conhecimento. NUNCA corrija um número, uma data, um nome ou um cargo usando o que você sabe ou lembra: só corrija quando AS FONTES abaixo disserem outra coisa. Se algo parecer estranho mas as fontes disserem isso, não troque (no máximo marque como "implausivel"). Ex.: se as fontes dizem que a COP31 foi em novembro de 2026, ela foi em novembro de 2026.

FONTES:
${fontes}

TEXTO ESCRITO PELA OUTRA IA (cada parte com seu endereço entre colchetes):
${texto}
${suspeitos.length ? `\nNúmeros do texto que NÃO aparecem nas fontes (confira com atenção): ${suspeitos.join(', ')}` : ''}

Aponte só problemas REAIS:
- sem_fonte: afirmação que as fontes não sustentam;
- numero_errado: número, data ou nome diferente do que está nas fontes;
- exagero: diz que algo JÁ acontece, ou é certo, quando as fontes falam em possibilidade (ou nem falam);
- contradicao: o texto se contradiz;
- implausivel: algo pouco verossímil (data impossível, cargo trocado, número absurdo), mesmo que pareça estar nas fontes;
- brasil_forcado: ligação com o Brasil que as fontes não sustentam. ATENÇÃO: dizer que NÃO há efeito no Brasil (ex.: "não altera a rotina no Brasil agora") NÃO é problema; não marque.
${extra}
Responda em JSON:
{"conferidas": <quantas afirmações você conferiu no total>,
 "problemas": [{"onde": "<o endereço exato, ex.: oQueAconteceu, afirmacoes[2], cadeia[3]>", "trecho": "<o trecho EXATO, copiado do texto, que tem o problema>", "tipo": "<um de: ${TIPOS.join(', ')}>", "explicacao": "<1 frase: o que está errado>", "correcao": "<o trecho corrigido, fiel às fontes; ou string vazia para tirar o trecho>"}]}
Se estiver tudo certo, "problemas": []. Nunca acrescente fatos novos na correção: só corrija, suavize ("pode", "segundo X") ou tire.`;

// Partes que nunca somem: se o revisor quiser tirar, entra um texto neutro.
const PROTEGIDAS = {
  'emTrintaSegundos.voce': 'Por enquanto, as fontes não apontam efeito direto no Brasil.',
  'chegaEmVoce.texto': 'Por enquanto, as fontes não apontam efeito direto no Brasil.',
};

/**
 * Travas no código (revisão de 24/11, quando o revisor trocou "2026" por
 * "2023" usando a própria memória):
 *  - correção que traz um número que não está nas fontes nem no trecho
 *    original é recusada;
 *  - partes protegidas não somem: viram um texto neutro.
 */
function filtrarCorrecoes(problemas, fontes) {
  return problemas.map((p) => {
    const correcao = typeof p.correcao === 'string' ? p.correcao : '';
    const novos = numerosSuspeitos(correcao, `${fontes}\n${p.trecho || ''}`);
    if (novos.length) {
      console.log(`  Correção recusada (número ${novos.join(', ')} não está nas fontes): ${p.onde}`);
      return null;
    }
    if (!correcao.trim() && PROTEGIDAS[p.onde]) return { ...p, trecho: p.trecho, correcao: PROTEGIDAS[p.onde] };
    return p;
  }).filter(Boolean);
}

async function revisar({ fontes, partes, suspeitos, extra = '', alvo, listas }) {
  const texto = partes.map(([onde, valor]) => `[${onde}] ${valor}`).join('\n');
  const { resposta } = await perguntarIA({
    sistema: 'Você é um revisor rigoroso e justo. Responda apenas com JSON válido.',
    usuario: PEDIDO(fontes, texto, suspeitos, extra),
    maxTokens: 3000,
    validar: (r) => { if (!Array.isArray(r.problemas)) throw new Error('revisão sem "problemas"'); },
  });
  const problemas = filtrarCorrecoes(resposta.problemas.filter((p) => TIPOS.includes(p.tipo) && p.onde), fontes);
  const feitos = aplicar(alvo, problemas, listas);
  return { conferidas: Number(resposta.conferidas) || partes.length, corrigidas: feitos.length, itens: feitos.slice(0, 12), em: new Date().toISOString() };
}

// ---------- Destaque ----------

/** Revisa a análise do destaque (muda `analise` no lugar). */
export async function revisarDestaque(analise, usadas) {
  const fontes = usadas.map((m, i) => `[${i}] ${m.fonteNome || m.fonte} (${m.pais}): ${m.titulo}. ${(m.resumo || '').slice(0, 350)}`).join('\n');
  const partes = [
    ['titulo', analise.titulo],
    ['oQueAconteceu', analise.oQueAconteceu],
    ['porQueImporta', analise.porQueImporta],
    ...Object.entries(analise.emTrintaSegundos || {}).map(([k, v]) => [`emTrintaSegundos.${k}`, v]),
    ['emUmaFrase', analise.emUmaFrase],
    ...analise.cadeia.map((c, i) => [`cadeia[${i}]`, c.passo]),
    ['chegaEmVoce.texto', analise.chegaEmVoce?.texto],
    ...analise.afirmacoes.map((a, i) => [`afirmacoes[${i}]`, `(${a.tipo}) ${a.texto}`]),
    ...(analise.quemDisse || []).map((q, i) => [`quemDisse[${i}]`, `${q.quem}: ${q.disse}`]),
  ].filter(([, v]) => v);
  const todoTexto = partes.map(([, v]) => v).join(' ');
  const suspeitos = numerosSuspeitos(todoTexto, fontes);
  // As listas guardam o texto em campos diferentes
  const listas = { afirmacoes: 'texto', cadeia: 'passo', quemDisse: 'disse' };
  return revisar({ fontes, partes, suspeitos, alvo: analise, listas });
}

// ---------- Tema ----------

/**
 * Revisa a aula do tema. Primeiro sem IA: números e datas da aula que não
 * estão nos artigos saem; depois a IA revisa as partes curtas e mais
 * arriscadas (curiosidades, mitos, ligação com o Brasil, vertentes).
 */
export async function revisarTema(aula, textoDasFontes) {
  const feitos = [];
  // 1. Números da caixa de números e datas da linha do tempo
  aula.numeros = (aula.numeros || []).filter((n) => {
    const ok = !numerosSuspeitos(n.valor, textoDasFontes).length;
    if (!ok) feitos.push({ onde: 'numeros', tipo: 'numero_errado', explicacao: 'número não encontrado nas fontes', antes: `${n.valor}: ${n.significado}`, depois: '(removido)' });
    return ok;
  });
  aula.linhaDoTempo = (aula.linhaDoTempo || []).filter((l) => {
    const anos = String(l.quando).match(/\b\d{3,4}\b/g) || [];
    const ok = anos.every((a) => textoDasFontes.includes(a));
    if (!ok) feitos.push({ onde: 'linhaDoTempo', tipo: 'numero_errado', explicacao: 'data não encontrada nas fontes', antes: `${l.quando}: ${l.oQue}`, depois: '(removido)' });
    return ok;
  });
  aula.voceSabia = (aula.voceSabia || []).filter((v) => {
    const ok = !numerosSuspeitos(v, textoDasFontes).length;
    if (!ok) feitos.push({ onde: 'voceSabia', tipo: 'numero_errado', explicacao: 'número da curiosidade não está nas fontes', antes: v, depois: '(removido)' });
    return ok;
  });

  // 2. A IA revisa o resto (com trechos das fontes que tocam nos mesmos assuntos)
  const partes = [
    ['emUmaFrase', aula.emUmaFrase],
    ...(aula.mitos || []).map((m, i) => [`mitos[${i}]`, `Mito: ${m.mito} | Verdade: ${m.verdade}`]),
    ...(aula.cadeia || []).map((c, i) => [`cadeia[${i}]`, c.passo]),
    ['chegaEmVoce.texto', aula.chegaEmVoce?.texto],
    ...(aula.vertentes || []).map((v, i) => [`vertentes[${i}]`, `${v.nome} — pensa: ${v.pensa} — quem defende: ${v.quemDefende}`]),
  ].filter(([, v]) => v);
  const fontes = trechosLigados(partes.map(([, v]) => v).join(' '), textoDasFontes, 7000);
  const r = await revisar({
    fontes, partes, suspeitos: [], alvo: aula,
    listas: { mitos: 'verdade', cadeia: 'passo', vertentes: 'pensa' },
    extra: '- Nas vertentes, confira também se o nome, o que pensa e quem defende são da MESMA visão.\n- As FONTES acima são só TRECHOS dos artigos: se você não achar algo nelas, NÃO marque "sem_fonte" (pode estar em outro trecho). Marque só contradição clara, exagero, implausível ou Brasil forçado.',
  });
  return { conferidas: r.conferidas + feitos.length, corrigidas: r.corrigidas + feitos.length, itens: [...feitos, ...r.itens].slice(0, 12), em: r.em };
}

/** Os parágrafos das fontes que mais tocam nas palavras do texto (para caber no limite da IA). */
function trechosLigados(texto, fontes, limite) {
  const palavras = new Set((texto.toLowerCase().match(/[a-zà-ú0-9]{5,}/g) || []));
  const paragrafos = fontes.split(/\n+/).filter((p) => p.trim().length > 40);
  const pontuados = paragrafos.map((p) => ({ p, n: (p.toLowerCase().match(/[a-zà-ú0-9]{5,}/g) || []).filter((w) => palavras.has(w)).length }));
  pontuados.sort((a, b) => b.n - a.n);
  let saida = '';
  for (const { p } of pontuados) {
    if (saida.length + p.length > limite) break;
    saida += `${p.trim()}\n`;
  }
  return saida;
}

// ---------- Tema: conferência FORA da Wikipedia ----------

/**
 * Confere os dados da aula (que vêm da Wikipedia) em fontes de referência
 * de fora: sites oficiais, centros de análise, ONU, Factbook, jornais.
 * Cada dado ganha um carimbo:
 *   confirmado  outra fonte diz o mesmo (guarda qual fonte);
 *   divergente  outra fonte diz diferente (guarda o que ela diz; a aula
 *               mostra as duas versões, sem apagar nada);
 *   sem_mencao  as outras fontes não falam disso.
 */
export async function conferirFora(aula, externas) {
  // Os dados conferidos: números, datas, fatos rápidos, curiosidades e mitos
  const dados = [
    ...(aula.numeros || []).map((n, i) => [`numeros[${i}]`, `${n.valor}: ${n.significado}`]),
    ...(aula.linhaDoTempo || []).map((l, i) => [`linhaDoTempo[${i}]`, `${l.quando}: ${l.oQue}`]),
    ...(aula.fatosRapidos || []).map((f, i) => [`fatosRapidos[${i}]`, `${f.rotulo}: ${f.valor}`]),
    ...(aula.voceSabia || []).map((v, i) => [`voceSabia[${i}]`, v]),
    ...(aula.mitos || []).map((m, i) => [`mitos[${i}]`, `${m.verdade}`]),
  ];
  if (!dados.length) return { confirmados: 0, divergentes: 0, semMencao: 0, fontes: [] };

  // Só os parágrafos das fontes que tocam nos mesmos assuntos (cabe no limite da IA)
  const porFonte = Math.floor(6500 / externas.length);
  const texto = externas.map((f, i) => `[F${i}] ${f.nome}:\n${trechosLigados(dados.map(([, d]) => d).join(' '), f.texto, porFonte)}`).join('\n\n');

  const { resposta } = await perguntarIA({
    sistema: 'Você é um checador de fatos rigoroso e justo. Responda apenas com JSON válido.',
    usuario: `Os DADOS abaixo vêm da Wikipedia. Confira cada um nas FONTES DE FORA da Wikipedia.

FONTES DE FORA:
${texto}

DADOS (cada um com seu endereço):
${dados.map(([onde, d]) => `[${onde}] ${d}`).join('\n')}

Para CADA dado, diga:
- "confirmado": alguma fonte de fora diz o mesmo (pode ser com outras palavras; números arredondados contam);
- "divergente": alguma fonte de fora diz algo DIFERENTE (outro número, outra data, outro fato);
- "sem_mencao": as fontes de fora não falam disso.
JSON: {"dados": [{"onde": "<endereço>", "status": "<confirmado | divergente | sem_mencao>", "fonte": "<F0, F1... a fonte que confirma ou diverge; vazio se sem_mencao>", "diz": "<se divergente: o que a fonte de fora diz, em 1 frase curta; senão vazio>"}]}
Seja rigoroso: só marque "confirmado" se a fonte de fora realmente disser aquilo.`,
    maxTokens: 3000,
    validar: (r) => { if (!Array.isArray(r.dados)) throw new Error('conferência sem "dados"'); },
  });

  const conta = { confirmado: 0, divergente: 0, sem_mencao: 0 };
  const divergencias = [];
  for (const d of resposta.dados) {
    const m = String(d.onde || '').match(/^(\w+)\[(\d+)\]$/);
    if (!m || !['confirmado', 'divergente', 'sem_mencao'].includes(d.status)) continue;
    const [campo, i] = [m[1], Number(m[2])];
    if (aula[campo]?.[i] == null) continue;
    conta[d.status] += 1;
    const fonte = externas[Number(String(d.fonte || '').replace(/\D/g, ''))];
    const marca = { status: d.status, fonte: fonte?.nome || '', link: fonte?.url || '', diz: d.status === 'divergente' ? String(d.diz || '') : '' };
    // "Você sabia?" é uma lista de textos: a marca fica numa lista ao lado
    if (typeof aula[campo][i] === 'string') ((aula[`${campo}Checagem`] ||= [])[i] = marca);
    else aula[campo][i].checagem = marca;
    if (d.status === 'divergente') divergencias.push({ onde: d.onde, dado: dados.find(([o]) => o === d.onde)?.[1] || '', ...marca });
  }
  return {
    confirmados: conta.confirmado,
    divergentes: conta.divergente,
    semMencao: conta.sem_mencao,
    total: dados.length,
    fontes: externas.map((f) => ({ nome: f.nome, link: f.url })),
    divergencias: divergencias.slice(0, 8),
  };
}
