// =============================================================
// sw.js — Service worker do Onda.
//
// Um service worker é um pequeno programa que o navegador guarda e
// roda "por trás" do site. Aqui ele faz duas coisas:
//   1. Guarda os arquivos do app (HTML, CSS, JS, ícones) para o app
//      abrir mesmo sem internet.
//   2. Para as notícias: tenta buscar a versão nova na internet; se
//      não conseguir, mostra a última que guardou.
//
// Ao mudar algum arquivo do app, aumente o número da VERSAO para os
// aparelhos baixarem a versão nova.
// =============================================================

const VERSAO = 'onda-v11';

const ARQUIVOS_DO_APP = [
  './',
  'index.html',
  'css/estilo.css',
  'js/app.js',
  'js/telas.js',
  'js/util.js',
  'js/meus.js',
  'js/dropbox.js',
  'js/prompt.js',
  'js/config.js',
  'js/textos.js',
  'manifest.webmanifest',
  'assets/logo/onda.svg',
  'assets/logo/onda-mini.svg',
  'assets/icones/icone-192.png',
  'assets/icones/icone-512.png',
  'assets/icones/apple-touch-icon.png',
];

// Instalação: guarda os arquivos do app.
self.addEventListener('install', (evento) => {
  // Guarda um por um: se algum arquivo faltar, os outros são guardados mesmo assim.
  evento.waitUntil(caches.open(VERSAO).then((cache) =>
    Promise.all(ARQUIVOS_DO_APP.map((arquivo) => cache.add(arquivo).catch(() => null)))));
  self.skipWaiting();
});

// Ativação: apaga guardados de versões antigas.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);

  // Notícias e páginas: internet primeiro, cópia guardada se estiver offline.
  if (url.pathname.includes('/data/') || pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(() => caches.match(pedido, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
    );
    return;
  }

  // Arquivos do app e fontes: mostra a cópia guardada na hora (rápido) e,
  // ao mesmo tempo, busca a versão nova para a próxima abertura.
  if (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    evento.respondWith(
      caches.match(pedido).then((guardado) => {
        const daInternet = fetch(pedido).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        }).catch(() => guardado);
        return guardado || daInternet;
      }),
    );
  }
  // Fotos das notícias: vêm direto dos sites das fontes, sem guardar cópia.
});
