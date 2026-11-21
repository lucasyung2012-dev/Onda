// =============================================================
// avisos.js — O aviso no celular ("O destaque do dia chegou").
//
// Como funciona (Web Push, o padrão dos navegadores):
//   1. Você toca em "Ativar avisos" e o celular pede a sua permissão.
//   2. O navegador cria um "endereço de entrega" só deste aparelho.
//   3. O Onda guarda esse endereço no seu Dropbox (onda.json).
//   4. Todo dia, depois de escrever o destaque, o robô lê o endereço e
//      manda o aviso. Quem mostra o aviso é o service worker (sw.js).
//
// No iPhone e no iPad, só funciona com o Onda instalado na tela de
// início (Compartilhar → Adicionar à Tela de Início), no iOS 16.4 ou mais novo.
//
// A chave abaixo é PÚBLICA (identifica o Onda). A chave privada fica só
// nos Secrets do GitHub (VAPID_PRIVATE_KEY).
// =============================================================

export const CHAVE_PUBLICA = 'BEXWbXw6YsgsVT-0iEFkfyTKTzKSmTxFdxb5wplHmEXBC5Laond3yx9irxzesWnwJcBWv5Hx13fKkEXabOgaYxU';

/** O navegador sabe receber avisos? */
export const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Está aberto como app instalado (tela de início)? No iPhone isso é obrigatório. */
export const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const ehApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Situação dos avisos neste aparelho. */
export async function situacao() {
  if (!suportado()) return { suportado: false, precisaInstalar: ehApple() && !instalado() };
  const registro = await navigator.serviceWorker.getRegistration();
  const inscricao = await registro?.pushManager.getSubscription();
  return { suportado: true, permissao: Notification.permission, ativo: Boolean(inscricao), precisaInstalar: ehApple() && !instalado() };
}

/** Converte a chave pública (texto) para o formato que o navegador pede. */
function chaveEmBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Pede permissão e cria o "endereço de entrega" deste aparelho. Devolve a inscrição (JSON). */
export async function ativar() {
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('permissao-negada');
  const registro = await navigator.serviceWorker.ready;
  const inscricao = (await registro.pushManager.getSubscription())
    || await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_PUBLICA) });
  return inscricao.toJSON();
}

/** Desliga os avisos neste aparelho. Devolve o endereço que foi desligado. */
export async function desativar() {
  const registro = await navigator.serviceWorker.getRegistration();
  const inscricao = await registro?.pushManager.getSubscription();
  if (!inscricao) return null;
  const endereco = inscricao.endpoint;
  await inscricao.unsubscribe();
  return endereco;
}
