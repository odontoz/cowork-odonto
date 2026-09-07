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
/* ⚠️ ESTE BLOCO PRECISA VIR ANTES DO IIFE DA MARCA (movido para cá em 07/09/2026).
 * O brand.js é carregado com `defer`, e script `defer` só executa DEPOIS que o
 * documento terminou de ser parseado — quando o readyState JÁ É "interactive".
 * Então o `if (document.readyState === "loading")` lá embaixo cai SEMPRE no else
 * e o init() (que monta os href de WhatsApp) roda NA HORA, de forma síncrona.
 * Com este bloco no fim do arquivo, o init() rodava antes de window.CS_REF
 * existir e os links saíam SEM o código de origem — falha silenciosa, medida em
 * tela em 07/09/2026 (CS_REF() respondia certo no console, e mesmo assim nenhum
 * link tinha "Ref.:"). Aqui em cima, ENJOY_ATRIB e CS_REF já estão publicados
 * quando o init() roda. NÃO mover de volta para o fim do arquivo.
 * ------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
 * Atribuição de mídia (23/08/2026 · reforçada em 07/09/2026) — preserva o clique
 * pago entre páginas. O anúncio pode cair na home ou numa LP e o lead ser
 * preenchido na /visita: sem isto, o gclid/fbclid se perde na navegação e o lead
 * é gravado como orgânico. gbraid/wbraid = equivalentes do gclid em iOS com ATT.
 *
 * 07/09/2026 — três mudanças, todas por causa da campanha do Meta:
 *  1. localStorage com validade de 90 dias, no lugar de sessionStorage. O
 *     sessionStorage morre quando a aba fecha: quem clicava no anúncio hoje e
 *     voltava amanhã para preencher o formulário virava lead orgânico. 90 dias é
 *     a mesma janela de atribuição que a Meta usa. O sessionStorage continua
 *     sendo escrito e lido como PLANO B (navegador com localStorage bloqueado) e
 *     para não perder a atribuição de quem já está com a versão anterior.
 *  2. _fbp e _fbc entram na atribuição. São os dois identificadores que a Meta
 *     usa para casar a pessoa; o pixel os cria sozinho (o _fbc a partir do
 *     fbclid da URL), mas ninguém os estava GUARDANDO junto do lead. Sem eles,
 *     o dia em que a CAPI entrar o evento do servidor chega sem casamento forte.
 *     São lidos NA HORA da chamada, nunca no carregamento: o fbevents.js é
 *     assíncrono e no primeiro instante da visita o cookie ainda não existe.
 *  3. Guarda a página de entrada e o referrer — é o que responde "o anúncio caiu
 *     em qual página?" sem depender do que a plataforma diz de si mesma.
 * ------------------------------------------------------------------------- */
