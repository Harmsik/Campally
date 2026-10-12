const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("back-link").addEventListener("click", (e) => {
  e.preventDefault();
  window.history.back();
});

document.getElementById("logout-item").addEventListener("click", async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

document.getElementById("delete-item").addEventListener("click", async (e) => {
  e.preventDefault();

  const confirmed = confirm(
    "Are you sure you want to delete your account? This cannot be undone, and your listings will remain but show no seller info."
  );

  if (!confirmed) return;

  alert(
    "To delete your account, please contact support directly for now — this keeps your data safe while we finish building a fully automatic option."
  );
});
