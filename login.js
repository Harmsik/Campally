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
      UI.formError(loginForm, "Please enter both your email and password.", { fields: [!email ? emailInput : passwordInput] });
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      UI.formError(loginForm, "That email address does not look right. Please check it.", { fields: [emailInput] });
      return;
    }

    // 2. Prevent accidental duplicate submissions & show loading state
    UI.clearFormError(loginForm);
    const restoreBtn = UI.busy(submitBtn, "Logging in...");

    try {
      // 3. Authenticate using Supabase signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.warn("Sign in error:", error.message);
        const wrongLogin = /invalid login/i.test(error.message || "");
        UI.formError(loginForm, UI.friendly(error), {
          fields: wrongLogin ? [emailInput, passwordInput] : [],
          href: wrongLogin ? "reset-password.html" : "",
          label: "Forgot password?"
        });
        restoreBtn();
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
      if (isFounder) sessionStorage.setItem("campally_founder_verified", "true");

      // One calm "success" screen, then move on
      const goTo = (url, who) => {
        const first = (who || "").trim().split(" ")[0];
        UI.successThen(
          isFounder ? "Welcome back, Founder" : "Login successful",
          first ? "Good to see you, " + first + "." : "Taking you to Campally...",
          () => window.location.replace(url)
        );
      };

      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect");

      // Priority 1: Explicit redirect query parameter
      if (redirectUrl) { goTo(redirectUrl, localStorage.getItem("campally_user_name")); return; }

      // Priority 2: Founder goes directly to marketplace
      if (isFounder) { goTo("home.html", "Founder"); return; }

      // Priority 3: Check if profile is complete (non-blocking fallback)
      let destination = "home.html";
      try {
        const profileRes = await supabase
          .from("profiles")
          .select("full_name, whatsapp_number")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileRes && profileRes.data) {
          if (profileRes.data.full_name) localStorage.setItem("campally_user_name", profileRes.data.full_name);
          const isComplete = Boolean(profileRes.data.full_name && profileRes.data.whatsapp_number);
          destination = isComplete ? "home.html" : "profile.html";
        }
      } catch (_) {
        destination = "home.html";
      }

      goTo(destination, localStorage.getItem("campally_user_name"));

    } catch (err) {
      console.error("Login fatal error:", err);
      UI.formError(loginForm, UI.friendly(err));
      restoreBtn();
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