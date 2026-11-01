/**
 * Campally - "Report this listing" (copyright, scam, wrong category...)
 * CampallyReport.attach(elementToPlaceAfter, listingId, sellerId)
 * Uses the page's own Supabase connection (load after listing.js).
 */
(function () {
  "use strict";
  var REASONS = [
    { v: "copyright", t: "Copyright: pirated, photocopied or a stolen file" },
    { v: "scam", t: "Scam or fake item" },
    { v: "wrong_category", t: "Wrong category or misleading" },
    { v: "prohibited", t: "Not allowed on Campally" },
    { v: "other", t: "Something else" }
  ];

  var css =
    ".rp-link{text-align:center;margin:14px 0 4px 0;}.rp-link a{font-size:12px;color:#9CA3AF;text-decoration:underline;cursor:pointer;}" +
    ".rp-sheet{position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;}" +
    ".rp-panel{background:#fff;width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:20px 20px calc(22px + env(safe-area-inset-bottom,0px)) 20px;max-height:86vh;overflow-y:auto;}" +
    ".rp-panel h3{margin:0 0 4px 0;color:#1E1B4B;font-size:17px;}.rp-panel p{margin:0 0 12px 0;font-size:12.5px;color:#6B7280;line-height:1.5;}" +
    ".rp-opt{display:flex;gap:10px;align-items:center;border:1.5px solid #EEE7DD;border-radius:12px;padding:11px 12px;margin-bottom:8px;font-size:13.5px;font-weight:600;color:#374151;cursor:pointer;}" +
    ".rp-opt.on{border-color:#E8553D;background:#FFF5F3;color:#9A2F1B;}" +
    ".rp-panel textarea{width:100%;box-sizing:border-box;border:1.5px solid #EEE7DD;border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;min-height:70px;margin:4px 0 12px 0;}" +
    ".rp-send{width:100%;background:#E8553D;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;}" +
    ".rp-cancel{width:100%;background:none;border:none;color:#6B7280;padding:10px;font-weight:700;cursor:pointer;font-family:inherit;}";
  var styled = false;
  function addStyle() { if (styled) return; var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); styled = true; }
  function toast(m, t) { if (window.UI) UI.toast(m, t); else alert(m); }

  async function currentUser() {
    try {
      var s = await supabase.auth.getSession();
      if (s.data && s.data.session) return s.data.session.user;
      var u = await supabase.auth.getUser();
      return u.data && u.data.user;
    } catch (e) { return null; }
  }

  function openSheet(listingId, user) {
    addStyle();
    var chosen = "";
    var sheet = document.createElement("div");
    sheet.className = "rp-sheet";
    var panel = document.createElement("div");
    panel.className = "rp-panel";
    panel.innerHTML = "<h3>Report this listing</h3><p>Tell us what is wrong. Reports are private and the seller is not told who reported.</p>";
    REASONS.forEach(function (r) {
      var o = document.createElement("div");
      o.className = "rp-opt";
      o.textContent = r.t;
      o.addEventListener("click", function () {
        chosen = r.v;
        Array.prototype.forEach.call(panel.querySelectorAll(".rp-opt"), function (x) { x.classList.toggle("on", x === o); });
      });
      panel.appendChild(o);
    });
    var ta = document.createElement("textarea");
    ta.maxLength = 500;
    ta.placeholder = "More details (optional)";
    panel.appendChild(ta);
    var send = document.createElement("button");
    send.type = "button"; send.className = "rp-send"; send.textContent = "Send report";
    var cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "rp-cancel"; cancel.textContent = "Cancel";
    panel.appendChild(send); panel.appendChild(cancel);
    sheet.appendChild(panel);
    document.body.appendChild(sheet);

    var close = function () { sheet.remove(); };
    cancel.addEventListener("click", close);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
    send.addEventListener("click", async function () {
      if (!chosen) { toast("Please choose a reason first.", "error"); return; }
      send.disabled = true; send.textContent = "Sending...";
      var res = await supabase.from("listing_reports").insert({
        listing_id: listingId, reporter_id: user.id, reason: chosen, details: ta.value.trim() || null
      });
      if (res.error) {
        send.disabled = false; send.textContent = "Send report";
        if (res.error.code === "23505") { close(); toast("You already reported this listing. Thank you.", "info"); return; }
        toast("Could not send the report. Please try again.", "error");
        return;
      }
      close();
      toast("Thank you. The Campally team will review this listing.", "success");
    });
  }

  async function attach(afterEl, listingId, sellerId) {
    if (!afterEl || !listingId) return;
    var user = await currentUser();
    if (user && user.id === sellerId) return;           // sellers do not report themselves
    addStyle();
    var wrap = document.createElement("div");
    wrap.className = "rp-link";
    var a = document.createElement("a");
    a.textContent = "Report this listing";
    wrap.appendChild(a);
    afterEl.insertAdjacentElement("afterend", wrap);
    a.addEventListener("click", async function () {
      var u = await currentUser();
      if (!u) { location.href = "login.html?redirect=" + encodeURIComponent("listing.html?id=" + listingId); return; }
      openSheet(listingId, u);
    });
  }

  window.CampallyReport = { attach: attach };
})();
