/* ============================================================================
 * galeria.js — carrossel de fotos das salas (20/09/2026)
 *
 * PRINCÍPIO: a faixa já rola sozinha por CSS (scroll-snap). No celular o dedo
 * arrasta e pronto — sem JS nenhum. Este arquivo só ACRESCENTA o que o mouse
 * precisa: setas, pontinhos e o contador "2/5". Por isso liga a classe
 * `.tem-js` no container: sem ele, esses controles ficam escondidos e a
 * galeria continua utilizável. Nunca some foto por causa de JS quebrado.
 *
 * COMO USAR na página:
 *   <div class="galeria" data-galeria>
 *     <div class="galeria-faixa">
 *       <img src="..." alt="..."> <img src="..." alt="..."> …
 *     </div>
 *   </div>
 * Carregar no fim do body: <script src="assets/js/galeria.js" defer></script>
 * ==========================================================================*/
(function () {
  "use strict";
  window.__galeriaVersao = "2026-09-20-c";

  function montar(cx) {
    var faixa = cx.querySelector(".galeria-faixa");
    if (!faixa) return;
    var fotos = faixa.querySelectorAll("img");
    if (fotos.length < 2) return;            // uma foto só não vira carrossel

    cx.classList.add("tem-js");
    var nome = cx.getAttribute("data-galeria") || "as fotos";

    // ---- contador -----------------------------------------------------
    var conta = document.createElement("span");
    conta.className = "galeria-conta";
    cx.appendChild(conta);

    // ---- setas --------------------------------------------------------
    function seta(classe, rotulo, texto) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "galeria-seta " + classe;
      b.setAttribute("aria-label", rotulo);
      b.innerHTML = texto;
      cx.appendChild(b);
      return b;
    }
    var ant  = seta("ant",  "Foto anterior de " + nome, "&#8249;");
    var prox = seta("prox", "Próxima foto de " + nome, "&#8250;");

    // ---- pontinhos ----------------------------------------------------
    var pontos = document.createElement("div");
    pontos.className = "galeria-pontos";
    var bolas = [];
    Array.prototype.forEach.call(fotos, function (_, i) {
      var p = document.createElement("button");
      p.type = "button";
      p.className = "galeria-ponto";
      p.setAttribute("aria-label", "Ver foto " + (i + 1) + " de " + fotos.length);
      p.addEventListener("click", function () { irPara(i); });
      pontos.appendChild(p);
      bolas.push(p);
    });
    cx.appendChild(pontos);

    // A posição é lida do próprio scroll (e não de um índice guardado à
    // parte): assim o arraste com o dedo e o clique nas setas nunca
    // divergem — é a mesma fonte de verdade.
    function atual() {
      return Math.round(faixa.scrollLeft / faixa.clientWidth);
    }
    // ⚠️ SEM ANIMAÇÃO DE PROPÓSITO — e isso custou caro para descobrir
    // (20/09/2026). Tentei `scrollTo({behavior:"smooth"})` e depois uma
    // animação própria com requestAnimationFrame: as duas FALHAM quando a aba
    // está oculta ou em segundo plano, porque o Chrome suspende o rAF e
    // estrangula os timers. Resultado: a pessoa clica na seta e a foto não
    // anda. Atribuir `scrollLeft` direto é a única forma que funciona em
    // qualquer estado da aba, e é instantânea.
    // A suavidade que importa não se perdeu: no celular — onde a maioria vai
    // ver — o dedo arrasta com a inércia nativa do scroll-snap, que é do
    // sistema e não depende de nada disto.
    function irPara(i) {
      var alvo = Math.min(Math.max(i, 0), fotos.length - 1);
      faixa.scrollLeft = alvo * faixa.clientWidth;
      pintar();
    }
    function pintar() {
      var i = Math.min(Math.max(atual(), 0), fotos.length - 1);
      conta.textContent = (i + 1) + "/" + fotos.length;
      ant.disabled = i === 0;
      prox.disabled = i === fotos.length - 1;
      bolas.forEach(function (p, k) {
        p.setAttribute("aria-current", k === i ? "true" : "false");
      });
    }

    ant.addEventListener("click", function () { irPara(atual() - 1); });
    prox.addEventListener("click", function () { irPara(atual() + 1); });

    // Throttle por RELÓGIO, não por rAF — pelo mesmo motivo acima: em aba
    // oculta o rAF não vem, e o contador ficaria preso em "1/6" enquanto a
    // faixa já rolou.
    var ultimo = 0;
    faixa.addEventListener("scroll", function () {
      var agora = Date.now();
      if (agora - ultimo < 60) return;
      ultimo = agora;
      pintar();
    }, { passive: true });

    // setas do teclado quando a galeria está em foco
    faixa.setAttribute("tabindex", "0");
    faixa.setAttribute("role", "group");
    faixa.setAttribute("aria-label", "Fotos " + (nome ? "de " + nome : ""));
    faixa.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); irPara(atual() + 1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); irPara(atual() - 1); }
    });

    window.addEventListener("resize", pintar);
    pintar();
  }

  function iniciar() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-galeria]"), montar
    );
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
