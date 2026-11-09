// Campally Global Utilities & Navigation
// Proactively clear stale ServiceWorker caches to prevent stale UI across browser updates
(function clearStaleAppCache() {
  try {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        }).catch(() => {});
      }
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        }).catch(() => {});
      }
    }
  } catch (_) {}
})();

// Universal Campus Ambassador Referral Tracker
(function initAmbassadorReferralTracking() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      const cleanRef = ref.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (cleanRef) {
        localStorage.setItem("campally_ref_code", cleanRef);
        sessionStorage.setItem("campally_ref_code", cleanRef);
        // Ping link click counter
        fetch(`/api/ambassadors/click?code=${encodeURIComponent(cleanRef)}`).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Referral tracking error:", e);
  }
})();

window.getCampallyReferralCode = function() {
  try {
    return localStorage.getItem("campally_ref_code") || sessionStorage.getItem("campally_ref_code") || null;
  } catch (e) {
    return null;
  }
};

window.CAMPUS_SAFE_SPOTS = [
  "University Main Library Foyer",
  "Student Union Building (SUB) Front Atrium",
  "Faculty Lecture Theater Corridor",
  "Hostel Porter's Lodge / Reception Desk",
  "Campus Main Gate Security Center"
];

// Service types shared by the Post form and the Book a Service page
window.CAMPALLY_SERVICE_TYPES = [
  { name: "Barbing", icon: "fa-scissors" },
  { name: "Hair & Braiding", icon: "fa-spa" },
  { name: "Make-up", icon: "fa-wand-magic-sparkles" },
  { name: "Nails & Lashes", icon: "fa-hand-sparkles" },
  { name: "Photography & Video", icon: "fa-camera" },
  { name: "Graphic Design", icon: "fa-palette" },
  { name: "Web & App Design", icon: "fa-laptop-code" },
  { name: "Tutoring & Lessons", icon: "fa-chalkboard-user" },
  { name: "Baking & Cakes", icon: "fa-cake-candles" },
  { name: "Catering & Cooking", icon: "fa-utensils" },
  { name: "Laundry & Ironing", icon: "fa-shirt" },
  { name: "Cleaning", icon: "fa-broom" },
  { name: "Phone & Laptop Repair", icon: "fa-screwdriver-wrench" },
  { name: "Printing & Typing", icon: "fa-print" },
  { name: "Tailoring", icon: "fa-ruler-combined" },
  { name: "Delivery & Errands", icon: "fa-motorcycle" },
  { name: "Events, DJ & MC", icon: "fa-music" },
  { name: "Fitness Training", icon: "fa-dumbbell" },
  { name: "Moving & Hauling", icon: "fa-truck" },
  { name: "Other", icon: "fa-ellipsis" }
];

// Currency and Swap Price Formatter
window.formatPrice = function(val, isSwap) {
  if (isSwap) {
    if (!val || Number(val) === 0) return "🔄 Open to Swap";
    return `₦${Number(val).toLocaleString()} (or Swap)`;
  }
  if (val === null || val === undefined || val === "") return "₦0 (Free / Negotiable)";
  const num = Number(val);
  if (!isNaN(num)) {
    return `₦${num.toLocaleString()}`;
  }
  return `₦${val}`;
};

// Sold Status Management (Synced locally & with Supabase)
window.isItemSold = function(itemId) {
  if (!itemId) return false;
  try {
    const soldList = JSON.parse(localStorage.getItem("campally_sold_items") || "[]");
    return soldList.includes(String(itemId));
  } catch (e) {
    return false;
  }
};

window.setItemSoldStatus = function(itemId, isSold) {
  if (!itemId) return;
  try {
    let soldList = JSON.parse(localStorage.getItem("campally_sold_items") || "[]");
    const strId = String(itemId);
    if (isSold) {
      if (!soldList.includes(strId)) soldList.push(strId);
    } else {
      soldList = soldList.filter(id => id !== strId);
    }
    localStorage.setItem("campally_sold_items", JSON.stringify(soldList));
  } catch (e) {}
};

// Saved / Favorites Management (Bookmarks)
window.getSavedItemIds = function() {
  try {
    return JSON.parse(localStorage.getItem("campally_saved_items") || "[]");
  } catch (e) {
    return [];
  }
};

