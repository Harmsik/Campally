/**
 * Campally - Trending Sellers (Home page)
 * Shows the sellers students are following and buying from right now,
 * each with a "Visit store" button. The ranking is calculated in Supabase
 * (get_trending_sellers), so this file only draws the cards.
 * Must load AFTER home.js (it uses the Supabase connection home.js creates).
 */
(function () {
  "use strict";

  var host = document.getElementById("trending-sellers");
  if (!host) return;

  var css =
    "#trending-sellers{padding:6px 20px 4px 20px;}" +
    ".ts-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}" +
    ".ts-title{font-size:16px;font-weight:800;color:#1E1B4B;}" +
    ".ts-row{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 16px 2px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}" +
    ".ts-row::-webkit-scrollbar{display:none;}" +
    ".ts-card{display:flex;flex-direction:column;flex:0 0 160px;position:relative;overflow:hidden;color:#fff;background:linear-gradient(150deg,#1E1B4B 0%,#312E81 58%,#4338CA 100%);border-radius:20px;padding:16px 12px 12px 12px;text-align:center;box-shadow:0 10px 24px rgba(30,27,75,.28);}" +
    ".ts-card::before{content:'';position:absolute;right:-34px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(252,211,77,.30),rgba(252,211,77,0) 70%);}" +
    ".ts-card>*{position:relative;z-index:1;}" +
    ".ts-rank{position:absolute !important;top:10px;left:10px;background:rgba(252,211,77,.18);color:#FCD34D;font-size:11px;font-weight:800;border-radius:10px;padding:2px 8px;border:1px solid rgba(252,211,77,.35);}" +
    ".ts-av{width:64px;height:64px;border-radius:50%;margin:6px auto 9px auto;padding:2.5px;background:linear-gradient(135deg,#FCD34D,#F97316);}" +
    ".ts-av-in{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#E0E7FF;color:#4338CA;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;}" +
    ".ts-av-in img{width:100%;height:100%;object-fit:cover;display:block;}" +
    ".ts-name{font-size:13.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".ts-sub{font-size:11px;color:#C7D2FE;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:15px;margin-top:1px;}" +
    ".ts-stats{font-size:11px;color:#E0E7FF;margin:9px 0 11px 0;line-height:1.6;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:6px 4px;}" +
    ".ts-stats b{color:#fff;}" +
    ".ts-btn{display:block;margin-top:auto;background:#fff;color:#1E1B4B;font-size:12.5px;font-weight:800;text-decoration:none;padding:9px 0;border-radius:11px;}" +
    ".ts-ver{color:#6EE7B7;font-size:11px;margin-left:3px;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  function card(s, rank) {
    var a = document.createElement("div");
    a.className = "ts-card";

    var r = document.createElement("div");
    r.className = "ts-rank";
    r.textContent = "#" + rank;
    a.appendChild(r);

    var ring = document.createElement("div");
    ring.className = "ts-av";
    var av = document.createElement("div");
    av.className = "ts-av-in";
    ring.appendChild(av);
    av.textContent = initials(s.full_name);
    if (s.avatar_url) {
      var im = document.createElement("img");
      im.alt = "";
      im.loading = "lazy";
      im.onerror = function () { im.remove(); };   // broken picture: keep the initials
      im.src = s.avatar_url;
      av.appendChild(im);
    }
    a.appendChild(ring);

    var nm = document.createElement("div");
    nm.className = "ts-name";
    nm.textContent = (s.full_name || "Campally seller").trim();
    if (s._vendor) {
      var vv = document.createElement("i");
      vv.className = "fa-solid fa-store ts-ver";
      vv.style.color = "#B45309";
      vv.title = "Verified Vendor";
      nm.appendChild(vv);
    } else if (s.is_verified) {
      var v = document.createElement("i");
      v.className = "fa-solid fa-circle-check ts-ver";
      v.title = "Verified Student";
      nm.appendChild(v);
    }
    a.appendChild(nm);

    var sub = document.createElement("div");
    sub.className = "ts-sub";
    sub.textContent = (s.department || s.hall || "").trim();
    a.appendChild(sub);

    var stats = document.createElement("div");
    stats.className = "ts-stats";
    var f = s.followers_count || 0, n = s.active_listings || 0;
    var line1 = "<b>" + f + "</b> follower" + (f === 1 ? "" : "s") + " &bull; <b>" + n + "</b> item" + (n === 1 ? "" : "s");
    var line2 = s.avg_rating ? '<br><i class="fa-solid fa-star" style="color:#FCD34D;"></i> <b>' + Number(s.avg_rating).toFixed(1) + "</b> (" + s.rating_count + ")" : "";
    stats.innerHTML = line1 + line2;
    a.appendChild(stats);

    var btn = document.createElement("a");
    btn.className = "ts-btn";
    btn.href = "seller.html?id=" + encodeURIComponent(s.id);
    btn.textContent = "Visit store";
    a.appendChild(btn);

    return a;
  }

  var token = 0;
  window.renderTrendingSellers = async function (campusId) {
    var mine = ++token;
    if (typeof supabase === "undefined" || !supabase.rpc) return;
    try {
      var res = await supabase.rpc("get_trending_sellers", {
        p_campus_id: campusId ? Number(campusId) : null,
        p_limit: 10
      });
      if (mine !== token) return;          // a newer campus choice replaced this request
      var list = res.data || [];
      if (res.error || !list.length) { host.style.display = "none"; host.innerHTML = ""; return; }

      // Mark the sellers who are verified vendors (gold store badge)
      try {
        var vids = list.map(function (x) { return x.id; }).filter(Boolean);
        if (vids.length) {
          var vr = await supabase.from("profiles").select("id").in("id", vids).eq("is_vendor_verified", true);
          var vmap = {};
          (vr.data || []).forEach(function (r) { vmap[r.id] = true; });
          list.forEach(function (x) { x._vendor = !!vmap[x.id]; });
        }
      } catch (e) {}

      host.style.display = "block";
      host.innerHTML = "";
      var head = document.createElement("div");
      head.className = "ts-head";
      head.innerHTML = '<span class="ts-title">\uD83D\uDD25 Trending Sellers</span>';
      var row = document.createElement("div");
      row.className = "ts-row";
      list.forEach(function (s, i) { row.appendChild(card(s, i + 1)); });
      host.appendChild(head);
      host.appendChild(row);
    } catch (e) {
      console.error("Trending sellers error:", e);
    }
  };

  // Home may have finished before this file arrived: draw now using its note
  if (window.__trendingPending) {
    var note = window.__trendingPending;
    window.__trendingPending = null;
    window.renderTrendingSellers(note.campusId);
  }
})();
