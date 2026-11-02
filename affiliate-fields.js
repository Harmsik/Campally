/**
 * Campally Affiliates - "Let other students promote this" panel on the Post page
 * Verified sellers can switch it on and pick a commission (5, 10, 15 or 20 percent).
 * The Post page calls CampallyAffiliate.validate() and CampallyAffiliate.fields().
 * Uses the page's own Supabase connection (load after post-listing.js).
 */
(function () {
  "use strict";
  var on = false, pct = 0, verified = false, box;

  var css =
    "#aff-panel{background:linear-gradient(145deg,#FFFBEB,#FFF7ED);border:1.5px solid #FDE68A;border-radius:16px;padding:14px;margin:6px 0 14px 0;}" +
    ".aff-head{display:flex;align-items:center;gap:12px;}" +
    ".aff-head b{display:block;font-size:14px;color:#78350F;}.aff-head span{font-size:12px;color:#92400E;line-height:1.4;}" +
    ".aff-ico{width:40px;height:40px;border-radius:12px;background:#FEF3C7;color:#D97706;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}" +
    ".aff-sw{margin-left:auto;position:relative;width:48px;height:28px;border-radius:14px;background:#D6D3D1;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;}" +
    ".aff-sw::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:transform .2s;}" +
    ".aff-sw.on{background:#D97706;}.aff-sw.on::after{transform:translateX(20px);}" +
    ".aff-body{margin-top:12px;display:none;}" +
    ".aff-pcts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}" +
    ".aff-pct{background:#fff;border:1.5px solid #FDE68A;border-radius:12px;padding:10px 0;font-weight:800;font-size:14px;color:#92400E;cursor:pointer;font-family:inherit;}" +
    ".aff-pct.on{background:#D97706;border-color:#D97706;color:#fff;}" +
    ".aff-note{font-size:12px;color:#78350F;line-height:1.55;background:#fff;border:1px solid #FDE68A;border-radius:10px;padding:9px 10px;}" +
    ".aff-lock{font-size:12.5px;color:#78350F;margin-top:10px;line-height:1.5;}.aff-lock a{color:#B45309;font-weight:800;}";

  function price() { var p = parseFloat((document.getElementById("price") || {}).value); return isNaN(p) ? 0 : p; }
  function money(n) { return "\u20A6" + Math.round(n).toLocaleString(); }

  function refresh() {
    var sw = box.querySelector(".aff-sw"), body = box.querySelector(".aff-body"), note = box.querySelector(".aff-note");
    sw.classList.toggle("on", on);
    body.style.display = on && verified ? "block" : "none";
    Array.prototype.forEach.call(box.querySelectorAll(".aff-pct"), function (b) { b.classList.toggle("on", Number(b.getAttribute("data-p")) === pct); });
    var p = price();
    if (!pct) note.textContent = "Pick a commission. It is paid by you, only if the item sells through a student's link.";
    else if (!p) note.textContent = "Enter your price above to see what each sale costs you.";
    else note.innerHTML = "If this sells through an affiliate, you pay them <b>" + money(p * pct / 100) + "</b> (" + pct + "% of " + money(p) + "). You keep " + money(p - p * pct / 100) + ". If it sells any other way, you pay nothing.";
  }

  async function build() {
    var form = document.getElementById("listing-form");
    var submit = form && form.querySelector('button[type="submit"]');
    if (!form || !submit || typeof supabase === "undefined") return;

    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div");
    box.id = "aff-panel";
    box.innerHTML =
      '<div class="aff-head"><div class="aff-ico"><i class="fa-solid fa-hand-holding-dollar"></i></div>' +
      '<div><b>Let other students promote this</b><span>Affiliates share your item and earn a commission when it sells.</span></div>' +
      '<button type="button" class="aff-sw" aria-label="Allow affiliates"></button></div>' +
      '<div class="aff-body"><div class="aff-pcts">' +
      [5, 10, 15, 20].map(function (n) { return '<button type="button" class="aff-pct" data-p="' + n + '">' + n + "%</button>"; }).join("") +
      '</div><div class="aff-note"></div></div><div class="aff-lock" style="display:none;"></div>';
    form.insertBefore(box, submit);

    box.querySelector(".aff-sw").addEventListener("click", function () {
      if (!verified) { var l = box.querySelector(".aff-lock"); l.style.display = "block"; return; }
      on = !on; if (!on) pct = 0; refresh();
    });
    box.querySelector(".aff-body").addEventListener("click", function (e) {
      var b = e.target.closest(".aff-pct"); if (!b) return; pct = Number(b.getAttribute("data-p")); refresh();
    });
    var pr = document.getElementById("price"); if (pr) pr.addEventListener("input", refresh);

    // Only Verified Students can offer commission
    try {
      var s = await supabase.auth.getSession();
      var u = s.data && s.data.session && s.data.session.user;
      if (u) { var p = await supabase.from("profiles").select("is_verified").eq("id", u.id).maybeSingle(); verified = !!(p.data && p.data.is_verified); }
    } catch (e) {}
    if (!verified) {
      var lock = box.querySelector(".aff-lock");
      lock.innerHTML = '<i class="fa-solid fa-lock"></i> Only <b>Verified Students</b> can offer commission. <a href="profile.html#verify">Get verified</a> to switch this on.';
      lock.style.display = "block";
      box.querySelector(".aff-sw").style.opacity = ".5";
    }
    refresh();
  }

  window.CampallyAffiliate = {
    fields: function () { return on && verified && pct ? { affiliate_enabled: true, affiliate_percent: pct } : {}; },
    validate: function () {
      if (!on) return "";
      if (!verified) return "Only Verified Students can offer commission.";
      if (!pct) return "Please choose a commission percentage, or switch affiliates off.";
      if (!price()) return "Please enter a price. Commission is a percentage of the price.";
      return "";
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
