/* ============================================================================
 * sw.js — Service worker mínimo do PWA Enjoy.
 * Estratégia: HTML rede-primeiro (evita ficar preso em página velha), estáticos
 * cache-first. Bump o CACHE ao trocar assets pra invalidar o antigo.
 *
 * ⚠️ TODOS os caminhos são RELATIVOS ao local do próprio sw.js (raiz do site).
 * Assim o PWA funciona em qualquer subpath (ex.: GitHub Pages /cowork-odonto/)
 * sem editar nada. O registro (assets/js/db.js e public/index.html) também usa
 * caminho relativo, e a fallback offline resolve pela BASE do sw.
 * ==========================================================================*/
var CACHE = "enjoy-v14";
// BASE = diretório do sw.js (termina em "/"). new Request() abaixo resolve os
// relativos contra a URL do sw, mas guardamos a base p/ a fallback de navegação.
var BASE = self.location.href.replace(/sw\.js.*$/, "");
var FALLBACK = "public/app/index.html";
var SHELL = [
  "public/index.html",
  "public/app/index.html",
  "public/app/login.html",
  "public/app/cadastro.html",
  "public/app/reservar.html",
  "public/app/gestao.html",
  "public/app/gestao-financeiro.html",
  "public/app/gestao-cadastros.html",
  "public/app/faturas.html",
  "public/app/pagamento-cartao.html",
  "public/app/contrato.html",
  "assets/css/base.css",
  "assets/js/motor-reservas.js",
  "assets/js/brand.js",
  "assets/js/db.js",
  "assets/js/nav-app.js",
  "assets/vendor/supabase.js",
  "assets/img/icon.svg",
  "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.allSettled(SHELL.map(function (u) { return c.add(new Request(BASE + u)); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.filter(function (k) { return k !== CACHE; })
                               .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                 // não intercepta POST (RPCs)
  if (req.url.indexOf("supabase.co") !== -1) return; // nunca cacheia a API

  var ehHtml = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (ehHtml) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) { var clone = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, clone); }); }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match(BASE + FALLBACK); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          var clone = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      });
    })
  );
});
