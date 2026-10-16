/**
 * Campally - Resilient Supabase Client Initializer & Auth Guard
 * Prevents "Invalid Refresh Token" lockups, hanging getUser() queries,
 * and ensures public queries (listings, categories, profiles) always work.
 */
(function() {
  "use strict";

  // Purge any corrupted or stale session tokens from browser storage
  // Purge corrupt session tokens ONLY when specifically confirmed invalid by Auth server
  function purgeCorruptSession() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("sb-") && k.endsWith("-auth-token"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}
  }
  window.purgeCorruptSession = purgeCorruptSession;

  // Unhandled rejection shield: Only catch explicit Refresh Token Not Found / invalid_grant
  window.addEventListener("unhandledrejection", function(event) {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.error_description || String(reason))) || "";
(function() {
  "use strict";

  const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000; // 1 day
  const LAST_ACTIVE_KEY = "campally_last_active";

  function purgeCorruptSession() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("sb-") && k.endsWith("-auth-token"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}
  }
  window.purgeCorruptSession = purgeCorruptSession;

  window.addEventListener("unhandledrejection", function(event) {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.error_description || String(reason))) || "";
    if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found")) {
      event.preventDefault();
      purgeCorruptSession();
      console.warn("[Campally Auth] Cleaned expired refresh token from storage");
    }
  });

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed || (!parsed.access_token && !parsed.refresh_token)) {
              localStorage.removeItem(k);
            }
          } catch (_) {
            localStorage.removeItem(k);
          }
        }
      }
    }
  } catch (_) {}

  function wrapSupabase() {
    if (!window.supabase || window.supabase.__isWrapped) return;

    const origCreateClient = window.supabase.createClient;
    window.supabase.createClient = function(url, anonKey, options) {
      const safeOptions = Object.assign({
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }, options);

      const client = origCreateClient.call(window.supabase, url, anonKey, safeOptions);

      if (client.auth && typeof client.auth.getUser === "function") {
        const origGetUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = async function(jwt) {
          // 1. Enforce 1-day inactivity logout before trusting any session
          try {
            const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0);
            if (lastActive && (Date.now() - lastActive) > INACTIVITY_LIMIT_MS) {
              await client.auth.signOut({ scope: "local" });
              purgeCorruptSession();
              return { data: { user: null }, error: null };
            }
          } catch (_) {}

          // 2. Ask Supabase directly — no artificial timeout race,
          // so a slow network is never mistaken for "not logged in"
          try {
            const result = await origGetUser(jwt);
            if (result && result.error) {
              const errMsg = result.error.message || "";
              if (errMsg.includes("Refresh Token") || errMsg.includes("invalid_grant")) {
                purgeCorruptSession();
                return { data: { user: null }, error: null };
              }
            }
            if (result && result.data && result.data.user) {
              localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
            }
            return result;
          } catch (err) {
            const msg = err?.message || "";
            if (msg.includes("Refresh Token") || msg.includes("invalid_grant")) {
              purgeCorruptSession();
            }
            return { data: { user: null }, error: null };
          }
        };
      }

      if (client.auth && typeof client.auth.signOut === "function") {
        const origSignOut = client.auth.signOut.bind(client.auth);
        client.auth.signOut = async function(opts) {
          try {
            await origSignOut(opts || { scope: "local" });
          } catch (_) {}
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
    const timer = setInterval(() => {
      if (window.supabase) {
        clearInterval(timer);
        wrapSupabase();
      }
    }, 10);
    setTimeout(() => clearInterval(timer), 5000);
  }
})();
