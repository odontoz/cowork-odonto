/* ============================================================================
 * brand.js — MARCA CENTRALIZADA da Enjoy (nome, cores, contato, endereço).
 *
 * ⚠️ ÚNICO ponto de verdade da identidade. Trocar a marca depois = editar SÓ
 * este arquivo (nome, cores, telefone, Instagram, CNPJ...). Todas as páginas do
 * site leem daqui — nunca escrever nome/telefone/endereço fixo no HTML.
 *
 * Como as páginas consomem:
 *   • Texto:  <span data-brand="nome"></span>            → preenchido pelo runtime
 *             <span data-brand="endereco.cidade"></span> → caminho com ponto
 *             <span data-brand="telefoneFmt"></span>     → campos derivados
 *   • Links:  <a data-brand-href="whatsapp">…</a>  (wa.me com msg padrão)
 *             <a data-brand-href="whatsapp:Texto custom">…</a>
 *             <a data-brand-href="tel">…</a>  <a data-brand-href="instagram">…</a>
 *             <a data-brand-href="email">…</a>  <a data-brand-href="maps">…</a>
 *   • Cores:  alimentam as CSS vars de :root do base.css em tempo de execução.
 *   • Botão WhatsApp flutuante: injetado automaticamente (some com <body data-no-wpp>).
 *
 * Carregar com defer no <head>:  <script src="/assets/js/brand.js" defer></script>
 * ==========================================================================*/
