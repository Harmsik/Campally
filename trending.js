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
    ".ts-title{font-size:15px;font-weight:800;color:#2B2B2B;}" +
    ".ts-row{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}" +
    ".ts-row::-webkit-scrollbar{display:none;}" +
    ".ts-card{display:flex;flex-direction:column;flex:0 0 156px;background:#fff;border:1px solid #E5E0D8;border-radius:16px;padding:14px 10px 12px 10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04);position:relative;}" +
    ".ts-rank{position:absolute;top:8px;left:8px;background:#FFF5F3;color:#E8553D;font-size:11px;font-weight:800;border-radius:10px;padding:1px 7px;}" +
    ".ts-av{width:60px;height:60px;border-radius:50%;margin:0 auto 8px auto;overflow:hidden;background:#FDE8E3;color:#E8553D;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;}" +
    ".ts-av img{width:100%;height:100%;object-fit:cover;display:block;}" +
    ".ts-name{font-size:13px;font-weight:800;color:#1E1B4B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".ts-sub{font-size:11px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:15px;margin-top:1px;}" +
    ".ts-stats{font-size:11px;color:#4B5563;margin:7px 0 9px 0;line-height:1.5;}" +
    ".ts-stats b{color:#2B2B2B;}" +
    ".ts-btn{display:block;margin-top:auto;background:#E8553D;color:#fff;font-size:12px;font-weight:800;text-decoration:none;padding:8px 0;border-radius:10px;}" +
    ".ts-ver{color:#059669;font-size:11px;margin-left:3px;}";
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

    var av = document.createElement("div");
    av.className = "ts-av";
    av.textContent = initials(s.full_name);
    if (s.avatar_url) {
      var im = document.createElement("img");
      im.alt = "";
      im.loading = "lazy";
      im.onerror = function () { im.remove(); };   // broken picture: keep the initials
      im.src = s.avatar_url;
      av.appendChild(im);
    }
    a.appendChild(av);

    var nm = document.createElement("div");
    nm.className = "ts-name";
    nm.textContent = (s.full_name || "Campally seller").trim();
    if (s.is_verified) {
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
    var line2 = s.avg_rating ? '<br><i class="fa-solid fa-star" style="color:#F59E0B;"></i> <b>' + Number(s.avg_rating).toFixed(1) + "</b> (" + s.rating_count + ")" : "";
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
})();
