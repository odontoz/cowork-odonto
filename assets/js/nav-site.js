/* ============================================================================
 * nav-site.js — menu sanduíche do SITE institucional (home, preços, visita,
 * termos, privacidade, LPs, hub e as páginas da fazenda de SEO).
 *
 * NÃO confundir com o assets/js/nav-app.js, que monta a navegação do app do
 * dentista em /public/app/* e tem hambúrguer próprio. Aqui a barra já vem
 * escrita no HTML — este arquivo só dá comportamento a ela.
 *
 * O que o HTML precisa ter:
 *   <nav class="nav-site">
 *     <div class="nav-menu" id="menu-site"> …os links que recolhem… </div>
 *     <a class="link" …>Entrar</a>            ← nunca recolhe
 *     <a class="btn btn-cta" …>Agendar visita</a>  ← nunca recolhe
 *     <button class="nav-sanduiche" type="button" aria-controls="menu-site"
 *             aria-expanded="false" aria-label="Abrir menu">
 *       <span class="barras" aria-hidden="true"></span>
 *     </button>
 *   </nav>
 *
 * E o <head> precisa de duas linhas:
 *   <script>document.documentElement.classList.add("js")</script>
 *   <script src="…/assets/js/nav-site.js" defer></script>
 *
 * A classe `js` é quem liga o modo painel no CSS. Sem JavaScript ela nunca
 * aparece, o painel não existe e os quatro links continuam VISÍVEIS, quebrando
 * linha — degradação limpa, ninguém fica sem o menu. Ela é posta por um script
 * SÍNCRONO no <head> de propósito: se ficasse aqui (defer), a barra pintaria
 * uma vez aberta e recolheria em seguida, piscando na cara de quem chega.
 *
 * Acessibilidade: abre e fecha pelo teclado (o botão é <button> de verdade),
 * Esc fecha e devolve o foco ao botão, o foco fica preso entre o botão e os
 * links enquanto o painel está aberto, e o botão anuncia estado (aria-expanded)
 * e rótulo (aria-label).
 * ==========================================================================*/
(function () {
  "use strict";

  function iniciar() {
    var botao = document.querySelector(".nav-sanduiche");
    var painel = document.getElementById("menu-site");
    if (!botao || !painel) return;

    var estreito = window.matchMedia("(max-width: 859.98px)");
    var fundo = null;

    function estaAberto() { return botao.getAttribute("aria-expanded") === "true"; }

    function linksDoPainel() {
      return Array.prototype.slice.call(painel.querySelectorAll("a[href]"));
    }

    function abrir() {
      painel.classList.add("aberto");
      botao.setAttribute("aria-expanded", "true");
      botao.setAttribute("aria-label", "Fechar menu");
      if (!fundo) {
        fundo = document.createElement("div");
        fundo.className = "nav-fundo";
        fundo.addEventListener("click", function () { fechar(true); });
      }
      document.body.appendChild(fundo);
      // a classe sobe a .topbar acima do escurecido (ver .nav-fundo no site.css)
      document.body.classList.add("menu-aberto");
      var alvos = linksDoPainel();
      if (alvos.length) alvos[0].focus();
    }

    function fechar(devolverFoco) {
      painel.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
      botao.setAttribute("aria-label", "Abrir menu");
      if (fundo && fundo.parentNode) fundo.parentNode.removeChild(fundo);
      document.body.classList.remove("menu-aberto");
      if (devolverFoco) botao.focus();
    }

    botao.addEventListener("click", function () {
      if (estaAberto()) fechar(false); else abrir();
    });

    document.addEventListener("keydown", function (e) {
      if (!estaAberto()) return;

      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        fechar(true);
        return;
      }
      if (e.key !== "Tab") return;

      // laço de foco: enquanto o painel está aberto o Tab só circula entre o
      // botão e os links do painel — não escapa para trás da camada.
      var anel = [botao].concat(linksDoPainel());
      var i = anel.indexOf(document.activeElement);
      var proximo;
      if (i === -1) {
        proximo = 0;
      } else {
        proximo = e.shiftKey ? i - 1 : i + 1;
        if (proximo < 0) proximo = anel.length - 1;
        if (proximo >= anel.length) proximo = 0;
      }
      e.preventDefault();
      anel[proximo].focus();
    });

    // clicou num link: fecha. Âncora da mesma página (#faq) não recarrega nada,
    // e sem isto o painel ficaria aberto por cima da seção para onde ele rolou.
    painel.addEventListener("click", function (e) {
      var alvo = e.target;
      while (alvo && alvo !== painel && alvo.tagName !== "A") alvo = alvo.parentNode;
      if (alvo && alvo.tagName === "A") fechar(false);
    });

    // girou o aparelho / abriu a janela: em tela larga o painel some pelo CSS,
    // então o estado do botão e o fundo escurecido têm que sumir junto.
    function aoMudarLargura() { if (!estreito.matches && estaAberto()) fechar(false); }
    if (estreito.addEventListener) estreito.addEventListener("change", aoMudarLargura);
    else if (estreito.addListener) estreito.addListener(aoMudarLargura);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
