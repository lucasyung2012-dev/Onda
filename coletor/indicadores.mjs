// =============================================================
// indicadores.mjs — O robô que baixa os indicadores (a cada 3 horas).
//
// As fontes e as regras de cada indicador estão em
// js/fontes-indicadores.js (o mesmo arquivo que o app usa como plano B).
//
// Grava data/app/indicadores.json. Se uma fonte falhar, os outros
// indicadores seguem e o que falhou mantém os dados da rodada anterior.
// =============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { INDICADORES, baixarSerie, montar } from '../js/fontes-indicadores.js';
import { gasolina } from './anp.mjs';

const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);

async function principal() {
  const anterior = await readFile(arquivo('data/app/indicadores.json'), 'utf8').then(JSON.parse).catch(() => ({ indicadores: [] }));
  const resultado = [];
  for (const ind of INDICADORES) {
    // A ANP só publica uma vez por semana e a planilha dos estados é grande:
    // baixamos a gasolina no máximo a cada 12 horas.
    const velho = anterior.indicadores.find((x) => x.id === ind.id);
    if (ind.origem.anp && velho?.atualizadoEm && Date.now() - new Date(velho.atualizadoEm).getTime() < 12 * 3600000 && !velho.erro) {
      resultado.push(velho);
      console.log(`${ind.nome}: ainda recente, mantido`);
      continue;
    }
    try {
      // A gasolina vem da planilha da ANP (só o robô lê); o resto, das APIs
      const serie = ind.origem.anp ? await gasolina(ind.origem.anp === 'BRASIL' ? null : ind.origem.anp) : await baixarSerie(ind);
      if (serie.length < 2) throw new Error('série vazia');
      const pronto = montar(ind, serie);
      resultado.push({ ...pronto, atualizadoEm: new Date().toISOString() });
      console.log(`${ind.nome}: ${pronto.ultimo.valor} em ${pronto.ultimo.data} (${serie.length} pontos)`);
    } catch (erro) {
      console.log(`${ind.nome}: falhou (${erro.message}); mantendo os dados anteriores`);
      if (velho) resultado.push({ ...velho, erro: erro.message });
    }
  }
  await mkdir(arquivo('data/app/'), { recursive: true });
  await writeFile(arquivo('data/app/indicadores.json'), JSON.stringify({ geradoEm: new Date().toISOString(), indicadores: resultado }) + '\n', 'utf8');
}

principal().catch((erro) => { console.error('Indicadores falharam:', erro); process.exit(1); });
