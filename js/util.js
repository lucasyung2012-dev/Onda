// =============================================================
// util.js — Funções pequenas usadas em vários lugares do app.
// =============================================================

const FUSO = 'America/Sao_Paulo';

/**
 * Protege o texto antes de colocá-lo no HTML.
 * Sem isso, um título com "<" ou "&" poderia quebrar a página
 * (ou, pior, rodar código que veio de um feed).
 */
export function esc(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "há 5 min", "há 3 h", "ontem"... */
export function tempoRelativo(iso, agora = new Date()) {
  if (!iso) return '';
  const minutos = Math.round((agora - new Date(iso)) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

/** "20/11/2026, 17:37" no horário de Brasília. */
export function dataHora(iso) {
  if (!iso) return 'sem dado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** "17:37" no horário de Brasília. */
export function hora(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "sexta-feira, 20 de novembro" a partir de "2026-11-20". */
export function dataPorExtenso(aaaammdd) {
  // Meio-dia evita que o fuso horário empurre a data para o dia anterior.
  const data = new Date(`${aaaammdd}T12:00:00-03:00`);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' }).format(data);
}

/** 1376 → "1.376" */
export function numero(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

/** Cor da região (definida no CSS como --r-<região>). */
export function corRegiao(regiao) {
  return `var(--r-${regiao || 'mundo'})`;
}
