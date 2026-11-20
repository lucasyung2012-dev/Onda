// =============================================================
// telas.js — Monta o HTML de cada tela.
//
// Cada função recebe dados e devolve um texto HTML. Quem decide
// QUANDO e ONDE mostrar é o app.js. Aqui fica só COMO cada tela é.
// =============================================================

import { esc, tempoRelativo, dataHora, hora, dataPorExtenso, dataCurta, numero, corRegiao, semAcento } from './util.js';
import { GRUPOS } from './biblioteca.js';

// ---------- Nomes bonitos ----------

const CAMADAS = {
  economia: 'Economia', precos: 'Preços', energia: 'Energia', politica: 'Política', seguranca: 'Segurança',
  tecnologia: 'Tecnologia', midia: 'Mídia', sociedade: 'Sociedade', brasil: 'Brasil',
};
const IMPACTO = {
  direto: 'Impacto direto', indireto: 'Impacto indireto', risco: 'Risco potencial', nenhum: 'Sem impacto imediato',
};
const AFIRMACAO = {
  fato: 'Fato confirmado', declaracao: 'Declaração oficial', alegacao: 'Alegação', nao_confirmado: 'Não confirmado', analise: 'Análise',
};
// Cor de cada tema na aba Explorar
const COR_TEMA = {
  conflitos: '#C2554F', diplomacia: '#4F86C6', economia: '#2E9E5B', energia: '#D98B3A', politica: '#8A7FD1',
  tecnologia: '#1FA594', clima: '#5A9E3A', direitos: '#C2557A', midia: '#B07ACC', saude: '#3FA3C9', outros: '#6B7F92',
};

// ---------- Peças reaproveitadas ----------

/**
 * Imagem com crédito. Sem foto (ou se a foto falhar), aparece uma
 * ilustração na cor da região. Nunca usamos foto inventada.
 * A foto entra com um "fade" quando termina de carregar.
 */
function imagem({ url, credito, regiao, nomeRegiao, classe = '', comCredito = true }) {
  const foto = url
    ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('carregou')" onerror="this.remove()">`
      + (comCredito && credito ? `<span class="credito">Foto: ${esc(credito)}</span>` : '')
    : '';
  return `<div class="imagem ${classe}" style="--cor:${corRegiao(regiao)}"><span class="sem-foto">${esc(nomeRegiao || 'Mundo')}</span>${foto}</div>`;
}

function etiquetaRegiao(regiao, dados, extra = '') {
  return `<span class="etiqueta regiao ${extra}" style="--cor:${corRegiao(regiao)}">${esc(dados.nomesRegioes[regiao] || regiao)}</span>`;
}
function etiquetaTema(tema, dados, extra = '') {
  if (!tema || tema === 'outros') return '';
  return `<span class="etiqueta ${extra}">${esc(dados.nomesTemas[tema] || tema)}</span>`;
}

/** Cabeçalho comum das telas */
function cabecalho(rotulo, titulo, subtitulo = '', classeRotulo = '') {
  return `
    <p class="rotulo ${classeRotulo}">${rotulo}</p>
    <h1 class="titulo-tela">${titulo}</h1>
    ${subtitulo ? `<p class="subtitulo">${subtitulo}</p>` : ''}`;
}

/** Linha de uma lista de fatos (Explorar, busca, gavetas). */
function itemFato(fato, dados, i) {
  return `
    <li style="--i:${Math.min(i, 10)}">
      <button class="item" type="button" data-fato="${esc(fato.id)}">
        <div>
          <h3>${esc(fato.titulo)}</h3>
          <div class="meta">
            <span class="${fato.fontes > 1 ? 'forte' : ''}">${fato.fontes > 1 ? `${fato.fontes} fontes` : esc(fato.materias[0].fonte)}</span>
            <span>·</span><span>${esc(dados.nomesRegioes[fato.regioes[0]] || '')}</span>
            <span>·</span><span>${tempoRelativo(fato.maisRecente)}</span>
          </div>
        </div>
        ${imagem({ url: fato.imagem, regiao: fato.regioes[0], nomeRegiao: dados.nomesRegioes[fato.regioes[0]], comCredito: false })}
      </button>
    </li>`;
}

