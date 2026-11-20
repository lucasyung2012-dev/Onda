// =============================================================
// telas.js — Monta o HTML de cada tela a partir dos dados.
//
// Cada função recebe os dados e devolve um texto HTML. Quem coloca
// esse HTML na página é o app.js. Separar assim deixa fácil de ler:
// aqui só tem "como a tela fica"; lá tem "quando e onde ela aparece".
// =============================================================

import { esc, tempoRelativo, dataHora, hora, dataPorExtenso, numero, corRegiao } from './util.js';

// ---------- Peças reaproveitadas ----------

/**
 * Imagem do fato. Se a fonte mandou foto, ela aparece com o crédito.
 * Se não mandou (ou a foto não carregar), aparece uma ilustração com a
 * cor e o nome da região. Nunca usamos foto inventada.
 */
function imagem(fato, nomesRegioes, comCredito = true) {
  const regiao = fato.regioes[0];
  const foto = fato.imagem
    ? `<img src="${esc(fato.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
      + (comCredito ? `<span class="credito">Foto: ${esc(fato.credito)}</span>` : '')
    : '';
  return `
    <div class="imagem" style="--cor-regiao:${corRegiao(regiao)}">
      <span class="sem-foto">${esc(nomesRegioes[regiao] || 'Mundo')}</span>
      ${foto}
    </div>`;
}

/** Etiquetas de região e tema. */
function etiquetas(fato, dados, { limite = 3 } = {}) {
  const regioes = fato.regioes.slice(0, 2).map((r) =>
    `<span class="etiqueta regiao" style="--cor-regiao:${corRegiao(r)}">${esc(dados.nomesRegioes[r] || r)}</span>`);
  const temas = fato.temas.filter((t) => t !== 'outros').slice(0, 1).map((t) =>
    `<span class="etiqueta">${esc(dados.nomesTemas[t] || t)}</span>`);
  const avisos = fato.fontes === 1 ? ['<span class="etiqueta aviso">Uma fonte só</span>'] : [];
  return `<div class="etiquetas">${[...regioes, ...temas, ...avisos].slice(0, limite + 1).join('')}</div>`;
}

/** "BBC, Al Jazeera, DW e mais 4" */
function nomesDasFontes(fato, maximo = 3) {
  const nomes = [...new Set(fato.materias.map((m) => m.fonte))];
  const visiveis = nomes.slice(0, maximo).join(', ');
  return nomes.length > maximo ? `${visiveis} e mais ${nomes.length - maximo}` : visiveis;
}

// ---------- Tela Hoje ----------

/** Cabeçalho do dia: data e números da coleta. */
export function telaHojeTopo(dados) {
  return `
    <p class="rotulo">Radar de hoje</p>
    <h2 style="font-size:26px;margin-top:2px">${esc(dataPorExtenso(dados.dataReferencia))}</h2>
    <p class="resumo-dia">
      ${numero(dados.totalNoticias)} notícias de ${dados.totalFontes} fontes nas últimas 24 h ·
      atualizado às ${hora(dados.geradoEm)}
    </p>`;
}

/** Cartão grande do destaque do dia. */
export function cartaoDestaque(fato, dados) {
  if (!fato) return '';
  return `
    <p class="rotulo" style="margin:0 2px 8px">Destaque do dia</p>
    <button class="destaque" type="button" data-fato="${esc(fato.id)}">
      ${imagem(fato, dados.nomesRegioes)}
      <div class="corpo">
        ${etiquetas(fato, dados)}
        <h3>${esc(fato.titulo)}</h3>
        <p class="motivo">${esc(fato.resumo)}</p>
        <p class="fontes-linha"><strong style="color:var(--acento)">${fato.fontes} fontes</strong> de ${fato.paises} países · ${esc(nomesDasFontes(fato))}</p>
      </div>
    </button>`;
}

/** Cartão do tema do dia (a biblioteca chega na etapa 5). */
export function cartaoTemaDoDia() {
  return `
    <div class="tema-dia">
      <p class="rotulo">Tema do dia</p>
      <h3>Em breve: um tema da biblioteca por dia</h3>
      <p>Ex.: "Ucrânia → petróleo → sua gasolina". A biblioteca de temas chega na etapa 5.</p>
    </div>`;
}

/** Filtros por região ou por tema, com a contagem de cada um. */
export function filtros(dados, fatos, filtro) {
  const campo = filtro.modo === 'regiao' ? 'regioes' : 'temas';
  const nomes = filtro.modo === 'regiao' ? dados.nomesRegioes : dados.nomesTemas;
  const conta = {};
  fatos.forEach((f) => f[campo].forEach((v) => { conta[v] = (conta[v] || 0) + 1; }));
  const ordem = Object.keys(conta).sort((a, b) => conta[b] - conta[a]);

  const chip = (valor, texto, total) => `
    <button class="chip" type="button" data-filtro="${esc(valor)}" aria-pressed="${filtro.valor === valor}">
      ${filtro.modo === 'regiao' && valor ? `<span class="ponto" style="--cor-regiao:${corRegiao(valor)}"></span>` : ''}${esc(texto)}<b>${total}</b>
    </button>`;

  return `
    <div class="filtros">
      <div class="alternador" role="group" aria-label="Organizar por">
        <button type="button" data-modo="regiao" aria-pressed="${filtro.modo === 'regiao'}">Por região</button>
        <button type="button" data-modo="tema" aria-pressed="${filtro.modo === 'tema'}">Por tema</button>
      </div>
      <div class="chips">
        ${chip('', 'Todas', fatos.length)}
        ${ordem.map((v) => chip(v, nomes[v] || v, conta[v])).join('')}
      </div>
    </div>`;
}

/** Uma linha da lista de fatos. */
function itemDaLista(fato, dados, abertoId) {
  const agora = new Date();
  return `
    <li>
      <button class="item" type="button" data-fato="${esc(fato.id)}" aria-current="${fato.id === abertoId}">
        ${imagem(fato, dados.nomesRegioes, false)}
        <div>
          <h3>${esc(fato.titulo)}</h3>
          <div class="meta">
            <span class="${fato.fontes > 1 ? 'forte' : ''}">${fato.fontes > 1 ? `${fato.fontes} fontes` : esc(fato.materias[0].fonte)}</span>
            <span>·</span>
            <span>${esc(dados.nomesRegioes[fato.regioes[0]] || '')}</span>
            <span>·</span>
            <span>${tempoRelativo(fato.maisRecente, agora)}</span>
          </div>
        </div>
      </button>
    </li>`;
}

/** Lista de fatos (mostra aos poucos, para o celular não engasgar). */
export function lista(fatos, dados, limite, abertoId) {
  if (fatos.length === 0) return '<p class="vazio">Nenhuma notícia neste filtro.</p>';
  const visiveis = fatos.slice(0, limite);
  const resto = fatos.length - visiveis.length;
  return `
    <ul class="lista">${visiveis.map((f) => itemDaLista(f, dados, abertoId)).join('')}</ul>
    ${resto > 0 ? `<button class="mais" type="button" data-mais>Mostrar mais (${numero(resto)})</button>` : ''}
    <p class="rodape-dados">Coleta das ${hora(dados.geradoEm)} (horário de Brasília). Títulos em inglês serão traduzidos na etapa 7.</p>`;
}

// ---------- Painel da notícia ----------

export function painelFato(fato, dados) {
  const materias = [...fato.materias].sort((a, b) => (a.publicadoEm || '').localeCompare(b.publicadoEm || ''));
  const primeira = materias[0];

  const materiaHtml = (m) => `
    <li class="materia">
      <div class="fonte">
        <strong>${esc(m.fonte)}</strong>
        <span class="etiqueta">${esc(m.pais)}</span>
        ${m.estatal ? '<span class="etiqueta estatal">Estatal</span>' : ''}
        ${m.tipo === 'analise' ? '<span class="etiqueta">Análise</span>' : ''}
        ${m.tipo === 'institucional' ? '<span class="etiqueta">Institucional</span>' : ''}
        ${m.idioma === 'en' ? '<span class="etiqueta">Inglês</span>' : ''}
      </div>
      <p class="visao">${esc(m.visao)}</p>
      <a href="${esc(m.link)}" target="_blank" rel="noopener noreferrer">${esc(m.titulo)}</a>
      <time datetime="${esc(m.publicadoEm)}">${m.semData ? 'Sem data no feed · coletada ' : 'Publicada '}${dataHora(m.publicadoEm)}</time>
    </li>`;

  return `
    <div class="painel-topo">
      <button class="voltar" type="button" data-voltar>‹ Voltar</button>
      <span class="rotulo" style="color:var(--texto-3)">${fato.id === dados.destaque?.id ? 'Destaque do dia' : 'Notícia'}</span>
    </div>
    ${imagem(fato, dados.nomesRegioes)}
    <div class="painel-corpo">
      ${etiquetas(fato, dados, { limite: 4 })}
      <h2>${esc(fato.titulo)}</h2>
      ${fato.resumo ? `<p class="resumo">${esc(fato.resumo)}</p>` : ''}
      ${fato.id === dados.destaque?.id ? `<p class="bloco-nota" style="margin:0"><strong>Por que é o destaque:</strong> ${esc(dados.destaque.motivo)}</p>` : ''}

      <dl class="datas">
        <dt>Data do fato</dt><dd>a confirmar na análise (etapa 4)</dd>
        <dt>1ª publicação</dt><dd>${dataHora(primeira.publicadoEm)}</dd>
        <dt>Última matéria</dt><dd>${dataHora(fato.maisRecente)}</dd>
        <dt>Consultado em</dt><dd>${dataHora(dados.geradoEm)} (Brasília)</dd>
      </dl>

      <div class="em-construcao">
        <strong>Cadeia de efeitos e notas</strong><br>
        O botão "Acompanhar" chega na etapa 3 e o formulário da cadeia (do fato até você) na etapa 4.
      </div>

      <h3 class="bloco-titulo">Como cada fonte contou (${fato.materias.length})</h3>
      <p class="bloco-nota">${fato.fontes === 1 ? 'Só uma fonte publicou: a informação ainda não tem confirmação independente.' : `${fato.fontes} fontes diferentes, de ${fato.paises} países.`}</p>
      <ul class="materias">${materias.map(materiaHtml).join('')}</ul>
    </div>`;
}

/** Painel vazio no iPad, antes de escolher uma notícia. */
export function painelVazio() {
  return `
    <div class="painel-vazio">
      <div>
        <img src="assets/logo/onda.svg" alt="">
        <p>Escolha uma notícia na lista para ver<br>como cada fonte contou o fato.</p>
      </div>
    </div>`;
}

// ---------- Abas que ainda vão ser construídas ----------

export function telaEmBreve(aba) {
  const textos = {
    acompanhando: ['Acompanhando', 'Aqui vão ficar as 3 a 5 notícias que você escolher por dia, sincronizadas entre celular e iPad. Chega na etapa 3.'],
    biblioteca: ['Biblioteca', 'Os 42 temas (como "eleições no Brasil → seu dia a dia") com a análise de cada um. Chega na etapa 5.'],
    historico: ['Histórico', 'Tudo o que você já escreveu, com busca por tema, região e data. Chega na etapa 6.'],
  };
  const [titulo, texto] = textos[aba];
  return `<div class="em-breve"><h2>${titulo}</h2><p>${texto}</p></div>`;
}

export function telaErro(mensagem) {
  return `<div class="em-breve"><h2>Não deu para carregar</h2><p>${esc(mensagem)}</p><button class="mais" type="button" data-recarregar>Tentar de novo</button></div>`;
}