(function () {
  var CHAVES = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term",
                "gclid","gbraid","wbraid","fbclid","msclkid"];
  var KEY = "cs_atrib";
  var DIAS = 90;

  function lerCookie(nome) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|;\\s*)" + nome + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }

  // Aceita os DOIS formatos: o novo {ts, dados} e o antigo (objeto plano, gravado
  // pela versão anterior deste arquivo). Sem isto, quem visitou antes do deploy
  // perderia a atribuição que já estava guardada.
  function normalizar(raw) {
    if (!raw) return null;
    var o;
    try { o = JSON.parse(raw); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    if (o.dados && typeof o.dados === "object") {
      if (o.ts && (Date.now() - o.ts) > DIAS * 864e5) return null;   // venceu
      return o.dados;
    }
    return o;   // formato antigo: sem carimbo de tempo, vale enquanto durar a sessão
  }

  function guardado() {
    var r = null;
    try { r = normalizar(localStorage.getItem(KEY)); } catch (e) {}
    if (r) return r;
    try { r = normalizar(sessionStorage.getItem(KEY)); } catch (e) {}
    return r || null;
  }

  try {
    var p = new URLSearchParams(location.search), achou = {};
    CHAVES.forEach(function (k) { if (p.get(k)) achou[k] = p.get(k); });
    if (Object.keys(achou).length) {
      // Clique NOVO sobrescreve o antigo (último clique), como o Google e a Meta contam.
      achou.landing = (location.origin + location.pathname).slice(0, 500);
      achou.referrer = (document.referrer || "").slice(0, 500);
      var pacote = JSON.stringify({ ts: Date.now(), dados: achou });
      try { localStorage.setItem(KEY, pacote); } catch (e) {}
      try { sessionStorage.setItem(KEY, pacote); } catch (e) {}
    }
  } catch (e) { /* storage bloqueado: segue sem atribuição */ }

  window.ENJOY_ATRIB = function () {
    var out = {}, salvo = guardado() || {};
    Object.keys(salvo).forEach(function (k) { out[k] = salvo[k]; });
    try {
      var q = new URLSearchParams(location.search);
      CHAVES.forEach(function (k) { if (q.get(k)) out[k] = q.get(k); });  // URL vence
    } catch (e) {}
    // Cookies da Meta lidos AGORA (o pixel os cria de forma assíncrona).
    var fbp = lerCookie("_fbp"), fbc = lerCookie("_fbc");
    if (fbp) out._fbp = fbp;
    if (fbc) out._fbc = fbc;
    return out;
  };

  /* == Código de origem: o que ATRAVESSA para o WhatsApp (07/09/2026) ========
   *
   * O PROBLEMA. Tudo o que a atribuição acima guarda — utm, gclid, fbclid —
   * morre no instante em que a pessoa sai do site para o WhatsApp. A ÚNICA coisa
   * que atravessa esse pulo é o texto pré-preenchido do wa.me. Até hoje esse
   * texto era uma frase fixa: quem atendia não tinha como saber se a pessoa veio
   * do Google, do Meta ou de indicação.
   *
   * O MECANISMO (o mesmo que a OdontoZ roda desde 08/08/2026). Geramos um CÓDIGO
   * CURTO, guardamos o clique inteiro no banco amarrado a ele, e mandamos só o
   * código junto da mensagem ("Ref.: A7K2M9XY"). O código é o bilhete do
   * guarda-volumes; as UTMs ficam no banco (tabela cliques_anuncio, migration
   * 0031). Quem trocar o código pelas UTMs é o webhook do WhatsApp — que a
   * ClinicShare AINDA NÃO TEM. Enquanto não tiver, o código serve para uma
   * pessoa consultar, e a frase de canal abaixo já responde na hora.
   *
   * ⚠️ O ALFABETO NÃO TEM 0/O NEM 1/I. O código viaja numa mensagem lida por
   * gente e às vezes redigitada; letra ambígua vira código que não casa. É a
   * MESMA régua do `check` da migration 0031 — mexer aqui sem mexer lá quebra o
   * casamento dos dois lados.
   *
   * REAPROVEITA a atribuição acima: não relê a URL, não duplica captura, usa
   * ENJOY_ATRIB(), lerCookie() e a janela de DIAS que já existem. O que guarda a
   * mais é só o par {código, chave do clique}.
   *
   * DEGRADA EM SILÊNCIO, SEMPRE. Sem rede, com bloqueador, com localStorage
   * fechado ou com o banco fora do ar, o link continua sendo o link de sempre.
   * ======================================================================== */
  var REF_KEY = "cs_ref";
  // Projeto Supabase da ClinicShare (hautwihloahassjhaucp) e a MESMA chave
  // publicável que já está em config/config.js. Fica aqui e não lá porque só a
  // /visita carrega o config.js — as LPs e a home não, e são elas que recebem o
  // clique pago.
  var REF_URL = "https://hautwihloahassjhaucp.supabase.co";
  var REF_KEY_PUB = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdXR3aWhsb2FoYXNzamhhdWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjg0MTAsImV4cCI6MjA5ODk0NDQxMH0.wNho3H1a2K-2pXb0iCA8634kH9GoIYKzdCNBB_PlviU";

  // Alfabeto sem 0/O e sem 1/I — ver aviso acima.
  function novoCodigo() {
    var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    try {
      var a = new Uint8Array(8);
      crypto.getRandomValues(a);
      for (var i = 0; i < 8; i++) s += abc.charAt(a[i] % abc.length);
    } catch (e) { /* sem crypto: cai no Math.random abaixo */ }
    while (s.length < 8) s += abc.charAt(Math.floor(Math.random() * abc.length));
    return s;
  }

  // O clique do Google carimba gclid (gbraid/wbraid no iOS com ATT); o do Meta
  // carimba fbclid. Sem carimbo nenhum, o utm_source ainda diz de onde veio.
  function tipoDe(a) {
    if (a.gclid) return "gclid";
    if (a.gbraid) return "gbraid";
    if (a.wbraid) return "wbraid";
    if (a.fbclid) return "fbclid";
    return "utm";
  }
  function canalDe(a) {
    if (a.gclid || a.gbraid || a.wbraid) return "google";
    if (a.fbclid) return "meta";
    var s = String(a.utm_source || "").toLowerCase();
    if (/google|adwords|gads|youtube/.test(s)) return "google";
    if (/facebook|instagram|meta|^fb$|^ig$/.test(s)) return "meta";
    return "";
  }
  // O banco exige um id de clique de 6 a 500 caracteres e não aceita nulo.
  // Quando o carimbo não veio (Firefox estrito remove o fbclid, ou o link foi
  // colado), o id é sintético e quem identifica o anúncio são as UTMs.
  function idDe(a, cod) {
    return a.gclid || a.gbraid || a.wbraid || a.fbclid || ("utm-" + cod);
  }
  // Chave de deduplicação: o carimbo do clique quando existe, senão a combinação
  // de UTMs que identifica o anúncio. Clique NOVO sobrescreve o antigo (último
  // clique), o mesmo critério da atribuição acima.
  function chaveDe(a) {
    var id = a.gclid || a.gbraid || a.wbraid || a.fbclid;
    if (id) return id;
    if (a.utm_source || a.utm_campaign || a.utm_content) {
      return "utm:" + (a.utm_source || "") + "|" + (a.utm_campaign || "") + "|" + (a.utm_content || "");
    }
    return "";   // visita orgânica/direta: não gera código nenhum
  }

  // O _fbp é criado pelo próprio pixel e é o 2º identificador que a Meta usa
  // para casar a pessoa. O fbevents.js é assíncrono: no primeiro instante da
  // visita o cookie ainda não existe. Esperar aqui é seguro — o código já está
  // no localStorage e o link já sai com ele; quem espera é só o envio ao banco.
  function comFbp(cb) {
    var v = lerCookie("_fbp");
    if (v) { cb(v); return; }
    var n = 0, t = setInterval(function () {
      var x = lerCookie("_fbp");
      if (x || ++n >= 30) { clearInterval(t); cb(x || ""); }
    }, 100);
  }

  function registrarClique(ref, a) {
    comFbp(function (fbp) {
      fetch(REF_URL + "/rest/v1/rpc/registrar_clique_anuncio", {
        method: "POST", keepalive: true, mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "apikey": REF_KEY_PUB,
          "Authorization": "Bearer " + REF_KEY_PUB
        },
        body: JSON.stringify({
          p_token: ref.cod,
          p_click_id: idDe(a, ref.cod),
          p_tipo: tipoDe(a),
          p_canal: ref.canal || null,
          p_url: (location.origin + location.pathname).slice(0, 500),
          p_referrer: (document.referrer || "").slice(0, 500),
          p_utm: a,
          p_fbp: fbp || null
        })
      }).then(function (r) {
        if (r && r.ok) {
          ref.ok = true;
          if (fbp) ref.fbp = fbp;
          try { localStorage.setItem(REF_KEY, JSON.stringify(ref)); } catch (e) {}
        }
      }).catch(function () { /* sem rede: a próxima visita tenta de novo */ });
    });
  }

  var REF = null;
  try {
    var atrib = window.ENJOY_ATRIB();
    var chave = chaveDe(atrib);
    if (chave) {
      try {
        var salvo = JSON.parse(localStorage.getItem(REF_KEY) || "null");
        if (salvo && salvo.cod && salvo.ts && (Date.now() - salvo.ts) <= DIAS * 864e5) REF = salvo;
      } catch (e) { /* storage bloqueado: o código vive só nesta página */ }

      if (!REF || REF.chave !== chave) {
        REF = { cod: novoCodigo(), chave: chave, canal: canalDe(atrib), ts: Date.now(), ok: false };
        try { localStorage.setItem(REF_KEY, JSON.stringify(REF)); } catch (e) {}
      }

      // Registra JÁ NA CHEGADA, nunca no clique do botão: no clique a página está
      // saindo e o fetch morre no meio. Se falhar, `ok` fica false e a próxima
      // visita tenta de novo — a RPC não duplica (ON CONFLICT no código) e no
      // reenvio só PREENCHE o _fbp que estiver vazio.
      if (!REF.ok || !REF.fbp) registrarClique(REF, atrib);
    }
  } catch (e) { /* nada aqui pode derrubar o link do WhatsApp */ }

  /* O que o BRAND.waLink() cola no fim da mensagem. Duas coisas, nesta ordem:
   *  1. a frase que diz o canal — para quem atende entender na hora, sem
   *     consultar nada. Escrita como uma pessoa escreveria, não como etiqueta.
   *  2. o código — para o banco devolver o anúncio EXATO depois.
   * Visita orgânica/direta: devolve string vazia e a mensagem sai intacta. */
  window.CS_REF = function () {
    if (!REF || !REF.cod) return "";
    var frase = "";
    if (REF.canal === "google") frase = "\n\nVi o anúncio de vocês no Google.";
    else if (REF.canal === "meta") frase = "\n\nVi o anúncio de vocês no Instagram/Facebook.";
    return frase + "\n\nRef.: " + REF.cod;
  };
})();

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
    // 02/09/2026 — TROCADO de "clinicshareoficial" para "clinicsharebr".
    // O @clinicshareoficial NÃO é nosso: "Sobre esta conta" mostra entrada em AGOSTO/2026,
    // depois de o site subir (16/07) e do depósito no INPI. Perfil zerado, 0 posts, só
    // segurando o nome — mesmo padrão do @clinicshare.br (junho/26, um mês depois de a
    // Caroline Iwata registrar clinicshare.com.br). Enquanto isso ficou aqui, o rodapé
    // mandava visita PAGA do Google para o perfil de terceiro. A retomada do nome vai por
    // denúncia de marca no Instagram (o depósito no INPI já existe) — isso é outra frente.
    instagram: "clinicsharebr",

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
      // 05/09/2026: alinhado ao que a AGENDA realmente abre (config.horario_funcionamento
      // no banco: 08:00–23:00 todos os dias). O site anunciava 22h/18h e escondia uma hora
      // por dia mais o domingo inteiro.
      semana:  "Seg a Sex · 8h às 23h",
      sabado:  "Sábado · 8h às 23h",
      domingo: "Domingo · 8h às 23h"
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

  /* PONTO ÚNICO de todo link de WhatsApp do site — os data-brand-href, o botão
   * flutuante que este arquivo injeta e o fallback do formulário da /visita.
   * É por isso que o código de origem entra AQUI e não página a página: uma
   * função cobre as 8 páginas de uma vez.
   *
   * raiz.CS_REF é publicado pelo bloco de atribuição no FIM deste arquivo. Ele
   * já rodou quando isto é chamado (o bloco é síncrono; waLink só é chamado no
   * DOMContentLoaded ou no clique). Se não existir — arquivo antigo em cache,
   * erro no bloco, visita orgânica — o sufixo é string vazia e a mensagem sai
   * exatamente como sempre saiu. Medição nunca pode derrubar o clique. */
  BRAND.waLink = function (msg) {
    var texto = msg || BRAND.msgWhatsapp;
    try {
      if (typeof raiz.CS_REF === "function") texto += (raiz.CS_REF() || "");
    } catch (e) { /* segue com a mensagem limpa */ }
    return "https://wa.me/" + soDigitos(BRAND.whatsapp) +
           "?text=" + encodeURIComponent(texto);
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

  /* Conversão "Clique no WhatsApp" (02/09/2026).
   *
   * MORA AQUI DENTRO de propósito: `BRAND` é privado do IIFE (não vai para o
   * window), então um bloco solto no fim do arquivo leria `undefined` e ficaria
   * calado — foi o que aconteceu na 1ª tentativa, e só apareceu no teste em tela.
   *
   * Um ouvinte só, delegado no documento, cobre TODO caminho para o WhatsApp:
   * os links `data-brand-href="whatsapp"` e o botão flutuante que este mesmo
   * arquivo injeta depois do HTML — que marcação link a link deixaria de fora.
   *
   * NÃO ATRAPALHA O CLIQUE: avisa o Google e deixa o link seguir. Sem
   * preventDefault e sem event_callback segurando a navegação; os links abrem em
   * aba nova, então não há corrida entre o disparo e a saída da página.
   * Onde não há tag (as telas de /public/app), simplesmente não faz nada. */
  function medirWhatsapp() {
    if (!BRAND.convWhatsapp) return;
    var ultimo = 0;
    document.addEventListener("click", function (ev) {
      try {
        var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
        if (!a) return;
        if (!/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(a.getAttribute("href") || "")) return;
        // 07/09/2026: o clique no WhatsApp passou a valer para o GOOGLE **e** para a META.
        // Motivo: é o evento que a campanha do Meta vai otimizar. Lead completo no formulário
        // acontece 1 a 3 vezes por semana com R$30/dia — nunca sairia do aprendizado. Clique no
        // WhatsApp acontece muito mais, e é o mesmo evento de negócio que a OdontoZ já usa.
        // A trava de 2 segundos vale para os dois, para um duplo clique não virar duas conversões.
        var temG = typeof raiz.gtag === "function";
        var temF = typeof raiz.fbq === "function";
        if (!temG && !temF) return;                       // página sem tag nenhuma
        var agora = Date.now();
        if (agora - ultimo < 2000) return;                // duplo clique não vale duas conversões
        ultimo = agora;
        if (temG) raiz.gtag("event", "conversion", { send_to: BRAND.convWhatsapp });
        // ⚠️ "Contact" é evento PADRÃO da Meta de propósito: evento personalizado nasce
        // SUPRIMIDO até ser confirmado, e queimaria o nome. Ver reference_meta_regras_duras_2026.
        // 07/09/2026 — o `dl` que o pixel manda para a Meta vem SÓ com o domínio, sem o
        // caminho (verificado em tela: acontece igual no site da OdontoZ, que converte).
        // Então "de qual página veio este Contact?" não dá para responder pela URL, e vai
        // aqui num parâmetro. content_name/content_category são parâmetros PADRÃO — não
        // correm o risco de nome de evento personalizado não verificado.
        //
        // ⚠️ MEDIDO EM TELA, MESMO DIA: hoje este parâmetro NÃO CHEGA. A requisição que
        // sai para /tr não leva NENHUM `cd[...]`, e o `dl` vem cortado no domínio — o
        // dataset está com o compartilhamento de parâmetro personalizado restrito
        // (Gerenciador de Eventos avisa "restrições adicionais" e a Categoria do conjunto
        // de dados está como "Nenhuma"). Fica no código porque não custa nada e volta a
        // valer sozinho quando o dono definir a categoria — mas NÃO CONFIE nele para
        // saber de que página veio o Contact enquanto isso; a régua é o CRM.
        var pag = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
        if (temF) raiz.fbq("track", "Contact", { content_name: pag, content_category: "whatsapp" });
      } catch (e) { /* medição nunca pode derrubar o clique */ }
    }, true);
  }

  function init() {
    aplicarCores();
    preencherTextos();
    preencherLinks();
    injetarLogo();
    injetarWpp();
    medirWhatsapp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);

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