window.isItemSaved = function(itemId) {
  if (!itemId) return false;
  const list = window.getSavedItemIds();
  return list.includes(String(itemId));
};

window.toggleSaveItem = function(itemId) {
  if (!itemId) return false;
  const strId = String(itemId);
  let list = window.getSavedItemIds();
  const exists = list.includes(strId);
  if (exists) {
    list = list.filter(id => id !== strId);
  } else {
    list.push(strId);
  }
  localStorage.setItem("campally_saved_items", JSON.stringify(list));
  if (window.__likeToDb) window.__likeToDb(strId, !exists);   // also save the heart in the database
  return !exists;
};

// ---------------------------------------------------------------------
// Hearts saved in the database (so a seller can see likes on their products).
// The phone copy stays, so every page keeps working the way it did.
// ---------------------------------------------------------------------
(function () {
  var URL_ = "https://mhshjusbtrkkkktymiyg.supabase.co";
  var KEY_ = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
  var client = null;
  var myId = null;

  function db() {
    if (!client && window.supabase) {
      try { client = window.supabase.createClient(URL_, KEY_); } catch (e) {}
    }
    return client;
  }
  async function uid() {
    if (myId) return myId;
    var c = db();
    if (!c) return null;
    try {
      var s = await c.auth.getSession();
      myId = s.data && s.data.session ? s.data.session.user.id : null;
    } catch (e) {}
    return myId;
  }

  window.__likeToDb = async function (itemId, liked) {
    try {
      var id = await uid();
      var c = db();
      if (!id || !c) return;
      if (liked) {
        await c.from("listing_likes").upsert({ listing_id: itemId, user_id: id }, { onConflict: "listing_id,user_id", ignoreDuplicates: true });
      } else {
        await c.from("listing_likes").delete().eq("listing_id", itemId).eq("user_id", id);
      }
    } catch (e) {}
  };

  function paintHearts(list) {
    try {
      document.querySelectorAll(".save-item-btn[data-id]").forEach(function (b) {
        var on = list.indexOf(String(b.getAttribute("data-id"))) !== -1;
        b.classList.toggle("saved", on);
        var i = b.querySelector("i");
        if (i) i.className = on ? "fa-solid fa-heart" : "fa-regular fa-heart";
      });
      var counter = document.getElementById("saved-counter");
      if (counter) counter.textContent = list.length;
    } catch (e) {}
  }

  async function syncLikes() {
    try {
      var id = await uid();
      var c = db();
      if (!id || !c) return;
      var flag = "campally_likes_pushed_" + id;
      var first = !localStorage.getItem(flag);
      if (!first) {
        var last = Number(sessionStorage.getItem("campally_likes_synced_at") || 0);
        if (Date.now() - last < 5 * 60 * 1000) return;
      }
      var r = await c.rpc("sync_my_likes", { p_ids: first ? window.getSavedItemIds() : [], p_push: first });
      if (r.error || !Array.isArray(r.data)) return;
      var before = JSON.stringify(window.getSavedItemIds().slice().sort());
      var after = JSON.stringify(r.data.slice().sort());
      localStorage.setItem("campally_saved_items", JSON.stringify(r.data));
      if (first) localStorage.setItem(flag, "1");
      sessionStorage.setItem("campally_likes_synced_at", String(Date.now()));
      if (before !== after) paintHearts(r.data);
    } catch (e) {}
  }

  // ----- Reminder for vendors who are not verified yet (shown on every page until they send their details) -----
  var NO_NUDGE = ["", "index.html", "landing.html", "login.html", "signup.html", "auth-callback.html", "reset-password.html", "update-password.html", "vendor-verify.html"];

  function showVendorNudge(rejectedNote) {
    if (document.getElementById("vendor-nudge")) return;
    var wrap = document.createElement("div");
    wrap.id = "vendor-nudge";
    wrap.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:100000; display:flex; align-items:center; justify-content:center; padding:20px;";
    var box = document.createElement("div");
    box.style.cssText = "background:#fff; border-radius:20px; max-width:340px; width:100%; padding:22px 20px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,.25); font-family:inherit;";

    var ico = document.createElement("div");
    ico.style.cssText = "width:54px; height:54px; border-radius:16px; background:#FEF3C7; color:#B45309; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 12px auto;";
    ico.innerHTML = '<i class="fa-solid fa-store"></i>';

    var h = document.createElement("h3");
    h.textContent = "Verify your vendor profile";
    h.style.cssText = "margin:0 0 8px 0; font-size:17px; color:#1E1B4B;";

    var p = document.createElement("p");
    p.style.cssText = "margin:0; font-size:13.5px; color:#475569; line-height:1.55;";
    p.textContent = rejectedNote
      ? "Your last request was not approved: " + rejectedNote + " Please send your details again."
      : "Please verify your profile for a better experience. Verified vendors get the gold badge and students trust them more. You cannot post products until you are verified.";

    var go = document.createElement("a");
    go.href = "vendor-verify.html";
    go.textContent = "Verify now";
    go.style.cssText = "display:block; margin-top:16px; padding:12px; border-radius:12px; background:#E8553D; color:#fff; font-weight:800; font-size:14px; text-decoration:none;";

    var later = document.createElement("button");
    later.type = "button";
    later.textContent = "Later";
    later.style.cssText = "margin-top:8px; background:none; border:none; color:#64748B; font-size:13px; font-weight:700; cursor:pointer; padding:8px;";
    later.addEventListener("click", function () { wrap.remove(); });

    box.appendChild(ico); box.appendChild(h); box.appendChild(p); box.appendChild(go); box.appendChild(later);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  }

  async function vendorNudge() {
    try {
      var page = (location.pathname.split("/").pop() || "").toLowerCase();
      if (NO_NUDGE.indexOf(page) !== -1) return;
      var id = await uid();
      var c = db();
      if (!id || !c) return;
      var r = await c.from("profiles").select("account_type, is_vendor_verified").eq("id", id).maybeSingle();
      var prof = r.data;
      if (!prof || prof.account_type !== "vendor" || prof.is_vendor_verified === true) return;
      var v = await c.from("vendor_verifications").select("status, review_note").eq("user_id", id).maybeSingle();
      var st = v.data && v.data.status;
      if (st === "pending") return;   // already sent, waiting for the Founder
      showVendorNudge(st === "rejected" ? (v.data.review_note || "Please upload clearer photos.") : "");
    } catch (e) {}
  }

  if (sessionStorage.getItem("campally_visitor_mode") !== "true") {
    setTimeout(syncLikes, 400);
    setTimeout(vendorNudge, 1200);
  }
})();


