// =============================================================
// app.js — O "maestro" do Onda.
//
//   - carrega os dados (notícias do dia + análise do destaque);
//   - descobre a tela pelo endereço (#hoje, #analise, #explorar/regiao/europa…);
//   - abre e fecha a "folha" da notícia (com animação e gesto de arrastar);
//   - reage aos toques (abas, busca, filtros, modo noite/dia);
//   - registra o service worker (app funciona sem internet).
// =============================================================

import * as telas from './telas.js';

// ---------- Estado: o que está acontecendo agora ----------
const estado = {
  dados: null,        // data/app/hoje.json
  analise: null,      // data/app/analise.json
  tema: null,         // data/app/tema.json (tema do dia)
  temas: null,        // data/app/temas.json (índice dos temas anteriores)
  edicoes: null,      // data/app/edicoes.json (índice das edições anteriores)
  arquivos: {},       // edições e temas antigos já baixados (para não baixar de novo)
  edicaoAberta: null, // edição antiga que está na tela (para abrir as notícias dela)
  explorar: { modo: 'regioes', busca: '', limite: 30 },
  gaveta: { chave: '', sub: '', limite: 30 },
};

const conteudo = document.getElementById('conteudo');
const folha = document.getElementById('folha');
const folhaCorpo = document.getElementById('folha-corpo');
const folhaRotulo = document.getElementById('folha-rotulo');
const veu = document.getElementById('veu');
const telaLarga = matchMedia('(min-width: 900px)');

// ---------- Dados ----------

async function lerJson(caminho) {
  const resposta = await fetch(caminho, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`${caminho}: o servidor respondeu ${resposta.status}`);
  return resposta.json();
}

async function carregar() {
  const opcional = (c) => lerJson(c).catch(() => null); // sem esses, o app funciona mesmo assim
  const [dados, analise, tema, temas, edicoes, fontes] = await Promise.all([
    lerJson('data/app/hoje.json'),
    opcional('data/app/analise.json'),
    opcional('data/app/tema.json'),
    opcional('data/app/temas.json'),
    opcional('data/app/edicoes.json'),
    opcional('data/fontes.json'),
  ]);
  // Domínio de cada fonte (para mostrar o logotipo dela no Explorar)
  dados.dominios = {};
  for (const f of fontes?.fontes || []) {
    const partes = new URL(f.feed).hostname.split('.');
    if (partes.length > 2 && ['www', 'rss', 'feeds', 'feed', 'moxie', 'english', 'en'].includes(partes[0])) partes.shift();
    dados.dominios[f.nome] = partes.join('.');
  }
  Object.assign(estado, { dados, analise, tema, temas, edicoes });
}

/** Baixa (uma vez só) a edição ou o tema de um dia antigo e guarda a última versão. */
async function arquivoDoDia(pasta, data) {
  const chave = `${pasta}/${data}`;
  if (!estado.arquivos[chave]) {
    const doDia = await lerJson(`data/${pasta}/${data}.json`);
    estado.arquivos[chave] = doDia.versoes[doDia.versoes.length - 1];
  }
  return estado.arquivos[chave];
}

// ---------- Rotas (o que vem depois do # no endereço) ----------

