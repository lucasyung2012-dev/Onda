// =============================================================
// dropbox.js — Guarda os SEUS dados (o que você acompanha e as suas
// cadeias de efeitos) num arquivo na sua pasta do Dropbox, para
// aparecerem iguais no celular e no iPad.
//
// Como funciona o login (OAuth com PKCE, o jeito seguro para sites):
//   1. O botão "Conectar" leva você ao site do Dropbox.
//   2. Você autoriza o app Onda (ele só enxerga a pasta Apps/<nome do app>).
//   3. O Dropbox volta para o Onda com um código, que vira um "token".
//   4. O token fica guardado SÓ neste aparelho (localStorage).
//      Cada aparelho conecta uma vez.
//
// O arquivo no Dropbox é /onda.json (dentro da pasta do app).
// A "App key" abaixo não é secreta: ela identifica o app, não dá
// acesso a nada sozinha.
// =============================================================

export const APP_KEY = ''; // ← preencher com a App key do Dropbox

const CAMINHO = '/onda.json';
const CHAVE_TOKEN = 'onda-dropbox';
const CHAVE_VERIFICADOR = 'onda-dropbox-verificador';

const redirecionamento = () => `${location.origin}${location.pathname}`;
const lerLocal = (chave) => { try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; } };
const gravarLocal = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento */ } };

export const configurado = () => Boolean(APP_KEY);
export const conectado = () => Boolean(lerLocal(CHAVE_TOKEN)?.refresh_token);

// ---------- Login ----------

/** Texto aleatório em formato seguro para endereço (base64url). */
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Leva você ao Dropbox para autorizar o Onda. */
export async function conectar() {
  const verificador = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const desafio = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
  sessionStorage.setItem(CHAVE_VERIFICADOR, verificador);
  const params = new URLSearchParams({
    client_id: APP_KEY,
    response_type: 'code',
    code_challenge: desafio,
    code_challenge_method: 'S256',
    token_access_type: 'offline', // permite renovar o acesso sem pedir login de novo
    redirect_uri: redirecionamento(),
  });
  location.href = `https://www.dropbox.com/oauth2/authorize?${params}`;
}

/**
 * Se o Dropbox acabou de devolver um código no endereço (?code=...),
 * troca pelo token e limpa o endereço. Devolve true se conectou agora.
 */
export async function concluirConexao() {
  const params = new URLSearchParams(location.search);
  const codigo = params.get('code');
  if (!codigo) return false;
  history.replaceState(null, '', redirecionamento() + location.hash); // tira o código do endereço
  const verificador = sessionStorage.getItem(CHAVE_VERIFICADOR);
  if (!verificador) return false;
  const resposta = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      code: codigo, grant_type: 'authorization_code', client_id: APP_KEY,
      redirect_uri: redirecionamento(), code_verifier: verificador,
    }),
  });
  sessionStorage.removeItem(CHAVE_VERIFICADOR);
  if (!resposta.ok) throw new Error('O Dropbox não aceitou a conexão. Tente de novo.');
  const token = await resposta.json();
  gravarLocal(CHAVE_TOKEN, { ...token, expiraEm: Date.now() + (token.expires_in - 60) * 1000 });
  return true;
}

/** Devolve um token válido (renova sozinho quando vence, a cada ~4 horas). */
async function tokenValido() {
  const t = lerLocal(CHAVE_TOKEN);
  if (!t?.refresh_token) throw new Error('não conectado');
  if (t.access_token && Date.now() < t.expiraEm) return t.access_token;
  const resposta = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: APP_KEY }),
  });
  if (!resposta.ok) {
    if (resposta.status === 400 || resposta.status === 401) localStorage.removeItem(CHAVE_TOKEN); // acesso revogado
    throw new Error('Não deu para renovar o acesso ao Dropbox.');
  }
  const novo = await resposta.json();
  gravarLocal(CHAVE_TOKEN, { ...t, access_token: novo.access_token, expiraEm: Date.now() + (novo.expires_in - 60) * 1000 });
  return novo.access_token;
}

/** Desconecta este aparelho (o arquivo no Dropbox continua lá). */
export async function desconectar() {
  try {
    const token = await tokenValido();
    await fetch('https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch { /* se falhar, só esquecemos o token */ }
  localStorage.removeItem(CHAVE_TOKEN);
}

/** Nome da conta conectada (para mostrar "Conectado como ..."). */
export async function nomeDaConta() {
  const token = await tokenValido();
  const r = await fetch('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return '';
  const conta = await r.json();
  return conta.name?.display_name || '';
}

// ---------- Ler e salvar o arquivo ----------

/** Baixa o onda.json. Devolve { dados, rev } ou { dados: null } se ainda não existe. */
export async function ler() {
  const token = await tokenValido();
  const r = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path: CAMINHO }) },
  });
  if (r.status === 409) return { dados: null, rev: null }; // arquivo ainda não existe
  if (!r.ok) throw new Error(`Dropbox respondeu ${r.status}`);
  const info = JSON.parse(r.headers.get('Dropbox-API-Result') || '{}');
  const dados = await r.json();
  let rev = info.rev || null;
  if (!rev) {
    // Plano B: se o navegador não mostrar a revisão, pergunta direto ao Dropbox.
    const m = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: CAMINHO }),
    });
    if (m.ok) rev = (await m.json()).rev || null;
  }
  return { dados, rev };
}

/**
 * Salva o onda.json. Usa a "revisão" para não apagar uma mudança feita
 * em outro aparelho ao mesmo tempo: se o arquivo mudou, devolve
 * { conflito: true } e quem chamou junta as duas versões antes de tentar de novo.
 */
export async function salvar(dados, rev) {
  const token = await tokenValido();
  const modo = rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' };
  const r = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path: CAMINHO, mode: modo, autorename: false, mute: true }),
    },
    body: new TextEncoder().encode(JSON.stringify(dados, null, 2)),
  });
  if (r.status === 409) return { conflito: true };
  if (!r.ok) throw new Error(`Dropbox respondeu ${r.status}`);
  const info = await r.json();
  return { rev: info.rev };
}
