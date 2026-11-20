// =============================================================
// config.js — As suas configurações (ficam salvas neste aparelho).
//
//   aparencia: 'auto' (segue o celular) | 'escuro' | 'claro'
//   idioma:    'pt' | 'en'
//   letra:     'p' | 'm' | 'g' | 'gg'   (tamanho do texto)
//   contraste: 'normal' | 'alto'
//   movimento: 'normal' | 'reduzido'  (menos animações)
//
// As configurações viram atributos na tag <html> (ex.: data-letra="g")
// e o CSS (estilo.css) muda o visual a partir deles.
// =============================================================

const CHAVE = 'onda-config';
export const PADRAO = { aparencia: 'auto', idioma: 'pt', letra: 'm', contraste: 'normal', movimento: 'normal' };

export function ler() {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE)) }; } catch { return { ...PADRAO }; }
}

const prefereClaro = matchMedia('(prefers-color-scheme: light)');

/** Aplica as configurações na página. */
export function aplicar(config = ler()) {
  const raiz = document.documentElement;
  const tema = config.aparencia === 'auto' ? (prefereClaro.matches ? 'claro' : 'escuro') : config.aparencia;
  raiz.dataset.tema = tema;
  raiz.dataset.letra = config.letra;
  raiz.dataset.contraste = config.contraste;
  raiz.dataset.movimento = config.movimento;
  raiz.lang = config.idioma === 'en' ? 'en' : 'pt-BR';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'escuro' ? '#051526' : '#F2F6F8');
}

export function salvar(mudancas) {
  const config = { ...ler(), ...mudancas };
  try { localStorage.setItem(CHAVE, JSON.stringify(config)); } catch { /* sem armazenamento: vale só agora */ }
  aplicar(config);
  return config;
}

// No modo "automático", acompanha quando o celular troca entre claro e escuro.
prefereClaro.addEventListener('change', () => { if (ler().aparencia === 'auto') aplicar(); });

/** O usuário pediu menos movimento (aqui ou nas configurações do celular)? */
export const menosMovimento = () =>
  ler().movimento === 'reduzido' || matchMedia('(prefers-reduced-motion: reduce)').matches;