// =====================================================================
// Campally UI kit: toasts, success screens, form errors, loaders, skeletons
// (every page that loads nav.js gets these)
// =====================================================================
(function () {
  if (window.UI && window.UI.__ready) return;

  var css = "" +
    /* toasts */
    ".cu-toasts{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(92vw,420px);z-index:20000;display:flex;flex-direction:column;gap:10px;pointer-events:none;}" +
    ".cu-toast{pointer-events:auto;position:relative;overflow:hidden;display:flex;gap:12px;align-items:flex-start;background:#fff;border-radius:16px;padding:12px 14px 14px 14px;box-shadow:0 12px 32px rgba(15,23,42,.20),0 2px 6px rgba(15,23,42,.08);border:1px solid rgba(15,23,42,.06);animation:cuIn .32s cubic-bezier(.2,.9,.3,1.25);cursor:pointer;}" +
    ".cu-toast.out{opacity:0;transform:translateY(-10px) scale(.98);transition:all .25s ease;}" +
    ".cu-toast.error{animation:cuIn .32s cubic-bezier(.2,.9,.3,1.25),cuNudge .4s .3s;}" +
    ".cu-ico{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:15px;}" +
    ".cu-toast.success .cu-ico{background:linear-gradient(135deg,#34D399,#059669);}" +
    ".cu-toast.error .cu-ico{background:linear-gradient(135deg,#FB7185,#DC2626);}" +
    ".cu-toast.info .cu-ico{background:linear-gradient(135deg,#818CF8,#4338CA);}" +
    ".cu-toast.warning .cu-ico{background:linear-gradient(135deg,#FBBF24,#D97706);}" +
    ".cu-txt{flex:1;min-width:0;}" +
    ".cu-title{font-weight:800;font-size:13.5px;color:#111827;line-height:1.3;}" +
    ".cu-msg{font-size:13px;color:#4B5563;line-height:1.45;margin-top:1px;word-wrap:break-word;overflow-wrap:anywhere;}" +
    ".cu-bar{position:absolute;left:0;bottom:0;height:3px;width:100%;transform-origin:left;animation:cuBar linear forwards;}" +
    ".cu-toast.success .cu-bar{background:#10B981;}.cu-toast.error .cu-bar{background:#EF4444;}.cu-toast.info .cu-bar{background:#6366F1;}.cu-toast.warning .cu-bar{background:#F59E0B;}" +
    "@keyframes cuIn{from{opacity:0;transform:translateY(-16px) scale(.96);}to{opacity:1;transform:none;}}" +
    "@keyframes cuBar{from{transform:scaleX(1);}to{transform:scaleX(0);}}" +
    "@keyframes cuNudge{0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}" +
    /* success screen */
    ".cu-screen{position:fixed;inset:0;z-index:30000;background:rgba(253,246,236,.96);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:24px;animation:cuFade .25s ease;}" +
    ".cu-screen .cu-circle{width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 14px 34px rgba(5,150,105,.35);animation:cuPop .5s cubic-bezier(.2,.9,.3,1.4);}" +
    ".cu-screen .cu-circle.success{background:linear-gradient(135deg,#34D399,#059669);}" +
    ".cu-screen .cu-circle.info{background:linear-gradient(135deg,#818CF8,#4338CA);box-shadow:0 14px 34px rgba(67,56,202,.35);font-size:40px;}" +
    ".cu-screen svg{width:46px;height:46px;}" +
    ".cu-screen path{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:cuDraw .5s .25s ease forwards;}" +
    ".cu-screen h2{font-size:22px;font-weight:800;color:#1E1B4B;margin:0;}" +
    ".cu-screen p{font-size:14px;color:#6B7280;margin:0;max-width:280px;line-height:1.5;}" +
    ".cu-dots{display:flex;gap:6px;margin-top:18px;}.cu-dots i{width:7px;height:7px;border-radius:50%;background:#E8553D;opacity:.3;animation:cuDot 1s infinite;}.cu-dots i:nth-child(2){animation-delay:.15s;}.cu-dots i:nth-child(3){animation-delay:.3s;}" +
    "@keyframes cuFade{from{opacity:0;}to{opacity:1;}}" +
    "@keyframes cuPop{0%{transform:scale(.4);opacity:0;}100%{transform:scale(1);opacity:1;}}" +
    "@keyframes cuDraw{to{stroke-dashoffset:0;}}" +
    "@keyframes cuDot{0%,100%{opacity:.25;transform:scale(.8);}50%{opacity:1;transform:scale(1.15);}}" +
    /* form error banner */
    ".cu-alert{display:flex;gap:10px;align-items:flex-start;background:#FEF2F2;border:1.5px solid #FCA5A5;border-left:5px solid #DC2626;color:#7F1D1D;border-radius:12px;padding:11px 13px;margin:0 0 14px 0;text-align:left;font-size:13px;line-height:1.5;animation:cuNudge .4s;}" +
    ".cu-alert i{color:#DC2626;font-size:16px;margin-top:1px;}" +
    ".cu-alert a{color:#B91C1C;font-weight:800;text-decoration:underline;margin-left:4px;}" +
    ".cu-alert.warn{background:#FFFBEB;border-color:#FCD34D;border-left-color:#D97706;color:#78350F;}.cu-alert.warn i{color:#D97706;}" +
    ".cu-invalid{border-color:#DC2626 !important;box-shadow:0 0 0 3px rgba(220,38,38,.12) !important;}" +
    /* busy buttons + spinner */
    ".cu-spin{display:inline-block;width:16px;height:16px;border:2.5px solid currentColor;border-right-color:transparent;border-radius:50%;animation:cuSpin .7s linear infinite;vertical-align:-3px;margin-right:8px;}" +
    "@keyframes cuSpin{to{transform:rotate(360deg);}}" +
    ".cu-busy{opacity:.85;cursor:progress !important;}" +
    /* skeletons */
    ".cu-sk{position:relative;overflow:hidden;background:#EDE7DC;border-radius:10px;}" +
    ".cu-sk::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);animation:cuShimmer 1.3s infinite;}" +
    "@keyframes cuShimmer{to{transform:translateX(100%);}}" +
    ".cu-sk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:0 20px;}" +
    ".cu-sk-card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.05);}" +
    ".cu-sk-img{height:150px;border-radius:0;}" +
    ".cu-sk-line{height:12px;margin:12px 12px 0 12px;}" +
    ".cu-sk-line.s{width:55%;margin-bottom:14px;}" +
    ".cu-sk-row{display:flex;gap:12px;align-items:center;background:#fff;border-radius:14px;padding:12px;margin-bottom:10px;}" +
    ".cu-sk-av{width:46px;height:46px;border-radius:50%;flex-shrink:0;}" +
    ".cu-sk-col{flex:1;}.cu-sk-col .cu-sk{height:11px;margin-bottom:8px;}.cu-sk-col .cu-sk:last-child{width:60%;margin-bottom:0;}" +
    /* top progress bar for page loads */
    "#cu-progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:40000;background:linear-gradient(90deg,#E8553D,#F59E0B);box-shadow:0 0 8px rgba(232,85,61,.6);transition:width .4s ease,opacity .3s ease;pointer-events:none;}";

  var st = document.createElement("style");
  st.id = "campally-ui-css";
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---------- Toasts ----------
  var TITLES = { success: "Success", error: "Something went wrong", info: "Heads up", warning: "Please note" };
  var ICONS = { success: "fa-check", error: "fa-xmark", info: "fa-info", warning: "fa-exclamation" };

  function toast(message, type, duration) {
    type = ICONS[type] ? type : "info";
    if (!duration) duration = type === "error" ? 5600 : 3400;
    var box = document.getElementById("campally-toast-container");
    if (!box) {
      box = el("div", "cu-toasts");
      box.id = "campally-toast-container";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    while (box.children.length >= 3) box.removeChild(box.firstChild);

    var t = el("div", "cu-toast " + type);
    t.setAttribute("role", type === "error" ? "alert" : "status");
    t.innerHTML = '<div class="cu-ico"><i class="fa-solid ' + ICONS[type] + '"></i></div>' +
      '<div class="cu-txt"><div class="cu-title">' + TITLES[type] + '</div><div class="cu-msg">' + esc(message) + "</div></div>" +
      '<div class="cu-bar" style="animation-duration:' + duration + 'ms"></div>';
    box.appendChild(t);
    if (type === "error" && navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }

    var gone = false;
    function close() { if (gone) return; gone = true; t.classList.add("out"); setTimeout(function () { t.remove(); }, 260); }
    t.addEventListener("click", close);
    setTimeout(close, duration);
    return t;
  }

  // ---------- Friendly error text ----------
  function friendly(err) {
    var m = String((err && err.message) || err || "").toLowerCase();
    if (!m) return "Something went wrong. Please try again.";
    if (m.indexOf("invalid login") > -1) return "That email or password is not right. Please check and try again.";
    if (m.indexOf("email not confirmed") > -1) return "Please confirm your email first. Check your inbox (and spam folder).";
    if (m.indexOf("already registered") > -1 || m.indexOf("already been registered") > -1) return "An account with this email already exists. Try logging in instead.";
    if (m.indexOf("failed to fetch") > -1 || m.indexOf("networkerror") > -1 || m.indexOf("network request failed") > -1 || m.indexOf("load failed") > -1) return "No internet connection. Check your data or Wi-Fi and try again.";
    if (m.indexOf("rate limit") > -1 || m.indexOf("too many") > -1 || m.indexOf("security purposes") > -1) return "Too many attempts. Please wait a minute and try again.";
    if (m.indexOf("password") > -1 && (m.indexOf("at least") > -1 || m.indexOf("weak") > -1 || m.indexOf("short") > -1)) return "Your password is too short or too easy to guess. Use at least 6 characters.";
    if (m.indexOf("jwt") > -1 || m.indexOf("expired") > -1) return "Your session expired. Please log in again.";
    return String((err && err.message) || err);
  }

  // ---------- Form error banner ----------
  function clearFormError(form) {
    if (!form) return;
    var old = form.querySelector(".cu-alert");
    if (old) old.remove();
    Array.prototype.forEach.call(form.querySelectorAll(".cu-invalid"), function (i) { i.classList.remove("cu-invalid"); });
  }
  function formError(form, message, opts) {
    opts = opts || {};
    if (!form) { toast(message, "error"); return; }
    clearFormError(form);
    var a = el("div", "cu-alert" + (opts.warn ? " warn" : ""));
    a.setAttribute("role", "alert");
    a.innerHTML = '<i class="fa-solid ' + (opts.warn ? "fa-triangle-exclamation" : "fa-circle-exclamation") + '"></i><div>' + esc(message) +
      (opts.href ? ' <a href="' + esc(opts.href) + '">' + esc(opts.label || "Learn more") + "</a>" : "") + "</div>";
    form.insertBefore(a, form.firstChild);
    (opts.fields || []).forEach(function (f) { if (f) f.classList.add("cu-invalid"); });
    if (opts.fields && opts.fields[0] && opts.fields[0].focus) { try { opts.fields[0].focus({ preventScroll: true }); } catch (e) {} }
    a.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
    var clear = function () { clearFormError(form); form.removeEventListener("input", clear); };
    form.addEventListener("input", clear);
  }

  // ---------- Success / goodbye screen ----------
  function successThen(title, sub, then, opts) {
    opts = opts || {};
    var tone = opts.tone || "success";
    var ms = opts.ms || 1400;
    var old = document.getElementById("cu-screen");
    if (old) old.remove();
    var s = el("div", "cu-screen");
    s.id = "cu-screen";
    s.setAttribute("role", "status");
    var inner = tone === "success"
      ? '<svg viewBox="0 0 52 52"><path d="M14 27 l8 8 l16 -17"/></svg>'
      : (opts.emoji || "\uD83D\uDC4B");
    s.innerHTML = '<div class="cu-circle ' + tone + '">' + inner + "</div><h2>" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + '<div class="cu-dots"><i></i><i></i><i></i></div>';
    document.body.appendChild(s);
    setTimeout(function () { if (typeof then === "function") then(); }, ms);
  }

  // ---------- Busy buttons ----------
  function busy(btn, label) {
    if (!btn) return function () {};
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add("cu-busy");
    btn.innerHTML = '<span class="cu-spin"></span>' + esc(label || "Please wait...");
    return function () { btn.disabled = false; btn.classList.remove("cu-busy"); btn.innerHTML = original; };
  }

  // ---------- Skeleton loaders ----------
  function skeletonGrid(container, n, bare) {
    if (!container) return;
    var h = bare ? "" : '<div class="cu-sk-grid">';
    for (var i = 0; i < (n || 6); i++) h += '<div class="cu-sk-card"><div class="cu-sk cu-sk-img"></div><div class="cu-sk cu-sk-line"></div><div class="cu-sk cu-sk-line s"></div></div>';
    container.innerHTML = h + (bare ? "" : "</div>");
  }
  function skeletonList(container, n) {
    if (!container) return;
    var h = "";
    for (var i = 0; i < (n || 4); i++) h += '<div class="cu-sk-row"><div class="cu-sk cu-sk-av"></div><div class="cu-sk-col"><div class="cu-sk"></div><div class="cu-sk"></div></div></div>';
    container.innerHTML = h;
  }

  // ---------- Top progress bar (page loads and page changes) ----------
  var bar = null, timer = null;
  function progressStart() {
    if (!bar) { bar = el("div"); bar.id = "cu-progress"; (document.body || document.documentElement).appendChild(bar); }
    clearInterval(timer);
    bar.style.opacity = "1";
    bar.style.width = "12%";
    var w = 12;
    timer = setInterval(function () { w += (92 - w) * 0.12; bar.style.width = w + "%"; }, 280);
  }
  function progressDone() {
    if (!bar) return;
    clearInterval(timer);
    bar.style.width = "100%";
    setTimeout(function () { if (bar) { bar.style.opacity = "0"; setTimeout(function () { if (bar) bar.style.width = "0"; }, 300); } }, 220);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:|https?:\/\/(?!(www\.)?campally))/i.test(href)) return;
    progressStart();
  }, true);
  window.addEventListener("pageshow", progressDone);
  window.addEventListener("load", progressDone);
  if (document.readyState !== "complete") { (function w() { if (document.body) progressStart(); else setTimeout(w, 20); })(); }

  window.UI = {
    __ready: true, toast: toast, friendly: friendly, formError: formError, clearFormError: clearFormError,
    successThen: successThen, busy: busy, skeletonGrid: skeletonGrid, skeletonList: skeletonList,
    progress: { start: progressStart, done: progressDone }
  };
  window.showToast = function (message, type, duration) { return toast(message, type, duration); };
})();

