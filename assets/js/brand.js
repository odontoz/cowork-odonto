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

    // Logo APROVADA 16/07 (selo CS + wordmark + slogan, versão A) — fonte: materiais/Identidade/logo-clinicshare-final.html
    logo:      "img/logo-clinicshare.svg",
    logoAlt:   "ClinicShare — seu consultório por hora",

    // Cores — paleta aprovada estilo "Michelob Ultra": navy + branco + vermelho (amarelo p/ conversão)
    cores: {
      primaria:       "#0E2A47",  // azul-marinho (wordmark/CTAs)
      primariaEscura: "#081C31",  // navy escuro (hover)
      tinta:          "#1A2430",  // texto
      destaque:       "#1f9d55"   // verde p/ badges "grátis/lançamento" (manter)
    },

    // Contato — telefone oficial (06/07); e-mail/instagram a criar no domínio novo
    telefone:  "556135462675",    // (61) 3546-2675
    whatsapp:  "556135462675",    // confirmar se o fixo tem WhatsApp Business
    email:     "contato@clinicshare.net",       // placeholder até criar a caixa (domínio .net decidido 16/07)
    instagram: "clinicshare",                   // placeholder (conferir disponibilidade do handle)

    // Registro — placeholder até abrir/definir o CNPJ da Enjoy
    cnpj: "00.000.000/0001-00",

    endereco: {
      logradouro:  "Ed. E-Business — Av. Pau Brasil, Lote 06",
      complemento: "Em frente à estação Águas Claras do metrô",
      bairro:      "Águas Claras",
      cidade:      "Brasília",
      uf:          "DF",
      cep:         "71900-000",                 // placeholder
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
    document.querySelectorAll("a.marca, .marca").forEach(function (el) {
      if (el.querySelector("img")) return;
      var img = document.createElement("img");
      img.src = url;
      img.alt = BRAND.logoAlt || BRAND.nome;
      img.style.height = "48px"; // 40px deixava o slogan do lockup ilegível (validação 16/07)
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
