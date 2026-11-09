/**
 * Campally - shared loading screen (skeleton) and "No connection" screen.
 * Add it right after the top bar of a page:
 *   <script src="page-shell.js" data-skeleton="grid"></script>
 * Skeleton types: grid, list, profile, detail, chat, dashboard.
 * It shows the page layout at once, then reveals the real page when the page's data has loaded
 * (it watches the page's own data requests, so no page code has to change).
 * If the internet is off or very slow, it shows a "No connection" card with a Try again button.
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var type = (me && me.getAttribute("data-skeleton")) || "list";
  var html = document.documentElement;
  var done = false;
  var pending = 0, started = 0, okCount = 0, failCount = 0;
  var idleTimer = null, maxTimer = null, graceTimer = null;

  // ---------- styles ----------
  var css =
    ".ps-sk{background:linear-gradient(90deg,#EFEAE3 25%,#F8F4EF 37%,#EFEAE3 63%);background-size:400% 100%;animation:psShimmer 1.3s ease infinite;border-radius:12px;}" +
    "@keyframes psShimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}" +
    "@keyframes psFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.ps-sk{animation:none}}" +
    "#ps-skeleton,#ps-offline{display:none;}" +
    "html.ps-hold #ps-skeleton{display:block;}" +
    "html.ps-offline #ps-skeleton{display:none !important;}" +
    "html.ps-offline #ps-offline{display:block;}" +
    // while loading, the real content is moved off-screen (not removed), so scroll positions still work when it is shown
    "html.ps-hold,html.ps-hold body{height:100%;overflow:hidden;}" +
    "html.ps-hold body > *:not(header):not(#ps-skeleton):not(#ps-offline):not(script):not(style):not(link):not(nav):not(.bottom-nav):not([id^='cu-']):not([class^='cu-']):not(#campally-confirm-modal){position:absolute !important;left:-200vw !important;top:0 !important;width:100% !important;visibility:hidden !important;}" +
    "html.ps-revealed body > *:not(header):not(script):not(style):not(link):not(nav):not(.bottom-nav){animation:psFade .3s ease both;}" +
    ".ps-wrap{padding:14px 18px 110px 18px;max-width:560px;margin:0 auto;}" +
    ".ps-card{background:#fff;border:1px solid #EEE7DD;border-radius:16px;padding:10px;}" +
    ".ps-row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #EEE7DD;border-radius:16px;padding:12px;margin-bottom:10px;}" +
    ".ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}" +
    ".ps-off{margin:60px 24px 0 24px;background:#fff;border:1px solid #EEE7DD;border-radius:20px;padding:28px 20px;text-align:center;box-shadow:0 4px 18px rgba(30,27,75,.06);}" +
    ".ps-off .ico{width:64px;height:64px;border-radius:20px;background:#FFF5F3;margin:0 auto 14px auto;display:flex;align-items:center;justify-content:center;}" +
    ".ps-off h3{margin:0 0 6px 0;font-size:18px;color:#1E1B4B;}" +
    ".ps-off p{margin:0 0 18px 0;font-size:13.5px;color:#64748B;line-height:1.55;}" +
    ".ps-off button{background:#E8553D;color:#fff;border:none;border-radius:12px;padding:12px 26px;font-weight:800;font-size:14px;cursor:pointer;}";
  var st = document.createElement("style");
  st.id = "ps-style";
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- skeleton layouts ----------
  function b(cls, style) { return '<div class="ps-sk ' + (cls || "") + '" style="' + (style || "") + '"></div>'; }
  function cardBlock() { return '<div class="ps-card">' + b("", "height:128px;margin-bottom:10px;") + b("", "height:12px;width:85%;margin-bottom:8px;") + b("", "height:12px;width:50%;") + "</div>"; }
  function rowBlock() { return '<div class="ps-row">' + b("", "width:46px;height:46px;border-radius:50%;flex-shrink:0;") + '<div style="flex:1;">' + b("", "height:13px;width:60%;margin-bottom:9px;") + b("", "height:11px;width:85%;") + "</div></div>"; }
  function many(fn, n) { var o = ""; for (var i = 0; i < n; i++) o += fn(); return o; }

  var T = {
    grid: b("", "height:46px;border-radius:14px;margin-bottom:14px;") +
          '<div style="display:flex;gap:8px;overflow:hidden;margin-bottom:16px;">' + many(function () { return b("", "flex:0 0 auto;width:84px;height:34px;border-radius:999px;"); }, 5) + "</div>" +
          '<div class="ps-grid">' + many(cardBlock, 4) + "</div>",
    list: b("", "height:46px;border-radius:14px;margin-bottom:14px;") + many(rowBlock, 7),
    profile: b("", "height:210px;border-radius:24px;margin-bottom:14px;") +
             b("", "height:44px;border-radius:14px;margin-bottom:14px;") +
             '<div class="ps-grid">' + many(cardBlock, 2) + "</div>",
    detail: b("", "height:300px;border-radius:18px;margin-bottom:14px;") +
            b("", "height:22px;width:70%;margin-bottom:12px;") + b("", "height:26px;width:35%;margin-bottom:16px;") +
            b("", "height:12px;width:95%;margin-bottom:9px;") + b("", "height:12px;width:80%;margin-bottom:9px;") + b("", "height:12px;width:60%;margin-bottom:20px;") +
            b("", "height:56px;border-radius:16px;margin-bottom:10px;") + b("", "height:56px;border-radius:16px;"),
    chat: '<div style="display:flex;flex-direction:column;gap:12px;padding-top:6px;">' +
          b("", "height:46px;width:62%;border-radius:18px;") + b("", "height:46px;width:48%;border-radius:18px;align-self:flex-end;") +
          b("", "height:70px;width:70%;border-radius:18px;") + b("", "height:46px;width:40%;border-radius:18px;align-self:flex-end;") +
          b("", "height:46px;width:58%;border-radius:18px;") + "</div>",
    dashboard: b("", "height:150px;border-radius:20px;margin-bottom:12px;") +
               '<div style="display:flex;gap:10px;margin-bottom:12px;">' + many(function () { return b("", "flex:1;height:78px;border-radius:14px;"); }, 3) + "</div>" +
               many(rowBlock, 4)
  };

  var sk = document.createElement("div");
  sk.id = "ps-skeleton";
  sk.setAttribute("aria-hidden", "true");
  sk.innerHTML = '<div class="ps-wrap">' + (T[type] || T.list) + "</div>";

  var off = document.createElement("div");
  off.id = "ps-offline";
  off.innerHTML =
    '<div class="ps-off"><div class="ico"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8553D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5 12.4a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="#E8553D"/><path d="M3 3l18 18"/></svg></div>' +
    "<h3>No connection</h3><p>Campally cannot reach the internet right now. Check your network and try again. It will also load by itself when your connection comes back.</p>" +
    '<button type="button" id="ps-retry">Try again</button></div>';

  html.classList.add("ps-hold");
  if (me && me.parentNode) {
    me.parentNode.insertBefore(sk, me.nextSibling);
    me.parentNode.insertBefore(off, sk.nextSibling);
  } else {
    document.body.insertBefore(sk, document.body.firstChild);
    document.body.insertBefore(off, sk.nextSibling);
  }

  // ---------- state changes ----------
  function ready() {
    if (done && !html.classList.contains("ps-offline")) return;
    done = true;
    clearTimeout(idleTimer); clearTimeout(maxTimer); clearTimeout(graceTimer);
    html.classList.remove("ps-hold", "ps-offline");
    html.classList.add("ps-revealed");
    window.dispatchEvent(new Event("resize"));   // lets layouts that measure themselves refresh
  }
  function failed() {
    if (html.classList.contains("ps-revealed")) return;
    clearTimeout(idleTimer); clearTimeout(graceTimer);
    html.classList.add("ps-offline");
  }
  window.PageShell = { ready: ready, failed: failed };

  // ---------- watching the page's own data requests ----------
  function settle(ok) {
    pending = Math.max(0, pending - 1);
    if (ok) okCount++; else failCount++;
    if (pending === 0 && !html.classList.contains("ps-revealed")) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (okCount === 0 && failCount > 0) failed(); else ready();
      }, 220);
    }
  }
  var origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input) {
      var url = "";
      try { url = typeof input === "string" ? input : ((input && input.url) || ""); } catch (e) {}
      var track = !html.classList.contains("ps-revealed") && url.indexOf(".supabase.co") !== -1 && url.indexOf("/storage/") === -1 && url.indexOf("/realtime") === -1;
      if (track) { pending++; started++; clearTimeout(idleTimer); clearTimeout(graceTimer); }
      var p = origFetch.apply(this, arguments);
      if (track) {
        p.then(function () { settle(true); }, function () { settle(false); });
      }
      return p;
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var retry = document.getElementById("ps-retry");
    if (retry) retry.addEventListener("click", function () { window.location.reload(); });
    // the app library did not load (no internet)
    var needsApi = !!document.querySelector('script[src*="supabase"]');
    if (needsApi && !window.supabase) { failed(); return; }
    // a page that makes no data request at all is ready soon after it has loaded
    graceTimer = setTimeout(function () { if (started === 0) ready(); }, 1600);
  });
  window.addEventListener("online", function () { if (html.classList.contains("ps-offline")) window.location.reload(); });
  window.addEventListener("offline", function () { if (html.classList.contains("ps-hold")) failed(); });
  // very slow connection: say so, but still reveal the page if the data arrives later
  maxTimer = setTimeout(function () { if (!html.classList.contains("ps-revealed")) failed(); }, 15000);
})();
