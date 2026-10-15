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
    if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found")) {
      event.preventDefault();
      purgeCorruptSession();
      console.warn("[Campally Auth] Cleaned expired refresh token from storage");
    }
  });

  // Verify stored session on startup; only remove if malformed JSON or empty token
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

  // Wrap window.supabase.createClient when the Supabase library loads
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

      // Guard client.auth.getUser(): Fast resolution with getSession fallback
      if (client.auth && typeof client.auth.getUser === "function") {
        const origGetUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = async function(jwt) {
          try {
            // First check local session for instant response
            if (!jwt && typeof client.auth.getSession === "function") {
              const { data: sessionData } = await client.auth.getSession();
              if (sessionData && sessionData.session && sessionData.session.user) {
                return { data: { user: sessionData.session.user }, error: null };
              }
            }

            // Otherwise query auth server with a safe 3s timeout
            const authPromise = origGetUser(jwt);
            const timeoutPromise = new Promise(resolve => 
              setTimeout(() => resolve({ data: { user: null }, error: null, isTimeout: true }), 3000)
            );
            const result = await Promise.race([authPromise, timeoutPromise]);
            if (result && result.error) {
              const errMsg = result.error.message || "";
              if (errMsg.includes("Refresh Token") || errMsg.includes("invalid_grant")) {
                purgeCorruptSession();
                return { data: { user: null }, error: null };
              }
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

      // Guard client.auth.signOut()
      if (client.auth && typeof client.auth.signOut === "function") {
        const origSignOut = client.auth.signOut.bind(client.auth);
        client.auth.signOut = async function(opts) {
          try {
            const p = origSignOut(opts || { scope: "local" });
            const timeout = new Promise(resolve => setTimeout(resolve, 1000));
            await Promise.race([p, timeout]);
          } catch (_) {}
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
    // If supabase script hasn't finished loading yet, poll briefly
    const timer = setInterval(() => {
      if (window.supabase) {
        clearInterval(timer);
        wrapSupabase();
      }
    }, 10);
    setTimeout(() => clearInterval(timer), 5000);
  }
})();
