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

  btn.addEventListener("click", async function () {
    var host = btn.closest(".auth-container") || document.body;
    var restore = window.UI ? UI.busy(btn, "Opening Google...") : function () {};

    // Remember where the student wanted to go, and any ambassador link
    try {
      var q = new URLSearchParams(location.search);
      var red = safeRedirect(q.get("redirect"));
      if (red) sessionStorage.setItem("campally_oauth_redirect", red);
      var ref = q.get("ref");
      if (ref) localStorage.setItem("campally_ref_code", ref);
    } catch (e) {}

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
