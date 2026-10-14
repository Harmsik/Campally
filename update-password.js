const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const updateForm = document.getElementById("update-form");

updateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const submitBtn = document.getElementById("update-submit-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Updating...</span>`;
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      if (window.showToast) window.showToast("Failed: " + error.message, "error");
      else alert("Failed: " + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Update Password</span>`;
      }
    } else {
      if (window.showToast) window.showToast("Password updated successfully! Redirecting to login...", "success");
      else alert("Password updated! Please log in.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    }
  } catch (err) {
    if (window.showToast) window.showToast("Error: " + err.message, "error");
    else alert("Error: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Update Password</span>`;
    }
  }
});
