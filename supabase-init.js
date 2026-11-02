/**
 * Campally - Resilient Supabase Client Initializer & Auth Guard
 *  - Prevents "Invalid Refresh Token" lockups.
 *  - Logs a student out after 1 day of inactivity (checked the moment any page opens).
 * Load this file AFTER the Supabase library and BEFORE any page script.
 */
(function () {
  "use strict";

  var INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000; // 1 day
  var LAST_ACTIVE_KEY = "campally_last_active";
  var AUTO_LOGOUT_FLAG = "campally_auto_logged_out";

  function tokenKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("sb-") === 0 && k.slice(-11) === "-auth-token") keys.push(k);
      }
    } catch (_) {}
    return keys;
  }

  // Remove the saved login from this device
  function purgeCorruptSession() {
    tokenKeys().forEach(function (k) { try { localStorage.removeItem(k); } catch (_) {} });
  }
  window.purgeCorruptSession = purgeCorruptSession;

  // Only catch explicit "refresh token" problems
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var msg = (reason && (reason.message || reason.error_description || String(reason))) || "";
    if (msg.indexOf("Invalid Refresh Token") > -1 || msg.indexOf("Refresh Token Not Found") > -1) {
      event.preventDefault();
      purgeCorruptSession();
      console.warn("[Campally Auth] Cleaned expired refresh token from storage");
    }
  });

  // Remove empty or broken saved logins
  tokenKeys().forEach(function (k) {
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || (!parsed.access_token && !parsed.refresh_token)) localStorage.removeItem(k);
    } catch (_) {
      try { localStorage.removeItem(k); } catch (_) {}
    }
  });

  // ---------- 1-day inactivity logout ----------
  // Runs immediately, before any page script creates its Supabase client,
  // so EVERY page respects it (not only pages that call getUser).
  function touch() {
    try { if (tokenKeys().length) localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch (_) {}
  }
  try {
    if (tokenKeys().length) {
      var last = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0);
      if (last && Date.now() - last > INACTIVITY_LIMIT_MS) {
        purgeCorruptSession();
        localStorage.removeItem(LAST_ACTIVE_KEY);
        localStorage.setItem(AUTO_LOGOUT_FLAG, "1");   // login page shows a friendly note
        console.warn("[Campally Auth] Logged out after 1 day of inactivity");
      } else {
        touch();   // first visit after this feature (or active student): start the clock now
      }
    }
  } catch (_) {}

  // While the student is using the app, keep the clock fresh (at most once a minute)
  var lastTouch = 0;
  function activity() {
    var now = Date.now();
    if (now - lastTouch < 60000) return;
    lastTouch = now;
    touch();
  }
  ["click", "touchstart", "keydown", "scroll"].forEach(function (evt) {
    window.addEventListener(evt, activity, { passive: true });
  });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") activity(); });

  // ---------- wrap the Supabase client ----------
  function wrapSupabase() {
    if (!window.supabase || window.supabase.__isWrapped) return;

    var origCreateClient = window.supabase.createClient;
    window.supabase.createClient = function (url, anonKey, options) {
      var safeOptions = Object.assign({
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      }, options);

      var client = origCreateClient.call(window.supabase, url, anonKey, safeOptions);

      if (client.auth && typeof client.auth.onAuthStateChange === "function") {
        // A fresh login starts a fresh inactivity clock
        client.auth.onAuthStateChange(function (event) {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); localStorage.removeItem(AUTO_LOGOUT_FLAG); } catch (_) {}
          }
        });
      }

      if (client.auth && typeof client.auth.getUser === "function") {
        var origGetUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = async function (jwt) {
          // No artificial timeout: a slow network is never mistaken for "not logged in"
          try {
            var result = await origGetUser(jwt);
            if (result && result.error) {
              var errMsg = result.error.message || "";
              if (errMsg.indexOf("Refresh Token") > -1 || errMsg.indexOf("invalid_grant") > -1) {
                purgeCorruptSession();
                return { data: { user: null }, error: null };
              }
            }
            return result;
          } catch (err) {
            var msg = (err && err.message) || "";
            if (msg.indexOf("Refresh Token") > -1 || msg.indexOf("invalid_grant") > -1) purgeCorruptSession();
            return { data: { user: null }, error: null };
          }
        };
      }

      if (client.auth && typeof client.auth.signOut === "function") {
        var origSignOut = client.auth.signOut.bind(client.auth);
        client.auth.signOut = async function (opts) {
          try { await origSignOut(opts || { scope: "local" }); } catch (_) {}
          try { localStorage.removeItem(LAST_ACTIVE_KEY); } catch (_) {}
          return { error: null };
        };
      }

      return client;
    };

    window.supabase.__isWrapped = true;
  }

  if (window.supabase) {
    wrapSupabase();
  } else {
    var timer = setInterval(function () {
      if (window.supabase) { clearInterval(timer); wrapSupabase(); }
    }, 10);
    setTimeout(function () { clearInterval(timer); }, 5000);
  }
})();
