const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const updateForm = document.getElementById("update-form");

updateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById("new-password").value;

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    alert("Failed: " + error.message);
  } else {
    alert("Password updated! Please log in.");
    window.location.href = "login.html";
  }
});
