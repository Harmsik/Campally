const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const submitBtn = document.getElementById("login-submit-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) {
      if (window.showToast) window.showToast("Login failed: " + error.message, "error");
      else alert("Login failed: " + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
      }
      return;
    }

    if (email.toLowerCase() === "mbuharmless@gmail.com") {
      sessionStorage.setItem("campally_founder_verified", "true");
      if (window.showToast) window.showToast("Welcome back, Founder! 👑", "success");
    } else {
      if (window.showToast) window.showToast("Logged in successfully!", "success");
    }
    sessionStorage.removeItem("campally_visitor_mode");

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get("redirect");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, whatsapp_number")
      .eq("id", data.user.id)
      .maybeSingle();

    const isComplete = profile && profile.full_name && profile.whatsapp_number;

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else if (isComplete) {
      window.location.href = "home.html";
    } else {
      window.location.href = "profile.html";
    }
  } catch (err) {
    if (window.showToast) window.showToast("Error: " + err.message, "error");
    else alert("Error: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  }
});

const browseVisitorLink = document.getElementById("browse-visitor-link");
if (browseVisitorLink) {
  browseVisitorLink.addEventListener("click", async (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    window.location.href = "home.html?visitor=true";
  });
}