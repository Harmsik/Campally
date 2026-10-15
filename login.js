const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. If an active session already exists, forward to destination immediately
(async function checkExistingSession() {
  try {
    const isVisitor = sessionStorage.getItem("campally_visitor_mode") === "true";
    if (isVisitor) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData && sessionData.session && sessionData.session.user) {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect") || "home.html";
      window.location.replace(redirectUrl);
    }
  } catch (_) {}
})();

const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("login-submit-btn");

    const email = (emailInput ? emailInput.value : "").trim();
    const password = passwordInput ? passwordInput.value : "";

    // 1. Validate form fields before sending request
    if (!email || !password) {
      if (window.showToast) window.showToast("Please enter both email and password.", "error");
      else alert("Please enter both email and password.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      if (window.showToast) window.showToast("Please enter a valid email address.", "error");
      else alert("Please enter a valid email address.");
      return;
    }

    // 2. Prevent accidental duplicate submissions & show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
    }

    try {
      // 3. Authenticate using Supabase signInWithPassword
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

      // Verify that user and session exist in the response
      if (!data || !data.user) {
        throw new Error("No user returned from authentication server.");
      }

      // 4. Success! Clear visitor mode flags and cache user email
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

      // Priority 1: Explicit redirect query parameter
      if (redirectUrl) {
        setTimeout(() => {
          window.location.replace(redirectUrl);
        }, 300);
        return;
      }

      // Priority 2: Founder goes directly to marketplace
      if (isFounder) {
        setTimeout(() => {
          window.location.replace("home.html");
        }, 300);
        return;
      }

      // Priority 3: Check if profile is complete (non-blocking fallback)
      let destination = "home.html";
      try {
        const profileRes = await supabase
          .from("profiles")
          .select("full_name, whatsapp_number")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileRes && profileRes.data) {
          const isComplete = Boolean(profileRes.data.full_name && profileRes.data.whatsapp_number);
          destination = isComplete ? "home.html" : "profile.html";
        }
      } catch (_) {
        destination = "home.html";
      }

      setTimeout(() => {
        window.location.replace(destination);
      }, 300);

    } catch (err) {
      console.error("Login fatal error:", err);
      if (window.showToast) {
        window.showToast("Error: " + (err.message || "Failed to log in"), "error");
      } else {
        alert("Error: " + (err.message || "Failed to log in"));
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Log In";
      }
    }
  });
}

// 5. Fast, resilient Visitor Mode trigger
const browseVisitorLink = document.getElementById("browse-visitor-link");
if (browseVisitorLink) {
  browseVisitorLink.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");
    window.location.replace("home.html?visitor=true");
  });
}