function rotaAtual() {
  const partes = decodeURI(location.hash.replace(/^#/, '')).split('/').filter(Boolean);
  return { tela: partes[0] || 'hoje', partes };
}

/** Qual aba do rodapé fica acesa para cada tela */
function abaDaTela(tela) {
  if (['analise', 'edicoes', 'edicao'].includes(tela)) return 'hoje';
  if (tela === 'tema') return 'temas';
  return ['hoje', 'temas', 'explorar', 'meu'].includes(tela) ? tela : 'hoje';
}

function htmlDaRota({ tela, partes }) {
  const { dados, analise } = estado;
  switch (tela) {
    case 'analise': return telas.telaAnalise(analise, dados);
    case 'temas': return telas.telaTemas(estado.tema, estado.temas);
    case 'edicoes': return telas.telaEdicoes(estado.edicoes, dados);
    // Telas de dias antigos: baixam o arquivo do dia e depois se desenham.
    case 'edicao': return carregarDepois('analises', partes[1], (ed) => { estado.edicaoAberta = ed; return telas.telaAnalise(ed, dados, { comOutros: true }); });
    case 'tema': {
      if (estado.tema?.dataReferencia === partes[1]) return telas.telaTema(estado.tema);
      return carregarDepois('temas', partes[1], (t) => telas.telaTema(t));
    }
    case 'meu': return telas.telaMeu();
    case 'explorar': {
      if (partes.length >= 3) {
        const chave = `${partes[1]}/${partes[2]}`;
        if (estado.gaveta.chave !== chave) estado.gaveta = { chave, sub: '', limite: 30 };
        return telas.telaGaveta(dados, partes[1], partes[2], estado.gaveta.sub, estado.gaveta.limite);
      }
      return telas.telaExplorar(dados, estado.explorar.modo, estado.explorar.busca);
    }
    default: return telas.telaHoje(analise, dados);
  }
}

/** Mostra "carregando" e, quando o arquivo do dia chegar, desenha a tela. */
function carregarDepois(pasta, data, montar) {
  const chave = location.hash;
  arquivoDoDia(pasta, data)
    .then((arq) => { if (location.hash === chave) conteudo.innerHTML = montar(arq); })
    .catch(() => { if (location.hash === chave) conteudo.innerHTML = telas.telaErro('Não achei esse dia. Confira a conexão.'); });
  return '<p class="carregando">Carregando…</p>';
}

/** Desenha a tela do endereço atual, com transição suave. */
function desenhar({ animar = true } = {}) {
  if (!estado.dados) return;
  const rota = rotaAtual();
  const aba = abaDaTela(rota.tela);
  document.querySelectorAll('.abas a').forEach((a) => a.setAttribute('aria-current', a.dataset.aba === aba ? 'page' : 'false'));

  const trocar = () => {
    conteudo.innerHTML = htmlDaRota(rota);
    window.scrollTo(0, 0);
  };
  // "View Transitions": o navegador anima a troca entre a tela velha e a nova.
  if (animar && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const transicao = document.startViewTransition(trocar);
    transicao.ready.catch(() => {}); // se a animação for pulada (app em segundo plano), tudo bem
  } else {
    trocar();
  }
}

// ---------- Folha da notícia ----------

let folhaAberta = false;

function contextoDoFato(id) {
  // Se o fato está no "Também importa", mostramos o título traduzido e o porquê.
  const item = estado.analise?.tambemImporta?.find((t) => t.fatoId === id);
  return item ? { tituloPt: item.tituloPt, porQueImporta: item.porQueImporta } : {};
}

function abrirFolha(id) {
  const fato = estado.dados.fatos.find((f) => f.id === id);
  // Se o fato não está mais nas últimas 24 h, procura nas edições guardadas.
  const guardado = !fato && [estado.edicaoAberta, estado.analise]
    .flatMap((e) => e?.tambemImporta || [])
    .find((t) => t.fatoId === id && t.materias);
  if (!fato && !guardado) return;
  folhaRotulo.textContent = 'Notícia';
  folhaCorpo.innerHTML = fato
    ? telas.folhaFato(fato, estado.dados, contextoDoFato(id))
    : telas.folhaArquivo(guardado, estado.dados);
  folhaCorpo.scrollTop = 0;
  folha.hidden = false;
  veu.hidden = false;
  document.body.classList.add('travado');
  requestAnimationFrame(() => requestAnimationFrame(() => { // espera um quadro para a animação acontecer
    folha.classList.add('aberta');
    veu.classList.add('aberto');
  }));
  if (!folhaAberta) history.pushState({ folha: id }, '', location.href); // "voltar" fecha a folha
  folhaAberta = true;
}

function fecharFolha({ veioDoVoltar = false } = {}) {
  if (!folhaAberta) return;
  folhaAberta = false;
  folha.style.transform = '';
  folha.classList.remove('aberta', 'arrastando');
  veu.classList.remove('aberto');
  document.body.classList.remove('travado');
  setTimeout(() => { if (!folhaAberta) { folha.hidden = true; veu.hidden = true; } }, 380);
  if (!veioDoVoltar && history.state?.folha) history.back();
}

// Arrastar a folha para baixo para fechar (celular)
(() => {
  let inicioY = null;
  let deslocamento = 0;
  folha.addEventListener('pointerdown', (e) => {
    if (telaLarga.matches || !e.target.closest('[data-arrastar]') || e.target.closest('button')) return;
    inicioY = e.clientY;
    deslocamento = 0;
    folha.classList.add('arrastando');
    folha.setPointerCapture(e.pointerId);
  });
  folha.addEventListener('pointermove', (e) => {
    if (inicioY === null) return;
    deslocamento = Math.max(0, e.clientY - inicioY);
    folha.style.transform = `translateY(${deslocamento}px)`;
  });
  const soltar = () => {
    if (inicioY === null) return;
    inicioY = null;
    folha.classList.remove('arrastando');
    if (deslocamento > 110) fecharFolha();
    else folha.style.transform = '';
  };
  folha.addEventListener('pointerup', soltar);
  folha.addEventListener('pointercancel', soltar);
})();

// ---------- Explorar: atualizações parciais (sem redesenhar a tela toda) ----------

function atualizarExplorarCorpo() {
  const alvo = document.getElementById('explorar-corpo');
  if (alvo) alvo.innerHTML = telas.corpoExplorar(estado.dados, estado.explorar.modo, estado.explorar.busca, estado.explorar.limite);
}

function atualizarGaveta() {
  const rota = rotaAtual();
  conteudo.innerHTML = telas.telaGaveta(estado.dados, rota.partes[1], rota.partes[2], estado.gaveta.sub, estado.gaveta.limite);
}

let esperaBusca = null;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'campo-busca') return;
  clearTimeout(esperaBusca);
  esperaBusca = setTimeout(() => { // espera a pessoa parar de digitar
    estado.explorar.busca = e.target.value;
    estado.explorar.limite = 30;
    atualizarExplorarCorpo();
  }, 220);
});

