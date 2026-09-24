/* ==========================================================================
 * docs-envio.js — envio de documentos do cliente (24/09/2026)
 *
 * UM componente só, usado em:
 *   • reservar.html  → ao tocar em "Confirmar reserva" com documentação pendente,
 *                      o pedido aparece ali mesmo e o envio já resolve;
 *   • documentos.html → "Meus documentos".
 *
 * Régua = RPC docs_pendentes (migrations 0037/0039): RG/CNH e carteirinha com
 * FRENTE e VERSO (PDF na frente vale pelos dois lados); comprovante; selfie.
 * Cada envio é um arquivo NOVO (<chave>[-verso]-<timestamp>.<ext>, sem upsert):
 * o cliente não sobrescreve nem apaga — o anterior fica no histórico.
 *
 * Uso:
 *   DocsEnvio.montar(elemento, { DB, perfil, todos: false, aoAtualizar: fn(falta) })
 *     todos=false → só os documentos pendentes; true → todos (com "enviar novo").
 *   DocsEnvio.pendentes(DB, perfilId) → Promise<string[]>
 * ==========================================================================*/
(function (raiz) {
  "use strict";

  var ITENS = [
    { k: "cro",  frente: "cro_url",         verso: "cro_verso_url", arquivo: "carteirinha", titulo: "Carteirinha do conselho", dica: "Frente e verso, com nome e número legíveis." },
    { k: "rg",   frente: "rg_url",          verso: "rg_verso_url",  arquivo: "rg",          titulo: "RG ou CNH",               dica: "Frente e verso. PDF com os dois lados vale pelos dois." },
    { k: "comp", frente: "comprovante_url", verso: null,            arquivo: "comprovante", titulo: "Comprovante de residência", dica: "Conta de luz, água, internet ou similar." }
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ehPdf(x) { return /\.pdf$/i.test(String(x || "")) || (x && x.type === "application/pdf"); }
  function extensao(file) {
    var m = /\.([a-z0-9]+)$/i.exec(file.name || "");
    return m ? m[1].toLowerCase() : (file.type === "application/pdf" ? "pdf" : "jpg");
  }

  // mesma régua da RPC, por lado — a tela precisa saber QUAL lado pedir
  function situacao(it, docs) {
    var fr = docs[it.frente] || "", ve = it.verso ? (docs[it.verso] || "") : "";
    var legado = docs.legado && docs.legado[it.k];
    var falta = { frente: !fr, verso: false };
    if (it.verso && !ve && !ehPdf(fr) && !legado) falta.verso = true;
    return falta;
  }

  async function pendentes(DB, perfilId) {
    try {
      var r = await DB.client.rpc("docs_pendentes", { p_perfil_id: perfilId });
      return (!r.error && r.data) || [];
    } catch (e) { console.warn("[docs-envio] pendentes:", e); return []; }
  }

  async function subir(DB, userId, nome, file) {
    var caminho = userId + "/" + nome + "-" + Date.now() + "." + extensao(file);
    var up = await DB.client.storage.from("documentos").upload(caminho, file, { upsert: false, contentType: file.type || undefined });
    if (up.error) throw new Error(up.error.message);
    return caminho;
  }

  async function montar(el, o) {
    var DB = o.DB, perfil = o.perfil;
    var cur = await DB.client.from("perfis").select("docs,selfie_url").eq("id", perfil.id).maybeSingle();
    var docs = (cur.data && cur.data.docs) || {};
    var semSelfie = !(cur.data && cur.data.selfie_url);

    var html = ITENS.map(function (it) {
      var f = situacao(it, docs);
      var pend = f.frente || f.verso;
      if (!pend && !o.todos) return "";
      var rotulo = f.frente && it.verso ? "falta frente" + (f.verso ? " e verso" : "") : (f.verso ? "falta o verso" : (f.frente ? "falta enviar" : "enviado"));
      var campos = "";
      if (pend) {
        if (f.frente) campos += '<label class="de-lbl">' + (it.verso ? "Frente" : "Arquivo") + ' <input type="file" accept="image/*,application/pdf" data-lado="frente"></label>';
        if (f.verso)  campos += '<label class="de-lbl">Verso <input type="file" accept="image/*,application/pdf" data-lado="verso"></label>';
      } else {
        campos += '<label class="de-lbl">' + (it.verso ? "Frente" : "Arquivo") + ' <input type="file" accept="image/*,application/pdf" data-lado="frente"></label>';
        if (it.verso) campos += '<label class="de-lbl">Verso <input type="file" accept="image/*,application/pdf" data-lado="verso"></label>';
      }
      return '<div class="de-doc" data-item="' + it.k + '" style="border:1px solid var(--linha);border-radius:var(--raio);padding:12px;margin-top:10px">' +
        '<div class="row-between"><strong>' + esc(it.titulo) + '</strong><span class="badge ' + (pend ? "badge-amarelo" : "badge-verde") + '">' + rotulo + "</span></div>" +
        '<small class="muted">' + esc(it.dica) + "</small>" +
        '<div style="display:grid;gap:8px;margin-top:8px">' + campos + "</div>" +
        '<div style="margin-top:10px"><button type="button" class="btn ' + (pend ? "btn-primario" : "btn-neutro") + '" data-enviar="' + it.k + '">' + (pend ? "Enviar" : "Enviar arquivo novo") + "</button></div>" +
        (pend ? "" : '<small class="muted">O arquivo anterior fica guardado no histórico.</small>') +
        '<p class="de-msg" style="display:none;margin:8px 0 0"></p>' +
        "</div>";
    }).join("");
    if (semSelfie) html += '<p class="muted" style="margin-top:10px">Falta a <strong>selfie</strong>: fale com a gestão para registrá-la.</p>';
    el.innerHTML = '<style>.de-lbl{display:grid;gap:4px;font-size:.9rem;font-weight:600}.de-lbl input{font-weight:400}</style>' + html;

    el.querySelectorAll("button[data-enviar]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var it = ITENS.find(function (x) { return x.k === b.dataset.enviar; });
        var box = b.closest(".de-doc"), msg = box.querySelector(".de-msg");
        function erro(t) { msg.textContent = t; msg.style.color = "#b42318"; msg.style.display = "block"; }
        var inF = box.querySelector('input[data-lado="frente"]'), inV = box.querySelector('input[data-lado="verso"]');
        var fF = inF && inF.files[0], fV = inV && inV.files[0];
        if (!fF && !fV) return erro("Escolha o arquivo.");
        // simula como o documento fica DEPOIS do envio, com a mesma régua
        var sim = Object.assign({}, docs);
        if (fF) sim[it.frente] = ehPdf(fF) ? "novo.pdf" : "novo.jpg";
        if (fV) sim[it.verso] = "novo-verso.jpg";
        var s2 = situacao(it, sim);
        if (s2.frente) return erro("Escolha o arquivo da frente.");
        if (s2.verso) return erro("Envie também o verso (ou um PDF com os dois lados).");
        if ((fF && fF.size > 10485760) || (fV && fV.size > 10485760)) return erro("Arquivo muito grande (máx. 10 MB).");
        b.disabled = true; b.textContent = "Enviando…";
        try {
          var novo = {};
          if (fF) novo[it.frente] = await subir(DB, perfil.user_id, it.arquivo, fF);
          if (fV) novo[it.verso] = await subir(DB, perfil.user_id, it.arquivo + "-verso", fV);
          // relê antes de gravar: não sobrescrever outra chave com cópia velha
          var atual = await DB.client.from("perfis").select("docs").eq("id", perfil.id).maybeSingle();
          if (atual.error) throw new Error(atual.error.message);
          var d2 = Object.assign({}, (atual.data && atual.data.docs) || {}, novo);
          var r = await DB.client.from("perfis").update({ docs: d2 }).eq("id", perfil.id).select("docs");
          if (r.error) throw new Error(r.error.message);
          if (!r.data || !r.data.length) throw new Error("não foi possível gravar no seu cadastro");
          var falta = await pendentes(DB, perfil.id);
          await montar(el, o);
          if (o.aoAtualizar) o.aoAtualizar(falta, it.titulo);
        } catch (e) {
          b.disabled = false; b.textContent = "Enviar";
          erro("Não foi possível enviar: " + e.message);
        }
      });
    });
  }

  raiz.DocsEnvio = { montar: montar, pendentes: pendentes };
})(window);