// In-App Confirmation Modal
window.showConfirm = function(title, message, onConfirm) {
  const existing = document.getElementById("campally-confirm-modal");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "campally-confirm-modal";
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-content" style="max-width:340px; text-align:center;">
      <h3 style="font-size:18px; margin-bottom:8px; color:#2B2B2B;">${title}</h3>
      <p style="font-size:14px; color:#666; margin-bottom:20px; line-height:1.4;">${message}</p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="confirm-cancel-btn" style="flex:1; padding:10px; border:1px solid #E5E0D8; background:#FAF9F6; border-radius:10px; font-weight:600; cursor:pointer; color:#555;">Cancel</button>
        <button id="confirm-ok-btn" style="flex:1; padding:10px; border:none; background:#E8553D; color:white; border-radius:10px; font-weight:600; cursor:pointer;">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector("#confirm-cancel-btn").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#confirm-ok-btn").addEventListener("click", () => {
    backdrop.remove();
    if (typeof onConfirm === "function") onConfirm();
  });
};

function loadNav(activePage) {
  // Ensure FontAwesome stylesheet is included if not present
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    document.head.appendChild(fa);
  }

  const pages = [
    { id: "home", href: "home.html", icon: "fa-house", label: "Home" },
    { id: "services", href: "services.html", icon: "fa-calendar-check", label: "Services" },
    { id: "post", href: "post-listing.html", icon: "fa-square-plus", label: "Post" },
    { id: "listings", href: "my-listings.html", icon: "fa-bag-shopping", label: "Listings" },
    { id: "profile", href: "profile.html", label: "Profile", icon: "fa-user", isProfile: true }
  ];
  
  // Remove existing bottom nav if any
  const existingNav = document.querySelector(".bottom-nav");
  if (existingNav) existingNav.remove();

  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  
  pages.forEach((page) => {
    const link = document.createElement("a");
    link.href = page.href;
    link.className = "nav-item" + (page.id === activePage ? " active" : "");
    if (page.isProfile) link.id = "profile-nav-link";
    link.innerHTML = `<i class="fa-solid ${page.icon}"></i><span>${page.label}</span>`;
    nav.appendChild(link);
  });
  
  document.body.appendChild(nav);
  
  if (window.supabase) {
    const supabase = window.supabase.createClient(
      "https://mhshjusbtrkkkktymiyg.supabase.co",
      "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4"
    );
    const isVisitor = sessionStorage.getItem("campally_visitor_mode") === "true";
    const link = document.getElementById("profile-nav-link");
    if (isVisitor) {
      if (link) link.href = "login.html";
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (link) {
        if (user) {
          link.href = "profile.html";   // the Profile hub (your public store is the "My store" button inside it)
        } else {
          link.href = "login.html";
        }
      }
    }).catch(() => {
      if (link) link.href = "login.html";
    });
  }
}


