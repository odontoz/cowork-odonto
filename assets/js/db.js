/* ============================================================================
 * db.js — Cliente Supabase da Enjoy + helpers de sessão/perfil.
 *
 * Lê as credenciais de config/config.js (window.ENJOY_CONFIG). O supabase-js
 * precisa estar disponível como window.supabase — inclua o vendor local ANTES
 * deste arquivo em toda página do app:
 *
 *   <script src="../../config/config.js"></script>
 *   <script src="../../assets/vendor/supabase.js"></script>   <!-- ANTES do db.js -->
 *   <script src="../../assets/js/db.js"></script>
 *
 * Se config.js ou o vendor faltarem, EnjoyDB.pronto = false e a página cai no
 * modo demonstração (mock) — fallback gracioso, sem quebrar.
 *
 * API pública (window.EnjoyDB):
 *   .client            instância Supabase (ou null)
 *   .pronto            true se conectado
 *   .motivo            por que não conectou (string) quando pronto=false
 *   .sessao()          -> Promise<session|null>
 *   .usuario()         -> Promise<user|null>
 *   .perfilAtual(force)-> Promise<perfil|null>  (cacheado; force=true recarrega)
 *   .exigirLogin(opts) -> Promise<perfil|null>  (redireciona pro login SE sem
 *                         sessão — CHAMAR ANTES DE RENDERIZAR. opts.exigirGestao
 *                         redireciona quem não for gestão/recepção.)
 *   .ehGestao(perfil)  -> boolean
 *   .sair(destino)     -> encerra sessão e vai pro login
 *   .urlAssinada(bucket, caminho, seg) -> Promise<string|null> (signed URL)
 * ==========================================================================*/
