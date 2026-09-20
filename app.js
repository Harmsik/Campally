const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signupForm = document.getElementById("signup-form");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const fullName = document.getElementById("full-name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: { full_name: fullName }
    }
  });
  
  if (error) {
  alert("Signup failed: " + error.message);
} else {
  window.location.href = "profile.html";
}
});