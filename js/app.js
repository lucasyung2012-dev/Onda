// =============================================================
// app.js — O "maestro" do Onda.
//
// Responsável por:
//   - carregar os dados do dia (data/app/hoje.json);
//   - saber em que aba você está (pelo endereço: #hoje, #biblioteca...);
//   - abrir e fechar o painel da notícia (#fato/<id>);
//   - reagir aos toques (filtros, "mostrar mais", modo noite/dia);
//   - registrar o service worker, que deixa o app funcionar offline.
// =============================================================

import * as telas from './telas.js';

// ---------- Estado do app (o que está acontecendo agora) ----------
const estado = {
  dados: null,                              // conteúdo de hoje.json
  filtro: { modo: 'regiao', valor: '' },    // '' = todas
  limite: 40,                               // quantos itens da lista aparecem
  abertoId: null,                           // fato aberto no painel
};

const conteudo = document.getElementById('conteudo');
const painel = document.getElementById('painel');
const telaLarga = matchMedia('(min-width: 900px)'); // iPad deitado / computador

// ---------- Dados ----------

async function carregarDados() {
  // "no-cache" pede ao navegador para conferir se há versão nova no servidor.
  const resposta = await fetch('data/app/hoje.json', { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`O servidor respondeu ${resposta.status}.`);
  return resposta.json();
}

/** Fatos que passam no filtro escolhido (sem o destaque, que já aparece em cima). */
function fatosFiltrados() {
  const { dados, filtro } = estado;
  const campo = filtro.modo === 'regiao' ? 'regioes' : 'temas';
  return dados.fatos.filter((f) =>
    f.id !== dados.destaque?.id && (!filtro.valor || f[campo].includes(filtro.valor)));
}

// ---------- Desenho das telas ----------

function desenharHoje() {
  const { dados, filtro, limite, abertoId } = estado;
  const destaque = dados.fatos.find((f) => f.id === dados.destaque?.id);
  const semDestaque = dados.fatos.filter((f) => f.id !== dados.destaque?.id);
  const filtrados = fatosFiltrados();
  conteudo.innerHTML = `
    ${telas.telaHojeTopo(dados)}
    ${telas.cartaoDestaque(destaque, dados)}
    ${telas.cartaoTemaDoDia()}
    <div class="secao-titulo"><h2>Notícias do dia</h2><span>${filtrados.length} fatos</span></div>
    ${telas.filtros(dados, semDestaque, filtro)}
    <div id="lista">${telas.lista(filtrados, dados, limite, abertoId)}</div>`;
}

/** Redesenha só a lista (mais rápido que redesenhar a tela inteira). */
function desenharLista() {
  const alvo = document.getElementById('lista');
  if (alvo) alvo.innerHTML = telas.lista(fatosFiltrados(), estado.dados, estado.limite, estado.abertoId);
}

function desenharPainel() {
  const fato = estado.dados?.fatos.find((f) => f.id === estado.abertoId);
  if (fato) {
    painel.innerHTML = telas.painelFato(fato, estado.dados);
    painel.hidden = false;
    painel.scrollTop = 0;
    document.body.style.overflow = telaLarga.matches ? '' : 'hidden'; // no celular, trava a rolagem de trás
  } else {
    painel.innerHTML = telaLarga.matches ? telas.painelVazio() : '';
    painel.hidden = !telaLarga.matches;
    document.body.style.overflow = '';
  }
}

// ---------- Navegação pelo endereço (#hoje, #fato/abc123...) ----------

function abaAtual() {
  const hash = location.hash.replace('#', '');
  if (hash.startsWith('fato/')) return 'hoje';
  return ['hoje', 'acompanhando', 'biblioteca', 'historico'].includes(hash) ? hash : 'hoje';
}

let abaDesenhada = null;

function navegar() {
  const aba = abaAtual();
  const hash = location.hash.replace('#', '');
  estado.abertoId = hash.startsWith('fato/') ? hash.slice(5) : null;

  // Marca a aba ativa no rodapé
  document.querySelectorAll('.abas a').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.aba === aba ? 'page' : 'false');
  });

  if (!estado.dados) return;
  if (aba !== abaDesenhada) {
    if (aba === 'hoje') desenharHoje();
    else conteudo.innerHTML = telas.telaEmBreve(aba);
    abaDesenhada = aba;
  } else if (aba === 'hoje') {
    // Mesma aba: só atualiza qual item aparece marcado
    document.querySelectorAll('.item').forEach((el) => {
      el.setAttribute('aria-current', String(el.dataset.fato === estado.abertoId));
    });
  }
  desenharPainel();
}

function abrirFato(id) {
  location.hash = `fato/${id}`;
}

function fecharFato() {
  // Se viemos da lista, "voltar" do navegador fecha o painel (gesto de voltar do iPhone também).
  if (history.length > 1 && location.hash.startsWith('#fato/')) history.back();
  else location.hash = 'hoje';
}

// ---------- Toques e cliques ----------

document.addEventListener('click', (evento) => {
  const alvo = evento.target.closest('[data-fato], [data-filtro], [data-modo], [data-mais], [data-voltar], [data-recarregar]');
  if (!alvo) return;

  if (alvo.dataset.fato) abrirFato(alvo.dataset.fato);
  else if (alvo.hasAttribute('data-voltar')) fecharFato();
  else if (alvo.hasAttribute('data-recarregar')) location.reload();
  else if (alvo.hasAttribute('data-mais')) {
    estado.limite += 40;
    desenharLista();
  } else if (alvo.dataset.modo) {
    estado.filtro = { modo: alvo.dataset.modo, valor: '' };
    estado.limite = 40;
    desenharHoje();
  } else if (alvo.hasAttribute('data-filtro')) {
    estado.filtro.valor = alvo.dataset.filtro;
    estado.limite = 40;
    desenharHoje();
  }
});

// Botão de modo noite / dia (a escolha fica salva neste aparelho)
document.getElementById('botao-tema').addEventListener('click', () => {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = novo;
  document.querySelector('meta[name="theme-color"]').content = novo === 'escuro' ? '#061A2E' : '#F3F7F9';
  try { localStorage.setItem('onda-tema', novo); } catch (e) { /* sem armazenamento: vale só agora */ }
});

// Tecla Esc fecha o painel (útil no computador)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && estado.abertoId) fecharFato();
});

window.addEventListener('hashchange', navegar);
telaLarga.addEventListener('change', desenharPainel); // girou o iPad? reorganiza

// ---------- Início ----------

async function iniciar() {
  try {
    estado.dados = await carregarDados();
    navegar();
  } catch (erro) {
    conteudo.innerHTML = telas.telaErro(`Sem conexão e sem cópia salva ainda. (${erro.message})`);
  }
}

// Service worker: guarda o app e a última edição para abrir sem internet.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* se falhar, o app funciona online normalmente */ });
}

iniciar();
