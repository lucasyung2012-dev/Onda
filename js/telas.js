// =============================================================
// telas.js — Monta o HTML de cada tela.
//
// Cada função recebe dados e devolve um texto HTML. Quem decide
// QUANDO e ONDE mostrar é o app.js. Aqui fica só COMO cada tela é.
// =============================================================

import { esc, tempoRelativo, dataHora, hora, dataPorExtenso, dataCurta, numero, corRegiao, semAcento } from './util.js';
import { t, emIngles } from './textos.js';

// ---------- Nomes bonitos ----------

// Os nomes passam pelo t() na hora de mostrar (para o inglês funcionar).
const traduzido = (obj) => new Proxy(obj, { get: (alvo, chave) => (typeof alvo[chave] === 'string' ? t(alvo[chave]) : alvo[chave]) });

const CAMADAS = traduzido({
  economia: 'Economia', precos: 'Preços', energia: 'Energia', politica: 'Política', seguranca: 'Segurança',
  tecnologia: 'Tecnologia', midia: 'Mídia', sociedade: 'Sociedade', brasil: 'Brasil',
});
const IMPACTO = traduzido({
  direto: 'Impacto direto', indireto: 'Impacto indireto', risco: 'Risco potencial', nenhum: 'Sem impacto imediato',
});
const AFIRMACAO = traduzido({
  fato: 'Fato confirmado', declaracao: 'Declaração oficial', alegacao: 'Alegação', nao_confirmado: 'Não confirmado', analise: 'Análise',
});
// Cor de cada tema na aba Explorar
const COR_TEMA = {
  conflitos: '#C2554F', diplomacia: '#4F86C6', economia: '#2E9E5B', energia: '#D98B3A', politica: '#8A7FD1',
  tecnologia: '#1FA594', clima: '#5A9E3A', direitos: '#C2557A', midia: '#B07ACC', saude: '#3FA3C9', outros: '#6B7F92',
};

// Ícone desenhado para cada assunto (traço simples, cor do texto)
const ICONES_TEMA = {
  conflitos: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  diplomacia: '<path d="M3 12l4-4 4 3 3-3 7 4"/><path d="M7 8l-4 4 6 6 2-2M21 12l-6 6-2-2"/><path d="M11 16l2 2"/>',
  economia: '<path d="M4 20V4M4 20h16"/><path d="M7 15l4-4 3 3 5-6"/><path d="M15 8h4v4"/>',
  energia: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  politica: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="M2 10l10-6 10 6z"/>',
  tecnologia: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  clima: '<path d="M5 19c8 0 14-6 14-15C10 4 5 9 5 15c0 1.5.4 2.8 1 4"/><path d="M5 19c2-4 5-7 9-9"/>',
  direitos: '<path d="M12 3v18M6 21h12M4 7h16"/><path d="M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z"/>',
  midia: '<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14"/>',
  saude: '<path d="M20.8 6.6a5 5 0 0 0-8.8-2.4 5 5 0 0 0-8.8 2.4C2.5 11 12 20 12 20s9.5-9 8.8-13.4z"/><path d="M7 11h3l1.5-2.5 2 5 1.5-2.5h2"/>',
  outros: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
};
function iconeTema(id, tamanho = 54) {
  return `<svg class="ilustra" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES_TEMA[id] || ICONES_TEMA.outros}</svg>`;
}

