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
// v42 (02/09/2026): o brand.js mudou DUAS vezes hoje — ganhou o disparo da conversão de
// clique no WhatsApp e trocou o Instagram de @clinicshareoficial (que não é nosso) para
// @clinicsharebr. Sem este bump, quem já tinha visitado o site continuava recebendo o
// arquivo velho do cache: conversão não disparava e o rodapé seguia mandando visita PAGA
// para o perfil de terceiro. Publicar asset e esquecer o bump = mudança que só o visitante
// novo enxerga.
// v44 (02/09): saíram da home as promessas que não existem hoje — check-in digital
// (3 lugares) e o raio-X sem a ressalva do sensor/insumos. Com anúncio pago rodando,
// promessa que a visita desmente vira reclamação, não venda.
// v45 (02/09): raio-X com o nome do aparelho (Saevo de parede) e o posicionador na lista do
// que é do profissional — a casa NÃO fornece. E saiu a frase que prometia mostrar licenças e
// certificações na visita: o alvará da vigilância ainda não saiu, então isso era promessa que
// a visita não entrega.
var CACHE = "enjoy-v45";
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

  // stale-while-revalidate: entrega o cache (rapido) MAS sempre busca a versao nova
  // em segundo plano. Antes era cache-first cego — um brand.js corrigido podia nunca
  // chegar no navegador de quem ja tinha o antigo (aconteceu 2x: logo do rodape e o
  // link de definir senha em 25/08/2026).
  e.respondWith(
    caches.match(req).then(function (hit) {
      var rede = fetch(req).then(function (res) {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          var clone = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || rede;
    })
  );
});
