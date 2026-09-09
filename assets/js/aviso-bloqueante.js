/* ============================================================================
 * aviso-bloqueante.js — o aviso que a pessoa precisa ler antes de continuar.
 *
 * Recado marcado com `exige_aceite` vira uma camada por cima da tela. Ela só
 * sai pelo botão "Entendi", e o botão chama a RPC `aceitar_recado`, que carimba
 * quem, quando, de qual IP e com qual navegador.
 *
 * ⚠️ ESTA CAMADA É A CORTINA, NÃO A TRANCA. A tranca está no servidor:
 * `criar_reserva` recusa enquanto houver aviso pendente. Sem isso, fechar a
 * cortina pelo navegador liberaria a reserva.
 *
 * Carregar DEPOIS do db.js, nas telas do dentista:
 *   <script src="../../assets/js/aviso-bloqueante.js" defer></script>
 *
 * Degrada em silêncio: sem banco, sem sessão ou com a consulta falhando, a
 * página segue normal. Uma tela travada seria pior do que um aviso não visto.
 * ==========================================================================*/
(function () {
  "use strict";

  var FILA = [];

  function css() {
    if (document.getElementById("avb-css")) return;
    var st = document.createElement("style");
    st.id = "avb-css";
    st.textContent = [
      ".avb-bg{position:fixed;inset:0;background:rgba(8,28,49,.72);z-index:9000;display:flex;",
      "  align-items:center;justify-content:center;padding:20px;overflow:auto}",
      ".avb-cx{background:var(--branco,#fff);border-radius:16px;max-width:520px;width:100%;margin:auto;",
      "  box-shadow:0 18px 50px rgba(8,28,49,.35);overflow:hidden}",
      ".avb-topo{background:var(--azul,#0E2A47);color:#fff;padding:18px 22px;font-weight:800;font-size:1.05rem}",
      ".avb-corpo{padding:22px}",
      ".avb-txt{white-space:pre-wrap;line-height:1.55;margin:0 0 18px;font-size:.98rem}",
      ".avb-quando{color:var(--cinza,#5b6b7b);font-size:.82rem;margin:0 0 14px}",
      ".avb-nota{color:var(--cinza,#5b6b7b);font-size:.84rem;margin:12px 0 0;text-align:center}",
      ".avb-bt{width:100%}"
    ].join("");
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fmtData(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  // O texto do recado costuma vir como "Título\n\ncorpo". A primeira linha vira
  // o cabeçalho; o resto, o corpo.
  function partir(texto) {
    var t = String(texto || "").trim();
    var q = t.indexOf("\n");
    if (q === -1) return { titulo: "Aviso importante", corpo: t };
    return { titulo: t.slice(0, q).trim(), corpo: t.slice(q).trim() };
  }

  function mostrar(rec) {
    css();
    var p = partir(rec.texto);
    var bg = document.createElement("div");
    bg.className = "avb-bg";
    bg.setAttribute("role", "alertdialog");
    bg.setAttribute("aria-modal", "true");
    bg.innerHTML =
      '<div class="avb-cx">' +
        '<div class="avb-topo">' + esc(p.titulo) + "</div>" +
        '<div class="avb-corpo">' +
          '<p class="avb-quando">Enviado em ' + esc(fmtData(rec.criado_em)) + "</p>" +
          '<p class="avb-txt">' + esc(p.corpo) + "</p>" +
          '<button class="btn btn-primario avb-bt" type="button">Entendi</button>' +
          '<p class="avb-nota">Enquanto este aviso não for lido, novas reservas ficam bloqueadas.</p>' +
        "</div>" +
      "</div>";
    document.body.appendChild(bg);
    document.body.style.overflow = "hidden";

    var bt = bg.querySelector(".avb-bt");
    bt.addEventListener("click", async function () {
      bt.disabled = true;
      bt.textContent = "Registrando…";
      try {
        var r = await window.EnjoyDB.client.rpc("aceitar_recado", {
          p_recado: rec.id,
          p_user_agent: navigator.userAgent
        });
        if (r.error) throw new Error(r.error.message);
      } catch (e) {
        bt.disabled = false;
        bt.textContent = "Entendi";
        var erro = bg.querySelector(".avb-nota");
        erro.textContent = "Não consegui registrar agora. Verifique a internet e toque de novo.";
        console.warn("[aviso-bloqueante] aceitar_recado:", e.message);
        return;
      }
      bg.remove();
      document.body.style.overflow = "";
      proximo();
    });

    // Sem clicar fora, sem Esc: é bloqueante de propósito.
    bg.addEventListener("click", function (e) { e.stopPropagation(); });
    bt.focus();
  }

  function proximo() {
    var r = FILA.shift();
    if (r) mostrar(r);
  }

  async function iniciar() {
    var DB = window.EnjoyDB;
    if (!DB || !DB.pronto) return;
    try {
      var s = await DB.sessao();
      if (!s) return;
      var hoje = new Date();
      var hojeISO = hoje.getFullYear() + "-" +
        String(hoje.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoje.getDate()).padStart(2, "0");
      // A RLS já limita aos recados da própria pessoa.
      var r = await DB.client.from("recados")
        .select("id,texto,criado_em,expira_em")
        .eq("exige_aceite", true).eq("lido", false)
        .order("criado_em", { ascending: true });
      if (r.error || !r.data || !r.data.length) return;
      FILA = r.data.filter(function (x) { return !x.expira_em || x.expira_em >= hojeISO; });
      proximo();
    } catch (e) {
      console.warn("[aviso-bloqueante]", e.message);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