/** Logotipo da fonte (o ícone do próprio site dela); se falhar, as iniciais. */
function logoFonte(nome, dominio) {
  const iniciais = nome.replace(/^The /, '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const img = dominio
    ? `<img src="https://icons.duckduckgo.com/ip3/${esc(dominio)}.ico" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
    : '';
  return `<span class="logo-fonte"><span>${esc(iniciais)}</span>${img}</span>`;
}

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
    <p class="rotulo ${classeRotulo}">${t(rotulo)}</p>
    <h1 class="titulo-tela">${t(titulo)}</h1>
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
  if (!fatos.length) return '<p class="vazio">' + t('Nada por aqui.') + '</p>';
  const resto = fatos.length - limite;
  return `
    <ul class="lista cascata">${fatos.slice(0, limite).map((f, i) => itemFato(f, dados, i)).join('')}</ul>
    ${resto > 0 ? `<button class="botao largo mais" type="button" data-mais>Mostrar mais (${numero(resto)})</button>` : ''}`;
}

// ---------- HOJE ----------

/** "Bom dia", "Boa tarde" ou "Boa noite", pela hora de Brasília. */
function saudacao() {
  const horaBR = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  if (emIngles()) return horaBR < 12 ? 'Good morning' : horaBR < 18 ? 'Good afternoon' : 'Good evening';
  return horaBR < 12 ? 'Bom dia' : horaBR < 18 ? 'Boa tarde' : 'Boa noite';
}

export function telaHoje(analise, dados, indicadoresHtml = '', tema = null) {
  const en = emIngles();
  const topo = `
    <p class="rotulo">${esc(dataPorExtenso(dados.dataReferencia))}</p>
    <h1 class="titulo-tela saudacao">${saudacao()}</h1>
    <p class="subtitulo">${en ? 'What happened in the world and how it reaches you' : 'O que aconteceu no mundo e como chega em você'} · ${numero(dados.totalNoticias)} ${en ? 'stories from' : 'notícias de'} ${dados.totalFontes} ${en ? 'sources' : 'fontes'} · ${en ? 'updated' : 'atualizado às'} ${hora(dados.geradoEm)}</p>`;

  // Atalhos do fim da tela: tema do dia (com o título de hoje), explorar e edições anteriores
  const temaOk = tema?.status === 'ok';
  const atalhos = `
    ${temaOk ? `
      <a class="tema-do-dia tema-atalho" href="#tema/${esc(tema.dataReferencia)}">
        <p class="rotulo">${t('Tema do dia')} · ${t('Entender o mundo')}</p>
        <h3>${esc(tema.titulo)}</h3>
        <p>${esc(tema.pergunta)}</p>
      </a>` : ''}
    <div class="atalhos cascata" style="margin-top:12px">
      <a class="atalho" href="#explorar" style="--i:1"><strong>${numero(dados.fatos.length)}</strong><span>${t('fatos para explorar por região, assunto ou fonte')}</span></a>
      <a class="atalho" href="#edicoes" style="--i:2"><strong>${en ? 'History' : 'Histórico'}</strong><span>${t('Edições anteriores')}</span></a>
    </div>`;

  const temAnalise = analise && analise.status === 'ok' && analise.destaque;
  if (!temAnalise) return `<div class="tela">${topo}${semAnalise(analise, dados)}${indicadoresHtml}<div class="secao">${atalhos}</div></div>`;

  const d = analise.destaque;
  const deOutroDia = analise.dataReferencia !== dados.dataReferencia;
  const rotuloCapa = deOutroDia ? `${t('Destaque de')} ${dataCurta(analise.dataReferencia)}` : t('Destaque do dia');
  const regiao = d.regioes[0];
  const aviso = analise.versao > 1
    ? (en ? `Version ${analise.versao} · redone at ${hora(analise.geradoEm)}` : `Versão ${analise.versao} · refeita às ${hora(analise.geradoEm)}`)
    : (en ? `Analysis by AI at ${hora(analise.geradoEm)}` : `Análise feita por IA às ${hora(analise.geradoEm)}`);

  return `
    <div class="tela">
      ${topo}
      <div class="hoje-grade" style="margin-top:18px">
        <!-- 1º e maior: o DESTAQUE DO DIA -->
        <div class="secao">
          <a class="capa" href="#analise">
            ${imagem({ url: d.imagem, credito: d.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao] })}
            <div class="capa-texto">
              <p class="rotulo"><span class="numero-destaque">1</span>${rotuloCapa}</p>
              <div class="etiquetas">${etiquetaRegiao(regiao, dados, 'sobre-foto')}${etiquetaTema(d.temas[0], dados, 'sobre-foto')}</div>
              <h2>${esc(d.titulo)}</h2>
            </div>
          </a>
          ${notas(d.notas)}
          <div class="uma-frase">
            <p class="rotulo ouro">${t('Como chega em você')}</p>
            <p>${esc(d.emUmaFrase)}</p>
          </div>
          <a class="botao principal largo" href="#analise" style="margin-top:14px">${t('Ler a análise completa')} <span class="icone i-seta" aria-hidden="true"></span></a>
          <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${aviso} ${en ? `from ${d.fontesUsadas.length} articles. Check the sources.` : `a partir de ${d.fontesUsadas.length} matérias. Confira nas fontes.`}</p>
        </div>
        <!-- Depois: os outros 5, os números e os atalhos -->
        <div class="secao">
          <div class="secao-cabeca"><h2>${t('Também importa hoje')}</h2><span>${analise.tambemImporta.length}</span></div>
          <div class="carrossel">
            ${analise.tambemImporta.map((item, i) => cartaoFoto(item, i + 2, dados)).join('')}
          </div>
          ${indicadoresHtml}
          <div class="secao" style="margin-top:22px">${atalhos}</div>
        </div>
      </div>
    </div>`;
}

/** Cartão com foto dos "Também importa" (arrasta para o lado). */
function cartaoFoto(item, numeroItem, dados) {
  const regiao = item.regioes[0];
  return `
    <button class="cartao-foto" type="button" data-fato="${esc(item.fatoId)}">
      ${imagem({ url: item.imagem, regiao, nomeRegiao: dados.nomesRegioes[regiao], comCredito: false })}
      <span class="numero-foto">${numeroItem}</span>
      <div class="cartao-foto-texto">
        <span class="etiqueta regiao" style="--cor:${corRegiao(regiao)}">${esc(dados.nomesRegioes[regiao] || '')}</span>
        <h3>${esc(item.tituloPt)}</h3>
        <p>${esc(item.porQueImporta)}</p>
      </div>
    </button>`;
}

function notas(n) {
  const caixa = (chave, rotulo, classe = '') => `
    <div class="nota ${classe}">
      <strong>${n[chave].nota}</strong><span>${t(rotulo)}</span>
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
      <p class="rotulo ouro">${t('Destaque do dia')}</p>
      <h2>A análise do dia ainda não chegou</h2>
      <p>${motivo}</p>
    </div>
    <div class="secao">
      <div class="secao-cabeca"><h2>${t('Fatos confirmados por várias fontes')}</h2></div>
      <p class="subtitulo" style="margin:-6px 0 12px">Sem análise ainda: a ordem abaixo não significa importância.</p>
      <ul class="lista cascata">${confirmados.map((f, i) => itemFato(f, dados, i)).join('')}</ul>
    </div>`;
}

// ---------- ANÁLISE COMPLETA ----------

export function telaAnalise(analise, dados, opcoes = {}) {
  if (!analise?.destaque) return `<div class="tela"><p class="vazio">Ainda não há análise.</p></div>`;
  const d = analise.destaque;
  const regiao = d.regioes[0];
  const paragrafos = (texto) => texto.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
  const bloco = (num, titulo, corpo) => `
    <section class="bloco entrar-lado">
      <div class="bloco-cabeca"><span class="num">${num}</span><h2>${t(titulo)}</h2></div>
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
        <p class="rotulo ouro">${analise.dataReferencia === dados.dataReferencia ? t('Destaque do dia') : `${t('Destaque de')} ${dataCurta(analise.dataReferencia)}`}</p>
        <div class="etiquetas">${etiquetaRegiao(regiao, dados)}${etiquetaTema(d.temas[0], dados)}</div>
        <h1>${esc(d.titulo)}</h1>
      </div>
      ${notas(d.notas)}
      ${opcoes.botao || ''}
      <div class="uma-frase"><p class="rotulo ouro">${t('Em uma frase')}</p><p>${esc(d.emUmaFrase)}</p></div>

      ${bloco(1, 'O que aconteceu', `<div class="texto-longo">${paragrafos(d.oQueAconteceu)}</div><p class="data-fato">${dataFato}</p>`)}
      ${bloco(2, 'Por que é o destaque do dia', `<div class="texto-longo">${paragrafos(d.porQueImporta)}</div>`)}
      ${bloco(3, 'Como chega em você', cadeia)}
      ${bloco(4, 'As notas', notasDetalhe)}
      ${bloco(5, 'Fatos × versões', afirmacoes)}
      ${bloco(6, 'O que ainda não sabemos', `<div class="texto-longo">${paragrafos(d.oQueNaoSabemos)}</div>`)}
      ${bloco(7, 'O que acompanhar', `<ul class="lista-pontos">${d.oQueAcompanhar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${bloco(8, `As fontes (${d.fontesUsadas.length})`, fontes)}

      ${opcoes.comOutros && analise.tambemImporta?.length ? `
        <section class="secao">
          <div class="secao-cabeca"><h2>${t('Também importou neste dia')}</h2></div>
          <div class="importa cascata">${analise.tambemImporta.map((t, i) => cartaoImporta(t, i + 2, dados)).join('')}</div>
        </section>` : ''}

      <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${esc(analise.ia.aviso)} Gerada em ${dataHora(analise.geradoEm)} por ${esc(analise.ia.provedor)} (${esc(analise.ia.modelo)}).</p>
    </div>`;
}

// ---------- EXPLORAR ----------

const MODOS = ['regioes', 'assuntos', 'fontes'];

export function telaExplorar(dados, modo, busca, historico = {}) {
  const en = emIngles();
  const pos = MODOS.indexOf(modo);
  // "Em alta agora": os fatos mais repercutidos (com foto) do momento
  const emAlta = dados.fatos.filter((f) => f.fontes >= 3 && f.imagem && f.temas[0] !== 'outros').slice(0, 8);
  return `
    <div class="tela">
      ${cabecalho('Explorar', 'Todas as notícias', `${numero(dados.totalNoticias)} ${en ? 'stories in' : 'notícias em'} ${numero(dados.fatos.length)} ${en ? 'events, last 24 h' : 'fatos, últimas 24 h'}`)}
      <label class="busca busca-grande"><span class="icone i-busca" aria-hidden="true"></span>
        <span class="sr-only">${en ? 'Search' : 'Buscar'}</span>
        <input id="campo-busca" type="search" placeholder="${en ? 'Search today and the history: China, oil…' : 'Buscar hoje e no histórico: China, petróleo…'}" value="${esc(busca)}" autocomplete="off" enterkeyhint="search">
      </label>
      ${!busca && emAlta.length ? `
        <div class="secao" style="margin-top:6px">
          <div class="secao-cabeca"><h2>${en ? 'Trending now' : 'Em alta agora'}</h2><span>${en ? 'most covered' : 'mais repercutidos'}</span></div>
          <div class="carrossel">
            ${emAlta.map((f) => `
              <button class="cartao-foto pequeno" type="button" data-fato="${esc(f.id)}">
                ${imagem({ url: f.imagem, regiao: f.regioes[0], nomeRegiao: dados.nomesRegioes[f.regioes[0]], comCredito: false })}
                <span class="numero-foto" style="width:auto;padding:0 8px;border-radius:999px;font-size:12px;font-family:var(--fonte-texto)">${f.fontes} ${en ? 'sources' : 'fontes'}</span>
                <div class="cartao-foto-texto"><h3>${esc(f.titulo)}</h3></div>
              </button>`).join('')}
          </div>
        </div>` : ''}
      <div class="segmentos" style="--qtd:3;--pos:${pos};margin-top:18px" role="group" aria-label="${en ? 'Organize by' : 'Organizar por'}">
        <span class="indicador"></span>
        <button type="button" data-modo="regioes" aria-pressed="${modo === 'regioes'}">${t('Regiões')}</button>
        <button type="button" data-modo="assuntos" aria-pressed="${modo === 'assuntos'}">${t('Assuntos')}</button>
        <button type="button" data-modo="fontes" aria-pressed="${modo === 'fontes'}">${t('Fontes')}</button>
      </div>
      <div id="explorar-corpo">${corpoExplorar(dados, modo, busca, 30, historico)}</div>
    </div>`;
}

export function corpoExplorar(dados, modo, busca, limite = 30, historico = {}) {
  if (busca && busca.trim().length >= 2) return resultadosBusca(dados, busca, limite, historico);
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
        // Regiões ganham o mapa da região; assuntos, um ícone próprio.
        const arte = modo === 'regioes'
          ? `<img class="mapa" src="assets/regioes/${esc(id)}.svg" alt="" loading="lazy" onerror="this.remove()">`
          : iconeTema(id);
        return `
          <button class="cartao-regiao" type="button" data-gaveta="${modo === 'regioes' ? 'regiao' : 'assunto'}/${esc(id)}" style="--cor:${cor};--i:${Math.min(i, 10)}">
            ${arte}
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
      <div class="grade-fontes cascata">
        ${porPais[pais].sort((a, b) => b.total - a.total).map((c, i) => `
          <button class="cartao-fonte" type="button" data-gaveta="fonte/${encodeURIComponent(c.nome)}" style="--i:${Math.min(i, 8)}">
            ${logoFonte(c.nome, dados.dominios?.[c.nome])}
            <strong>${esc(c.nome)}</strong>
            <small>${c.total} ${emIngles() ? 'stories' : 'notícias'}${c.estatal ? ` · <span style="color:var(--alerta)">${t('Estatal')}</span>` : ''}</small>
          </button>`).join('')}
      </div>
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
        <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Explorar')}</button>
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

/** Aba Temas: o tema do dia e os temas anteriores (que vão se acumulando). */
/** Quantas partes e quantos minutos de leitura tem a aula. */
function tamanhoDaAula(tema) {
  const textos = JSON.stringify(tema).replace(/"(link|url|imagem|fonte|dataReferencia|geradoEm)":"[^"]*"/g, '');
  const palavras = textos.split(/\s+/).length;
  const partes = ['paraComecar', 'historia', 'comoFunciona', 'atores', 'debate', 'eHoje', 'cadeia', 'teste']
    .filter((c) => (Array.isArray(tema[c]) ? tema[c].length : tema[c])).length + 1; // +1 = as fontes
  return { partes, minutos: Math.max(2, Math.round(palavras / 200)) };
}

export function telaTemas(tema, indice, filaHtml = '') {
  const en = emIngles();
  const temHoje = tema?.status === 'ok';
  const anteriores = (indice?.temas || []).filter((x) => !temHoje || x.data !== tema.dataReferencia);
  let capa;
  if (temHoje) {
    const { partes, minutos } = tamanhoDaAula(tema);
    capa = `
      <a class="tema-do-dia tema-capa" href="#tema/${esc(tema.dataReferencia)}">
        ${tema.imagem?.url ? `<img class="tema-capa-img" src="${esc(tema.imagem.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('carregou')" onerror="this.remove()">` : ''}
        <div class="tema-capa-texto">
          <p class="rotulo">${t('Tema do dia')} · ${esc(dataCurta(tema.dataReferencia))}${tema.sugeridoPorVoce ? ` · ${en ? 'your suggestion' : 'sugerido por você'}` : ''}</p>
          <h2>${esc(tema.titulo)}</h2>
          <p class="tema-pergunta">${esc(tema.pergunta)}</p>
          <div class="tema-info">
            <span>${partes} ${en ? 'parts' : 'partes'}</span><span>${minutos} min ${en ? 'read' : 'de leitura'}</span>${tema.teste?.length ? `<span>${en ? 'quick quiz' : 'teste rápido'}</span>` : ''}
          </div>
          <span class="botao" style="margin-top:14px;background:rgba(255,255,255,.16);border:0;color:#fff">${t('Ler a explicação')} <span class="icone i-seta" aria-hidden="true"></span></span>
        </div>
      </a>`;
  } else {
    capa = `
      <div class="tema-do-dia" style="margin-top:18px">
        <p class="rotulo">${t('Tema do dia')}</p>
        <h2>${en ? 'The first topic arrives with the first analysis' : 'O primeiro tema chega com a primeira análise'}</h2>
        <p>${en ? 'Every day at 7 a.m., Onda picks a subject to understand the world and explains it from the beginning to you, using only sources you can check.' : 'Todo dia, às 7h, o Onda escolhe um assunto para entender o mundo e explica do começo até você, usando só fontes que dá para conferir.'}</p>
      </div>`;
  }

  // Cores dos cartões sem imagem (variam com o título, sempre as mesmas para cada tema)
  const cores = ['#13628A', '#5B4BC4', '#1FA594', '#C2557A', '#D98B3A', '#4F86C6'];
  const cor = (texto) => cores[[...texto].reduce((s, c) => s + c.charCodeAt(0), 0) % cores.length];

  return `
    <div class="tela">
      ${cabecalho('Temas', 'Entender o mundo', en ? 'Not news: the explanation of a subject, from the beginning to your daily life.' : 'Não é notícia: é a explicação de um assunto, do começo até o seu dia a dia.')}
      ${capa}
      ${filaHtml}
      <div class="secao">
        <div class="secao-cabeca"><h2>${t('Temas anteriores')}</h2><span>${anteriores.length}</span></div>
        ${anteriores.length
          ? `<div class="grade-temas cascata">${anteriores.map((x, i) => `
              <a class="cartao-tema" href="#tema/${esc(x.data)}" style="--i:${Math.min(i, 10)};--cor:${cor(x.titulo)}">
                <div class="cartao-tema-img">${x.imagem ? `<img src="${esc(x.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>${esc(x.titulo.slice(0, 1))}</span></div>
                <div class="cartao-tema-texto"><small>${esc(dataCurta(x.data))}</small><strong>${esc(x.titulo)}</strong></div>
              </a>`).join('')}</div>`
          : `<p class="vazio">${t('Os temas vão se acumulando aqui, um por dia.')}</p>`}
      </div>
    </div>`;
}

/** Corta um texto longo para caber numa pílula. */
function curto(texto, max = 28) {
  return texto.length > max ? `${texto.slice(0, max - 1).trim()}…` : texto;
}

/** Tela do tema: mini-aula (formato 2) ou explicação antiga. */
export function telaTema(tema, temasAnteriores = []) {
  if (!tema?.titulo) return `<div class="tela"><p class="vazio">Tema não encontrado.</p></div>`;
  if (tema.formato !== 2) return telaTemaV1(tema);

  const paragrafos = (texto) => (texto || '').split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
  const blocos = [];
  const bloco = (titulo, corpo) => blocos.push({ titulo: t(titulo), corpo });

  if (tema.paraComecar) {
    bloco('Para começar do zero', `<div class="texto-longo">${paragrafos(tema.paraComecar)}</div>
      ${tema.glossario?.length ? `<div class="glossario">${tema.glossario.map((g) => `
        <details><summary>${esc(g.termo)}</summary><p>${esc(g.definicao)}</p></details>`).join('')}</div>` : ''}`);
  }
  if (tema.historia) {
    bloco('Como chegamos aqui', `<div class="texto-longo">${paragrafos(tema.historia)}</div>
      ${tema.linhaDoTempo?.length ? `<ol class="cadeia linha-tempo" style="margin-top:16px">${tema.linhaDoTempo.map((l) => `
        <li class="elo"><span class="ponto" style="font-size:9px">●</span><div class="caixa"><span class="camada">${esc(l.quando)}</span><p>${esc(l.oQue)}</p>${l.fonte ? `<small class="subtitulo">${esc(l.fonte)}</small>` : ''}</div></li>`).join('')}</ol>` : ''}`);
  }
  if (tema.comoFunciona) {
    bloco('Como funciona por dentro', `<div class="texto-longo">${paragrafos(tema.comoFunciona)}</div>
      ${tema.numeros?.length ? `<div class="numeros">${tema.numeros.map((n) => `
        <div class="numero-caixa"><strong>${esc(n.valor)}</strong><p>${esc(n.significado)}</p>${n.fonte ? `<small>${esc(n.fonte)}</small>` : ''}</div>`).join('')}</div>` : ''}`);
  }
  if (tema.atores?.length) {
    bloco('O que cada lado quer', `<div class="atores">${tema.atores.map((a) => `
      <div class="ator"><strong>${esc(a.nome)}</strong><p><span class="rotulo acento">Quer</span> ${esc(a.quer)}</p>${a.porque ? `<p class="subtitulo">${esc(a.porque)}</p>` : ''}</div>`).join('')}</div>`);
  }
  if (tema.debate?.length || tema.mitos?.length) {
    bloco('Onde há debate', `
      ${(tema.debate || []).map((d) => `<div class="afirmacao" style="--cor:var(--a-analise);margin-bottom:8px"><span class="tipo">${esc(d.quemDefende || 'Visão')}</span><p><strong>${esc(d.visao)}</strong></p>${d.argumento ? `<small>${esc(d.argumento)}</small>` : ''}</div>`).join('')}
      ${(tema.mitos || []).map((m) => `<div class="mito"><p><span class="etiqueta estatal">Mito</span> ${esc(m.mito)}</p><p><span class="etiqueta pronta">Verdade</span> ${esc(m.verdade)}</p></div>`).join('')}`);
  }
  if (tema.eHoje) bloco('E hoje?', `<div class="texto-longo">${paragrafos(tema.eHoje)}</div>`);
  if (tema.cadeia?.length) {
    bloco('Como chega em você', `<ol class="cadeia">
      ${tema.cadeia.map((c, i) => `<li class="elo"><span class="ponto">${i + 1}</span><div class="caixa"><span class="camada">${esc(CAMADAS[c.camada] || c.camada)}</span><p>${esc(c.passo)}</p></div></li>`).join('')}
      <li class="elo voce"><span class="ponto">★</span><div class="caixa"><span class="camada">Você · ${esc(IMPACTO[tema.chegaEmVoce?.tipo] || '')}</span><p>${esc(tema.chegaEmVoce?.texto || '')}</p></div></li></ol>`);
  }
  if (tema.teste?.length) {
    bloco('Teste rápido', tema.teste.map((q, qi) => `
      <div class="quiz" data-quiz="${qi}">
        <p class="quiz-pergunta">${qi + 1}. ${esc(q.pergunta)}</p>
        ${q.opcoes.map((o, oi) => `<button type="button" class="quiz-opcao" data-resposta="${oi}" data-correta="${q.correta}">${esc(o)}</button>`).join('')}
        <p class="quiz-explicacao" hidden>${esc(q.explicacao || '')}</p>
      </div>`).join(''));
  }
  const ligacoes = (tema.ligacoes || []).map((titulo) => temasAnteriores.find((t) => t.titulo === titulo)).filter(Boolean);
  if (ligacoes.length) {
    bloco('Ligações com outros temas', `<div class="temas-lista">${ligacoes.map((t) => `
      <a class="tema-item" href="#tema/${esc(t.data)}" style="text-decoration:none;color:inherit"><span><strong style="display:block;font-weight:600">${esc(t.titulo)}</strong><small style="white-space:normal">${esc(t.pergunta)}</small></span><small>${esc(dataCurta(t.data))}</small></a>`).join('')}</div>`);
  }
  bloco('Para ir além: as fontes', `<ul class="fontes-usadas">${(tema.fontes || []).map((f, i) => `
    <li><a class="fonte-usada" href="${esc(f.link)}" target="_blank" rel="noopener noreferrer"><span class="idx">${i + 1}</span><div><strong>${esc(f.fonte)}</strong><p>${esc(f.titulo)}</p></div><span class="icone i-externo" aria-hidden="true"></span></a></li>`).join('')}</ul>`);

  // Índice no topo: pula direto para cada parte da aula
  const indice = blocos.map((b, i) => `<a href="#tema/${esc(tema.dataReferencia)}" data-pular="bloco-${i}">${i + 1}. ${b.titulo}</a>`).join('');

  return `
    <div class="tela aula">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Temas')}</button>
      <div class="tema-do-dia aula-capa" style="margin-top:8px">
        ${tema.imagem ? `<img class="aula-imagem" src="${esc(tema.imagem.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('carregou')" onerror="this.remove()">` : ''}
        <div class="aula-capa-texto">
          <p class="rotulo">${t('Tema do dia')} · ${esc(dataCurta(tema.dataReferencia))}${tema.sugeridoPorVoce ? ` · ${emIngles() ? 'your suggestion' : 'sugerido por você'}` : ''}</p>
          <h2>${esc(tema.titulo)}</h2>
          <p style="font-family:var(--fonte-titulo);font-size:18px;color:#fff">${esc(tema.pergunta)}</p>
        </div>
        ${tema.imagem ? `<a class="credito" href="${esc(tema.imagem.link)}" target="_blank" rel="noopener noreferrer">Imagem: ${esc(tema.imagem.credito)}</a>` : ''}
      </div>
      <div class="uma-frase"><p class="rotulo ouro">${t('A resposta em uma frase')}</p><p>${esc(tema.emUmaFrase)}</p></div>
      <nav class="indice-aula" aria-label="Partes da aula"><p class="rotulo">${t('Nesta aula')}</p>${indice}</nav>
      ${blocos.map((b, i) => `
        <section class="bloco" id="bloco-${i}">
          <div class="bloco-cabeca"><span class="num">${i + 1}</span><h2>${b.titulo}</h2></div>${b.corpo}
        </section>`).join('')}
      ${tema.paraPensar ? `<div class="uma-frase" style="margin-top:24px"><p class="rotulo ouro">${t('Para pensar')}</p><p>${esc(tema.paraPensar)}</p></div>` : ''}
      <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${esc(tema.ia?.aviso || '')} Gerada em ${dataHora(tema.geradoEm)}.</p>
    </div>`;
}

/** Explicação de um tema no formato antigo (até 20/11/2026). */
function telaTemaV1(tema) {
  if (!tema?.titulo) return `<div class="tela"><p class="vazio">Tema não encontrado.</p></div>`;
  const paragrafos = (texto) => texto.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
  const bloco = (num, titulo, corpo) => `
    <section class="bloco entrar-lado">
      <div class="bloco-cabeca"><span class="num">${num}</span><h2>${t(titulo)}</h2></div>${corpo}
    </section>`;
  let n = 0;
  return `
    <div class="tela">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Temas')}</button>
      <div class="tema-do-dia" style="margin-top:8px">
        <p class="rotulo">${t('Tema do dia')} · ${esc(dataCurta(tema.dataReferencia))}${tema.sugeridoPorVoce ? ` · ${emIngles() ? 'your suggestion' : 'sugerido por você'}` : ''}</p>
        <h2>${esc(tema.titulo)}</h2>
        <p style="font-family:var(--fonte-titulo);font-size:18px;color:#fff">${esc(tema.pergunta)}</p>
      </div>
      <div class="uma-frase"><p class="rotulo ouro">${t('A resposta em uma frase')}</p><p>${esc(tema.emUmaFrase)}</p></div>

      ${bloco(++n, 'A explicação', `<div class="texto-longo">${paragrafos(tema.explicacao)}</div>`)}
      ${tema.linhaDoTempo.length ? bloco(++n, 'Linha do tempo', `
        <ol class="cadeia">${tema.linhaDoTempo.map((l) => `
          <li class="elo"><span class="ponto" style="width:28px;font-size:9px">•</span><div class="caixa"><span class="camada">${esc(l.quando)}</span><p>${esc(l.oQue)}</p>${l.fonte ? `<small class="subtitulo">${esc(l.fonte)}</small>` : ''}</div></li>`).join('')}
        </ol>`) : ''}
      ${tema.atores.length ? bloco(++n, 'Quem está envolvido', `
        <div class="temas-lista">${tema.atores.map((a) => `<div class="tema-item" style="display:block"><strong style="font-weight:600">${esc(a.nome)}</strong><p class="subtitulo" style="font-size:14px;margin-top:2px">${esc(a.papel)}</p></div>`).join('')}</div>`) : ''}
      ${bloco(++n, 'Como chega em você', `
        <ol class="cadeia">
          ${tema.cadeia.map((c, i) => `<li class="elo"><span class="ponto">${i + 1}</span><div class="caixa"><span class="camada">${esc(CAMADAS[c.camada] || c.camada)}</span><p>${esc(c.passo)}</p></div></li>`).join('')}
          <li class="elo voce"><span class="ponto">★</span><div class="caixa"><span class="camada">Você · ${esc(IMPACTO[tema.chegaEmVoce.tipo])}</span><p>${esc(tema.chegaEmVoce.texto)}</p></div></li>
        </ol>`)}
      ${tema.eHoje ? bloco(++n, 'E hoje?', `<div class="texto-longo">${paragrafos(tema.eHoje)}</div>`) : ''}
      ${tema.paraPensar ? `<div class="uma-frase" style="margin-top:24px"><p class="rotulo ouro">${t('Para pensar')}</p><p>${esc(tema.paraPensar)}</p></div>` : ''}
      ${bloco(++n, `As fontes (${tema.fontes.length})`, `
        <ul class="fontes-usadas">${tema.fontes.map((f, i) => `
          <li><a class="fonte-usada" href="${esc(f.link)}" target="_blank" rel="noopener noreferrer">
            <span class="idx">${i + 1}</span><div><strong>${esc(f.fonte)}</strong><p>${esc(f.titulo)}</p></div><span class="icone i-externo" aria-hidden="true"></span>
          </a></li>`).join('')}</ul>`)}
      <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${esc(tema.ia?.aviso || '')} Gerado em ${dataHora(tema.geradoEm)}.</p>
    </div>`;
}

// ---------- HISTÓRICO EM CALENDÁRIO ----------
// Cada dia guarda, automaticamente, a edição do Onda (destaque + 5 fatos)
// e o que você acompanhou. Toque num dia para ver tudo de forma compacta.

// Nome do mês e letras da semana no idioma escolhido
const nomeMes = (ano, m) => new Intl.DateTimeFormat(emIngles() ? "en-US" : "pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 15)));
const SEMANA = () => (emIngles() ? ["S", "M", "T", "W", "T", "F", "S"] : ["D", "S", "T", "Q", "Q", "S", "S"]);

/** Calendário de um mês. mes = "AAAA-MM". */
function calendario({ mes, dia, diasEdicao, diasMeus, hoje }) {
  const [ano, m] = mes.split('-').map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay(); // 0 = domingo
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push('<span></span>');
  for (let d = 1; d <= diasNoMes; d++) {
    const data = `${mes}-${String(d).padStart(2, '0')}`;
    const futuro = data > hoje;
    const classes = [
      diasEdicao.has(data) ? 'tem-edicao' : '',
      diasMeus.has(data) ? 'tem-meus' : '',
      data === dia ? 'escolhido' : '',
      data === hoje ? 'hoje' : '',
    ].join(' ');
    celulas.push(`<button type="button" class="dia ${classes}" data-dia="${data}" ${futuro ? 'disabled' : ''} aria-label="${d}">${d}</button>`);
  }
  const anterior = m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, '0')}`;
  const proximo = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  return `
    <div class="calendario cartao">
      <div class="cal-topo">
        <button type="button" class="botao-icone" data-mes="${anterior}" aria-label="Mês anterior" style="--icone:var(--i-voltar)"></button>
        <strong>${nomeMes(ano, m)}</strong>
        <button type="button" class="botao-icone" data-mes="${proximo}" aria-label="Próximo mês" style="--icone:var(--i-seta)" ${proximo > hoje.slice(0, 7) ? 'disabled' : ''}></button>
      </div>
      <div class="cal-semana">${SEMANA().map((l) => `<span>${l}</span>`).join("")}</div>
      <div class="cal-dias">${celulas.join('')}</div>
      <div class="cal-legenda"><span class="l-edicao">${t('edição do Onda')}</span><span class="l-meus">${t('você acompanhou')}</span></div>
    </div>`;
}

/** O dia escolhido, compacto: destaque, os 5 fatos e o que você acompanhou. */
function diaCompacto({ dia, edicao, carregando, meusDoDia, dados }) {
  const titulo = `<h3 class="dia-titulo">${esc(dataPorExtenso(dia))}</h3>`;
  let corpo;
  if (carregando) corpo = '<p class="vazio" style="padding:16px">Carregando…</p>';
  else if (!edicao) corpo = '<p class="subtitulo" style="margin:4px 0 8px">' + t('Sem edição do Onda neste dia.') + '</p>';
  else {
    const d = edicao.destaque;
    corpo = `
      <a class="linha-compacta destaque-compacto" href="#edicao/${esc(dia)}">
        <span class="n">★</span>
        <span><strong>${esc(d.titulo)}</strong><small>Destaque · notas ${d.notas.geral} · ${d.notas.mundo} · <b style="color:var(--ouro)">${d.notas.voce}</b></small></span>
        <span class="icone i-seta" aria-hidden="true"></span>
      </a>
      ${(edicao.tambemImporta || []).map((t, i) => `
        <button type="button" class="linha-compacta" data-fato="${esc(t.fatoId)}">
          <span class="n">${i + 2}</span>
          <span><strong>${esc(t.tituloPt)}</strong><small>${esc(dados.nomesRegioes[t.regioes[0]] || '')}</small></span>
          <span class="icone i-seta" aria-hidden="true"></span>
        </button>`).join('')}`;
  }
  const meus = meusDoDia.length ? `
    <p class="rotulo ouro" style="margin:14px 0 6px">${t('Você acompanhou')}</p>
    ${meusDoDia.map((it) => `
      <a class="linha-compacta" href="#analise-minha/${esc(it.id)}">
        <span class="n" style="color:var(--ouro)">☆</span>
        <span><strong>${esc(it.titulo)}</strong><small>${it.minha?.texto ? 'com a sua análise' : it.minha?.palpite ? 'com o seu palpite' : 'sem análise'}</small></span>
        <span class="icone i-seta" aria-hidden="true"></span>
      </a>`).join('')}` : '';
  return `<div class="dia-compacto entrar-lado">${titulo}${corpo}${meus}</div>`;
}

/** Calendário + dia escolhido (usado no Meu Onda e em "Edições anteriores"). */
export function areaHistorico(params) {
  return `<div id="historico">${calendario(params)}${diaCompacto(params)}</div>`;
}

export function telaEdicoes(historicoHtml) {
  return `
    <div class="tela">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Hoje')}</button>
      ${cabecalho('Histórico', 'Edições anteriores', 'Todo dia o Onda guarda o destaque e os outros 5 fatos. Toque num dia.')}
      <div style="margin-top:16px">${historicoHtml}</div>
    </div>`;
}

/** Folha de um fato guardado numa edição (pode não estar mais no "hoje"). */
export function folhaArquivo(item, dados, botao = '') {
  const regiao = item.regioes[0];
  return `
    ${imagem({ url: item.imagem, credito: item.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao], classe: 'grande' })}
    <div class="etiquetas">${item.regioes.slice(0, 2).map((r) => etiquetaRegiao(r, dados)).join('')}${etiquetaTema(item.temas[0], dados)}</div>
    <h2>${esc(item.tituloPt)}</h2>
    ${botao}
    <div class="uma-frase" style="margin:0 0 12px"><p class="rotulo ouro">${t('Por que importa')}</p><p style="font-size:16px">${esc(item.porQueImporta)}</p></div>
    ${item.resumo ? `<p class="resumo">${esc(item.resumo)}</p>` : ''}
    <div class="secao-cabeca" style="margin-top:22px"><h2 style="font-size:18px">${t('Como cada fonte contou')}</h2><span>${(item.materias || []).length}</span></div>
    <ul class="materias">
      ${(item.materias || []).map((m) => `
        <li class="materia">
          <div class="fonte"><strong>${esc(m.fonte)}</strong><span class="etiqueta">${esc(m.pais)}</span>${m.estatal ? '<span class="etiqueta estatal">' + t('Estatal') + '</span>' : ''}</div>
          <p class="visao">${esc(m.visao || '')}</p>
          <a href="${esc(m.link)}" target="_blank" rel="noopener noreferrer">${esc(m.titulo)}<span class="icone i-externo" aria-hidden="true"></span></a>
          <time datetime="${esc(m.publicadoEm)}">${dataHora(m.publicadoEm)}</time>
        </li>`).join('')}
    </ul>`;
}

// ---------- ACOMPANHAR ----------

/** Desenho do marcador de página (o ícone do "Guardar"). Cheio quando já está guardada. */
const marcador = (cheio) => `<svg class="marcador" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" fill="${cheio ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

/** Botão "Guardar": sem limite, só para não perder a notícia. */
function botaoGuardar(id, guardado) {
  return `<button class="botao guardar ${guardado ? 'ativo' : ''}" type="button" data-guardar="${esc(id)}" aria-pressed="${guardado}">${marcador(guardado)}${guardado ? t('Guardada') : t('Guardar')}</button>`;
}

/** Botões de estrela "Acompanhar" e "Guardar". `cheio` = o Acompanhar já chegou ao limite de hoje. */
export function botaoAcompanhar(id, ativo, contagem, limite, cheio, guardado = false) {
  if (ativo) {
    return `<div class="acompanhar-linha">
      <button class="botao acompanhar ativo" type="button" data-acompanhar="${esc(id)}"><span class="estrela" aria-hidden="true">★</span>${t('Acompanhando')}</button>
      ${botaoGuardar(id, guardado)}
      <a class="botao principal" href="#analise-minha/${esc(id)}">${t('Minha análise')} <span class="icone i-seta" aria-hidden="true"></span></a>
    </div>`;
  }
  return `<div class="acompanhar-linha">
    <button class="botao acompanhar" type="button" data-acompanhar="${esc(id)}" ${cheio ? 'data-cheio' : ''}><span class="estrela" aria-hidden="true">☆</span>${t('Acompanhar')}</button>
    ${botaoGuardar(id, guardado)}
    <span class="subtitulo">${contagem}/${limite} ${emIngles() ? 'today' : 'hoje'}</span>
  </div>`;
}

/** Uma notícia guardada: título, resumo e as fontes com link (abre mesmo semanas depois). */
function linhaGuardada(item, i) {
  const fontes = (item.materias || []).slice(0, 4);
  return `
    <div class="cartao guardada-cartao" style="--i:${Math.min(i, 10)}">
      <p class="rotulo">${esc(dataCurta(item.data))}${item.origem === 'destaque' ? ` · ${emIngles() ? 'story of the day' : 'destaque'}` : ''}</p>
      <h3>${esc(item.titulo)}</h3>
      ${item.resumo ? `<p>${esc(item.resumo)}</p>` : ''}
      ${fontes.length ? `<ul class="guardada-fontes">${fontes.map((m) => `<li><a href="${esc(m.link)}" target="_blank" rel="noopener">${esc(m.fonte)}</a></li>`).join('')}</ul>` : ''}
      <button class="botao-texto" type="button" data-tirar-guardada="${esc(item.id)}">${emIngles() ? 'Remove' : 'Tirar das guardadas'}</button>
    </div>`;
}

// ---------- MEU ONDA ----------

/** Primeira linha do texto, para mostrar na lista. */
function previa(texto, max = 110) {
  const linha = (texto || '').split('\n').map((l) => l.replace(/[#*]/g, '').trim()).find(Boolean) || '';
  return linha.length > max ? `${linha.slice(0, max - 1)}…` : linha;
}

function linhaMeu(item, dados, i) {
  const regiao = item.regioes?.[0];
  const m = item.minha || {};
  const resumo = m.texto ? previa(m.texto) : m.palpite ? `Palpite: ${previa(m.palpite)}` : 'Ainda sem análise';
  return `
    <a class="cartao-importa" href="#analise-minha/${esc(item.id)}" style="--i:${Math.min(i, 10)};grid-template-columns:1fr 64px;text-decoration:none;color:inherit">
      <div>
        <h3>${esc(item.titulo)}</h3>
        <p>${m.texto ? '<span class="etiqueta pronta">Salva</span> ' : ''}${esc(resumo)}</p>
      </div>
      ${imagem({ url: item.imagem, regiao, nomeRegiao: dados.nomesRegioes[regiao], comCredito: false })}
    </a>`;
}

/** "Esta semana", "Semana passada" ou "16/11 – 22/11" para agrupar as anteriores. */
function nomeDaSemana(dataIso, hojeIso) {
  const segunda = (iso) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; };
  const s = segunda(dataIso); const h = segunda(hojeIso);
  const diff = Math.round((h - s) / (7 * 86400000));
  if (diff === 0) return emIngles() ? 'This week' : 'Esta semana';
  if (diff === 1) return emIngles() ? 'Last week' : 'Semana passada';
  const fim = new Date(s); fim.setUTCDate(fim.getUTCDate() + 6);
  return `${dataCurta(s.toISOString().slice(0, 10))} – ${dataCurta(fim.toISOString().slice(0, 10))}`;
}

export function telaMeu({ situacao, nomeConta, hoje, anteriores, todos, limite, dados, historico, aba, dataHoje, guardadas = [] }) {
  const en = emIngles();
  // Seus números
  const analises = todos.filter((i) => i.minha?.texto).length;
  const dias = new Set(todos.map((i) => i.data));
  let seguidos = 0;
  for (let d = new Date(`${dataHoje}T12:00:00Z`); dias.has(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() - 1)) seguidos++;
  const numeros = `
    <div class="meus-numeros">
      <div class="cartao"><strong>${hoje.length}<small>/${limite}</small></strong><span>${en ? 'today' : 'hoje'}</span></div>
      <div class="cartao"><strong>${analises}</strong><span>${en ? 'analyses' : 'análises'}</span></div>
      <div class="cartao ouro"><strong>${seguidos}</strong><span>${en ? 'days in a row' : 'dias seguidos'}</span></div>
    </div>`;

  let conta;
  if (!situacao.configurado) {
    conta = `<p class="subtitulo">${en ? 'Saved only on this device.' : 'Salvo só neste aparelho.'}</p>`;
  } else if (!situacao.conectado) {
    conta = `<div class="cartao meu-cartao"><div class="avatar"><span class="icone i-pessoa" aria-hidden="true"></span></div>
      <h2>${t('Conecte o seu Dropbox')}</h2><p>${en ? 'So what you follow and your analyses look the same on your phone and iPad. Onda only sees its own folder, inside Apps.' : 'Assim o que você acompanha e as suas análises ficam iguais no celular e no iPad. O Onda só enxerga a pasta dele, dentro de Apps.'}</p>
      <button class="botao principal" type="button" data-dropbox="conectar" style="margin-top:6px">${t('Conectar o Dropbox')}</button></div>`;
  } else {
    const quando = situacao.ultimaSincronizacao ? `${en ? 'synced at' : 'sincronizado às'} ${hora(situacao.ultimaSincronizacao.toISOString())}` : (en ? 'syncing…' : 'sincronizando…');
    conta = `<div class="conta-compacta">
      <span class="ponto-sync ${situacao.ultimoErro ? 'erro' : ''}"></span>
      <span>Dropbox · ${situacao.ultimoErro ? `<span style="color:var(--perigo)">${en ? 'not synced' : 'sem sincronizar'}: ${esc(situacao.ultimoErro)}</span>` : quando}</span>
      <button class="botao-texto" type="button" data-dropbox="sincronizar">${t('Sincronizar')}</button>
    </div>`;
  }

  const abas = [['hoje', en ? 'Today' : 'Hoje'], ['anteriores', en ? 'Earlier' : 'Anteriores'], ['guardadas', en ? 'Saved' : 'Guardadas'], ['calendario', en ? 'Calendar' : 'Calendário']];
  const abaAtual = abas.some(([a]) => a === aba) ? aba : 'hoje';
  let corpo;
  if (abaAtual === 'hoje') {
    corpo = hoje.length
      ? `<div class="importa cascata">${hoje.map((it, i) => linhaMeu(it, dados, i)).join('')}</div>`
      : `<p class="vazio">${en ? 'Tap ☆ Follow on a story (the story of the day, the other 5 or Explore).' : 'Toque em ☆ Acompanhar numa notícia (no destaque, nos 5 do dia ou no Explorar).'}</p>`;
  } else if (abaAtual === 'anteriores') {
    const grupos = {};
    for (const it of anteriores) (grupos[nomeDaSemana(it.data, dataHoje)] ||= []).push(it);
    corpo = anteriores.length
      ? Object.entries(grupos).map(([semana, lista]) => `
          <p class="rotulo" style="margin:16px 0 8px">${esc(semana)} · ${lista.length}</p>
          <div class="importa cascata">${lista.map((it, i) => linhaMeu(it, dados, i)).join('')}</div>`).join('')
      : `<p class="vazio">${en ? 'Stories you followed on other days show up here.' : 'As notícias que você acompanhou em outros dias aparecem aqui.'}</p>`;
  } else if (abaAtual === 'guardadas') {
    corpo = guardadas.length
      ? `<p class="subtitulo" style="margin-bottom:12px">${guardadas.length} ${en ? (guardadas.length === 1 ? 'saved story' : 'saved stories') : (guardadas.length === 1 ? 'notícia guardada' : 'notícias guardadas')}</p>
         <div class="guardadas cascata">${guardadas.map((it, i) => linhaGuardada(it, i)).join('')}</div>`
      : `<p class="vazio">${en ? 'Tap Save on any story to keep it here forever, with no daily limit.' : 'Toque em Guardar em qualquer notícia para ela ficar aqui para sempre, sem limite por dia.'}</p>`;
  } else {
    corpo = `<p class="subtitulo" style="margin-bottom:12px">${en ? 'Each day keeps the Onda edition (story of the day + 5) and what you followed.' : 'Cada dia guarda sozinho a edição do Onda (destaque + 5) e o que você acompanhou.'}</p>${historico}`;
  }

  return `
    <div class="tela">
      ${cabecalho('Meu Onda', 'O que você acompanha')}
      ${numeros}
      ${atalhoSemana()}
      <div style="margin-top:12px">${conta}</div>
      <div class="segmentos" style="--qtd:4;--pos:${abas.findIndex(([a]) => a === abaAtual)};margin-top:18px" role="group">
        <span class="indicador"></span>
        ${abas.map(([a, nome]) => `<button type="button" data-aba-meu="${a}" aria-pressed="${a === abaAtual}">${nome}</button>`).join('')}
      </div>
      <div style="margin-top:14px">${corpo}</div>
      ${situacao.conectado ? `<button class="botao-texto" type="button" data-dropbox="desconectar" style="margin-top:28px">${t('Desconectar este aparelho')}</button>` : ''}
    </div>`;
}

// ---------- MINHA ANÁLISE ----------
// Opcional, para exercitar o raciocínio: um palpite curto (antes de ler a IA)
// e uma caixa de texto livre, onde você escreve ou cola a resposta da IA.

export function telaMinhaAnalise(item, dados) {
  if (!item) return `<div class="tela"><button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Meu Onda')}</button><p class="vazio">Essa notícia não está mais na sua lista.</p></div>`;
  const m = item.minha || {};
  const regiao = item.regioes?.[0];
  return `
    <div class="tela editor" data-item="${esc(item.id)}">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Meu Onda')}</button>
      <div class="etiquetas" style="margin-top:6px">${regiao ? etiquetaRegiao(regiao, dados) : ''}</div>
      <h1 class="titulo-tela" style="font-size:24px;margin-top:8px">${esc(item.titulo)}</h1>
      <p class="subtitulo">Acompanhando desde ${esc(dataCurta(item.data))} · <span id="estado-salvo">${m.texto || m.palpite ? 'salvo' : 'nada escrito ainda'}</span></p>

      <section class="bloco">
        <div class="bloco-cabeca"><span class="num">1</span><h2>${t('Meu palpite')}</h2></div>
        <label class="campo"><small>Opcional. Antes de ler qualquer análise: em uma frase, como você acha que isso chega em você?</small>
          <textarea data-campo="palpite" rows="2" placeholder="Ex.: pode encarecer a gasolina daqui a algumas semanas">${esc(m.palpite || '')}</textarea></label>
      </section>

      <section class="bloco">
        <div class="bloco-cabeca"><span class="num">2</span><h2>${t('Peça a análise a uma IA')}</h2></div>
        <p class="subtitulo" style="margin-bottom:10px">O prompt já leva a notícia, as fontes e tudo que a análise precisa ter: o que aconteceu, quem é afetado, os efeitos, como chega em você e as notas.</p>
        <button class="botao principal" type="button" data-copiar-prompt>${t('Copiar prompt')}</button>
      </section>

      <section class="bloco">
        <div class="bloco-cabeca"><span class="num">3</span><h2>${t('Minha análise')}</h2></div>
        <label class="campo"><small>Cole aqui a resposta da IA, escreva do seu jeito, ou os dois. Fica salvo.</small>
          <textarea data-campo="texto" rows="14" placeholder="Cole ou escreva aqui">${esc(m.texto || '')}</textarea></label>
      </section>

      <button class="botao largo" type="button" data-acompanhar="${esc(item.id)}" style="margin-top:20px">${t('Deixar de acompanhar')}</button>

      ${(item.materias || []).length ? `<div class="secao"><div class="secao-cabeca"><h2 style="font-size:18px">${t('Fontes')}</h2></div>
        <ul class="fontes-usadas">${item.materias.map((f, i) => `<li><a class="fonte-usada" href="${esc(f.link)}" target="_blank" rel="noopener noreferrer"><span class="idx">${i + 1}</span><div><strong>${esc(f.fonte)}</strong><p>${esc(f.titulo)}</p></div><span class="icone i-externo" aria-hidden="true"></span></a></li>`).join('')}</ul></div>` : ''}
    </div>`;
}

// ---------- FOLHA DA NOTÍCIA ----------

export function folhaFato(fato, dados, contexto = {}) {
  const materias = [...fato.materias].sort((a, b) => (a.publicadoEm || '').localeCompare(b.publicadoEm || ''));
  const regiao = fato.regioes[0];
  const titulo = contexto.tituloPt || fato.titulo;
  return `
    ${imagem({ url: fato.imagem, credito: fato.credito, regiao, nomeRegiao: dados.nomesRegioes[regiao], classe: 'grande' })}
    <div class="etiquetas">${fato.regioes.slice(0, 2).map((r) => etiquetaRegiao(r, dados)).join('')}${etiquetaTema(fato.temas[0], dados)}${fato.fontes === 1 ? '<span class="etiqueta aviso">' + t('Uma fonte só') + '</span>' : ''}</div>
    <h2>${esc(titulo)}</h2>
    ${contexto.botao || ''}
    ${contexto.porQueImporta ? `<div class="uma-frase" style="margin:0 0 12px"><p class="rotulo ouro">${t('Por que importa')}</p><p style="font-size:16px">${esc(contexto.porQueImporta)}</p></div>` : ''}
    ${fato.resumo ? `<p class="resumo">${esc(fato.resumo)}</p>` : ''}
    <dl class="datas">
      <dt>1ª publicação</dt><dd>${dataHora(materias[0].publicadoEm)}</dd>
      <dt>Última matéria</dt><dd>${dataHora(fato.maisRecente)}</dd>
      <dt>Consultado em</dt><dd>${dataHora(dados.geradoEm)} (Brasília)</dd>
    </dl>
    <div class="secao-cabeca" style="margin-top:22px"><h2 style="font-size:18px">${t('Como cada fonte contou')}</h2><span>${fato.materias.length}</span></div>
    <p class="subtitulo" style="margin:-6px 0 12px">${fato.fontes === 1 ? 'Só uma fonte publicou: ainda sem confirmação independente.' : `${fato.fontes} fontes diferentes, de ${fato.paises} países.`}</p>
    <ul class="materias">
      ${materias.map((m) => `
        <li class="materia">
          <div class="fonte">
            <strong>${esc(m.fonte)}</strong><span class="etiqueta">${esc(m.pais)}</span>
            ${m.estatal ? '<span class="etiqueta estatal">' + t('Estatal') + '</span>' : ''}
            ${m.tipo === 'analise' ? '<span class="etiqueta">' + t('Análise') + '</span>' : ''}
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

// ---------- CONFIGURAÇÕES ----------

export function telaConfig(config, { conectado = false, roboLigado = false, saudeHtml = '', avisosHtml = '' } = {}) {
  // Grupo de opções lado a lado (como um seletor). Cada botão grava uma escolha.
  const opcoes = (chave, lista) => `
    <div class="opcoes" role="group">
      ${lista.map(([valor, rotulo]) => `<button type="button" data-config="${chave}" data-valor="${valor}" aria-pressed="${config[chave] === valor}">${t(rotulo)}</button>`).join('')}
    </div>`;
  const interruptor = (chave, ligado, rotulo, dica) => `
    <button type="button" class="interruptor" data-config="${chave}" data-valor="${ligado ? 'normal' : (chave === 'contraste' ? 'alto' : 'reduzido')}" aria-pressed="${ligado}">
      <span><strong>${t(rotulo)}</strong><small>${dica}</small></span><i aria-hidden="true"></i>
    </button>`;
  const en = config.idioma === 'en';
  return `
    <div class="tela">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Hoje')}</button>
      <h1 class="titulo-tela">${t('Configurações')}</h1>

      <section class="grupo-config">
        <h2>${t('Aparência')}</h2>
        ${opcoes('aparencia', [['auto', 'Automático'], ['escuro', 'Noite'], ['claro', 'Dia']])}
        <p class="subtitulo">${en ? 'Automatic follows your phone (dark at night, light during the day).' : 'Automático segue o celular (escuro à noite, claro de dia).'}</p>
      </section>

      <section class="grupo-config">
        <h2>${t('Idioma')}</h2>
        ${opcoes('idioma', [['pt', 'Português'], ['en', 'English']])}
        <p class="subtitulo">${en ? 'Menus and buttons switch now. The daily analysis and topics are translated by the robot each morning.' : 'Menus e botões mudam na hora. A análise e o tema do dia são traduzidos pelo robô toda manhã.'}</p>
      </section>

      <section class="grupo-config">
        <h2>${t('Acessibilidade')}</h2>
        <p class="rotulo" style="margin-bottom:8px">${t('Tamanho da letra')}</p>
        ${opcoes('letra', [['p', 'A−'], ['m', 'A'], ['g', 'A+'], ['gg', 'A++']])}
        <p class="previa-letra">${en ? 'This is how the text will look.' : 'É assim que o texto vai ficar.'}</p>
        ${interruptor('contraste', config.contraste === 'alto', 'Mais contraste', en ? 'Brighter text and stronger borders.' : 'Textos mais fortes e bordas mais visíveis.')}
        ${interruptor('movimento', config.movimento === 'reduzido', 'Menos movimento', en ? 'Turns off animations and transitions.' : 'Desliga animações e transições.')}
      </section>

      ${conectado ? `<section class="grupo-config">
        <h2>${en ? 'Topic queue: link the robot' : 'Fila de temas: ligar o robô'}</h2>
        <p class="subtitulo">${roboLigado ? (en ? '✓ The robot is already reading your queue.' : '✓ O robô já está lendo a sua fila.') : (en ? 'Done once: copy the key below and save it in GitHub → Onda → Settings → Secrets and variables → Actions → New repository secret, with the name DROPBOX_REFRESH_TOKEN. It only opens the Onda folder in your Dropbox. Never paste it anywhere else.' : 'Faça uma vez só: copie a chave abaixo e salve no GitHub → Onda → Settings → Secrets and variables → Actions → New repository secret, com o nome DROPBOX_REFRESH_TOKEN. Ela só abre a pasta do Onda no seu Dropbox. Não cole em nenhum outro lugar.')}</p>
        <button class="botao" type="button" data-chave-robo>${en ? 'Copy robot key' : 'Copiar a chave do robô'}</button>
      </section>` : ''}
      ${avisosHtml}
      ${saudeHtml}
      <section class="grupo-config">
        <h2>${t('Sobre o Onda')}</h2>
        <p class="subtitulo">${en ? 'Onda — from the world to you. Free, open source:' : 'Onda — do mundo até você. Gratuito e de código aberto:'} <a href="https://github.com/lucasyung2012-dev/Onda" target="_blank" rel="noopener noreferrer">github.com/lucasyung2012-dev/Onda</a></p>
      </section>
    </div>`;
}

// ---------- FILA DE TEMAS SUGERIDOS ----------

/**
 * Você sugere assuntos; o robô transforma o primeiro da fila no tema do
 * próximo dia (às 7h). `itens` = [{ id, texto, data }] com a data prevista.
 */
export function secaoFila(itens, { conectado, roboLigado }) {
  const en = emIngles();
  const aviso = !conectado
    ? `<p class="subtitulo">${en ? 'Connect Dropbox in My Onda to use the queue.' : 'Conecte o Dropbox no Meu Onda para usar a fila.'}</p>`
    : !roboLigado
      ? `<p class="subtitulo">${en ? 'Last step: link the robot to your Dropbox in Settings, so it can read the queue.' : 'Falta um passo: ligar o robô ao seu Dropbox, em Configurações, para ele conseguir ler a fila.'} <a href="#config">${t('Configurações')}</a></p>`
      : '';
  return `
    <div class="secao">
      <div class="secao-cabeca"><h2>${en ? 'Topic queue' : 'Fila de temas'}</h2><span>${itens.length}</span></div>
      <p class="subtitulo" style="margin:-6px 0 12px">${en
        ? 'Suggest something you want to learn. The first in line becomes the topic of the next day (or today, if before 7 a.m.). With an empty queue, the AI picks.'
        : 'Sugira algo que você quer aprender. O primeiro da fila vira o tema do próximo dia (ou de hoje, se for antes das 7h). Com a fila vazia, a IA escolhe sozinha.'}</p>
      ${aviso}
      <form class="sugerir" data-sugerir>
        <input id="campo-sugestao" type="text" maxlength="200" placeholder="${en ? 'e.g. How do US elections work?' : 'Ex.: Como funcionam as eleições nos EUA?'}" ${conectado ? '' : 'disabled'} enterkeyhint="send">
        <button class="botao principal" type="submit" ${conectado ? '' : 'disabled'}>${en ? 'Add' : 'Sugerir'}</button>
      </form>
      ${itens.length ? `<ol class="fila">${itens.map((x, i) => `
        <li class="fila-item">
          <span class="fila-data">${esc(x.rotuloData)}</span>
          <span class="fila-texto">${esc(x.texto)}</span>
          <span class="fila-acoes">
            <button type="button" class="botao-icone" data-fila="subir" data-id="${esc(x.id)}" aria-label="${en ? 'Move up' : 'Subir'}" style="--icone:var(--i-subir)" ${i === 0 ? 'disabled' : ''}></button>
            <button type="button" class="botao-icone" data-fila="descer" data-id="${esc(x.id)}" aria-label="${en ? 'Move down' : 'Descer'}" style="--icone:var(--i-descer)" ${i === itens.length - 1 ? 'disabled' : ''}></button>
            <button type="button" class="botao-icone" data-fila="tirar" data-id="${esc(x.id)}" aria-label="${en ? 'Remove' : 'Tirar da fila'}" style="--icone:var(--i-fechar)"></button>
          </span>
        </li>`).join('')}</ol>` : ''}
    </div>`;
}

// ---------- PAINEL DE INDICADORES ----------
// Tela principal: grade Brasil / Mundo. Ao tocar, a página do indicador
// com gráfico (períodos e toque para ver o valor) e "comparar com uma data".

const fmtNumero = (v, casas = 2) => new Intl.NumberFormat(emIngles() ? 'en-US' : 'pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
export const valorFormatado = (ind, v) => `${ind.prefixo || ''}${fmtNumero(v)}${ind.sufixo || ''}`;

/** Data do dado: "19/11/2026", "out/2026" (mensal) ou "2025" (anual). */
export function dataIndicador(ind, iso) {
  if (ind.frequencia === 'anual') return iso.slice(0, 4);
  if (ind.frequencia === 'mensal') {
    return new Intl.DateTimeFormat(emIngles() ? 'en-US' : 'pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
  }
  const [a, m, d] = iso.split('-');
  return emIngles() ? `${m}/${d}/${a}` : `${d}/${m}/${a}`;
}

/** Selo de variação: ▲ / ▼ com cor (subiu = âmbar, caiu = turquesa). */
export function selo(variacao, grande = false) {
  const n = variacao.porcento ?? variacao.pontos;
  if (n === null || n === undefined) return '';
  const classe = n > 0 ? 'sobe' : n < 0 ? 'desce' : 'igual';
  const seta = n > 0 ? '▲' : n < 0 ? '▼' : '•';
  const valor = new Intl.NumberFormat(emIngles() ? 'en-US' : 'pt-BR', { maximumFractionDigits: 2 }).format(Math.abs(n));
  return `<span class="selo ${classe} ${grande ? 'grande' : ''}">${seta} ${valor}${variacao.porcento !== undefined ? '%' : ' p.p.'}</span>`;
}

const periodoTexto = (c) => (c.periodo === 'ano anterior' ? (emIngles() ? 'vs. previous year' : 'vs. ano anterior') : (emIngles() ? 'in 30 days' : 'em 30 dias'));

// Símbolo grande e transparente no fundo de cada cartão
const DESENHOS = {
  gota: '<path d="M12 2.5C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2.5z"/>',
  grao: '<path d="M12 21V8M12 8c0-3 2-5 5-5 0 3-2 5-5 5zM12 8C12 5 10 3 7 3c0 3 2 5 5 5zM12 14c0-3 2-5 5-5 0 3-2 5-5 5zM12 14c0-3-2-5-5-5 0 3 2 5 5 5z"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  chama: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3-6 4-9 1 1.5 1.5 3 1.5 4.5C12.5 9 14 7 14 4.5c3 2.5 4.5 6 4.5 10 0 3.6-2.5 6.5-6.5 6.5z"/>',
  bomba: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M5 10h10M15 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
};
const SIMBOLOS = { dolar: '$', euro: '€', selic: '%', ipca: '%', juroseua: '%', yuan: '¥', petroleo: 'gota', wti: 'gota', commodities: 'grao', pibmundo: 'globo', inflacaomundo: 'chama', gasolina: 'bomba', 'gasolina-br': 'bomba' };
function simbolo(id) {
  const s = SIMBOLOS[id] || '•';
  if (DESENHOS[s]) return `<svg class="marca-fundo desenho" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DESENHOS[s]}</svg>`;
  return `<span class="marca-fundo" aria-hidden="true">${s}</span>`;
}

/** Curva suave passando pelos pontos (em vez de "zigue-zague"). */
function caminhoSuave(p) {
  if (p.length < 3) return p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, y0] = p[i - 1] || p[i]; const [x1, y1] = p[i]; const [x2, y2] = p[i + 1]; const [x3, y3] = p[i + 2] || p[i + 1];
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

/** Mini gráfico dos últimos 30 dias (ou dos últimos pontos, nos mensais e anuais). */
function miniGrafico(ind) {
  const pts = ind.frequencia === 'diaria' ? pontosDoPeriodo(ind, '30d') : ind.serie.slice(-12);
  if (pts.length < 2) return '';
  const vs = pts.map(([, v]) => v); const min = Math.min(...vs); const max = Math.max(...vs);
  const xy = pts.map(([, v], i) => [(i / (pts.length - 1)) * 100, max === min ? 12 : 22 - ((v - min) / (max - min)) * 20]);
  return `<svg class="mini-grafico" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d="${caminhoSuave(xy)}" vector-effect="non-scaling-stroke"/></svg>`;
}

const classeVariacao = (c) => { const n = c.porcento ?? c.pontos; return n > 0 ? 'sobe' : n < 0 ? 'desce' : ''; };

/** Faixa compacta no Hoje. */
export function resumoIndicadores(dados) {
  if (!dados?.indicadores?.length) return '';
  const en = emIngles();
  return `
    <div class="secao">
      <div class="secao-cabeca"><h2>${en ? 'The world in numbers' : 'O mundo em números'}</h2><a href="#indicadores">${en ? 'See all' : 'Ver todos'}</a></div>
      <div class="faixa-indicadores">
        ${dados.indicadores.filter((ind) => !ind.oculto).map((ind) => `
          <a class="mini-indicador ${classeVariacao(ind.comparacao)}" href="#indicadores/${esc(ind.id)}">
            ${simbolo(ind.id)}
            <span class="nome">${esc(t(ind.nome))}</span>
            <strong>${valorFormatado(ind, ind.ultimo.valor)}</strong>
            ${selo(ind.comparacao)}
            ${miniGrafico(ind)}
          </a>`).join('')}
      </div>
    </div>`;
}

/** Tela principal do painel: abas Brasil / Mundo e cartões. */
export function telaIndicadores(dados, grupoEscolhido = 'brasil') {
  const en = emIngles();
  const titulo = en ? 'The world in numbers' : 'O mundo em números';
  if (!dados?.indicadores?.length) {
    return `<div class="tela">${cabecalho('Indicadores', titulo)}<p class="vazio">${en ? 'Could not load the indicators. Check your connection.' : 'Não deu para carregar os indicadores. Confira a conexão.'}</p></div>`;
  }
  const grupo = grupoEscolhido === 'mundo' ? 'mundo' : 'brasil';
  const lista = dados.indicadores.filter((i) => i.grupo === grupo && !i.oculto);
  const direto = dados.direto ? (en ? ' (read straight from the sources)' : ' (lido direto das fontes)') : '';
  return `
    <div class="tela">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Hoje')}</button>
      ${cabecalho('Indicadores', titulo, en ? 'Official numbers that show how events abroad reach Brazil. Tap one to see more. Context, not investment advice.' : 'Números oficiais que mostram como o que acontece lá fora chega ao Brasil. Toque num deles para ver mais. É contexto, não dica de investimento.')}
      <div class="segmentos" style="--qtd:2;--pos:${grupo === 'mundo' ? 1 : 0};margin-top:14px" role="group">
        <span class="indicador"></span>
        <button type="button" data-grupo-ind="brasil" aria-pressed="${grupo === 'brasil'}">${en ? 'Brazil' : 'Brasil'}</button>
        <button type="button" data-grupo-ind="mundo" aria-pressed="${grupo === 'mundo'}">${en ? 'World' : 'Mundo'}</button>
      </div>
      <div class="grade-indicadores cascata" style="margin-top:14px">
        ${lista.map((ind, i) => `
          <a class="cartao-indicador ${classeVariacao(ind.comparacao)}" href="#indicadores/${esc(ind.id)}" style="--i:${i}">
            ${simbolo(ind.id)}
            <span class="nome">${esc(t(ind.nome))}</span>
            <strong class="valor">${valorFormatado(ind, ind.ultimo.valor)}</strong>
            ${selo(ind.comparacao)}
            <small>${periodoTexto(ind.comparacao)} · ${esc(dataIndicador(ind, ind.ultimo.data))}</small>
            ${miniGrafico(ind)}
          </a>`).join('')}
      </div>
      <p class="aviso-ia">${en ? 'Updated' : 'Atualizado'} ${dataHora(dados.geradoEm)}${direto}.</p>
    </div>`;
}

/** Os pontos do período escolhido (30d, 6m, 1a, 5a ou tudo). */
export function pontosDoPeriodo(ind, periodo) {
  const dias = { '30d': 31, '6m': 183, '1a': 366, '5a': 1830 }[periodo];
  if (!dias || ind.frequencia === 'anual') return ind.serie;
  const ultimo = new Date(`${ind.ultimo.data}T12:00:00Z`).getTime();
  const corte = new Date(ultimo - dias * 86400000).toISOString().slice(0, 10);
  return ind.serie.filter(([d]) => d >= corte);
}

/** Gráfico do período: curva suave, degradê, linhas de grade e o ponto de hoje. O app mostra o valor do ponto tocado. */
function graficoIndicador(ind, pontos) {
  if (pontos.length < 2) return '';
  const L = 320; const A = 130; const m = 8;
  const valores = pontos.map(([, v]) => v);
  const min = Math.min(...valores); const max = Math.max(...valores);
  const x = (i) => m + (i / (pontos.length - 1)) * (L - 2 * m);
  const y = (v) => (max === min ? A / 2 : m + (1 - (v - min) / (max - min)) * (A - 2 * m - 10));
  const xy = pontos.map(([, v], i) => [x(i), y(v)]);
  const linha = caminhoSuave(xy);
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)} ${A} L${x(0).toFixed(1)} ${A} Z`;
  const subiu = pontos[pontos.length - 1][1] >= pontos[0][1];
  const grade = [0.25, 0.5, 0.75].map((f) => `<line class="grafico-grade" x1="0" x2="${L}" y1="${(A * f).toFixed(1)}" y2="${(A * f).toFixed(1)}" vector-effect="non-scaling-stroke"/>`).join('');
  const [xf, yf] = xy[xy.length - 1];
  const id = `grad-${esc(ind.id)}`;
  return `
    <div class="grafico grafico-interativo ${subiu ? 'sobe' : 'desce'}" data-grafico="${esc(ind.id)}">
      <div class="grafico-dica" hidden></div>
      <div class="grafico-caixa">
      <svg viewBox="0 0 ${L} ${A}" preserveAspectRatio="none" role="img" aria-label="${emIngles() ? 'Chart' : 'Gráfico'}">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cor-grafico);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--cor-grafico);stop-opacity:0"/></linearGradient></defs>
        ${grade}
        <path d="${area}" fill="url(#${id})"/><path d="${linha}" class="grafico-linha" vector-effect="non-scaling-stroke"/>
        <line class="grafico-cursor" x1="0" x2="0" y1="0" y2="${A}" vector-effect="non-scaling-stroke" visibility="hidden"/>
      </svg>
      <span class="grafico-ponto" style="left:${((xf / L) * 100).toFixed(2)}%;top:${((yf / A) * 100).toFixed(2)}%"></span>
      </div>
      <div class="grafico-legenda"><span>${esc(dataIndicador(ind, pontos[0][0]))}</span><span>${emIngles() ? 'min' : 'mín.'} ${valorFormatado(ind, min)} · ${emIngles() ? 'max' : 'máx.'} ${valorFormatado(ind, max)}</span><span>${esc(dataIndicador(ind, pontos[pontos.length - 1][0]))}</span></div>
    </div>`;
}

/**
 * Página de um indicador.
 * `escolha` = { periodo, dataComparar } — o que você escolheu nos botões e no calendário.
 */
export function telaIndicador(ind, explicacao, noticias, escolha) {
  const en = emIngles();
  if (!ind) return `<div class="tela"><p class="vazio">${en ? 'Indicator not found.' : 'Indicador não encontrado.'}</p></div>`;
  const c = ind.comparacao;
  const n = c.porcento ?? c.pontos;
  const ex = explicacao || {};
  const periodos = ind.frequencia === 'anual'
    ? [['tudo', en ? 'All' : 'Tudo']]
    : [['30d', en ? '30 days' : '30 dias'], ['6m', en ? '6 months' : '6 meses'], ['1a', en ? '1 year' : '1 ano'], ['5a', en ? '5 years' : '5 anos']];
  const periodo = periodos.some(([p]) => p === escolha.periodo) ? escolha.periodo : periodos[Math.min(2, periodos.length - 1)][0];

  return `
    <div class="tela pagina-indicador" data-indicador="${esc(ind.id)}">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${en ? 'Indicators' : 'Indicadores'}</button>
      ${ind.id.startsWith('gasolina') ? `
      <div class="segmentos" style="--qtd:2;--pos:${ind.id === 'gasolina' ? 0 : 1};margin-top:10px" role="group">
        <span class="indicador"></span>
        <a class="aba-link" href="#indicadores/gasolina" aria-pressed="${ind.id === 'gasolina'}">São Paulo</a>
        <a class="aba-link" href="#indicadores/gasolina-br" aria-pressed="${ind.id === 'gasolina-br'}">${en ? 'Brazil' : 'Brasil'}</a>
      </div>` : ''}
      <div class="indicador-capa ${n > 0 ? 'sobe' : n < 0 ? 'desce' : ''}">
        ${simbolo(ind.id)}
        <p class="rotulo">${esc(t(ind.nome))} · ${ind.grupo === 'mundo' ? (en ? 'World' : 'Mundo') : (en ? 'Brazil' : 'Brasil')}</p>
        <p class="valor-gigante">${valorFormatado(ind, ind.ultimo.valor)}</p>
        <p class="subtitulo">${esc(ind.unidade)} · ${en ? 'data from' : 'dado de'} ${esc(dataIndicador(ind, ind.ultimo.data))}${ind.erro ? (en ? ' · not updated today' : ' · não atualizado hoje') : ''}</p>
        <div class="de-para">
          ${selo(c, true)}
          <span>${periodoTexto(c)}</span>
        </div>
        <p class="de-para-valores">${valorFormatado(ind, c.de.valor)} <small>(${esc(dataIndicador(ind, c.de.data))})</small> → <strong>${valorFormatado(ind, ind.ultimo.valor)}</strong></p>
      </div>

      <div class="segmentos periodos" style="--qtd:${periodos.length};--pos:${periodos.findIndex(([p]) => p === periodo)}" role="group" aria-label="${en ? 'Period' : 'Período'}">
        <span class="indicador"></span>
        ${periodos.map(([p, nome]) => `<button type="button" data-periodo="${p}" aria-pressed="${p === periodo}">${nome}</button>`).join('')}
      </div>
      <div id="grafico-area">${graficoIndicador(ind, pontosDoPeriodo(ind, periodo))}</div>

      <div class="cartao comparar">
        <p class="rotulo">${en ? 'Compare with a date' : 'Comparar com uma data'}</p>
        <input type="date" id="data-comparar" min="${esc(ind.serie[0][0])}" max="${esc(ind.ultimo.data)}" value="${esc(escolha.dataComparar || c.de.data)}">
        <div id="resultado-comparar">${resultadoComparacao(ind, escolha.dataComparar || c.de.data)}</div>
      </div>

      <div class="explica-cartoes">
        ${ex.oQueE ? `<div class="cartao"><p class="rotulo">${en ? 'What it is' : 'O que é'}</p><p>${esc(ex.oQueE)}</p></div>` : ''}
        ${ex.mundo ? `<div class="cartao"><p class="rotulo">${en ? 'What moves it' : 'O que mexe nele'}</p><p>${esc(ex.mundo)}</p></div>` : ''}
        ${ex.voce ? `<div class="cartao voce"><p class="rotulo ouro">${en ? 'How it reaches you' : 'Como chega em você'}</p><p>${esc(ex.voce)}</p></div>` : ''}
      </div>

      ${noticias.length ? `<div class="secao"><div class="secao-cabeca"><h2>${en ? "In today's news" : 'Nas notícias de hoje'}</h2></div>
        ${noticias.map((f) => `<button type="button" class="linha-compacta" data-fato="${esc(f.id)}"><span class="n">•</span><span><strong>${esc(f.titulo)}</strong><small>${f.fontes} ${en ? 'sources' : 'fontes'}</small></span><span class="icone i-seta" aria-hidden="true"></span></button>`).join('')}</div>` : ''}

      <p class="fonte-indicador">${en ? 'Source' : 'Fonte'}: <a href="${esc(ind.link)}" target="_blank" rel="noopener noreferrer">${esc(ind.fonte)}</a></p>
    </div>`;
}

/** "Em 15/10/2026: R$ 5,05 → hoje R$ 5,89 (▲ 16,6%)" */
export function resultadoComparacao(ind, dataIso) {
  const en = emIngles();
  let ponto = null;
  for (const p of ind.serie) { if (p[0] <= dataIso) ponto = p; else break; }
  if (!ponto) return `<p class="subtitulo">${en ? 'No data before this date.' : 'Sem dado antes dessa data.'}</p>`;
  const [d, v] = ponto;
  const atual = ind.ultimo.valor;
  const variacao = ind.taxa ? { pontos: Math.round((atual - v) * 100) / 100 } : { porcento: Math.round(((atual - v) / v) * 1000) / 10 };
  const outroDia = d !== dataIso ? `<small> (${en ? 'closest data' : 'dado mais próximo'}: ${esc(dataIndicador(ind, d))})</small>` : '';
  return `
    <div class="comparacao-linha">
      <div><span class="subtitulo">${en ? 'On that date' : 'Naquela data'}</span><strong>${valorFormatado(ind, v)}</strong>${outroDia}</div>
      <span class="seta-comparar">→</span>
      <div><span class="subtitulo">${en ? 'Latest' : 'Agora'}</span><strong>${valorFormatado(ind, atual)}</strong></div>
      ${selo(variacao, true)}
    </div>`;
}

/**
 * Etapa 7 — Busca em tudo: as notícias de hoje, as edições anteriores
 * (destaque e os 5 de cada dia), os temas e as suas análises.
 */
function resultadosBusca(dados, busca, limite, { edicoes = [], temas = [], meus = [] }) {
  const en = emIngles();
  const termo = semAcento(busca.trim().toLowerCase());
  const tem = (...textos) => textos.some((x) => x && semAcento(String(x).toLowerCase()).includes(termo));

  const hoje = dados.fatos.filter((f) => tem(f.titulo, ...f.materias.map((m) => m.titulo)));
  const dias = edicoes.filter((e) => tem(e.titulo, ...(e.outros || [])));
  const aulas = temas.filter((x) => tem(x.titulo, x.pergunta));
  const minhas = meus.filter((i) => tem(i.titulo, i.minha?.texto, i.minha?.palpite));
  const total = hoje.length + dias.length + aulas.length + minhas.length;

  const bloco = (titulo, qtd, corpo) => (qtd ? `<div class="secao" style="margin-top:20px"><div class="secao-cabeca"><h2 style="font-size:17px">${titulo}</h2><span>${qtd}</span></div>${corpo}</div>` : '');
  const linha = (href, n, titulo, sub) => `<a class="linha-compacta" href="${href}"><span class="n">${n}</span><span><strong>${esc(titulo)}</strong><small>${sub}</small></span><span class="icone i-seta" aria-hidden="true"></span></a>`;

  return `
    <p class="subtitulo" style="margin:14px 0 4px">${total} ${en ? 'result(s) for' : 'resultado(s) para'} “${esc(busca)}”</p>
    ${bloco(en ? 'Past editions' : 'Edições anteriores', dias.length, dias.map((e) => {
      const outro = (e.outros || []).find((o) => tem(o));
      return linha(`#edicao/${esc(e.data)}`, '★', tem(e.titulo) ? e.titulo : outro, `${esc(dataCurta(e.data))} · ${tem(e.titulo) ? (en ? 'story of the day' : 'destaque do dia') : (en ? 'also mattered' : 'também importou')}`);
    }).join(''))}
    ${bloco(en ? 'Topics' : 'Temas', aulas.length, aulas.map((x) => linha(`#tema/${esc(x.data)}`, '◆', x.titulo, `${esc(dataCurta(x.data))} · ${esc(x.pergunta || '')}`)).join(''))}
    ${bloco(en ? 'Your analyses' : 'Suas análises', minhas.length, minhas.map((i) => linha(`#analise-minha/${esc(i.id)}`, '☆', i.titulo, `${esc(dataCurta(i.data))} · ${i.minha?.texto ? (en ? 'with your analysis' : 'com a sua análise') : (en ? 'followed' : 'acompanhada')}`)).join(''))}
    ${bloco(en ? 'Today’s news' : 'Notícias de hoje', hoje.length, listaDeFatos(hoje, dados, limite))}
    ${total ? '' : `<p class="vazio">${en ? 'Nothing found. Try another word.' : 'Nada encontrado. Tente outra palavra.'}</p>`}`;
}

// ---------- SAÚDE DO ONDA ----------
// Mostra quando cada robô trabalhou pela última vez e o que falhou.
// `itens` = [{ nome, quando (ISO), ok (true/false/null), detalhe }]

export function secaoSaude(itens) {
  const en = emIngles();
  return `
    <section class="grupo-config">
      <h2>${en ? 'Onda health' : 'Saúde do Onda'}</h2>
      <p class="subtitulo">${en ? 'When each robot last worked and what failed.' : 'Quando cada robô trabalhou pela última vez e o que falhou.'}</p>
      <div class="saude">
        ${itens.map((x) => `
          <div class="saude-item ${x.ok === false ? 'ruim' : x.ok === null ? 'atencao' : 'bom'}">
            <span class="saude-ponto" aria-hidden="true"></span>
            <div><strong>${esc(x.nome)}</strong><small>${x.quando ? `${en ? 'last' : 'última vez'}: ${dataHora(x.quando)}` : (en ? 'no data' : 'sem dado')}${x.detalhe ? ` · ${esc(x.detalhe)}` : ''}</small></div>
          </div>`).join('')}
      </div>
    </section>`;
}

/** Faixa de aviso no Hoje quando algum robô está atrasado. */
export function avisoAtraso(texto) {
  return `<a class="aviso-atraso" href="#config"><span aria-hidden="true">⚠</span><span>${esc(texto)}</span></a>`;
}

// ---------- SUA SEMANA NO ONDA ----------
// Um resumo dos últimos 7 dias: os destaques, os temas, o que você
// acompanhou e escreveu, e como os principais números se mexeram.

export function telaSemana({ dataHoje, edicoes, temas, meus, indicadores }) {
  const en = emIngles();
  const fim = dataHoje;
  const inicio = new Date(new Date(`${dataHoje}T12:00:00Z`).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const naSemana = (d) => d >= inicio && d <= fim;
  const dias = (edicoes || []).filter((e) => naSemana(e.data));
  const aulas = (temas || []).filter((x) => naSemana(x.data));
  const minhas = (meus || []).filter((i) => naSemana(i.data));
  const escritas = minhas.filter((i) => i.minha?.texto).length;
  const palpites = minhas.filter((i) => i.minha?.palpite).length;

  // Como os números se mexeram em 7 dias
  const semanaDe = (ind) => {
    let antes = null;
    const alvo = new Date(new Date(`${ind.ultimo.data}T12:00:00Z`).getTime() - 7 * 86400000).toISOString().slice(0, 10);
    for (const p of ind.serie) { if (p[0] <= alvo) antes = p; else break; }
    if (!antes) return null;
    return ind.taxa ? { pontos: Math.round((ind.ultimo.valor - antes[1]) * 100) / 100 } : { porcento: Math.round(((ind.ultimo.valor - antes[1]) / antes[1]) * 1000) / 10 };
  };
  const principais = ['dolar', 'petroleo', 'gasolina', 'juroseua']
    .map((id) => (indicadores?.indicadores || []).find((i) => i.id === id)).filter(Boolean);

  // O destaque mais "pesado" da semana, pela nota de importância
  const maior = [...dias].sort((a, b) => b.notas.geral - a.notas.geral)[0];

  return `
    <div class="tela">
      <button class="voltar-texto" type="button" data-voltar><span class="icone i-voltar" aria-hidden="true"></span>${t('Meu Onda')}</button>
      <div class="semana-capa">
        <p class="rotulo">${en ? 'Your week on Onda' : 'Sua semana no Onda'}</p>
        <h1>${esc(dataCurta(inicio))} – ${esc(dataCurta(fim))}</h1>
        <div class="semana-numeros">
          <div><strong>${dias.length}</strong><span>${en ? 'editions' : 'edições'}</span></div>
          <div><strong>${aulas.length}</strong><span>${en ? 'topics' : 'temas'}</span></div>
          <div><strong>${minhas.length}</strong><span>${en ? 'followed' : 'acompanhadas'}</span></div>
          <div><strong>${escritas}</strong><span>${en ? 'analyses' : 'análises'}</span></div>
        </div>
      </div>

      ${maior ? `
        <div class="secao">
          <div class="secao-cabeca"><h2>${en ? 'The biggest story of the week' : 'O fato mais importante da semana'}</h2></div>
          <a class="linha-compacta destaque-compacto" href="#edicao/${esc(maior.data)}"><span class="n">★</span><span><strong>${esc(maior.titulo)}</strong><small>${esc(dataCurta(maior.data))} · ${en ? 'importance' : 'importância'} ${maior.notas.geral} · ${en ? 'you' : 'você'} ${maior.notas.voce}</small></span><span class="icone i-seta" aria-hidden="true"></span></a>
        </div>` : ''}

      <div class="secao">
        <div class="secao-cabeca"><h2>${en ? 'Stories of the day' : 'Destaques de cada dia'}</h2><span>${dias.length}</span></div>
        ${dias.length ? dias.map((e) => `<a class="linha-compacta" href="#edicao/${esc(e.data)}"><span class="n" style="font-size:12px">${esc(dataCurta(e.data))}</span><span><strong>${esc(e.titulo)}</strong><small>${en ? 'scores' : 'notas'} ${e.notas.geral} · ${e.notas.mundo} · ${e.notas.voce}</small></span><span class="icone i-seta" aria-hidden="true"></span></a>`).join('') : `<p class="vazio">${en ? 'No editions this week yet.' : 'Ainda sem edições nesta semana.'}</p>`}
      </div>

      ${aulas.length ? `
        <div class="secao">
          <div class="secao-cabeca"><h2>${en ? 'What you could learn' : 'O que deu para aprender'}</h2><span>${aulas.length}</span></div>
          ${aulas.map((x) => `<a class="linha-compacta" href="#tema/${esc(x.data)}"><span class="n">◆</span><span><strong>${esc(x.titulo)}</strong><small>${esc(x.pergunta || '')}</small></span><span class="icone i-seta" aria-hidden="true"></span></a>`).join('')}
        </div>` : ''}

      ${principais.length ? `
        <div class="secao">
          <div class="secao-cabeca"><h2>${en ? 'Numbers in 7 days' : 'Os números em 7 dias'}</h2><a href="#indicadores">${en ? 'Panel' : 'Painel'}</a></div>
          <div class="grade-indicadores">
            ${principais.map((ind) => { const v = semanaDe(ind); return `
              <a class="cartao-indicador ${v ? ((v.porcento ?? v.pontos) > 0 ? 'sobe' : (v.porcento ?? v.pontos) < 0 ? 'desce' : '') : ''}" href="#indicadores/${esc(ind.id)}" style="min-height:110px">
                <span class="nome">${esc(t(ind.nome))}</span>
                <strong class="valor">${valorFormatado(ind, ind.ultimo.valor)}</strong>
                ${v ? selo(v) : ''}
                <small>${en ? 'in 7 days' : 'em 7 dias'}</small>
              </a>`; }).join('')}
          </div>
        </div>` : ''}

      <div class="secao">
        <div class="secao-cabeca"><h2>${en ? 'You' : 'Você'}</h2></div>
        <div class="cartao semana-voce">
          ${minhas.length
            ? `<p>${en ? `You followed <b>${minhas.length}</b> stories, wrote <b>${escritas}</b> analyses and made <b>${palpites}</b> guesses this week.` : `Você acompanhou <b>${minhas.length}</b> notícias, escreveu <b>${escritas}</b> análises e fez <b>${palpites}</b> palpites nesta semana.`}</p>`
            : `<p>${en ? 'You did not follow any stories this week. Tap ☆ Follow on something that catches your eye.' : 'Você não acompanhou nenhuma notícia nesta semana. Toque em ☆ Acompanhar no que chamar a sua atenção.'}</p>`}
        </div>
      </div>
    </div>`;
}

/** Cartão-atalho para "Sua semana no Onda". */
export function atalhoSemana() {
  const en = emIngles();
  return `<a class="semana-atalho" href="#semana"><span><strong>${en ? 'Your week on Onda' : 'Sua semana no Onda'}</strong><small>${en ? 'The stories, topics and numbers of the last 7 days' : 'Os destaques, temas e números dos últimos 7 dias'}</small></span><span class="icone i-seta" aria-hidden="true"></span></a>`;
}

// ---------- AVISO NO CELULAR (Configurações) ----------

export function secaoAvisos(sit, conectado) {
  const en = emIngles();
  let corpo;
  if (!sit) corpo = `<p class="subtitulo">${en ? 'Checking…' : 'Verificando…'}</p>`;
  else if (sit.precisaInstalar) {
    corpo = `<p class="subtitulo">${en
      ? 'On iPhone and iPad, notifications only work with Onda installed: in Safari, tap Share → Add to Home Screen, then open Onda from the icon and come back here.'
      : 'No iPhone e no iPad, os avisos só funcionam com o Onda instalado: no Safari, toque em Compartilhar → Adicionar à Tela de Início, abra o Onda pelo ícone e volte aqui.'}</p>`;
  } else if (!sit.suportado) {
    corpo = `<p class="subtitulo">${en ? 'This browser cannot receive notifications.' : 'Este navegador não consegue receber avisos.'}</p>`;
  } else if (!conectado) {
    corpo = `<p class="subtitulo">${en ? 'Connect Dropbox in My Onda first: the robot finds your device through it.' : 'Conecte o Dropbox no Meu Onda primeiro: é por ele que o robô encontra o seu aparelho.'}</p>`;
  } else if (sit.permissao === 'denied') {
    corpo = `<p class="subtitulo">${en ? 'Notifications are blocked. Allow them in Settings → Notifications → Onda.' : 'Os avisos estão bloqueados. Libere em Ajustes → Notificações → Onda.'}</p>`;
  } else if (sit.ativo) {
    corpo = `
      <p class="subtitulo">✓ ${en ? 'On. Every morning, when the story of the day is ready (around 7 a.m.), you get a notification on this device.' : 'Ligado. Toda manhã, quando o destaque do dia ficar pronto (por volta das 7h), chega um aviso neste aparelho.'}</p>
      <button class="botao" type="button" data-avisos="desativar">${en ? 'Turn off on this device' : 'Desligar neste aparelho'}</button>`;
  } else {
    corpo = `
      <p class="subtitulo">${en ? 'Get a notification every morning when the story of the day is ready.' : 'Receba um aviso toda manhã quando o destaque do dia ficar pronto.'}</p>
      <button class="botao principal" type="button" data-avisos="ativar">${en ? 'Turn on notifications' : 'Ativar avisos'}</button>`;
  }
  return `<section class="grupo-config"><h2>${en ? 'Morning notification' : 'Aviso no celular às 7h'}</h2>${corpo}</section>`;
}
