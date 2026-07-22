/* ============================================================================
 * nav-app.js — navegação ÚNICA do app do dentista (e variante gestão).
 *
 * Reconstrói o <header class="topbar"> de qualquer página /public/app/* com um
 * menu consistente (logo + links + Sair) e hambúrguer no mobile. Detecta a
 * página ativa pelo nome do arquivo. NÃO usar em login/cadastro/pagamento
 * (funil sem distração) — basta não incluir o <script> nessas telas.
 *
 * Carregar DEPOIS do db.js (o Sair usa DB.sair):
 *   <script src="../../assets/js/nav-app.js" defer></script>
 * ==========================================================================*/
(function () {
  "use strict";

  var arquivo = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  // menus por contexto (dentista x gestão) — decidido pelo nome do arquivo
  var GESTAO = ["gestao.html", "gestao-financeiro.html"];
  var ehGestao = GESTAO.indexOf(arquivo) !== -1;

  var LINKS = ehGestao ? [
    { href: "gestao.html",            txt: "Agenda & gestão" },
    { href: "gestao-financeiro.html", txt: "Financeiro" }
  ] : [
    { href: "index.html",    txt: "Início" },
    { href: "reservar.html", txt: "Reservar" },
    { href: "faturas.html",  txt: "Faturas" },
    { href: "contrato.html", txt: "Contrato" }
  ];

  function css() {
    if (document.getElementById("nav-app-css")) return;
    var st = document.createElement("style");
    st.id = "nav-app-css";
    st.textContent = [
      ".nav-app{display:flex;align-items:center;gap:16px}",
      ".nav-marca{display:flex;align-items:center;gap:9px;font-weight:800;letter-spacing:-.02em;color:var(--tinta);text-decoration:none;flex:0 0 auto}",
      ".nav-marca:hover{text-decoration:none}",
      ".nav-selo{width:30px;height:30px;border-radius:8px;background:var(--azul);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800;letter-spacing:-.03em}",
      ".nav-marca b{font-weight:800}.nav-marca b span{color:var(--azul)}",
      ".nav-links{display:flex;align-items:center;gap:4px;margin-left:auto}",
      ".nav-links a{color:var(--cinza);text-decoration:none;font-weight:600;font-size:.95rem;padding:8px 12px;border-radius:9px;line-height:1}",
      ".nav-links a:hover{color:var(--tinta);background:var(--fundo);text-decoration:none}",
      ".nav-links a.active{color:var(--azul);background:color-mix(in srgb,var(--azul) 10%,transparent)}",
      ".nav-sair{color:var(--vermelho)!important}",
      ".nav-burger{display:none;margin-left:auto;background:none;border:1px solid var(--linha);border-radius:9px;width:40px;height:38px;font-size:20px;line-height:1;color:var(--tinta);cursor:pointer}",
      "@media(max-width:640px){",
      "  .nav-burger{display:block}",
      "  .nav-links{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:2px;",
      "    background:var(--branco);border-bottom:1px solid var(--linha);box-shadow:var(--sombra);padding:8px;margin:0;display:none;z-index:20}",
      "  .nav-links.open{display:flex}",
      "  .nav-links a{padding:12px 14px;font-size:1rem}",
      "  .topbar{position:relative}",
      "}"
    ].join("");
    document.head.appendChild(st);
  }

  function montar() {
    var header = document.querySelector("header.topbar");
    if (!header) return;
    var cont = header.querySelector(".container") || header;

    // nome curto da marca vem do brand.js quando disponível
    var nomeCurto = (window.ENJOY_BRAND && window.ENJOY_BRAND.nomeCurto) || "ClinicShare";
    var marcaHTML = (nomeCurto === "ClinicShare") ? 'Clinic<span>Share</span>' : nomeCurto;

    var wrap = document.createElement("div");
    wrap.className = "container nav-app";

    var linksHTML = LINKS.map(function (l) {
      var on = (l.href.toLowerCase() === arquivo) ? " active" : "";
      return '<a href="' + l.href + '" class="nav-lk' + on + '">' + l.txt + '</a>';
    }).join("");

    wrap.innerHTML =
      '<a class="nav-marca" href="' + (ehGestao ? "gestao.html" : "index.html") + '">' +
        '<span class="nav-selo">CS</span><b>' + marcaHTML + '</b>' +
      '</a>' +
      '<button class="nav-burger" aria-label="Abrir menu" aria-expanded="false">&#9776;</button>' +
      '<nav class="nav-links" id="nav-links">' + linksHTML +
        '<a href="#" class="nav-sair" id="nav-sair">Sair</a>' +
      '</nav>';

    // substitui o conteúdo do container (remove o "← Início" / marca antiga)
    if (cont === header) { header.innerHTML = ""; header.appendChild(wrap); }
    else { cont.replaceWith(wrap); }

    // hambúrguer
    var burger = wrap.querySelector(".nav-burger");
    var links = wrap.querySelector("#nav-links");
    burger.addEventListener("click", function () {
      var aberto = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", aberto ? "true" : "false");
    });

    // Sair — usa DB.sair() se o banco estiver pronto; senão vai pro login
    wrap.querySelector("#nav-sair").addEventListener("click", function (e) {
      e.preventDefault();
      try { if (window.DB && DB.pronto && DB.sair) { DB.sair(); return; } } catch (err) {}
      location.href = "login.html";
    });
  }

  function iniciar() { css(); montar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
