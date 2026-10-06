const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const resetForm = document.getElementById("reset-form");

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://harmsik.github.io/Campally/update-password.html"
  });

  if (error) {
    alert("Failed: " + error.message);
  } else {
    alert("Check your email for a reset link!");
  }
});