(function (raiz) {
  "use strict";

  var cfg = raiz.ENJOY_CONFIG;
  var db = null;
  var motivo = null;

  if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("SEU-PROJETO") !== -1) {
    motivo = "config.js ausente ou não preenchido — copie config/config.example.js para config/config.js e preencha o Supabase da Enjoy.";
  } else if (!raiz.supabase || typeof raiz.supabase.createClient !== "function") {
    motivo = "supabase-js não carregado — inclua o vendor local (assets/vendor/supabase.js) antes de db.js.";
  } else {
    try {
      db = raiz.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (e) {
      motivo = "Falha ao inicializar Supabase: " + e.message;
    }
  }

  if (motivo) console.warn("[Enjoy/db] " + motivo);

  // ---- sessão / perfil -----------------------------------------------------
  var _perfilPromise = null;

  async function sessao() {
    if (!db) return null;
    var r = await db.auth.getSession();
    return (r && r.data && r.data.session) || null;
  }

  async function usuario() {
    var s = await sessao();
    return s ? s.user : null;
  }

  function limparCachePerfil() { _perfilPromise = null; }

  async function perfilAtual(force) {
    if (!db) return null;
    if (force) _perfilPromise = null;
    if (!_perfilPromise) {
      _perfilPromise = (async function () {
        var u = await usuario();
        if (!u) return null;
        var r = await db.from("perfis")
          .select("id,user_id,nome,telefone,tipo,status,cro,profissao,docs")
          .eq("user_id", u.id)
          .maybeSingle();
        if (r.error) { console.warn("[Enjoy/db] perfil:", r.error.message); return null; }
        return r.data || null;
      })();
    }
    return _perfilPromise;
  }

  function ehGestao(perfil) {
    return !!perfil && (perfil.tipo === "gestao" || perfil.tipo === "recepcao");
  }

  // Auth ANTES de renderizar (padrão do CLAUDE.md). Sem sessão → vai pro login.
  async function exigirLogin(opcoes) {
    opcoes = opcoes || {};
    if (!db) return null; // modo demonstração: página segue com mock
    var s = await sessao();
    if (!s) {
      location.replace(opcoes.login || "login.html");
      return new Promise(function () {}); // trava o resto do script
    }
    var p = await perfilAtual();
    if (opcoes.exigirGestao && !ehGestao(p)) {
      location.replace(opcoes.destinoNaoAutorizado || "index.html");
      return new Promise(function () {});
    }
    return p;
  }

  async function sair(destino) {
    if (db) { try { await db.auth.signOut(); } catch (e) {} }
    limparCachePerfil();
    location.replace(destino || "login.html");
  }

  async function urlAssinada(bucket, caminho, segundos) {
    if (!db || !caminho) return null;
    try {
      var r = await db.storage.from(bucket).createSignedUrl(caminho, segundos || 3600);
      if (r.error) { console.warn("[Enjoy/db] signedUrl:", r.error.message); return null; }
      return r.data ? r.data.signedUrl : null;
    } catch (e) { console.warn("[Enjoy/db] signedUrl:", e.message); return null; }
  }

  // ---- auditoria (só gestão enxerga; RPCs SECURITY DEFINER) -----------------
  // "editado por X em Y": última entrada do registro. Retorna null se não houver.
  async function ultimaEdicao(tabela, registroId) {
    if (!db || !tabela || registroId == null) return null;
    try {
      var r = await db.rpc("ultima_edicao", { p_tabela: tabela, p_registro_id: String(registroId) });
      if (r.error) { console.warn("[Enjoy/db] ultima_edicao:", r.error.message); return null; }
      return (r.data && r.data[0]) || null;
    } catch (e) { console.warn("[Enjoy/db] ultima_edicao:", e.message); return null; }
  }

  // histórico completo de um registro (mais recente primeiro).
  async function auditoriaDe(tabela, registroId, limite) {
    if (!db || !tabela || registroId == null) return [];
    try {
      var r = await db.rpc("auditoria_de", { p_tabela: tabela, p_registro_id: String(registroId), p_limite: limite || 50 });
      if (r.error) { console.warn("[Enjoy/db] auditoria_de:", r.error.message); return []; }
      return r.data || [];
    } catch (e) { console.warn("[Enjoy/db] auditoria_de:", e.message); return []; }
  }

  // texto pronto "editado por Fulano · 18/07 14:30" a partir do objeto de ultimaEdicao.
  function fmtEdicao(ed) {
    if (!ed) return "";
    var verbo = ed.acao === "INSERT" ? "criado" : (ed.acao === "DELETE" ? "excluído" : "editado");
    var quem = ed.ator_nome || "sistema";
    var d = ed.quando ? new Date(ed.quando) : null;
    var qd = d ? d.toLocaleDateString("pt-BR") + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") : "";
    return verbo + " por " + quem + (qd ? " · " + qd : "");
  }

  raiz.EnjoyDB = {
    client: db,
    pronto: !!db,
    motivo: motivo,
    config: cfg || null,
    sessao: sessao,
    usuario: usuario,
    perfilAtual: perfilAtual,
    limparCachePerfil: limparCachePerfil,
    ehGestao: ehGestao,
    exigirLogin: exigirLogin,
    sair: sair,
    urlAssinada: urlAssinada,
    ultimaEdicao: ultimaEdicao,
    auditoriaDe: auditoriaDe,
    fmtEdicao: fmtEdicao
  };

  // ---- PWA: registra o service worker com CAMINHO RELATIVO -----------------
  // Resolve o sw.js a partir do próprio db.js (funciona em qualquer subpath,
  // ex.: GitHub Pages /cowork-odonto/). Só em http(s).
  (function registrarSW() {
    if (!("serviceWorker" in navigator)) return;
    if (!location.protocol.startsWith("http")) return;
    try {
      var sc = document.querySelector('script[src*="db.js"]');
      if (!sc) return;
      var base = sc.src.replace(/assets\/js\/db\.js.*$/, ""); // raiz do site
      navigator.serviceWorker.register(base + "sw.js")
        .catch(function (e) { console.warn("[Enjoy/db] SW não registrado:", e); });
    } catch (e) { /* silencioso */ }
  })();
})(typeof window !== "undefined" ? window : this);
