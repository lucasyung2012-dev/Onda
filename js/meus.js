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

const vazio = () => ({ versao: 1, itens: {}, apagados: {} });

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

/** Junta duas versões: de cada item, vale a mais recente; apagados valem se forem mais novos. */
function juntar(a, b) {
  const resultado = vazio();
  resultado.apagados = { ...a.apagados };
  for (const [id, quando] of Object.entries(b.apagados || {})) {
    if (!resultado.apagados[id] || quando > resultado.apagados[id]) resultado.apagados[id] = quando;
  }
  for (const fonte of [a.itens, b.itens || {}]) {
    for (const item of Object.values(fonte)) {
      const atual = resultado.itens[item.id];
      if (!atual || item.atualizadoEm > atual.atualizadoEm) resultado.itens[item.id] = item;
    }
  }
  for (const [id, quando] of Object.entries(resultado.apagados)) {
    if (resultado.itens[id] && resultado.itens[id].atualizadoEm <= quando) delete resultado.itens[id];
  }
  return resultado;
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
