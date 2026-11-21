// =============================================================
// fila.mjs — O robô lendo a sua "fila de temas" no Dropbox.
//
// O app guarda as suas sugestões de tema no arquivo onda.json, na pasta
// do app Onda no seu Dropbox. Para o robô do GitHub conseguir ler esse
// arquivo, ele usa a "chave de renovação" que você salvou nos Secrets
// (DROPBOX_REFRESH_TOKEN). Ela só abre a pasta do Onda.
//
// O robô pega o PRIMEIRO da fila e, depois que o tema do dia fica
// pronto, tira ele da fila (o app vê a mudança na próxima sincronização).
// =============================================================

const APP_KEY = 'su4ar3bli5d9fgs'; // a mesma do app (pública)
const CAMINHO = '/onda.json';

export const filaConfigurada = () => Boolean(process.env.DROPBOX_REFRESH_TOKEN);

let tokenAtual = null;
async function token() {
  if (tokenAtual) return tokenAtual;
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: process.env.DROPBOX_REFRESH_TOKEN, client_id: APP_KEY }),
  });
  if (!r.ok) throw new Error(`Dropbox não aceitou a chave do robô (HTTP ${r.status})`);
  tokenAtual = (await r.json()).access_token;
  return tokenAtual;
}

async function ler() {
  const t = await token();
  const r = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Dropbox-API-Arg': JSON.stringify({ path: CAMINHO }) },
  });
  if (r.status === 409) return { dados: null, rev: null };
  if (!r.ok) throw new Error(`Dropbox respondeu ${r.status}`);
  const info = JSON.parse(r.headers.get('Dropbox-API-Result') || '{}');
  return { dados: await r.json(), rev: info.rev };
}

/** O primeiro tema da fila (ou null se a fila estiver vazia). */
export async function proximaSugestao() {
  const { dados } = await ler();
  const fila = Object.values(dados?.fila || {})
    .filter((x) => !(dados.apagados || {})[x.id] || x.atualizadoEm > dados.apagados[x.id])
    .sort((a, b) => a.ordem - b.ordem || a.criadoEm.localeCompare(b.criadoEm));
  return fila[0] || null;
}

const normal = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Tira um tema da fila (depois que ele virou o tema do dia), junto com
 * qualquer cópia com o mesmo texto (ex.: sugerida duas vezes, ou no
 * celular e no iPad). Devolve quantos itens saíram.
 */
export async function tirarDaFila(id, texto) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { dados, rev } = await ler();
    const iguais = Object.values(dados?.fila || {}).filter((x) => x.id === id || normal(x.texto) === normal(texto)).map((x) => x.id);
    if (!iguais.length) return 0;
    const agora = new Date().toISOString();
    dados.apagados = { ...(dados.apagados || {}) };
    for (const i of iguais) { delete dados.fila[i]; dados.apagados[i] = agora; }
    dados.atualizadoEm = agora;
    const r = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await token()}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path: CAMINHO, mode: { '.tag': 'update', update: rev }, autorename: false, mute: true }),
      },
      body: new TextEncoder().encode(JSON.stringify(dados, null, 2)),
    });
    if (r.ok) return iguais.length;
    if (r.status !== 409) throw new Error(`Dropbox respondeu ${r.status}`);
    // 409 = o app mudou o arquivo no meio: lê de novo e tenta outra vez
  }
  throw new Error('não deu para tirar o tema da fila (o arquivo mudou várias vezes)');
}
