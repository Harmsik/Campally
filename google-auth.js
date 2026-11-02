/**
 * Campally - "Continue with Google" button (login and signup pages)
 * Sends the student to Google, then Supabase brings them back to auth-callback.html.
 * The Google client ID and secret are set in the Supabase dashboard, never in this file.
 */
(function () {
  "use strict";
  var btn = document.getElementById("google-btn");
  if (!btn || typeof supabase === "undefined") return;

  var css =
    ".google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#fff;color:#1F2937;border:1.5px solid #E5E0D8;border-radius:14px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(30,27,75,.06);transition:transform .12s ease,box-shadow .12s ease;}" +
    ".google-btn:active{transform:scale(.98);}.google-btn:disabled{opacity:.8;cursor:progress;}" +
    ".or-divider{display:flex;align-items:center;gap:12px;margin:16px 0 6px 0;color:#9CA3AF;font-size:12px;font-weight:600;}" +
    ".or-divider::before,.or-divider::after{content:'';flex:1;height:1px;background:#E5E0D8;}" +
    ".google-note{font-size:11.5px;color:#6B7280;text-align:center;margin:8px 0 0 0;line-height:1.5;}" +
    ".google-note a{color:#E8553D;font-weight:700;text-decoration:none;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function safeRedirect(r) {
    if (!r || typeof r !== "string") return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(r) || r.indexOf("//") === 0) return "";
    return /^[a-z0-9_\-./?=&%#]+$/i.test(r) ? r : "";
  }

  // Remember where the student wanted to go, and any ambassador link
  function rememberIntent() {
    try {
      var q = new URLSearchParams(location.search);
      var red = safeRedirect(q.get("redirect"));
      if (red) sessionStorage.setItem("campally_oauth_redirect", red);
      var ref = q.get("ref");
      if (ref) localStorage.setItem("campally_ref_code", ref);
    } catch (e) {}
  }

  // ----- Preferred way: Google's own button (shows "Campally", never the Supabase address) -----
  function randomNonce() {
    var a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function sha256Hex(text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  function loadGsi() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
      var sc = document.createElement("script");
      sc.src = "https://accounts.google.com/gsi/client";
      sc.async = true;
      sc.onload = function () { resolve(); };
      sc.onerror = function () { reject(new Error("blocked")); };
      document.head.appendChild(sc);
      setTimeout(function () { reject(new Error("timeout")); }, 8000);
    });
  }
  async function startGsi(clientId) {
    await loadGsi();
    var raw = randomNonce();
    var hashed = await sha256Hex(raw);
    var holder = document.createElement("div");
    holder.id = "google-gsi";
    holder.style.cssText = "display:flex;justify-content:center;min-height:44px;";
    btn.insertAdjacentElement("afterend", holder);

    google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashed,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: async function (response) {
        rememberIntent();
        var spin = window.UI ? UI.busy(btn, "Signing you in...") : function () {};
        btn.style.display = "flex";
        holder.style.display = "none";
        try {
          var res = await supabase.auth.signInWithIdToken({ provider: "google", token: response.credential, nonce: raw });
          if (res.error) throw res.error;
          location.href = "auth-callback.html";
        } catch (err) {
          spin();
          btn.style.display = "none";
          holder.style.display = "flex";
          var m = /provider is not enabled|unsupported provider/i.test(err.message || "")
            ? "Google sign-in is not switched on yet. Please use your email for now."
            : (window.UI ? UI.friendly(err) : err.message);
          if (window.UI) UI.toast(m, "error", 6000); else alert(m);
        }
      }
    });
    google.accounts.id.renderButton(holder, { theme: "outline", size: "large", type: "standard", shape: "pill", text: "continue_with", logo_alignment: "center", width: Math.min(holder.parentNode.clientWidth || 320, 380) });
    btn.style.display = "none";   // Google's own button replaces ours
  }

  var clientId = (window.CAMPALLY_GOOGLE_CLIENT_ID || "").trim();
  if (/\.apps\.googleusercontent\.com$/.test(clientId) && window.crypto && crypto.subtle) {
    startGsi(clientId).catch(function () { /* Google's script was blocked: the normal button below still works */ });
  }

  // ----- Backup way: redirect through Supabase (shows the Supabase address on Google's page) -----
  btn.addEventListener("click", async function () {
    var restore = window.UI ? UI.busy(btn, "Opening Google...") : function () {};
    rememberIntent();

    try {
      var res = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: location.origin + "/auth-callback.html",
          queryParams: { prompt: "select_account" }
        }
      });
      if (res.error) throw res.error;
      // The browser now moves to Google. Nothing else to do here.
    } catch (err) {
      restore();
      var msg = /provider is not enabled|unsupported provider/i.test(err.message || "")
        ? "Google sign-in is not switched on yet. Please use your email for now."
        : (window.UI ? UI.friendly(err) : err.message);
      if (window.UI) UI.toast(msg, "error", 6000); else alert(msg);
    }
  });
})();
