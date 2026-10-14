const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("back-link").addEventListener("click", (e) => {
  e.preventDefault();
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "home.html";
  }
});

document.getElementById("logout-item").addEventListener("click", async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  if (window.showToast) window.showToast("Signed out successfully", "info");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 400);
});

document.getElementById("delete-item").addEventListener("click", async (e) => {
  e.preventDefault();

  const handleAccountDeletion = () => {
    if (window.showToast) {
      window.showToast("To delete your account, please message support at mbuharmless@gmail.com for verification.", "info", 5000);
    } else {
      alert("To delete your account, please contact support directly at mbuharmless@gmail.com.");
    }
  };

  if (window.showConfirm) {
    window.showConfirm(
      "Delete Account?",
      "Are you sure you want to delete your account? This action cannot be undone.",
      handleAccountDeletion
    );
  } else {
    const confirmed = confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (confirmed) handleAccountDeletion();
  }
});
