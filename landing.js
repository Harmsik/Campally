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
    alert("Failed to send feedback: " + error.message);
  } else {
    alert("Thank you for your feedback!");
    feedbackForm.reset();
  }
});