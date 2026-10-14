const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const resetForm = document.getElementById("reset-form");

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const submitBtn = document.getElementById("reset-submit-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending link...</span>`;
  }

  const redirectUrl = window.location.origin ? `${window.location.origin}/update-password.html` : "https://campally.publicvm.com/update-password.html";

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      if (window.showToast) window.showToast("Failed: " + error.message, "error");
      else alert("Failed: " + error.message);
    } else {
      if (window.showToast) window.showToast("Check your email for the password reset link!", "success");
      else alert("Check your email for a reset link!");
    }
  } catch (err) {
    if (window.showToast) window.showToast("Error: " + err.message, "error");
    else alert("Error: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Send Reset Link</span>`;
    }
  }
});
