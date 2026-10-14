const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const feedbackForm = document.getElementById("feedback-form");

feedbackForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("feedback-name").value;
  const message = document.getElementById("feedback-message").value;
  
  const { error } = await supabase.from("site_feedback").insert({
    name: name || null,
    message: message
  });
  
  if (error) {
    if (window.showToast) window.showToast("Failed to send feedback: " + error.message, "error");
    else alert("Failed to send feedback: " + error.message);
  } else {
    if (window.showToast) window.showToast("Thank you for your feedback!", "success");
    else alert("Thank you for your feedback!");
    feedbackForm.reset();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.update();
  }).catch(() => {});
}

const signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
  signupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "signup.html";
  });
}

const browseVisitorBtn = document.getElementById("browse-visitor-btn");
if (browseVisitorBtn) {
  browseVisitorBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    window.location.href = "home.html?visitor=true";
  });
}
