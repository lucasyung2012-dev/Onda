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

export function telaHoje(analise, dados) {
  const topo = cabecalho('Radar de hoje', esc(dataPorExtenso(dados.dataReferencia)),
    `${numero(dados.totalNoticias)} notícias de ${dados.totalFontes} fontes · atualizado às ${hora(dados.geradoEm)}`);

  const temAnalise = analise && analise.status === 'ok' && analise.destaque;
  const atalhos = `
    <div class="atalhos cascata">
      <a class="atalho" href="#explorar" style="--i:1"><strong>${numero(dados.fatos.length)}</strong><span>${t('fatos para explorar por região, assunto ou fonte')}</span></a>
      <a class="atalho tema" href="#temas" style="--i:2"><span>${t('Tema do dia')}</span><strong style="font-size:17px">${t('Entender o mundo')}</strong></a>
    </div>
    <a class="botao largo" href="#edicoes" style="margin-top:10px">${t('Edições anteriores')} <span class="icone i-seta" aria-hidden="true"></span></a>`;

  if (!temAnalise) return `<div class="tela">${topo}${semAnalise(analise, dados)}<div class="secao">${atalhos}</div></div>`;

  const d = analise.destaque;
  const deOutroDia = analise.dataReferencia !== dados.dataReferencia;
  const rotuloCapa = deOutroDia ? `${t('Destaque de')} ${dataCurta(analise.dataReferencia)}` : t('Destaque do dia');
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
            <p class="rotulo ouro">${t('Como chega em você')}</p>
            <p>${esc(d.emUmaFrase)}</p>
          </div>
          <a class="botao principal largo" href="#analise" style="margin-top:14px">${t('Ler a análise completa')} <span class="icone i-seta" aria-hidden="true"></span></a>
          <p class="aviso-ia"><span class="icone i-ia" aria-hidden="true"></span>${analise.versao > 1 ? `Versão ${analise.versao} · refeita às ${hora(analise.geradoEm)}` : `Análise feita por IA às ${hora(analise.geradoEm)}`} a partir de ${d.fontesUsadas.length} matérias. Confira nas fontes.</p>
        </div>
        <div class="secao">
          <div class="secao-cabeca"><h2>${t('Também importa hoje')}</h2></div>
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
        <button type="button" data-modo="regioes" aria-pressed="${modo === 'regioes'}">${t('Regiões')}</button>
        <button type="button" data-modo="assuntos" aria-pressed="${modo === 'assuntos'}">${t('Assuntos')}</button>
        <button type="button" data-modo="fontes" aria-pressed="${modo === 'fontes'}">${t('Fontes')}</button>
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
      <ul class="lista-fontes cascata" style="margin-top:8px">
        ${porPais[pais].sort((a, b) => b.total - a.total).map((c, i) => `
          <li style="--i:${Math.min(i, 8)}"><button class="linha-fonte" type="button" data-gaveta="fonte/${encodeURIComponent(c.nome)}">
            <span class="nome-fonte">${logoFonte(c.nome, dados.dominios?.[c.nome])}<span>${esc(c.nome)}${c.estatal ? ' <span class="etiqueta estatal" style="margin-left:4px">' + t('Estatal') + '</span>' : ''}</span></span>
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
export function telaTemas(tema, indice) {
  const temHoje = tema?.status === 'ok';
  const anteriores = (indice?.temas || []).filter((t) => !temHoje || t.data !== tema.dataReferencia);
  const capa = temHoje ? `
    <a class="tema-do-dia" href="#tema/${esc(tema.dataReferencia)}" style="margin-top:18px;display:block;text-decoration:none">
      <p class="rotulo">Tema do dia · ${esc(dataCurta(tema.dataReferencia))}</p>
      <h2>${esc(tema.titulo)}</h2>
      <p style="font-family:var(--fonte-titulo);font-size:17px;color:#fff;margin-bottom:10px">${esc(tema.pergunta)}</p>
      <div class="passos-tema">${tema.cadeia.slice(0, 4).map((c) => `<span>${esc(curto(c.passo))}</span>`).join('<i>›</i>')}<i>›</i><span>${t('Você')}</span></div>
      <p>${esc(tema.emUmaFrase)}</p>
      <span class="botao" style="margin-top:14px;background:rgba(255,255,255,.14);border:0;color:#fff">${t('Ler a explicação')} <span class="icone i-seta" aria-hidden="true"></span></span>
    </a>` : `
    <div class="tema-do-dia" style="margin-top:18px">
      <p class="rotulo">${t('Tema do dia')}</p>
      <h2>O primeiro tema chega com a primeira análise</h2>
      <p>Todo dia, às 7h, o Onda escolhe um assunto para entender o mundo — de qualquer época — e explica do começo até você, usando só fontes que dá para conferir (Wikipedia e notícias). Precisa da chave da IA configurada.</p>
    </div>`;

  return `
    <div class="tela">
      ${cabecalho('Temas', 'Entender o mundo', 'Não é notícia: é a explicação de um assunto, do começo até o seu dia a dia.')}
      ${capa}
      <div class="secao">
        <div class="secao-cabeca"><h2>${t('Temas anteriores')}</h2><span>${anteriores.length}</span></div>
        ${anteriores.length
          ? `<div class="temas-lista cascata">${anteriores.map((t, i) => `
              <a class="tema-item" href="#tema/${esc(t.data)}" style="--i:${Math.min(i, 10)};text-decoration:none;color:inherit">
                <span><strong style="display:block;font-weight:600">${esc(t.titulo)}</strong><small style="white-space:normal">${esc(t.pergunta)}</small></span>
                <small>${esc(dataCurta(t.data))}</small>
              </a>`).join('')}</div>`
          : '<p class="vazio">' + t('Os temas vão se acumulando aqui, um por dia.') + '</p>'}
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
          <p class="rotulo">Tema do dia · ${esc(dataCurta(tema.dataReferencia))}</p>
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
        <p class="rotulo">Tema do dia · ${esc(dataCurta(tema.dataReferencia))}</p>
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

/** Botão de estrela "Acompanhar". `cheio` = já chegou ao limite de hoje. */
export function botaoAcompanhar(id, ativo, contagem, limite, cheio) {
  if (ativo) {
    return `<div class="acompanhar-linha">
      <button class="botao acompanhar ativo" type="button" data-acompanhar="${esc(id)}"><span class="estrela" aria-hidden="true">★</span>${t('Acompanhando')}</button>
      <a class="botao principal" href="#analise-minha/${esc(id)}">${t('Minha análise')} <span class="icone i-seta" aria-hidden="true"></span></a>
    </div>`;
  }
  return `<div class="acompanhar-linha">
    <button class="botao acompanhar" type="button" data-acompanhar="${esc(id)}" ${cheio ? 'data-cheio' : ''}><span class="estrela" aria-hidden="true">☆</span>${t('Acompanhar')}</button>
    <span class="subtitulo">${contagem}/${limite} hoje</span>
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

export function telaMeu({ situacao, nomeConta, hoje, anteriores, limite, dados, historico }) {
  let conta;
  if (!situacao.configurado) {
    conta = `<div class="cartao meu-cartao"><div class="avatar"><span class="icone i-pessoa" aria-hidden="true"></span></div>
      <h2>Falta ligar o Dropbox</h2><p>Por enquanto, o que você acompanha fica salvo só neste aparelho.</p></div>`;
  } else if (!situacao.conectado) {
    conta = `<div class="cartao meu-cartao"><div class="avatar"><span class="icone i-pessoa" aria-hidden="true"></span></div>
      <h2>${t('Conecte o seu Dropbox')}</h2><p>Assim o que você acompanha e as suas análises ficam iguais no celular e no iPad. O Onda só enxerga a pasta dele, dentro de Apps.</p>
      <button class="botao principal" type="button" data-dropbox="conectar" style="margin-top:6px">${t('Conectar o Dropbox')}</button></div>`;
  } else {
    const quando = situacao.ultimaSincronizacao ? `sincronizado às ${hora(situacao.ultimaSincronizacao.toISOString())}` : 'sincronizando…';
    conta = `<div class="cartao conta-linha">
      <div><strong>${t('Dropbox conectado')}</strong><p class="subtitulo">${esc(nomeConta || '')}${nomeConta ? ' · ' : ''}${situacao.ultimoErro ? `<span style="color:var(--perigo)">sem sincronizar: ${esc(situacao.ultimoErro)}</span>` : quando}</p></div>
      <button class="botao" type="button" data-dropbox="sincronizar">${t('Sincronizar')}</button>
    </div>`;
  }

  return `
    <div class="tela">
      ${cabecalho('Meu Onda', 'O que você acompanha', `Até ${limite} notícias por dia. Em cada uma, se quiser, a sua análise fica guardada.`)}
      <div style="margin-top:16px">${conta}</div>
      <div class="secao">
        <div class="secao-cabeca"><h2>${t('Hoje')}</h2><span>${hoje.length}/${limite}</span></div>
        ${hoje.length ? `<div class="importa cascata">${hoje.map((it, i) => linhaMeu(it, dados, i)).join('')}</div>`
          : '<p class="vazio">Toque em ☆ Acompanhar numa notícia (no destaque, nos 5 do dia ou no Explorar).</p>'}
      </div>
      <div class="secao">
        <div class="secao-cabeca"><h2>${t('Dia a dia')}</h2><span>${anteriores.length} acompanhadas antes</span></div>
        <p class="subtitulo" style="margin:-6px 0 12px">Cada dia guarda sozinho a edição do Onda (destaque + 5) e o que você acompanhou.</p>
        ${historico}
      </div>
      ${situacao.conectado ? '<button class="botao largo" type="button" data-dropbox="desconectar" style="margin-top:28px">' + t('Desconectar este aparelho') + '</button>' : ''}
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

export function telaConfig(config) {
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

      <section class="grupo-config">
        <h2>${t('Sobre o Onda')}</h2>
        <p class="subtitulo">${en ? 'Onda — from the world to you. Free, open source:' : 'Onda — do mundo até você. Gratuito e de código aberto:'} <a href="https://github.com/lucasyung2012-dev/Onda" target="_blank" rel="noopener noreferrer">github.com/lucasyung2012-dev/Onda</a></p>
      </section>
    </div>`;
}
