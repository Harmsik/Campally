const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  if (error) {
  alert("Login failed: " + error.message);
  return;
}

const { data: profile } = await supabase
  .from("profiles")
  .select("full_name, whatsapp_number")
  .eq("id", data.user.id)
  .single();

const isComplete = profile && profile.full_name && profile.whatsapp_number;

if (isComplete) {
  window.location.href = "home.html";
} else {
  window.location.href = "profile.html";
}
});