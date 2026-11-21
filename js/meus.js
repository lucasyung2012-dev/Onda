// =============================================================
// meus.js — Os SEUS dados: o que você acompanha e as suas cadeias.
//
// Funciona primeiro neste aparelho (para abrir rápido e sem internet)
// e, se o Dropbox estiver conectado, sincroniza com o arquivo de lá.
//
// Sincronizar = baixar o arquivo do Dropbox, juntar com o daqui (vale
// a versão mais recente de cada item) e enviar de volta.
// =============================================================

import * as dropbox from './dropbox.js';

export const LIMITE_POR_DIA = 5;
const CHAVE_LOCAL = 'onda-meus';

const vazio = () => ({ versao: 1, itens: {}, fila: {}, avisos: {}, guardadas: {}, apagados: {} });

let dados = (() => { try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || vazio(); } catch { return vazio(); } })();
let ultimaSincronizacao = null;
let ultimoErro = null;
const ouvintes = new Set();

function gravarLocal() {
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados)); } catch { /* sem armazenamento */ }
}
function avisar() { ouvintes.forEach((f) => f()); }

/** Avisa quem quiser saber quando os dados mudarem (para redesenhar a tela). */
export function aoMudar(funcao) { ouvintes.add(funcao); }

export function situacao() {
  return { conectado: dropbox.conectado(), configurado: dropbox.configurado(), ultimaSincronizacao, ultimoErro };
}

// ---------- Leitura ----------

export const todos = () => Object.values(dados.itens).sort((a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm));
export const pegar = (id) => dados.itens[id] || null;
export const acompanhando = (id) => Boolean(dados.itens[id]);
export const doDia = (data) => todos().filter((i) => i.data === data);

// ---------- Mudanças ----------

/** Começa a acompanhar uma notícia. Devolve false se já chegou ao limite do dia. */
export function acompanhar(item) {
  if (dados.itens[item.id]) return true;
  if (doDia(item.data).length >= LIMITE_POR_DIA) return false;
  const agora = new Date().toISOString();
  dados.itens[item.id] = { ...item, adicionadoEm: agora, atualizadoEm: agora, cadeia: item.cadeia || {}, status: 'rascunho' };
  delete dados.apagados[item.id];
  salvar();
  return true;
}

export function deixarDeAcompanhar(id) {
  delete dados.itens[id];
  dados.apagados[id] = new Date().toISOString(); // lembra que foi apagado, para o outro aparelho também apagar
  salvar();
}

/** Atualiza a cadeia de efeitos (ou o status) de um item. */
export function atualizar(id, mudancas) {
  const item = dados.itens[id];
  if (!item) return;
  Object.assign(item, mudancas, { atualizadoEm: new Date().toISOString() });
  salvar({ avisarTela: false }); // quem está digitando não precisa redesenhar a tela
}

// ---------- Salvar e sincronizar ----------

let esperaEnvio = null;
function salvar({ avisarTela = true } = {}) {
  gravarLocal();
  if (avisarTela) avisar();
  clearTimeout(esperaEnvio);
  esperaEnvio = setTimeout(sincronizar, 1500); // junta várias mudanças seguidas num envio só
}

/**
 * Junta duas versões: de cada item (e de cada tema da fila), vale a mais
 * recente; apagados valem se forem mais novos.
 */
function juntar(a, b) {
  const resultado = vazio();
  resultado.apagados = { ...a.apagados };
  for (const [id, quando] of Object.entries(b.apagados || {})) {
    if (!resultado.apagados[id] || quando > resultado.apagados[id]) resultado.apagados[id] = quando;
  }
  for (const campo of ['itens', 'fila', 'avisos', 'guardadas']) {
    resultado[campo] = {};
    for (const fonte of [a[campo] || {}, b[campo] || {}]) {
      for (const item of Object.values(fonte)) {
        const atual = resultado[campo][item.id];
        if (!atual || item.atualizadoEm > atual.atualizadoEm) resultado[campo][item.id] = item;
      }
    }
    for (const [id, quando] of Object.entries(resultado.apagados)) {
      if (resultado[campo][id] && resultado[campo][id].atualizadoEm <= quando) delete resultado[campo][id];
    }
  }
  return resultado;
}

// ---------- Notícias guardadas ----------
// "Guardar" é diferente de "Acompanhar": não tem limite por dia e não é
// para escrever análise, só para não perder a notícia. Fica para sempre.
// O id ganha o prefixo "g-" para não se misturar com o do Acompanhar
// (assim, tirar dos guardados não apaga a sua análise da mesma notícia).

