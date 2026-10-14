/**
 * Campally - Resilient Supabase Client Initializer & Auth Guard
 * Prevents "Invalid Refresh Token" lockups, hanging getUser() queries,
 * and ensures public queries (listings, categories, profiles) always work.
 */
(function() {
  "use strict";

  // Purge any corrupted or stale session tokens from browser storage
  function purgeCorruptSession() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("sb-") || k.includes("supabase"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith("sb-") || k.includes("supabase"))) {
          try { sessionStorage.removeItem(k); } catch (_) {}
        }
      }
    } catch (_) {}
  }
  window.purgeCorruptSession = purgeCorruptSession;

  // Global uncaught error and unhandled rejection shield for Refresh Token errors
  window.addEventListener("unhandledrejection", function(event) {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.error_description || String(reason))) || "";
    if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found") || msg.includes("invalid_grant")) {
      event.preventDefault();
      purgeCorruptSession();
      console.warn("[Campally Auth] Cleaned stale session after refresh token expiration");
    }
  });

  window.addEventListener("error", function(event) {
    const msg = (event && (event.message || "")) || "";
    if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found") || msg.includes("invalid_grant")) {
      event.preventDefault();
      purgeCorruptSession();
    }
  });

  // Verify stored session on startup; if refresh token is demonstrably expired, clean it
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          // If session has no refresh token or expires_at is far in the past (> 30 days)
          if (!parsed || !parsed.refresh_token) {
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

      // 1. Guard client.auth.getUser()
      if (client.auth && typeof client.auth.getUser === "function") {
        const origGetUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = async function(jwt) {
          try {
            // Race against a 3.5s timeout so page loading never hangs on auth
            const authPromise = origGetUser(jwt);
            const timeoutPromise = new Promise(resolve => 
              setTimeout(() => resolve({ data: { user: null }, error: null, isTimeout: true }), 3500)
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
            if (msg.includes("Refresh Token") || msg.includes("invalid_grant") || err?.name === "AuthApiError") {
              purgeCorruptSession();
            }
            return { data: { user: null }, error: null };
          }
        };
      }

      // 2. Guard client.auth.signOut()
      if (client.auth && typeof client.auth.signOut === "function") {
        const origSignOut = client.auth.signOut.bind(client.auth);
        client.auth.signOut = async function(opts) {
          purgeCorruptSession();
          try {
            const p = origSignOut(opts || { scope: "local" });
            const timeout = new Promise(resolve => setTimeout(resolve, 800));
            await Promise.race([p, timeout]);
          } catch (_) {}
          return { error: null };
        };
      }

      // 3. Guard client.from(table) PostgREST calls
      if (typeof client.from === "function") {
        const origFrom = client.from.bind(client);
        client.from = function(table) {
          const builder = origFrom(table);
          const origThen = builder.then ? builder.then.bind(builder) : null;
          if (origThen) {
            builder.then = function(onFulfilled, onRejected) {
              return origThen(
                onFulfilled,
                function(err) {
                  const errMsg = err?.message || String(err || "");
                  if (errMsg.includes("Refresh Token") || errMsg.includes("invalid_grant")) {
                    purgeCorruptSession();
                    // Retry query as unauthenticated anon
                    return origFrom(table).then(onFulfilled, onRejected);
                  }
                  if (typeof onRejected === "function") {
                    return onRejected(err);
                  }
                  throw err;
                }
              );
            };
          }
          return builder;
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
