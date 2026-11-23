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

const PEDIDO = (fontes, texto, suspeitos, extra) => `Você é o REVISOR do Onda. Outra IA escreveu o texto abaixo a partir das fontes. Seu trabalho é conferir, afirmação por afirmação, se o texto está fiel às fontes e se é verossímil.

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
- brasil_forcado: ligação com o Brasil que as fontes não sustentam.
${extra}
Responda em JSON:
{"conferidas": <quantas afirmações você conferiu no total>,
 "problemas": [{"onde": "<o endereço exato, ex.: oQueAconteceu, afirmacoes[2], cadeia[3]>", "trecho": "<o trecho EXATO, copiado do texto, que tem o problema>", "tipo": "<um de: ${TIPOS.join(', ')}>", "explicacao": "<1 frase: o que está errado>", "correcao": "<o trecho corrigido, fiel às fontes; ou string vazia para tirar o trecho>"}]}
Se estiver tudo certo, "problemas": []. Nunca acrescente fatos novos na correção: só corrija, suavize ("pode", "segundo X") ou tire.`;

async function revisar({ fontes, partes, suspeitos, extra = '', alvo, listas }) {
  const texto = partes.map(([onde, valor]) => `[${onde}] ${valor}`).join('\n');
  const { resposta } = await perguntarIA({
    sistema: 'Você é um revisor rigoroso e justo. Responda apenas com JSON válido.',
    usuario: PEDIDO(fontes, texto, suspeitos, extra),
    maxTokens: 3000,
    validar: (r) => { if (!Array.isArray(r.problemas)) throw new Error('revisão sem "problemas"'); },
  });
  const problemas = resposta.problemas.filter((p) => TIPOS.includes(p.tipo) && p.onde);
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
    ...(aula.voceSabia || []).map((v, i) => [`voceSabia[${i}]`, v]),
    ...(aula.mitos || []).map((m, i) => [`mitos[${i}]`, `Mito: ${m.mito} | Verdade: ${m.verdade}`]),
    ...(aula.cadeia || []).map((c, i) => [`cadeia[${i}]`, c.passo]),
    ['chegaEmVoce.texto', aula.chegaEmVoce?.texto],
    ...(aula.vertentes || []).map((v, i) => [`vertentes[${i}]`, `${v.nome} — pensa: ${v.pensa} — quem defende: ${v.quemDefende}`]),
  ].filter(([, v]) => v);
  const fontes = trechosLigados(partes.map(([, v]) => v).join(' '), textoDasFontes, 7000);
  const r = await revisar({
    fontes, partes, suspeitos: [], alvo: aula,
    listas: { mitos: 'verdade', cadeia: 'passo', vertentes: 'pensa' },
    extra: '- Nas vertentes, confira também se o nome, o que pensa e quem defende são da MESMA visão.',
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
