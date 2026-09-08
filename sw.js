// ClinicShare — service worker.
// O HISTÓRICO DE VERSÕES SAIU DAQUI DE PROPÓSITO (08/09/2026): este arquivo é público,
// baixado por todo visitante, e o changelog expunha assunto interno. Ele vive agora em
// docs/sw-historico.md, que não sobe para o site.
// v60 (08/09): brand.js e public/index.html perderam comentários internos; sem o bump,
// quem já visitou continuaria servindo do cache a versão com eles.

var CACHE = "enjoy-v60";
var BASE = self.location.href.replace(/sw\.js.*$/, "");
var FALLBACK = "public/app/index.html";
var SHELL = [
  "public/index.html",
  "public/app/index.html",
  "public/app/login.html",
  "public/app/cadastro.html",
  "public/app/reservar.html",
  "public/app/minhas-reservas.html",
  "public/app/gestao.html",
  "public/app/gestao-financeiro.html",
  "public/app/gestao-cadastros.html",
  "public/app/gestao-avisos.html",
  "public/app/renovar-taxa.html",
  "public/app/faturas.html",
  "public/app/pagamento-cartao.html",
  "public/app/contrato.html",
  "assets/css/base.css",
  "assets/js/motor-reservas.js",
  "assets/js/brand.js",
  "assets/js/db.js",
  "assets/js/nav-app.js",
  "assets/js/taxa-banner.js",
  "assets/vendor/supabase.js",
  "assets/img/icon.svg",
  "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.allSettled(SHELL.map(function (u) {
        return c.add(new Request(BASE + u, { cache: "reload" }));
      }));
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
  if (req.method !== "GET") return;
  if (req.url.indexOf("supabase.co") !== -1) return;

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
      var pedido = req.url.startsWith(self.location.origin)
        ? new Request(req.url, { cache: "reload", credentials: req.credentials, mode: "same-origin" })
        : req;
      var rede = fetch(pedido).then(function (res) {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          var clone = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || rede;
    })
  );
});