export function listaDeFatos(fatos, dados, limite) {
  if (!fatos.length) return '<p class="vazio">Nada por aqui.</p>';
  const resto = fatos.length - limite;
  return `
    <ul class="lista cascata">${fatos.slice(0, limite).map((f, i) => itemFato(f, dados, i)).join('')}</ul>
    ${resto > 0 ? `<button class="botao largo mais" type="button" data-mais>Mostrar mais (${numero(resto)})</button>` : ''}`;
}

// ---------- HOJE ----------

export function telaHoje(analise, dados) {
  const topo = cabecalho('Radar de hoje', esc(dataPorExtenso(dados.dataReferencia)),
    `${numero(dados.totalNoticias)} notícias de ${dados.totalFontes} fontes · atualizado às ${hora(dados.geradoEm)}`);

  const temAnalise = analise && analise.status === 'ok' && analise.destaque;
  const atalhos = `
    <div class="atalhos cascata">
      <a class="atalho" href="#explorar" style="--i:1"><strong>${numero(dados.fatos.length)}</strong><span>fatos para explorar por região, assunto ou fonte</span></a>
      <a class="atalho tema" href="#temas" style="--i:2"><span>Tema do dia</span><strong style="font-size:17px">Biblioteca de temas</strong></a>
    </div>`;

  if (!temAnalise) return `<div class="tela">${topo}${semAnalise(analise, dados)}<div class="secao">${atalhos}</div></div>`;

  const d = analise.destaque;
  const deOutroDia = analise.dataReferencia !== dados.dataReferencia;
  const rotuloCapa = deOutroDia ? `Destaque de ${dataCurta(analise.dataReferencia)}` : 'Destaque do dia';
  const regiao = d.regioes[0];

  return `
    <div class="tela">
      ${topo}
      <div class="hoje-grade" style="margin-top:18px">
        <div class="secao">
          <a class="capa" href="#analise">
            ${imagem({ url: d.imagem, credito: d.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao] })}
            <div class="capa-texto">
              <p class="rotulo">${rotuloCapa}</p>
              <div class="etiquetas">${etiquetaRegiao(regiao, dados, 'sobre-foto')}${etiquetaTema(d.temas[0], dados, 'sobre-foto')}</div>
              <h2>${esc(d.titulo)}</h2>
            </div>
          </a>
          ${notas(d.notas)}
          <div class="uma-frase">
            <p class="rotulo ouro">Como chega em você</p>
            <p>${esc(d.emUmaFrase)}</p>
          </div>
          <a class="botao principal largo" href="#analise" style="margin-top:14px">Ler a análise completa <span class="icone i-seta" aria-hidden="true"></span></a>
          <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>Análise feita por IA às ${hora(analise.geradoEm)} a partir de ${d.fontesUsadas.length} matérias. Confira nas fontes.</p>
        </div>
        <div class="secao">
          <div class="secao-cabeca"><h2>Também importa hoje</h2></div>
          <div class="importa cascata">
            ${analise.tambemImporta.map((t, i) => cartaoImporta(t, i + 2, dados)).join('')}
          </div>
          <div class="secao" style="margin-top:22px">${atalhos}</div>
        </div>
      </div>
    </div>`;
}

function notas(n) {
  const caixa = (chave, rotulo, classe = '') => `
    <div class="nota ${classe}">
      <strong>${n[chave].nota}</strong><span>${rotulo}</span>
      <div class="barra"><i style="--n:${n[chave].nota}"></i></div>
    </div>`;
  return `<div class="notas">${caixa('geral', 'Importância')}${caixa('mundo', 'No mundo')}${caixa('voce', 'Em você', 'voce')}</div>`;
}

