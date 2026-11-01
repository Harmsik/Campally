const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const updateForm = document.getElementById("update-form");

updateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pwInput = document.getElementById("new-password");
  const newPassword = pwInput.value;
  const btn = updateForm.querySelector('button[type="submit"]');

  if (newPassword.length < 6) {
    UI.formError(updateForm, "Your new password needs at least 6 characters.", { fields: [pwInput] });
    return;
  }

  UI.clearFormError(updateForm);
  const restore = UI.busy(btn, "Updating password...");
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      UI.formError(updateForm, UI.friendly(error));
      restore();
      return;
    }
    UI.successThen("Password updated", "Please log in with your new password.", () => {
      window.location.href = "login.html";
    });
  } catch (err) {
    UI.formError(updateForm, UI.friendly(err));
    restore();
  }
});