// ---------------------------------------------------------------------
// Site-wide UI polish: offline strip, press feedback, image fade-in and lazy loading,
// top bar shadow on scroll, back-to-top button, keyboard focus outline.
// ---------------------------------------------------------------------
(function () {
  if (window.__cuUx) return;
  window.__cuUx = true;

  var css =
    "*{-webkit-tap-highlight-color:transparent;}" +
    "button,.btn-primary,.ph-btn,.ph-q,.category-chip,.listing-card,.vr-card,.vr-btn,.sp-tab,.small-btn{transition:transform .12s ease,box-shadow .2s ease,background-color .2s ease;}" +
    "button:not(:disabled):active,.btn-primary:active,.ph-btn:active,.ph-q:active,.category-chip:active,.vr-btn:active,.sp-tab:active,.small-btn:active{transform:scale(.96);}" +
    ".listing-card:active,.vr-card:active{transform:scale(.985);}" +
    "a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(232,85,61,.45);outline-offset:2px;}" +
    "img.cu-fade{opacity:0;transition:opacity .35s ease;}" +
    "img.cu-fade.cu-loaded{opacity:1;}" +
    ".top-bar{transition:box-shadow .25s ease;}" +
    ".top-bar.cu-scrolled{box-shadow:0 6px 18px rgba(30,27,75,.10);}" +
    "#cu-offline-bar{position:fixed;top:0;left:0;right:0;z-index:100001;text-align:center;font-size:12.5px;font-weight:700;padding:7px 12px;color:#fff;background:#1E1B4B;transform:translateY(-100%);transition:transform .25s ease;}" +
    "#cu-offline-bar.show{transform:none;}" +
    "#cu-offline-bar.ok{background:#059669;}" +
    "#cu-top{position:fixed;right:16px;bottom:92px;z-index:9990;width:44px;height:44px;border-radius:50%;border:none;background:#1E1B4B;color:#fff;font-size:18px;box-shadow:0 8px 20px rgba(30,27,75,.35);cursor:pointer;opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .25s ease,transform .25s ease;}" +
    "#cu-top.show{opacity:1;pointer-events:auto;transform:none;}" +
    "@media (prefers-reduced-motion:reduce){*{transition:none !important;}img.cu-fade{opacity:1;}}";
  var st = document.createElement("style");
  st.id = "cu-ux-style";
  st.textContent = css;
  document.head.appendChild(st);

  // ----- offline strip (when the connection drops while the app is open) -----
  var bar = null, hideTimer = null;
  function barEl() {
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "cu-offline-bar";
      bar.setAttribute("role", "status");
      document.body.appendChild(bar);
    }
    return bar;
  }
  function goOffline() {
    if (document.documentElement.classList.contains("ps-offline")) return;   // the full-page card is already showing
    clearTimeout(hideTimer);
    var b = barEl();
    b.classList.remove("ok");
    b.textContent = "You are offline. Some things may not load.";
    requestAnimationFrame(function () { b.classList.add("show"); });
  }
  function goOnline() {
    if (!bar || !bar.classList.contains("show")) return;
    bar.classList.add("ok");
    bar.textContent = "Back online";
    hideTimer = setTimeout(function () { bar.classList.remove("show"); }, 1800);
  }
  window.addEventListener("offline", goOffline);
  window.addEventListener("online", goOnline);
  if (navigator.onLine === false) setTimeout(goOffline, 600);

  // ----- images: load only when needed, and fade in -----
  function prepImg(img) {
    if (!img || img.__cuDone) return;
    img.__cuDone = true;
    if (img.closest && img.closest("header, .top-bar, #cu-top")) return;   // the logo should not fade
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (img.complete && img.naturalWidth > 0) return;                       // already there
    img.classList.add("cu-fade");
    var done = function () { img.classList.add("cu-loaded"); };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    setTimeout(done, 4000);                                                  // never leave an image invisible
  }
  function scanImages(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === "IMG") prepImg(root);
    root.querySelectorAll("img").forEach(prepImg);
  }
  scanImages(document);
  try {
    new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scanImages(n); }); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // ----- top bar shadow + back to top -----
  var topBtn = null, ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var hdr = document.querySelector(".top-bar");
      if (hdr) hdr.classList.toggle("cu-scrolled", y > 4);
      if (y > 900) {
        if (!topBtn) {
          topBtn = document.createElement("button");
          topBtn.id = "cu-top";
          topBtn.type = "button";
          topBtn.setAttribute("aria-label", "Back to top");
          topBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
          topBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
          document.body.appendChild(topBtn);
        }
        requestAnimationFrame(function () { topBtn.classList.add("show"); });
      } else if (topBtn) {
        topBtn.classList.remove("show");
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();
