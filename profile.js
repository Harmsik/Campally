const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const profileForm = document.getElementById("profile-form");
const logoutLink = document.getElementById("logout-link");
const avatarInput = document.getElementById("avatar-input");
const avatarPreview = document.getElementById("avatar-preview");

let currentUserId = null;
document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("profile-nav-link");
  if (link) link.href = "profile.html";
});

async function loadProfile() {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    window.location.href = "login.html";
    return;
  }
  
  currentUserId = userData.user.id;
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUserId)
    .single();
  
  if (data) {
    document.getElementById("full-name").value = data.full_name || "";
    document.getElementById("department").value = data.department || "";
    document.getElementById("hall").value = data.hall || "";
    document.getElementById("whatsapp").value = data.whatsapp_number || "";
    if (data.avatar_url) {
      avatarPreview.src = data.avatar_url;
    }
  }
}

loadProfile();

// Show a quick local preview the moment a photo is picked, before uploading
avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (file) {
    avatarPreview.src = URL.createObjectURL(file);
  }
});

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const fullName = document.getElementById("full-name").value;
  const department = document.getElementById("department").value;
  const hall = document.getElementById("hall").value;
  const whatsapp = document.getElementById("whatsapp").value;
  
  let avatarUrl = avatarPreview.src.startsWith("blob:") ? null : avatarPreview.src;
  
  const file = avatarInput.files[0];
  
  if (file) {
    const filePath = `${currentUserId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);
    
    if (uploadError) {
      alert("Photo upload failed: " + uploadError.message);
      return;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    
    avatarUrl = publicUrlData.publicUrl;
  }
  
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      department: department,
      hall: hall,
      whatsapp_number: whatsapp,
      avatar_url: avatarUrl
    })
    .eq("id", currentUserId);
  
  if (error) {
  alert("Failed to save: " + error.message);
} else {
  window.location.href = "seller.html?id=" + currentUserId;
}
});

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  window.location.href = "login.html";
});