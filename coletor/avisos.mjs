// =============================================================
// avisos.mjs — Manda o aviso "o destaque do dia chegou" para o celular.
//
// Roda depois do analista. Lê no Dropbox (onda.json) os aparelhos que
// ativaram os avisos e manda um aviso para cada um, uma vez por dia.
//
// Precisa de dois Secrets no GitHub:
//   VAPID_PRIVATE_KEY     → a chave privada dos avisos (a pública está abaixo)
//   DROPBOX_REFRESH_TOKEN → a mesma chave que o robô usa para ler a fila
//
// Usa o pacote "web-push", que o robô instala na hora (npm install).
// =============================================================

import { readFile, writeFile } from 'node:fs/promises';
import webpush from 'web-push';
import { lerOnda, filaConfigurada } from './fila.mjs';

const CHAVE_PUBLICA = 'BEXWbXw6YsgsVT-0iEFkfyTKTzKSmTxFdxb5wplHmEXBC5Laond3yx9irxzesWnwJcBWv5Hx13fKkEXabOgaYxU';
const RAIZ = new URL('../', import.meta.url);
const arquivo = (c) => new URL(c, RAIZ);
const lerJson = async (c, padrao) => { try { return JSON.parse(await readFile(arquivo(c), 'utf8')); } catch { return padrao; } };
const dataBrasilia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

async function principal() {
  if (!process.env.VAPID_PRIVATE_KEY) { console.log('Sem VAPID_PRIVATE_KEY nos Secrets: avisos desligados.'); return; }
  if (!filaConfigurada()) { console.log('Sem DROPBOX_REFRESH_TOKEN: não dá para achar os aparelhos.'); return; }

  const hoje = dataBrasilia(new Date());
  const forcar = process.env.FORCAR_AVISO === 'sim';
  const analise = await lerJson('data/app/analise.json', null);
  if (analise?.dataReferencia !== hoje || !analise?.destaque) { console.log('Ainda não há destaque de hoje: nenhum aviso enviado.'); return; }

  const controle = await lerJson('data/app/aviso-enviado.json', {});
  if (controle.data === hoje && !forcar) { console.log('O aviso de hoje já foi enviado.'); return; }

  const onda = await lerOnda();
  const apagados = onda.apagados || {};
  const aparelhos = Object.values(onda.avisos || {}).filter((a) => !apagados[a.id] || a.atualizadoEm > apagados[a.id]);
  if (!aparelhos.length) { console.log('Nenhum aparelho ativou os avisos.'); return; }

  const tema = await lerJson('data/app/tema.json', null);
  const corpo = `${analise.destaque.titulo}${tema?.dataReferencia === hoje ? `\nTema do dia: ${tema.titulo}` : ''}`;
  webpush.setVapidDetails('https://lucasyung2012-dev.github.io/Onda/', CHAVE_PUBLICA, process.env.VAPID_PRIVATE_KEY.trim());

  let enviados = 0;
  for (const a of aparelhos) {
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: a.keys },
        JSON.stringify({ titulo: 'Onda · Destaque do dia', corpo, url: './#hoje' }),
        { TTL: 12 * 3600 }, // se o celular estiver desligado, o aviso espera até 12 horas
      );
      enviados++;
    } catch (erro) {
      // 404/410 = o aparelho desligou os avisos ou reinstalou o app
      console.log(`Aparelho ${a.id}: não entregue (${erro.statusCode || erro.message})`);
    }
  }
  await writeFile(arquivo('data/app/aviso-enviado.json'), JSON.stringify({ data: hoje, enviados, aparelhos: aparelhos.length }) + '\n');
  console.log(`Avisos enviados: ${enviados} de ${aparelhos.length} aparelho(s).`);
}

principal().catch((erro) => { console.error('Os avisos falharam:', erro.message); process.exit(1); });