function cartaoImporta(t, numeroItem, dados) {
  return `
    <button class="cartao-importa" type="button" data-fato="${esc(t.fatoId)}" style="--i:${numeroItem}">
      <span class="numero">${numeroItem}</span>
      <div>
        <h3>${esc(t.tituloPt)}</h3>
        <p>${esc(t.porQueImporta)}</p>
      </div>
      ${imagem({ url: t.imagem, regiao: t.regioes[0], nomeRegiao: dados.nomesRegioes[t.regioes[0]], comCredito: false })}
    </button>`;
}

/** Quando ainda não há análise (sem chave da IA ou falha): explica e mostra os fatos confirmados. */
function semAnalise(analise, dados) {
  const motivo = !analise || analise.status === 'sem-chave'
    ? 'A análise automática começa assim que a chave gratuita da IA for configurada no GitHub.'
    : `A análise de hoje ainda não ficou pronta${analise?.ultimoErro ? ' (o robô registrou um problema e tenta de novo amanhã às 7h)' : ''}.`;
  const confirmados = dados.fatos.filter((f) => f.fontes >= 2 && f.temas[0] !== 'outros').slice(0, 5);
  return `
    <div class="cartao sem-analise" style="margin-top:18px">
      <p class="rotulo ouro">Destaque do dia</p>
      <h2>A análise do dia ainda não chegou</h2>
      <p>${motivo}</p>
    </div>
    <div class="secao">
      <div class="secao-cabeca"><h2>Fatos confirmados por várias fontes</h2></div>
      <p class="subtitulo" style="margin:-6px 0 12px">Sem análise ainda: a ordem abaixo não significa importância.</p>
      <ul class="lista cascata">${confirmados.map((f, i) => itemFato(f, dados, i)).join('')}</ul>
    </div>`;
}

// ---------- ANÁLISE COMPLETA ----------

