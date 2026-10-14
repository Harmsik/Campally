const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("login-submit-btn");

  const email = (emailInput ? emailInput.value : "").trim();
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    if (window.showToast) window.showToast("Please enter both email and password.", "error");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.warn("Sign in error:", error.message);
      if (window.showToast) {
        window.showToast("Login failed: " + error.message, "error");
      } else {
        alert("Login failed: " + error.message);
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Log In";
      }
      return;
    }

    // Success! Clear any visitor mode flags
    sessionStorage.removeItem("campally_visitor_mode");
    localStorage.setItem("campally_user_email", email);

    const isFounder = email.toLowerCase() === "mbuharmless@gmail.com";
    if (isFounder) {
      sessionStorage.setItem("campally_founder_verified", "true");
      if (window.showToast) window.showToast("Welcome back, Founder! 👑", "success");
    } else {
      if (window.showToast) window.showToast("Logged in successfully! Redirecting...", "success");
    }

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get("redirect");

    // If explicit redirect parameter was passed, navigate there immediately
    if (redirectUrl) {
      setTimeout(() => {
        window.location.replace(redirectUrl);
      }, 400);
      return;
    }

    // Founder goes straight to marketplace home
    if (isFounder) {
      setTimeout(() => {
        window.location.replace("home.html");
      }, 400);
      return;
    }

    // Check if profile is complete with a strict 1.5s timeout (never blocks navigation)
    let destination = "home.html";
    try {
      const profilePromise = supabase
        .from("profiles")
        .select("full_name, whatsapp_number")
        .eq("id", data.user.id)
        .maybeSingle();

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 1500));
      const res = await Promise.race([profilePromise, timeoutPromise]);

      if (res && !res.timeout && res.data) {
        const isComplete = Boolean(res.data.full_name && res.data.whatsapp_number);
        destination = isComplete ? "home.html" : "profile.html";
      }
    } catch (_) {
      destination = "home.html";
    }

    setTimeout(() => {
      window.location.replace(destination);
    }, 400);

  } catch (err) {
    console.error("Login fatal error:", err);
    if (window.showToast) window.showToast("Error: " + (err.message || "Failed to log in"), "error");
    else alert("Error: " + (err.message || "Failed to log in"));

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Log In";
    }
  }
});

// Fast, resilient Visitor Mode trigger
const browseVisitorLink = document.getElementById("browse-visitor-link");
if (browseVisitorLink) {
  browseVisitorLink.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");

    // Clear any stale local auth tokens immediately so visitor mode is fast & clean
    try {
      if (typeof window.purgeCorruptSession === "function") {
        window.purgeCorruptSession();
      }
      if (supabase && supabase.auth && typeof supabase.auth.signOut === "function") {
        supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
    } catch (_) {}

    window.location.replace("home.html?visitor=true");
  });
}