const idGuardada = (id) => `g-${id}`;

/** As guardadas, da mais recente para a mais antiga. */
export const guardadas = () => Object.values(dados.guardadas || {}).sort((a, b) => b.guardadaEm.localeCompare(a.guardadaEm));
export const guardada = (id) => Boolean(dados.guardadas?.[idGuardada(id)]);

export function guardar(item) {
  const agora = new Date().toISOString();
  const id = idGuardada(item.id);
  dados.guardadas ||= {};
  dados.guardadas[id] = { ...item, id, fatoId: item.id, guardadaEm: agora, atualizadoEm: agora };
  delete dados.apagados[id];
  salvar();
}

export function tirarDasGuardadas(id) {
  const chave = id.startsWith('g-') ? id : idGuardada(id);
  if (!dados.guardadas?.[chave]) return;
  delete dados.guardadas[chave];
  dados.apagados[chave] = new Date().toISOString();
  salvar();
}

// ---------- Avisos no celular ----------
// Cada aparelho que ativou os avisos guarda aqui o seu "endereço de
// entrega". O robô lê esta lista no Dropbox para mandar o aviso das 7h.

const idDoAviso = (endpoint) => `aviso-${[...endpoint].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;

export function guardarAviso(inscricao) {
  const agora = new Date().toISOString();
  const id = idDoAviso(inscricao.endpoint);
  dados.avisos ||= {};
  dados.avisos[id] = { id, endpoint: inscricao.endpoint, keys: inscricao.keys, criadoEm: dados.avisos[id]?.criadoEm || agora, atualizadoEm: agora };
  delete dados.apagados[id];
  salvar();
}

export function esquecerAviso(endpoint) {
  const id = idDoAviso(endpoint);
  if (!dados.avisos?.[id]) return;
  delete dados.avisos[id];
  dados.apagados[id] = new Date().toISOString();
  salvar();
}

// ---------- Fila de temas sugeridos ----------
// Você sugere assuntos; o robô usa o primeiro da fila no tema do dia
// seguinte (ou de hoje, se ainda não passou das 7h) e tira da fila.

/** A fila em ordem (o primeiro é o próximo a virar tema). */
export const fila = () => Object.values(dados.fila || {}).sort((a, b) => a.ordem - b.ordem || a.criadoEm.localeCompare(b.criadoEm));

export function sugerirTema(texto) {
  const limpo = texto.trim().slice(0, 200);
  if (!limpo) return false;
  // Não deixa a mesma sugestão entrar duas vezes na fila.
  const normal = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (fila().some((x) => normal(x.texto) === normal(limpo))) return false;
  const agora = new Date().toISOString();
  const id = `fila-${Date.now().toString(36)}`;
  const ultima = fila().at(-1);
  dados.fila ||= {};
  dados.fila[id] = { id, texto: limpo, criadoEm: agora, atualizadoEm: agora, ordem: (ultima?.ordem ?? 0) + 1 };
  salvar();
  return true;
}

export function tirarDaFila(id) {
  if (!dados.fila?.[id]) return;
  delete dados.fila[id];
  dados.apagados[id] = new Date().toISOString();
  salvar();
}

/** Sobe (-1) ou desce (+1) um tema na fila, trocando de lugar com o vizinho. */
export function moverNaFila(id, direcao) {
  const lista = fila();
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return;
  const agora = new Date().toISOString();
  lista.forEach((x, k) => { x.ordem = k; });
  [lista[i].ordem, lista[j].ordem] = [lista[j].ordem, lista[i].ordem];
  lista[i].atualizadoEm = agora;
  lista[j].atualizadoEm = agora;
  salvar();
}

let sincronizando = null;
export function sincronizar() {
  if (!dropbox.conectado()) return Promise.resolve();
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    try {
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const { dados: remoto, rev } = await dropbox.ler();
        const juntos = remoto ? juntar(dados, remoto) : dados;
        const resultado = await dropbox.salvar({ ...juntos, atualizadoEm: new Date().toISOString() }, rev);
        if (resultado.conflito) continue; // outro aparelho salvou no meio: tenta de novo
        // Junta de novo com o local: você pode ter digitado algo enquanto sincronizava.
        dados = juntar(juntos, dados);
        gravarLocal();
        ultimaSincronizacao = new Date();
        ultimoErro = null;
        avisar();
        return;
      }
      throw new Error('o arquivo mudou várias vezes seguidas');
    } catch (erro) {
      ultimoErro = erro.message;
      avisar();
    } finally {
      sincronizando = null;
    }
  })();
  return sincronizando;
}
