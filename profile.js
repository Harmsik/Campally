const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: "image/jpeg" }));
      }, "image/jpeg", quality);
    };
  });
}

const profileForm = document.getElementById("profile-form");
const logoutLink = document.getElementById("logout-link");
const avatarInput = document.getElementById("avatar-input");
const avatarPreview = document.getElementById("avatar-preview");
const campusSelect = document.getElementById("campus");

let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("profile-nav-link");
  if (link) link.href = "profile.html";
});

async function loadCampuses() {
  const { data, error } = await supabase
    .from("campuses")
    .select("*")
    .eq("active", true);

  if (error) return;

  data.forEach((campus) => {
    const option = document.createElement("option");
    option.value = campus.id;
    option.textContent = campus.name;
    campusSelect.appendChild(option);
  });
}

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
    if (data.campus_id) campusSelect.value = data.campus_id;
    if (data.avatar_url) {
      avatarPreview.src = data.avatar_url;
    }
  }
}

async function init() {
  await loadCampuses();
  await loadProfile();
}

init();

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
  const campusId = document.getElementById("campus").value;
  const hall = document.getElementById("hall").value;
  const whatsapp = document.getElementById("whatsapp").value;

  let avatarUrl = avatarPreview.src.startsWith("blob:") ? null : avatarPreview.src;

  let file = avatarInput.files[0];

  if (file) {
    file = await compressImage(file);

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
      campus_id: campusId,
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