(function (raiz) {
  "use strict";

  // -------------------------------------------------------------------------
  // >>> EDITE AQUI PARA TROCAR A MARCA <<<
  // -------------------------------------------------------------------------
  var BRAND = {
    nome:      "ClinicShare Coworking Odontológico", // nome DEFINIDO pelo Vinicius 16/07 (INPI-first)
    nomeCurto: "ClinicShare",
    tagline:   "Coworking Odontológico",

    // Logo APROVADA 16/07 (selo CS + wordmark, versão A) — fonte: materiais/Identidade/logo-clinicshare-final.html
    // Header usa a versão SEM slogan (MANUAL.md: alturas <60px o slogan fica ilegível).
    // A versão COM slogan (img/logo-clinicshare.svg) segue disponível p/ hero e materiais.
    logo:      "img/logo-clinicshare-header.svg",
    logoDark:  "img/logo-clinicshare-header-navy.svg", // versão branca p/ fundos escuros (rodapé)
    logoAlt:   "ClinicShare — seu consultório por hora",

    // Cores — paleta aprovada estilo "Michelob Ultra": navy + branco + vermelho (amarelo p/ conversão)
    cores: {
      primaria:       "#0E2A47",  // azul-marinho (wordmark/CTAs)
      primariaEscura: "#081C31",  // navy escuro (hover)
      tinta:          "#1A2430",  // texto
      destaque:       "#1f9d55"   // verde p/ badges "grátis/lançamento" (manter)
    },

    // Contato — telefone oficial (06/07); e-mail/instagram a criar no domínio novo
    telefone:  "5561982565189",   // (61) 98256-5189 — oficial ClinicShare (23/08/2026)
    whatsapp:  "5561982565189",   // celular oficial = WhatsApp da ClinicShare
    // Rótulo da conversão "Clique no WhatsApp" (ação 7742820941, conta 721-356-1772).
    // Fica aqui e não solto no HTML pelo mesmo motivo do telefone: é UM lugar só.
    // Trocar a ação no Google Ads = trocar esta linha, e o site inteiro acompanha.
    convWhatsapp: "AW-18411824511/R3VhCM2kiOwcEP_KuMtE",

    email:     "contato@clinicshare.net.br",       // caixa ATIVA via ImprovMX → Gmail (22/07)
    instagram: "clinicshareoficial",            // handle oficial (definido 17/07)

    // Registro — placeholder até abrir/definir o CNPJ da Enjoy
    cnpj: "",   // vazio ate definir o CNPJ; rodape nao exibe mais (removido do HTML)

    endereco: {
      logradouro:  "Ed. E-Business — Av. Pau Brasil, Lote 06",
      complemento: "Em frente à estação Águas Claras do metrô",
      bairro:      "Águas Claras",
      cidade:      "Brasília",
      uf:          "DF",
      cep:         "71916-500",                 // confirmado ViaCEP 23/08/2026
      lat:         -15.8340,                     // geo aproximada de Águas Claras
      lng:         -48.0270
    },

    horarios: {
      semana:  "Seg a Sex · 8h às 22h",
      sabado:  "Sábado · 8h às 22h",
      domingo: "Domingo · 8h às 18h"
    },

    // Mensagem padrão do WhatsApp (CTA principal)
    msgWhatsapp: "Olá! Vim pelo site da ClinicShare e gostaria de conhecer o coworking odontológico e agendar uma visita."
  };

  // -------------------------------------------------------------------------
  // Campos derivados / helpers (não editar para trocar marca)
  // -------------------------------------------------------------------------
  function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }

  function fmtFone(e164) {
    var d = soDigitos(e164);
    // 55 + DDD(2) + numero(8-9)
    if (d.length >= 12) {
      var ddd = d.slice(2, 4), num = d.slice(4);
      if (num.length === 9) return "(" + ddd + ") " + num.slice(0, 5) + "-" + num.slice(5);
      return "(" + ddd + ") " + num.slice(0, 4) + "-" + num.slice(4);
    }
    return e164;
  }

  BRAND.telefoneFmt = fmtFone(BRAND.telefone);
  BRAND.whatsappFmt = fmtFone(BRAND.whatsapp);
  BRAND.instagramUrl = "https://instagram.com/" + BRAND.instagram;
  BRAND.enderecoLinha =
    BRAND.endereco.logradouro + " · " + BRAND.endereco.bairro + ", " +
    BRAND.endereco.cidade + "/" + BRAND.endereco.uf;
  BRAND.enderecoCurto = BRAND.endereco.bairro + ", " + BRAND.endereco.cidade + "/" + BRAND.endereco.uf;

  BRAND.waLink = function (msg) {
    return "https://wa.me/" + soDigitos(BRAND.whatsapp) +
           "?text=" + encodeURIComponent(msg || BRAND.msgWhatsapp);
  };
  BRAND.telLink   = function () { return "tel:+" + soDigitos(BRAND.telefone); };
  BRAND.emailLink = function () { return "mailto:" + BRAND.email; };
  BRAND.mapsLink  = function () {
    return "https://www.google.com/maps/search/?api=1&query=" +
           encodeURIComponent(BRAND.nome + " " + BRAND.enderecoLinha);
  };

  // acesso por caminho com ponto: get("endereco.cidade")
  function get(path) {
    return path.split(".").reduce(function (o, k) {
      return (o == null) ? undefined : o[k];
    }, BRAND);
  }

  raiz.ENJOY_BRAND = BRAND;

  // -------------------------------------------------------------------------
  // Runtime: aplica cores, preenche data-brand, injeta botão WhatsApp
  // -------------------------------------------------------------------------
  function aplicarCores() {
    var r = document.documentElement.style;
    r.setProperty("--azul", BRAND.cores.primaria);
    r.setProperty("--azul-escuro", BRAND.cores.primariaEscura);
    r.setProperty("--tinta", BRAND.cores.tinta);
    r.setProperty("--verde", BRAND.cores.destaque);
  }

  function preencherTextos() {
    document.querySelectorAll("[data-brand]").forEach(function (el) {
      var v = get(el.getAttribute("data-brand"));
      if (v != null) el.textContent = v;
    });
  }

  function preencherLinks() {
    document.querySelectorAll("[data-brand-href]").forEach(function (el) {
      var spec = el.getAttribute("data-brand-href");
      var tipo = spec, extra = "";
      var sep = spec.indexOf(":");
      if (sep !== -1) { tipo = spec.slice(0, sep); extra = spec.slice(sep + 1); }
      var href = null, externo = false;
      if (tipo === "whatsapp") { href = BRAND.waLink(extra || null); externo = true; }
      else if (tipo === "tel") { href = BRAND.telLink(); }
      else if (tipo === "email") { href = BRAND.emailLink(); }
      else if (tipo === "instagram") { href = BRAND.instagramUrl; externo = true; }
      else if (tipo === "maps") { href = BRAND.mapsLink(); externo = true; }
      if (href) {
        el.setAttribute("href", href);
        if (externo) { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
      }
    });
  }

  function injetarWpp() {
    if (document.body.hasAttribute("data-no-wpp")) return;
    if (document.querySelector(".wpp-float")) return;
    var a = document.createElement("a");
    a.className = "wpp-float";
    a.href = BRAND.waLink();
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Falar no WhatsApp");
    a.innerHTML =
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true">' +
      '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.32-1.95 1.36-.5.05-1.13.24-3.68-.77-3.1-1.22-5.06-4.4-5.21-4.6-.15-.2-1.24-1.65-1.24-3.15 0-1.5.79-2.24 1.07-2.55.28-.31.61-.38.81-.38.2 0 .41 0 .58.01.19.01.44-.07.69.53.24.6.83 2.07.9 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2 .96.29.15.49.22.56.34.07.12.07.71-.17 1.39z"/>' +
      '</svg>';
    document.body.appendChild(a);
  }

  function injetarLogo() {
    if (!BRAND.logo) return;
    // resolve o caminho do logo relativo ao próprio brand.js (funciona em /public, /public/lp, /public/app)
    var sc = document.querySelector('script[src*="brand.js"]');
    var base = sc ? sc.src.replace(/js\/brand\.js.*$/, "") : "/assets/";
    var url = base + BRAND.logo;
    var urlDark = BRAND.logoDark ? base + BRAND.logoDark : url;
    document.querySelectorAll("a.marca, .marca").forEach(function (el) {
      if (el.querySelector("img")) return;
      // rodapé (fundo escuro) usa a versão branca da logo
      var escuro = el.closest("footer, .rodape, .rodape-rico");
      var img = document.createElement("img");
      img.src = escuro ? urlDark : url;
      img.alt = BRAND.logoAlt || BRAND.nome;
      img.style.height = "44px"; // lockup sem slogan: 44px assenta melhor no header (16/07)
      img.style.width = "auto";
      img.style.display = "block";
      el.textContent = "";
      el.appendChild(img);
    });
  }

  function init() {
    aplicarCores();
    preencherTextos();
    preencherLinks();
    injetarLogo();
    injetarWpp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);

/* ---------------------------------------------------------------------------
 * Atribuição de mídia (23/08/2026) — preserva o clique pago entre páginas.
 * O anúncio pode cair na home e o lead ser preenchido na /visita: sem isto,
 * o gclid se perde na navegação e o lead é gravado como orgânico.
 * gbraid/wbraid = equivalentes do gclid em iOS com ATT.
 * ------------------------------------------------------------------------- */
(function () {
  var CHAVES = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term",
                "gclid","gbraid","wbraid","fbclid","msclkid"];
  try {
    var p = new URLSearchParams(location.search), achou = {};
    CHAVES.forEach(function (k) { if (p.get(k)) achou[k] = p.get(k); });
    if (Object.keys(achou).length) {
      sessionStorage.setItem("cs_atrib", JSON.stringify(achou));
    }
  } catch (e) { /* sessionStorage bloqueado: segue sem atribuição */ }

  window.ENJOY_ATRIB = function () {
    var out = {};
    try {
      var salvo = JSON.parse(sessionStorage.getItem("cs_atrib") || "{}");
      Object.keys(salvo).forEach(function (k) { out[k] = salvo[k]; });
    } catch (e) {}
    try {
      var p = new URLSearchParams(location.search);
      CHAVES.forEach(function (k) { if (p.get(k)) out[k] = p.get(k); });  // URL vence
    } catch (e) {}
    return out;
  };
})();

/* ---------------------------------------------------------------------------
 * Link de definir senha (25/08/2026) — o e-mail do Supabase cai na HOME, nao na
 * tela de senha: o token vem no fragmento (#access_token=...&type=recovery) e a
 * home nao sabe o que fazer com ele, entao a pessoa via a tela de login e travava.
 * Aqui, qualquer pagina que receba esse token encaminha para definir-senha.html
 * PRESERVANDO o fragmento. Uma correcao so, vale para o site inteiro.
 * ------------------------------------------------------------------------- */
(function () {
  try {
    var h = location.hash || "";
    var temToken = h.indexOf("access_token") > -1 &&
                   /type=(recovery|invite|signup|magiclink)/.test(h);
    // link expirado/ja usado volta SEM token, so com error_description — sem isto
    // a pessoa cai na home sem entender nada (caso do Thiago em 26/08/2026)
    var temErro = h.indexOf("error") > -1 || (location.search || "").indexOf("error") > -1;
    if (!temToken && !temErro) return;
    if (/definir-senha\.html/.test(location.pathname)) return;   // ja esta no lugar certo
    location.replace(location.origin + "/public/app/definir-senha.html" + (h || "#erro=link"));
  } catch (e) { /* nunca quebrar a pagina por causa disto */ }
})();

/* ---------------------------------------------------------------------------
 * Conversão "Clique no WhatsApp" (02/09/2026)
 *
 * POR QUE AQUI E NÃO NO HTML: todo caminho para o WhatsApp neste site passa pelo
 * brand.js — os links `data-brand-href="whatsapp"` e o botão flutuante que ele
 * mesmo injeta. Marcar link por link no HTML deixaria o botão flutuante de fora
 * (ele nasce em JS, depois do HTML) e quebraria de novo na próxima página nova.
 * Um ouvinte só, delegado no documento, cobre o que existe hoje e o que vier.
 *
 * NÃO ATRAPALHA O CLIQUE: só avisa o Google e deixa o link seguir. Sem
 * preventDefault, sem event_callback segurando a navegação — os links abrem em
 * aba nova, então não há corrida entre o disparo e a saída da página.
 *
 * SILENCIOSO ONDE NÃO HÁ TAG: as telas de /public/app não carregam gtag, e ali
 * isto simplesmente não faz nada.
 * ------------------------------------------------------------------------- */
(function () {
  var ULTIMO = 0;
  document.addEventListener("click", function (ev) {
    try {
      var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
      if (!a) return;
      if (!/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(a.getAttribute("href") || "")) return;
      if (typeof window.gtag !== "function") return;          // página sem a tag
      var rotulo = (window.BRAND && window.BRAND.convWhatsapp) || "";
      if (!rotulo) return;
      // duplo clique no mesmo botão não vale duas conversões
      var agora = Date.now();
      if (agora - ULTIMO < 2000) return;
      ULTIMO = agora;
      window.gtag("event", "conversion", { send_to: rotulo });
    } catch (e) { /* medição nunca pode derrubar o clique */ }
  }, true);
})();
