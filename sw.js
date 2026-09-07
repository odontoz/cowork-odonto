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
// v46 (02/09): saiu do site TODA declaração de situação regulatória — o card "Vigilância
// sanitária", "estrutura em conformidade", "regularização já resolvidas", "conforme as normas
// vigentes". Ordem do dono: nada declarado sobre vigilância/alvará em lugar nenhum enquanto
// o alvará não sair. A seção de biossegurança agora se sustenta só no físico.
// v47 (02/09): régua ajustada pelo dono. Volta a linguagem geral ("em conformidade",
// "regularização", PGRSS) — é descrição de estrutura. Fica FORA só o que DECLARA situação
// sanitária: o card "Vigilância sanitária" e a promessa de mostrar licenças na visita.
// v48 (02/09): Meta Pixel 1059808447015750 instalado nas 5 páginas públicas. O evento Lead
// da visita.html já estava escrito e nunca disparava — agora fbq existe e ele passa a contar.
// v49 (04/09): a LP de HOF respondia "Sim" a "posso fazer procedimentos injetáveis?" e chamava
// injetável de "não invasiva". Isso fazia a ClinicShare AUTORIZAR o procedimento em vez de alugar
// a sala — e é essa aparência de prestador que cria responsabilidade compartilhada. A resposta
// agora diz o que a casa faz (aluga a sala equipada) e devolve a habilitação para o profissional
// e o conselho dele. Ver docs/planejamento/17-quem-pode-fazer-hof.md.
// v50 (05/09): horário alinhado ao que a agenda REALMENTE abre — 08h às 23h todos os dias
// (config.horario_funcionamento no banco). O site anunciava "Seg a Sáb até 22h, Dom até 18h"
// e escondia uma hora por dia mais o domingo inteiro. Mexeu no brand.js, no index (texto,
// FAQ e JSON-LD) e na LP de aluguel por hora.
// v51 (07/09): visita.html — é a página que os anúncios do Meta abrem e ela
// contradizia os próprios anúncios. Saiu "Pronto pra atender · Cadeira, equipo, RX e
// esterilização no local" (o RX levava a entender que era só chegar e usar; o sensor e os
// insumos são do profissional — a home já dizia isso e esta página tinha ficado para trás)
// e "Aberto todo dia" virou "Todo dia, 8h às 23h", que é específico e verificável.
// v52 (07/09): o clique no WhatsApp agora dispara TAMBÉM o evento Contact
// da Meta, além da conversão do Google. É o evento que a campanha do Meta vai otimizar —
// escolha do dono, e é o mesmo evento de negócio que a OdontoZ já usa.
// v57 (07/09): meta tag de verificação de domínio da Meta na raiz e na home.
var CACHE = "enjoy-v57";
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
      // cache: "reload" OBRIGATORIO — sem isto o c.add() passa pelo cache HTTP do
      // navegador e o GitHub Pages responde com max-age=600: o SW NOVO guardava o
      // arquivo VELHO e o bump do CACHE nao adiantava nada. Pego em tela em 07/09/2026,
      // com o brand.js: `caches.keys()` dizia enjoy-v54 e o conteudo dentro era o v53.
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
      // Mesma razao do install: a revalidacao tem que ir na REDE, nao no cache HTTP.
      // Only same-origin — em terceiros (fbevents.js, gtag.js) o pedido segue como veio.
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
