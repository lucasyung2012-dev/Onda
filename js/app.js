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
import * as meus from './meus.js';
import * as dropbox from './dropbox.js';
import { gerarPrompt } from './prompt.js';
import * as config from './config.js';
import { t, emIngles, REGIOES_EN, TEMAS_EN } from './textos.js';

// ---------- Estado: o que está acontecendo agora ----------
const estado = {
  dados: null,        // data/app/hoje.json
  analise: null,      // data/app/analise.json
  tema: null,         // data/app/tema.json (tema do dia)
  temas: null,        // data/app/temas.json (índice dos temas anteriores)
  edicoes: null,      // data/app/edicoes.json (índice das edições anteriores)
  arquivos: {},       // edições e temas antigos já baixados (para não baixar de novo)
  edicaoAberta: null, // edição antiga que está na tela (para abrir as notícias dela)
  cal: { mes: null, dia: null }, // mês e dia escolhidos no calendário do histórico
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
  if (tela === 'analise-minha') return 'meu';
  return ['hoje', 'temas', 'explorar', 'meu'].includes(tela) ? tela : 'hoje';
}

function htmlDaRota({ tela, partes }) {
  const { dados, analise } = estado;
  switch (tela) {
    case 'analise': return telas.telaAnalise(analise, dados, { botao: analise?.destaque ? botaoPara(analise.destaque.fatoId) : '' });
    case 'temas': return telas.telaTemas(estado.tema, estado.temas);
    case 'edicoes': return telas.telaEdicoes(htmlHistorico());
    // Telas de dias antigos: baixam o arquivo do dia e depois se desenham.
    case 'edicao': return carregarDepois('analises', partes[1], (ed) => { estado.edicaoAberta = ed; return telas.telaAnalise(ed, dados, { comOutros: true, botao: botaoPara(ed.destaque.fatoId) }); });
    case 'tema': {
      const anteriores = estado.temas?.temas || [];
      if (estado.tema?.dataReferencia === partes[1]) return telas.telaTema(estado.tema, anteriores);
      return carregarDepois('temas', partes[1], (t) => telas.telaTema(t, anteriores));
    }
    case 'meu': return htmlMeu();
    case 'config': return telas.telaConfig(config.ler());
    case 'analise-minha': return telas.telaMinhaAnalise(meus.pegar(partes[1]), dados);
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
  if (animar && document.startViewTransition && !config.menosMovimento()) {
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
    ? telas.folhaFato(fato, estado.dados, { ...contextoDoFato(id), botao: botaoPara(id) })
    : telas.folhaArquivo(guardado, estado.dados, botaoPara(id));
  folha.dataset.fato = id;
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

// ---------- Acompanhar e Meu Onda ----------

/** Aviso rápido no rodapé da tela ("Acompanhando!", "Prompt copiado"...). */
function aviso(texto) {
  document.querySelector('.aviso-flutuante')?.remove();
  const el = document.createElement('div');
  el.className = 'aviso-flutuante';
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

const hojeData = () => estado.dados.dataReferencia;

/** Botão "Acompanhar" já com o estado certo (ativo? limite do dia?). */
function botaoPara(id) {
  const contagem = meus.doDia(hojeData()).length;
  return telas.botaoAcompanhar(id, meus.acompanhando(id), contagem, meus.LIMITE_POR_DIA, contagem >= meus.LIMITE_POR_DIA);
}

/**
 * Junta tudo que sabemos sobre uma notícia para guardar no Meu Onda:
 * título, resumo, região e as fontes com link (para o prompt e para reler depois).
 */
function itemParaAcompanhar(id) {
  const base = { id, data: hojeData() };
  const materias = (lista) => (lista || []).slice(0, 6).map((m) => ({ fonte: m.fonte, pais: m.pais, titulo: m.titulo, link: m.link, publicadoEm: m.publicadoEm }));
  for (const ed of [estado.analise, estado.edicaoAberta]) {
    if (ed?.destaque?.fatoId === id) {
      const d = ed.destaque;
      return { ...base, origem: 'destaque', titulo: d.titulo, resumo: d.emUmaFrase, regioes: d.regioes, temas: d.temas, imagem: d.imagem, materias: materias(d.fontesUsadas) };
    }
  }
  const fato = estado.dados.fatos.find((f) => f.id === id);
  const importa = [estado.analise, estado.edicaoAberta].flatMap((e) => e?.tambemImporta || []).find((t) => t.fatoId === id);
  if (fato) {
    return { ...base, origem: importa ? 'importa' : 'explorar', titulo: importa?.tituloPt || fato.titulo, resumo: importa?.porQueImporta || fato.resumo, regioes: fato.regioes, temas: fato.temas, imagem: fato.imagem, materias: materias(fato.materias) };
  }
  if (importa) {
    return { ...base, origem: 'importa', titulo: importa.tituloPt, resumo: importa.porQueImporta, regioes: importa.regioes, temas: importa.temas, imagem: importa.imagem, materias: materias(importa.materias) };
  }
  return null;
}

function alternarAcompanhar(botao) {
  const id = botao.dataset.acompanhar;
  if (meus.acompanhando(id)) {
    meus.deixarDeAcompanhar(id);
    aviso('Deixou de acompanhar');
    if (rotaAtual().tela === 'analise-minha') { location.hash = 'meu'; return; }
  } else {
    const item = itemParaAcompanhar(id);
    if (!item) return;
    if (!meus.acompanhar(item)) { aviso(`Limite de ${meus.LIMITE_POR_DIA} por dia atingido`); return; }
    aviso('★ Acompanhando');
  }
  // Atualiza todos os botões dessa notícia que estão na tela
  document.querySelectorAll(`[data-acompanhar="${CSS.escape(id)}"]`).forEach((b) => {
    const linha = b.closest('.acompanhar-linha');
    if (linha) {
      linha.outerHTML = botaoPara(id);
      document.querySelector(`[data-acompanhar="${CSS.escape(id)}"]`)?.classList.add('pulsar');
    }
  });
}

function htmlMeu() {
  const todos = meus.todos();
  return telas.telaMeu({
    situacao: meus.situacao(),
    nomeConta: estado.nomeConta,
    hoje: todos.filter((i) => i.data === hojeData()),
    anteriores: todos.filter((i) => i.data !== hojeData()),
    limite: meus.LIMITE_POR_DIA,
    dados: estado.dados,
    historico: htmlHistorico(),
  });
}

// ---------- Histórico em calendário ----------

/** Monta o calendário e o dia escolhido (baixa a edição do dia se precisar). */
function htmlHistorico() {
  const hoje = hojeData();
  const datas = (estado.edicoes?.edicoes || []).map((e) => e.data);
  const dia = estado.cal.dia || datas[0] || hoje;
  const mes = estado.cal.mes || dia.slice(0, 7);
  const diasEdicao = new Set(datas);
  const diasMeus = new Set(meus.todos().map((i) => i.data));

  let edicao = null;
  let carregando = false;
  if (estado.analise?.dataReferencia === dia && estado.analise.destaque) edicao = estado.analise;
  else if (estado.arquivos[`analises/${dia}`]) edicao = estado.arquivos[`analises/${dia}`];
  else if (diasEdicao.has(dia)) {
    carregando = true;
    arquivoDoDia('analises', dia).then(atualizarHistorico).catch(() => {});
  }
  estado.edicaoAberta = edicao; // para as notícias do dia abrirem na folha

  return telas.areaHistorico({ mes, dia, diasEdicao, diasMeus, hoje, edicao, carregando, meusDoDia: meus.doDia(dia), dados: estado.dados });
}

function atualizarHistorico() {
  const el = document.getElementById('historico');
  if (el) el.outerHTML = htmlHistorico();
}

// Quando os seus dados mudam (ou sincronizam), a aba Meu Onda se redesenha.
meus.aoMudar(() => {
  if (rotaAtual().tela === 'meu') conteudo.innerHTML = htmlMeu();
});

// ---------- Minha análise: salva enquanto você digita ----------

/** Grava o palpite ou o texto da sua análise. */
function gravarCampo(id, campo, valor) {
  const item = meus.pegar(id);
  if (!item) return;
  meus.atualizar(id, { minha: { ...(item.minha || {}), [campo]: valor } });
  const salvo = document.getElementById('estado-salvo');
  if (salvo) salvo.textContent = meus.situacao().conectado ? 'salvo e enviando ao Dropbox' : 'salvo neste aparelho';
}

// Uma espera para cada campo: digitar no texto não cancela o salvamento do palpite.
const esperaDigitacao = {};
document.addEventListener('input', (e) => {
  const editor = e.target.closest('.editor');
  const campo = e.target.dataset?.campo;
  if (!editor || !campo) return;
  const salvo = document.getElementById('estado-salvo');
  if (salvo) salvo.textContent = 'digitando…';
  clearTimeout(esperaDigitacao[campo]);
  esperaDigitacao[campo] = setTimeout(() => gravarCampo(editor.dataset.item, campo, e.target.value), 600);
});

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
  const alvo = e.target.closest('[data-fato], [data-gaveta], [data-modo], [data-sub], [data-mais], [data-voltar], [data-fechar-folha], [data-recarregar], [data-acompanhar], [data-dropbox], [data-copiar-prompt], [data-mes], [data-dia], [data-resposta], [data-pular], [data-config], #veu');
  if (!alvo) return;
  const idEditor = alvo.closest('.editor')?.dataset.item;

  if (alvo.dataset.config) {
    // Configurações: grava, aplica e redesenha a tela
    config.salvar({ [alvo.dataset.config]: alvo.dataset.valor });
    if (alvo.dataset.config === 'idioma') { aplicarIdiomaNosDados(); traduzirFixos(); }
    desenhar({ animar: false });
  } else if (alvo.dataset.pular) {
    // Índice da aula: rola até a parte, sem mudar de tela
    e.preventDefault();
    document.getElementById(alvo.dataset.pular)?.scrollIntoView({ behavior: 'smooth' });
  } else if (alvo.dataset.resposta) {
    // Teste rápido: marca a escolhida, mostra a certa e a explicação
    const quiz = alvo.closest('.quiz');
    if (quiz.classList.contains('respondida')) return;
    quiz.classList.add('respondida');
    const correta = alvo.dataset.correta;
    quiz.querySelectorAll('.quiz-opcao').forEach((b) => { if (b.dataset.resposta === correta) b.classList.add('certa'); });
    if (alvo.dataset.resposta !== correta) alvo.classList.add('errada');
    quiz.querySelector('.quiz-explicacao').hidden = false;
  } else if (alvo.dataset.mes) { estado.cal.mes = alvo.dataset.mes; atualizarHistorico(); }
  else if (alvo.dataset.dia) { estado.cal.dia = alvo.dataset.dia; estado.cal.mes = alvo.dataset.dia.slice(0, 7); atualizarHistorico(); }
  else if (alvo.dataset.acompanhar) alternarAcompanhar(alvo);
  else if (alvo.dataset.dropbox === 'conectar') dropbox.conectar();
  else if (alvo.dataset.dropbox === 'sincronizar') { meus.sincronizar(); aviso('Sincronizando…'); }
  else if (alvo.dataset.dropbox === 'desconectar') dropbox.desconectar().then(() => { estado.nomeConta = ''; conteudo.innerHTML = htmlMeu(); aviso('Dropbox desconectado deste aparelho'); });
  else if (alvo.hasAttribute('data-copiar-prompt')) {
    navigator.clipboard.writeText(gerarPrompt(meus.pegar(idEditor)))
      .then(() => aviso('Prompt copiado — cole na IA'))
      .catch(() => aviso('Não deu para copiar neste navegador'));
  } else if (alvo.dataset.fato) abrirFolha(alvo.dataset.fato);
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

// Atalho de noite / dia no topo (grava a escolha nas configurações)
document.getElementById('botao-tema').addEventListener('click', () => {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  const aplicar = () => config.salvar({ aparencia: novo });
  if (document.startViewTransition && !config.menosMovimento()) document.startViewTransition(aplicar).ready.catch(() => {});
  else aplicar();
  if (rotaAtual().tela === 'config') desenhar({ animar: false });
});

// ---------- Idioma ----------

/** Troca os textos fixos da página (abas, frase do topo) pelo idioma escolhido. */
function traduzirFixos() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.getElementById('botao-config')?.setAttribute('aria-label', t('Configurações'));
}

/** Nomes de regiões e assuntos no idioma escolhido. */
function aplicarIdiomaNosDados() {
  const d = estado.dados;
  if (!d) return;
  d.nomesPt ||= { regioes: d.nomesRegioes, temas: d.nomesTemas };
  d.nomesRegioes = emIngles() ? REGIOES_EN : d.nomesPt.regioes;
  d.nomesTemas = emIngles() ? TEMAS_EN : d.nomesPt.temas;
}

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
  config.aplicar();
  traduzirFixos();
  // Voltando do Dropbox com o código de autorização? Termina a conexão.
  let acabouDeConectar = false;
  try { acabouDeConectar = await dropbox.concluirConexao(); } catch (erro) { setTimeout(() => aviso(erro.message), 500); }
  if (acabouDeConectar) location.hash = 'meu';

  try {
    await carregar();
    aplicarIdiomaNosDados();
    desenhar({ animar: false });
  } catch (erro) {
    conteudo.innerHTML = telas.telaErro(`Sem conexão e sem cópia salva ainda. (${erro.message})`);
    return;
  }

  // Sincroniza com o Dropbox em segundo plano (o app já está na tela).
  if (dropbox.conectado()) {
    if (acabouDeConectar) aviso('Dropbox conectado');
    meus.sincronizar();
    dropbox.nomeDaConta().then((nome) => {
      estado.nomeConta = nome;
      if (rotaAtual().tela === 'meu') conteudo.innerHTML = htmlMeu();
    }).catch(() => {});
  }
}

// Ao voltar para o app (trocou de aba ou de app), busca o que mudou no outro aparelho.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dropbox.conectado()) meus.sincronizar();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker, o app funciona online */ });
}

iniciar();
