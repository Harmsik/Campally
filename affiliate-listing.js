/**
 * Campally Affiliates - listing page
 *  - Buyer side: remembers an affiliate's code from the link and records a "lead"
 *    when the buyer taps Message or WhatsApp.
 *  - Student side: "Copy Listing Link" becomes "Get affiliate link (earn N)" with their own code.
 *  - Seller side: shows the commission they offered.
 * Load after listing.js (uses its Supabase connection). Call CampallyAffiliate.attach(item, contactEl).
 */
(function () {
  "use strict";
  var DAY14 = 14 * 24 * 3600 * 1000;

  function key(id) { return "campally_aff_" + id; }
  function readCode(id) {
    try {
      var o = JSON.parse(localStorage.getItem(key(id)) || "null");
      if (o && o.code && Date.now() - o.ts < DAY14) return o.code;
    } catch (e) {}
    return "";
  }
  function money(n) { return "\u20A6" + Math.round(n).toLocaleString(); }
  function toast(m, t) { if (window.UI) UI.toast(m, t || "success", 5200); else alert(m); }
  async function getUser() {
    try {
      var s = await supabase.auth.getSession();
      if (s.data && s.data.session) return s.data.session.user;
      var u = await supabase.auth.getUser();
      return u.data && u.data.user;
    } catch (e) { return null; }
  }

  async function attach(item, contactEl) {
    if (!item || !item.affiliate_enabled || !item.affiliate_percent) return;
    var id = item.id;
    var commission = Math.round(Number(item.price || 0) * item.affiliate_percent / 100);

    // 1) remember the code that came in the link
    var q = new URLSearchParams(location.search);
    var inCode = q.get("aff");
    if (inCode) { try { localStorage.setItem(key(id), JSON.stringify({ code: inCode, ts: Date.now() })); } catch (e) {} }

    var user = await getUser();
    var isOwner = !!(user && user.id === item.seller_id);
    var copyBtn = document.getElementById("copy-link-btn");

    // 2) seller sees what they offered
    if (isOwner) {
      if (copyBtn) copyBtn.insertAdjacentHTML("beforebegin",
        '<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12.5px;color:#78350F;line-height:1.5;"><i class="fa-solid fa-hand-holding-dollar"></i> Affiliates earn <b>' + item.affiliate_percent + "%</b> (" + money(commission) + ") when this sells through their link. <a href=\"earn.html#sales\" style=\"color:#B45309;font-weight:800;\">See your affiliate sales</a></div>");
      return;
    }

    // 3) record a lead when the buyer reaches out through an affiliate link
    var code = readCode(id);
    if (code && contactEl) {
      var rec = function (via) {
        return supabase.rpc("record_affiliate_lead", { p_listing: id, p_code: code, p_via: via }).then(function () {}, function () {});
      };
      Array.prototype.forEach.call(contactEl.querySelectorAll("a"), function (a) {
        var href = a.getAttribute("href") || "";
        if (href.indexOf("chat.html") === 0) {
          a.addEventListener("click", function (e) {
            e.preventDefault();
            Promise.race([rec("chat"), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { location.href = href; });
          });
        } else if (href.indexOf("wa.me") > -1) {
          a.addEventListener("click", function () { rec("whatsapp"); });
        }
      });
    }

    // 4) "Copy Listing Link" becomes "Get affiliate link"
    if (copyBtn) {
      var fresh = copyBtn.cloneNode(false);
      fresh.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> Get affiliate link (earn ' + money(commission) + ")";
      fresh.style.cssText += ";border-color:#FDE68A;color:#92400E;background:#FFFBEB;";
      copyBtn.parentNode.replaceChild(fresh, copyBtn);
      fresh.insertAdjacentHTML("beforebegin",
        '<div style="font-size:12px;color:#78350F;margin:10px 0 6px 0;line-height:1.5;">Share this item on your status or groups. If someone buys it through your link, you earn <b>' + item.affiliate_percent + "%</b>.</div>");
      fresh.addEventListener("click", async function () {
        var u = await getUser();
        if (!u) { location.href = "login.html?redirect=" + encodeURIComponent("listing.html?id=" + id); return; }
        var mine = await supabase.rpc("get_my_affiliate_code");
        var c = mine.data;
        if (!c) { toast("Could not create your link. Please try again.", "error"); return; }
        var link = location.origin + "/listing.html?id=" + encodeURIComponent(id) + "&aff=" + encodeURIComponent(c);
        try { await navigator.clipboard.writeText(link); toast("Affiliate link copied! You earn " + money(commission) + " if a buyer you send purchases this.", "success"); }
        catch (e) { prompt("Copy your affiliate link:", link); }
      });
    }

    // 5) make anything shared from this page carry the student's own code
    if (user) {
      try {
        var mine2 = await supabase.rpc("get_my_affiliate_code");
        if (mine2.data) {
          var p = new URLSearchParams(location.search);
          p.set("aff", mine2.data);
          history.replaceState(null, "", location.pathname + "?" + p.toString());
        }
      } catch (e) {}
    }

    // 6) trust line: how reliably this seller pays commission
    try {
      var rr = await supabase.rpc("seller_affiliate_record", { p_seller: item.seller_id });
      var r = rr.data;
      if (r && r.confirmed > 0 && copyBtn) {
        document.getElementById("copy-link-btn").insertAdjacentHTML("afterend",
          '<div style="font-size:11.5px;color:#6B7280;margin-top:6px;"><i class="fa-solid fa-circle-check" style="color:#059669;"></i> Seller record: paid ' + r.paid + " of " + r.confirmed + " affiliate commissions</div>");
      }
    } catch (e) {}
  }

  window.CampallyAffiliate = window.CampallyAffiliate || {};
  window.CampallyAffiliate.attach = attach;
})();