export function telaAnalise(analise, dados) {
  if (!analise?.destaque) return `<div class="tela"><p class="vazio">Ainda não há análise.</p></div>`;
  const d = analise.destaque;
  const regiao = d.regioes[0];
  const paragrafos = (texto) => texto.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
  const bloco = (num, titulo, corpo) => `
    <section class="bloco entrar-lado">
      <div class="bloco-cabeca"><span class="num">${num}</span><h2>${titulo}</h2></div>
      ${corpo}
    </section>`;

  const dataFato = d.dataDoFato
    ? `<strong>Data do fato:</strong> ${esc(dataCurta(d.dataDoFato))}. ${esc(d.dataDoFatoObs || '')}`
    : `<strong>Data do fato:</strong> as matérias não deixam claro. ${esc(d.dataDoFatoObs || '')}`;

  const cadeia = `
    <ol class="cadeia">
      ${d.cadeia.map((c, i) => `
        <li class="elo"><span class="ponto">${i + 1}</span><div class="caixa"><span class="camada">${esc(CAMADAS[c.camada] || c.camada)}</span><p>${esc(c.passo)}</p></div></li>`).join('')}
      <li class="elo voce"><span class="ponto">★</span><div class="caixa"><span class="camada">Você · ${esc(IMPACTO[d.chegaEmVoce.tipo])}</span><p>${esc(d.chegaEmVoce.texto)}</p></div></li>
    </ol>`;

  const legenda = Object.entries(AFIRMACAO).map(([k, v]) => `<span style="--cor:var(--a-${k})">${v}</span>`).join('');
  const afirmacoes = `
    <div class="legenda">${legenda}</div>
    <ul class="afirmacoes">
      ${d.afirmacoes.map((a) => `
        <li class="afirmacao" style="--cor:var(--a-${a.tipo})">
          <span class="tipo">${AFIRMACAO[a.tipo]}</span>
          <p>${esc(a.texto)}</p>
          ${a.fontes.length ? `<small>Fonte: ${a.fontes.map((i) => esc(d.fontesUsadas[i]?.fonte || '')).filter(Boolean).join(', ')}</small>` : ''}
        </li>`).join('')}
    </ul>`;

  const notasDetalhe = `
    <div class="notas-detalhe">
      ${[['geral', 'Importância geral'], ['mundo', 'Impacto no mundo'], ['voce', 'Impacto no seu dia a dia']].map(([k, rotulo]) => `
        <div class="nota-linha ${k === 'voce' ? 'voce' : ''}"><span class="valor">${d.notas[k].nota}</span><div><strong>${rotulo}</strong><p>${esc(d.notas[k].porque)}</p></div></div>`).join('')}
    </div>`;

  const fontes = `
    <ul class="fontes-usadas">
      ${d.fontesUsadas.map((f, i) => `
        <li><a class="fonte-usada" href="${esc(f.link)}" target="_blank" rel="noopener noreferrer">
          <span class="idx">${i + 1}</span>
          <div><strong>${esc(f.fonte)}</strong> <span class="subtitulo">· ${esc(f.pais)}${f.estatal ? ' · estatal' : ''}</span><p>${esc(f.titulo)}</p></div>
          <span class="icone i-externo" aria-hidden="true"></span>
        </a></li>`).join('')}
    </ul>`;

  return `
    <div class="tela">
      <div class="analise-capa">
        ${imagem({ url: d.imagem, credito: d.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao] })}
        <button class="voltar-flutuante" type="button" data-voltar aria-label="Voltar"><span class="icone i-voltar" aria-hidden="true"></span></button>
      </div>
      <div class="analise-cabeca">
        <p class="rotulo ouro">${analise.dataReferencia === dados.dataReferencia ? 'Destaque do dia' : `Destaque de ${dataCurta(analise.dataReferencia)}`}</p>
        <div class="etiquetas">${etiquetaRegiao(regiao, dados)}${etiquetaTema(d.temas[0], dados)}</div>
        <h1>${esc(d.titulo)}</h1>
      </div>
      ${notas(d.notas)}
      <div class="uma-frase"><p class="rotulo ouro">Em uma frase</p><p>${esc(d.emUmaFrase)}</p></div>

      ${bloco(1, 'O que aconteceu', `<div class="texto-longo">${paragrafos(d.oQueAconteceu)}</div><p class="data-fato">${dataFato}</p>`)}
      ${bloco(2, 'Por que é o destaque do dia', `<div class="texto-longo">${paragrafos(d.porQueImporta)}</div>`)}
      ${bloco(3, 'Como chega em você', cadeia)}
      ${bloco(4, 'As notas', notasDetalhe)}
      ${bloco(5, 'Fatos × versões', afirmacoes)}
      ${bloco(6, 'O que ainda não sabemos', `<div class="texto-longo">${paragrafos(d.oQueNaoSabemos)}</div>`)}
      ${bloco(7, 'O que acompanhar', `<ul class="lista-pontos">${d.oQueAcompanhar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${bloco(8, `As fontes (${d.fontesUsadas.length})`, fontes)}

      <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${esc(analise.ia.aviso)} Gerada em ${dataHora(analise.geradoEm)} por ${esc(analise.ia.provedor)} (${esc(analise.ia.modelo)}).</p>
    </div>`;
}

// ---------- EXPLORAR ----------

const MODOS = ['regioes', 'assuntos', 'fontes'];

export function telaExplorar(dados, modo, busca) {
  const pos = MODOS.indexOf(modo);
  return `
    <div class="tela">
      ${cabecalho('Explorar', 'Todas as notícias', `${numero(dados.totalNoticias)} notícias em ${numero(dados.fatos.length)} fatos, últimas 24 h`)}
      <label class="busca"><span class="icone i-busca" aria-hidden="true"></span>
        <span class="sr-only">Buscar</span>
        <input id="campo-busca" type="search" placeholder="Buscar: China, petróleo, Lula…" value="${esc(busca)}" autocomplete="off" enterkeyhint="search">
      </label>
      <div class="segmentos" style="--qtd:3;--pos:${pos}" role="group" aria-label="Organizar por">
        <span class="indicador"></span>
        <button type="button" data-modo="regioes" aria-pressed="${modo === 'regioes'}">Regiões</button>
        <button type="button" data-modo="assuntos" aria-pressed="${modo === 'assuntos'}">Assuntos</button>
        <button type="button" data-modo="fontes" aria-pressed="${modo === 'fontes'}">Fontes</button>
      </div>
      <div id="explorar-corpo">${corpoExplorar(dados, modo, busca)}</div>
    </div>`;
}

export function corpoExplorar(dados, modo, busca, limite = 30) {
  if (busca && busca.trim().length >= 2) {
    const termo = semAcento(busca.trim().toLowerCase());
    const achados = dados.fatos.filter((f) =>
      semAcento(f.titulo.toLowerCase()).includes(termo) ||
      f.materias.some((m) => semAcento(m.titulo.toLowerCase()).includes(termo)));
    return `<p class="subtitulo" style="margin:14px 0 4px">${achados.length} resultado(s) para “${esc(busca)}”</p>${listaDeFatos(achados, dados, limite)}`;
  }
  if (modo === 'fontes') return gradeFontes(dados);
  const campo = modo === 'regioes' ? 'regioes' : 'temas';
  const nomes = modo === 'regioes' ? dados.nomesRegioes : dados.nomesTemas;
  const grupos = {};
  for (const f of dados.fatos) for (const v of f[campo]) (grupos[v] ||= []).push(f);
  const ordem = Object.keys(grupos).sort((a, b) => grupos[b].length - grupos[a].length);
  return `
    <div class="grade-regioes cascata">
      ${ordem.map((id, i) => {
        const cor = modo === 'regioes' ? corRegiao(id) : (COR_TEMA[id] || COR_TEMA.outros);
        return `
          <button class="cartao-regiao" type="button" data-gaveta="${modo === 'regioes' ? 'regiao' : 'assunto'}/${esc(id)}" style="--cor:${cor};--i:${Math.min(i, 10)}">
            <div><strong>${esc(nomes[id] || id)}</strong><div class="conta">${numero(grupos[id].length)} fatos</div></div>
            <span class="manchete">${esc(grupos[id][0].titulo)}</span>
          </button>`;
      }).join('')}
    </div>`;
}

function gradeFontes(dados) {
  const contagem = {};
  for (const f of dados.fatos) for (const m of f.materias) {
    const c = (contagem[m.fonte] ||= { nome: m.fonte, pais: m.pais, estatal: m.estatal, total: 0 });
    c.total++;
  }
  const porPais = {};
  for (const c of Object.values(contagem)) (porPais[c.pais] ||= []).push(c);
  const paises = Object.keys(porPais).sort((a, b) => a.localeCompare(b, 'pt'));
  return paises.map((pais) => `
    <div class="grupo-fontes">
      <p class="rotulo">${esc(pais)}</p>
      <ul class="lista-fontes cascata" style="margin-top:8px">
        ${porPais[pais].sort((a, b) => b.total - a.total).map((c, i) => `
          <li style="--i:${Math.min(i, 8)}"><button class="linha-fonte" type="button" data-gaveta="fonte/${encodeURIComponent(c.nome)}">
            <span>${esc(c.nome)}${c.estatal ? ' <span class="etiqueta estatal" style="margin-left:4px">Estatal</span>' : ''}</span>
            <span class="conta">${c.total}</span>
            <span class="icone i-seta" aria-hidden="true"></span>
          </button></li>`).join('')}
      </ul>
    </div>`).join('');
}

/** "Gaveta": os fatos de uma região, de um assunto ou de uma fonte. */
export function telaGaveta(dados, tipo, id, sub, limite) {
  const { fatos, titulo, cor, campoSub, nomesSub } = dadosDaGaveta(dados, tipo, id);
  const filtrados = sub ? fatos.filter((f) => f[campoSub].includes(sub)) : fatos;

  let chips = '';
  if (campoSub) {
    const conta = {};
    fatos.forEach((f) => f[campoSub].forEach((v) => { if (v !== id) conta[v] = (conta[v] || 0) + 1; }));
    const ordem = Object.keys(conta).sort((a, b) => conta[b] - conta[a]);
    chips = `
      <div class="chips">
        <button class="chip" type="button" data-sub="" aria-pressed="${!sub}">Todos<b>${fatos.length}</b></button>
        ${ordem.map((v) => `<button class="chip" type="button" data-sub="${esc(v)}" aria-pressed="${sub === v}">${esc(nomesSub[v] || v)}<b>${conta[v]}</b></button>`).join('')}
      </div>`;
  }

  return `
    <div class="tela">
      <div class="cabeca-gaveta" style="--cor:${cor}">
        <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>Explorar</button>
        <h1 class="titulo-tela">${esc(titulo)}</h1>
        <p class="subtitulo">${numero(fatos.length)} fatos nas últimas 24 h · os mais repercutidos primeiro</p>
      </div>
      ${chips}
      <div id="lista-gaveta">${listaDeFatos(filtrados, dados, limite)}</div>
    </div>`;
}

export function dadosDaGaveta(dados, tipo, id) {
  if (tipo === 'regiao') {
    return { fatos: dados.fatos.filter((f) => f.regioes.includes(id)), titulo: dados.nomesRegioes[id] || id, cor: corRegiao(id), campoSub: 'temas', nomesSub: dados.nomesTemas };
  }
  if (tipo === 'assunto') {
    return { fatos: dados.fatos.filter((f) => f.temas.includes(id)), titulo: dados.nomesTemas[id] || id, cor: COR_TEMA[id] || COR_TEMA.outros, campoSub: 'regioes', nomesSub: dados.nomesRegioes };
  }
  const nome = decodeURIComponent(id);
  return { fatos: dados.fatos.filter((f) => f.materias.some((m) => m.fonte === nome)), titulo: nome, cor: 'var(--acento)', campoSub: 'regioes', nomesSub: dados.nomesRegioes };
}

// ---------- TEMAS ----------

export function telaTemas() {
  const total = GRUPOS.reduce((s, g) => s + g.temas.length, 0);
  return `
    <div class="tela">
      ${cabecalho('Temas', 'Entender o mundo', 'Assuntos que não acabam num dia, explicados do começo até você.')}
      <div class="tema-do-dia" style="margin-top:18px">
        <p class="rotulo">Tema do dia · em breve</p>
        <h2>Ucrânia → petróleo → sua gasolina</h2>
        <div class="passos-tema"><span>Guerra</span><i>›</i><span>Sanções</span><i>›</i><span>Barril</span><i>›</i><span>Petrobras</span><i>›</i><span>Bomba</span></div>
        <p>Exemplo de como vai ficar. Na etapa 6, todo dia um tema da biblioteca ganha análise, ligado às notícias do momento.</p>
      </div>
      <div class="secao-cabeca" style="margin-top:26px"><h2>Biblioteca</h2><span>${total} temas</span></div>
      ${GRUPOS.map((g) => `
        <div class="grupo-temas">
          <h3>${esc(g.nome)}</h3>
          <div class="temas-lista cascata">${g.temas.map((t, i) => `<div class="tema-item" style="--i:${i}"><span>${esc(t)}</span><small>em breve</small></div>`).join('')}</div>
        </div>`).join('')}
    </div>`;
}

// ---------- MEU ONDA ----------

export function telaMeu() {
  return `
    <div class="tela">
      ${cabecalho('Meu Onda', 'O que você acompanha')}
      <div class="cartao meu-cartao entrar-lado" style="margin-top:18px">
        <div class="avatar"><span class="icone i-pessoa" aria-hidden="true"></span></div>
        <h2>Entrar com Google</h2>
        <p>Na próxima etapa você vai poder entrar com a sua conta, escolher de 3 a 5 notícias por dia para acompanhar e escrever a sua cadeia de efeitos. Tudo sincronizado entre o celular e o iPad.</p>
      </div>
      <div class="secao"><div class="secao-cabeca"><h2>Acompanhando</h2></div><p class="vazio">Nenhuma notícia ainda.</p></div>
      <div class="secao"><div class="secao-cabeca"><h2>Histórico</h2></div><p class="vazio">Suas cadeias de efeitos vão aparecer aqui.</p></div>
    </div>`;
}

// ---------- FOLHA DA NOTÍCIA ----------

export function folhaFato(fato, dados, contexto = {}) {
  const materias = [...fato.materias].sort((a, b) => (a.publicadoEm || '').localeCompare(b.publicadoEm || ''));
  const regiao = fato.regioes[0];
  const titulo = contexto.tituloPt || fato.titulo;
  return `
    ${imagem({ url: fato.imagem, credito: fato.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao], classe: 'grande' })}
    <div class="etiquetas">${fato.regioes.slice(0, 2).map((r) => etiquetaRegiao(r, dados)).join('')}${etiquetaTema(fato.temas[0], dados)}${fato.fontes === 1 ? '<span class="etiqueta aviso">Uma fonte só</span>' : ''}</div>
    <h2>${esc(titulo)}</h2>
    ${contexto.porQueImporta ? `<div class="uma-frase" style="margin:0 0 12px"><p class="rotulo ouro">Por que importa</p><p style="font-size:16px">${esc(contexto.porQueImporta)}</p></div>` : ''}
    ${fato.resumo ? `<p class="resumo">${esc(fato.resumo)}</p>` : ''}
    <dl class="datas">
      <dt>1ª publicação</dt><dd>${dataHora(materias[0].publicadoEm)}</dd>
      <dt>Última matéria</dt><dd>${dataHora(fato.maisRecente)}</dd>
      <dt>Consultado em</dt><dd>${dataHora(dados.geradoEm)} (Brasília)</dd>
    </dl>
    <div class="secao-cabeca" style="margin-top:22px"><h2 style="font-size:18px">Como cada fonte contou</h2><span>${fato.materias.length}</span></div>
    <p class="subtitulo" style="margin:-6px 0 12px">${fato.fontes === 1 ? 'Só uma fonte publicou: ainda sem confirmação independente.' : `${fato.fontes} fontes diferentes, de ${fato.paises} países.`}</p>
    <ul class="materias">
      ${materias.map((m) => `
        <li class="materia">
          <div class="fonte">
            <strong>${esc(m.fonte)}</strong><span class="etiqueta">${esc(m.pais)}</span>
            ${m.estatal ? '<span class="etiqueta estatal">Estatal</span>' : ''}
            ${m.tipo === 'analise' ? '<span class="etiqueta">Análise</span>' : ''}
            ${m.tipo === 'institucional' ? '<span class="etiqueta">Institucional</span>' : ''}
          </div>
          <p class="visao">${esc(m.visao)}</p>
          <a href="${esc(m.link)}" target="_blank" rel="noopener noreferrer">${esc(m.titulo)}<span class="icone i-externo" aria-hidden="true"></span></a>
          <time datetime="${esc(m.publicadoEm)}">${m.semData ? 'Sem data no feed · coletada ' : ''}${dataHora(m.publicadoEm)}</time>
        </li>`).join('')}
    </ul>`;
}

export function telaErro(mensagem) {
  return `<div class="tela"><div class="cartao sem-analise" style="margin-top:24px"><h2>Não deu para carregar</h2><p>${esc(mensagem)}</p><button class="botao principal" type="button" data-recarregar style="margin-top:8px">Tentar de novo</button></div></div>`;
}