// ---------- Toques e cliques ----------

document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-fato], [data-gaveta], [data-modo], [data-sub], [data-mais], [data-voltar], [data-fechar-folha], [data-recarregar], #veu');
  if (!alvo) return;

  if (alvo.dataset.fato) abrirFolha(alvo.dataset.fato);
  else if (alvo.id === 'veu' || alvo.hasAttribute('data-fechar-folha')) fecharFolha();
  else if (alvo.dataset.gaveta) location.hash = `explorar/${alvo.dataset.gaveta}`;
  else if (alvo.hasAttribute('data-recarregar')) location.reload();
  else if (alvo.hasAttribute('data-voltar')) {
    const { tela } = rotaAtual();
    const pai = { explorar: 'explorar', tema: 'temas', edicao: 'edicoes' }[tela] || 'hoje';
    if (history.length > 1) history.back();
    else location.hash = pai;
  } else if (alvo.dataset.modo) {
    // Troca Regiões / Assuntos / Fontes: a pílula desliza e o conteúdo muda.
    estado.explorar.modo = alvo.dataset.modo;
    const seg = alvo.closest('.segmentos');
    seg.style.setProperty('--pos', ['regioes', 'assuntos', 'fontes'].indexOf(alvo.dataset.modo));
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === alvo)));
    atualizarExplorarCorpo();
  } else if (alvo.hasAttribute('data-sub')) {
    estado.gaveta.sub = alvo.dataset.sub;
    estado.gaveta.limite = 30;
    atualizarGaveta();
  } else if (alvo.hasAttribute('data-mais')) {
    if (rotaAtual().partes.length >= 3) { estado.gaveta.limite += 30; atualizarGaveta(); }
    else { estado.explorar.limite += 30; atualizarExplorarCorpo(); }
  }
});

// Modo noite / dia (a escolha fica salva neste aparelho)
document.getElementById('botao-tema').addEventListener('click', () => {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  const aplicar = () => {
    document.documentElement.dataset.tema = novo;
    document.querySelector('meta[name="theme-color"]').content = novo === 'escuro' ? '#051526' : '#F2F6F8';
  };
  if (document.startViewTransition) document.startViewTransition(aplicar); else aplicar();
  try { localStorage.setItem('onda-tema', novo); } catch (err) { /* sem armazenamento */ }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharFolha(); });

window.addEventListener('hashchange', () => {
  if (folhaAberta) fecharFolha({ veioDoVoltar: true });
  desenhar();
});
window.addEventListener('popstate', () => {
  if (folhaAberta && !history.state?.folha) fecharFolha({ veioDoVoltar: true });
});

// ---------- Início ----------

async function iniciar() {
  try {
    await carregar();
    desenhar({ animar: false });
  } catch (erro) {
    conteudo.innerHTML = telas.telaErro(`Sem conexão e sem cópia salva ainda. (${erro.message})`);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker, o app funciona online */ });
}

iniciar();
