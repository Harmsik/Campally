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
    img.onerror = () => resolve(file);
  });
}

const profileForm = document.getElementById("profile-form");
const logoutLink = document.getElementById("logout-link");
const avatarInput = document.getElementById("avatar-input");
const avatarPreview = document.getElementById("avatar-preview");
const campusSelect = document.getElementById("campus");
const campusSearchInput = document.getElementById("campus-search-input");
const campusSuggestionsDropdown = document.getElementById("campus-suggestions-dropdown");
let campusAutocomplete = null;

function updateHostelSuggestions(campusId) {
  const datalist = document.getElementById("hostel-suggestions");
  if (!datalist) return;
  datalist.innerHTML = "";
  const hostels = window.getHostelsForCampus ? window.getHostelsForCampus(campusId) : [];
  hostels.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h;
    datalist.appendChild(opt);
  });
}

const verificationForm = document.getElementById("verification-form");
const matricInput = document.getElementById("matric-number");
const schoolEmailInput = document.getElementById("school-email");
const idCardInput = document.getElementById("id-card-file");
const idCardPreview = document.getElementById("id-card-preview");
const verificationStatusBanner = document.getElementById("verification-status-banner");
const submitVerificationBtn = document.getElementById("submit-verification-btn");

let currentUserId = null;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("profile-nav-link");
  if (link) link.href = "profile.html";

  // Check for custom new user suggestion
  const urlParams = new URLSearchParams(window.location.search);
  const isNewUser = urlParams.get("welcome") === "1" || localStorage.getItem("campally_show_guide_suggestion") === "true";
  const suggestionContainer = document.getElementById("new-user-suggestion-container");

  if (isNewUser && suggestionContainer) {
    suggestionContainer.innerHTML = `
      <div id="new-user-guide-card" style="background: linear-gradient(135deg, #FFF7ED 0%, #FEF2F2 100%); border: 1.5px solid #FDBA74; border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 12px rgba(232, 85, 61, 0.08);">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #E8553D; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #9A3412;">Welcome to Campally! 🎉</div>
              <div style="font-size: 12px; color: #7C2D12; line-height: 1.4;">New student? Learn how to buy safely, sell your items, and make requests with coursemates.</div>
            </div>
          </div>
          <button id="dismiss-profile-guide-btn" style="background: transparent; border: none; font-size: 18px; color: #9A3412; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
        </div>
        <a href="how-to-use.html?from=profile" style="background: #E8553D; color: #FFFFFF; font-weight: 700; font-size: 12px; padding: 8px 14px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
          <i class="fa-solid fa-book-open"></i> See How to Use Campally
        </a>
      </div>
    `;

    const dismissBtn = document.getElementById("dismiss-profile-guide-btn");
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        const card = document.getElementById("new-user-guide-card");
        if (card) card.remove();
        localStorage.removeItem("campally_show_guide_suggestion");
      };
    }
  }

  const proBtn = document.getElementById("upgrade-pro-seller-btn");
  if (proBtn) {
    proBtn.addEventListener("click", () => {
      if (window.CampallyPay && window.CampallyPay.openProSellerModal) {
        window.CampallyPay.openProSellerModal(currentUser, () => {
          checkProSellerStatus();
        });
      }
    });
  }
});

async function loadCampuses() {
  if (!campusSelect) return;
  campusSelect.innerHTML = `<option value="">Select your campus</option>`;
  const list = window.NIGERIAN_CAMPUSES || [];
  list.forEach((campus) => {
    const option = document.createElement("option");
    option.value = campus.id;
    option.textContent = `🏫 ${campus.name}`;
    campusSelect.appendChild(option);
  });

  if (campusSearchInput && campusSuggestionsDropdown && window.setupCampusAutocomplete) {
    campusAutocomplete = window.setupCampusAutocomplete({
      input: campusSearchInput,
      dropdown: campusSuggestionsDropdown,
      onSelect: (campus) => {
        if (campus) {
          campusSelect.value = campus.id;
          updateHostelSuggestions(campus.id);
        } else {
          campusSelect.value = "";
          updateHostelSuggestions(null);
        }
      }
    });
  }
}

async function loadProfile() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData || !userData.user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = userData.user;
  currentUserId = currentUser.id;

  // Founder Account Recognition
  if (currentUser && currentUser.email && currentUser.email.toLowerCase() === "mbuharmless@gmail.com") {
    let founderBanner = document.getElementById("founder-admin-profile-banner");
    if (!founderBanner) {
      founderBanner = document.createElement("div");
      founderBanner.id = "founder-admin-profile-banner";
      founderBanner.style.cssText = "background:linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color:#FFFFFF; border-radius:16px; padding:18px 20px; margin-bottom:18px; border:1px solid #FCD34D; box-shadow:0 6px 18px rgba(30,27,75,0.25);";
      founderBanner.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:11px; font-weight:800; color:#FCD34D; text-transform:uppercase; letter-spacing:1px;"><i class="fa-solid fa-crown"></i> Founder & Super Admin</span>
          <span style="font-size:11px; background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:12px; color:#FCD34D;">Verified Owner</span>
        </div>
        <div style="font-size:16px; font-weight:800; margin-bottom:4px;">Welcome back, Founder! 🎓</div>
        <div style="font-size:12px; color:#E0E7FF; margin-bottom:12px; line-height:1.4;">
          Manage all university ambassadors, review student referrals in real-time, monitor Paystack payments, and process payouts.
        </div>
        <a href="ambassador.html?admin=true" style="background:#FCD34D; color:#1E1B4B; text-decoration:none; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:800; display:inline-flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-gauge-high"></i> Open Founder Admin Command Hub &rarr;
        </a>
      `;
      const form = document.getElementById("profile-form");
      if (form && form.parentNode) {
        form.parentNode.insertBefore(founderBanner, form);
      }
    }
  }

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
    if (data.campus_id && campusSelect) {
      campusSelect.value = data.campus_id;
      if (campusAutocomplete) campusAutocomplete.setCampus(data.campus_id);
      updateHostelSuggestions(data.campus_id);
    }
    if (data.avatar_url) {
      avatarPreview.src = data.avatar_url;
    }
  }

  // Load Student ID Verification status from Supabase Auth or cache
  loadVerificationData();
  checkProSellerStatus();
}

function checkProSellerStatus() {
  const isPro = Boolean(
    (window.CampallyPay && window.CampallyPay.isSellerPro(currentUserId)) ||
    currentUser?.user_metadata?.is_pro === true
  );

  const banner = document.getElementById("pro-seller-status-banner");
  const btn = document.getElementById("upgrade-pro-seller-btn");

  if (isPro) {
    if (banner) {
      banner.style.display = "block";
      banner.innerHTML = `
        <div style="background:#FEF3C7; border:1px solid #FCD34D; border-radius:10px; padding:10px 14px; color:#92400E; font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-crown" style="font-size:16px; color:#D97706;"></i> Campally Pro Seller Active (Semester Pass)
        </div>
      `;
    }
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-crown"></i> Renew Pro Seller Pass (₦500)`;
    }
  }

  if (btn) {
    btn.onclick = () => {
      if (window.CampallyPay && window.CampallyPay.openProSellerModal) {
        window.CampallyPay.openProSellerModal(currentUser, () => {
          checkProSellerStatus();
        });
      }
    };
  }
}
window.checkProSellerStatus = checkProSellerStatus;

function loadVerificationData() {
  let vData = currentUser?.user_metadata || {};
  const localCache = localStorage.getItem("campally_student_verification_" + currentUserId);
  if (localCache) {
    try {
      const parsed = JSON.parse(localCache);
      vData = { ...vData, ...parsed };
    } catch (e) {}
  }

  if (matricInput && vData.matric_number) {
    matricInput.value = vData.matric_number;
  }
  if (schoolEmailInput && vData.school_email) {
    schoolEmailInput.value = vData.school_email;
  }
  if (idCardPreview && vData.student_id_url) {
    idCardPreview.src = vData.student_id_url;
    idCardPreview.style.display = "block";
  }

  if (verificationStatusBanner) {
    if (vData.is_verified || vData.matric_number) {
      verificationStatusBanner.style.display = "block";
      verificationStatusBanner.innerHTML = `
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; padding:10px 14px; color:#065F46; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-circle-check" style="font-size:16px;"></i> Verified Student ID — Your account has a verified badge!
        </div>
      `;
      if (submitVerificationBtn) {
        submitVerificationBtn.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i> Update Student ID Information`;
      }
    }
  }
}

async function init() {
  await loadCampuses();
  await loadProfile();
}

init();

// Quick local preview for avatar
if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (file) {
      avatarPreview.src = URL.createObjectURL(file);
    }
  });
}

// Quick preview for ID card
if (idCardInput && idCardPreview) {
  idCardInput.addEventListener("change", () => {
    const file = idCardInput.files[0];
    if (file) {
      idCardPreview.src = URL.createObjectURL(file);
      idCardPreview.style.display = "block";
    }
  });
}

// Save General Profile
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("full-name").value.trim();
    const department = document.getElementById("department").value.trim();
    const campusId = campusSelect ? campusSelect.value : null;
    const hall = document.getElementById("hall").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();

    let avatarUrl = avatarPreview.src.startsWith("blob:") ? null : avatarPreview.src;
    let file = avatarInput.files[0];

    if (file) {
      file = await compressImage(file);
      const filePath = `${currentUserId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        if (window.showToast) window.showToast("Photo upload failed: " + uploadError.message, "error");
        else alert("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;
    }

    const updatePayload = {
      full_name: fullName,
      department: department,
      hall: hall,
      whatsapp_number: whatsapp,
      avatar_url: avatarUrl
    };
    if (campusId) {
      updatePayload.campus_id = campusId;
    }

    let { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", currentUserId);

    // Fallback if campus_id column does not exist yet
    if (error && error.message && error.message.includes("campus_id")) {
      delete updatePayload.campus_id;
      const res = await supabase.from("profiles").update(updatePayload).eq("id", currentUserId);
      error = res.error;
    }

    if (error) {
      if (window.showToast) window.showToast("Failed to save: " + error.message, "error");
      else alert("Failed to save: " + error.message);
    } else {
      if (window.showToast) window.showToast("Profile saved successfully!", "success");
      setTimeout(() => {
        window.location.href = "seller.html?id=" + currentUserId;
      }, 500);
    }
  });
}

// Save Student ID Verification Safely in Supabase
if (verificationForm) {
  verificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const matricNumber = (matricInput?.value || "").trim();
    const schoolEmail = (schoolEmailInput?.value || "").trim();
    const cardFile = idCardInput?.files[0];

    if (!matricNumber) {
      if (window.showToast) window.showToast("Please enter your Matriculation or Student ID number", "error");
      return;
    }

    if (submitVerificationBtn) {
      submitVerificationBtn.disabled = true;
      submitVerificationBtn.textContent = "Securing & saving in Supabase...";
    }

    let idCardUrl = idCardPreview?.src && !idCardPreview.src.startsWith("blob:") ? idCardPreview.src : null;

    try {
      // 1. Upload ID card photo safely to Supabase storage if provided
      if (cardFile) {
        const compressed = await compressImage(cardFile);
        const cardPath = `${currentUserId}/student_id_${Date.now()}_${cardFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(cardPath, compressed);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(cardPath);
          idCardUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Safely store in Supabase Auth user metadata
      const verificationPayload = {
        matric_number: matricNumber,
        school_email: schoolEmail || null,
        student_id_url: idCardUrl,
        is_verified: true,
        verified_at: new Date().toISOString()
      };

      await supabase.auth.updateUser({
        data: verificationPayload
      });

      // 3. Log verification record in Supabase site_feedback for admin audit
      const campusName = campusSelect?.options[campusSelect.selectedIndex]?.text || "Campally Student";
      try {
        await supabase.from("site_feedback").insert({
          name: `[STUDENT_ID_VERIFIED] ${currentUserId}`,
          message: `Student: ${document.getElementById("full-name")?.value || "Student"} | Matric: ${matricNumber} | Campus: ${campusName} | Email: ${schoolEmail || "N/A"} | ID Image: ${idCardUrl || "None"}`
        });
      } catch (logErr) {
        console.warn("Audit log notice:", logErr);
      }

      // 4. Save to local cache
      localStorage.setItem("campally_student_verification_" + currentUserId, JSON.stringify(verificationPayload));

      if (window.showToast) {
        window.showToast("Student ID safely verified and saved in Supabase!", "success");
      }

      // Update banner immediately
      if (verificationStatusBanner) {
        verificationStatusBanner.style.display = "block";
        verificationStatusBanner.innerHTML = `
          <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; padding:10px 14px; color:#065F46; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-circle-check" style="font-size:16px;"></i> Verified Student ID — Your account has a verified badge!
          </div>
        `;
      }

      if (submitVerificationBtn) {
        submitVerificationBtn.disabled = false;
        submitVerificationBtn.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i> Student ID Verified`;
      }
    } catch (err) {
      console.error("Verification save error:", err);
      if (window.showToast) window.showToast("Saved locally: " + err.message, "info");
      if (submitVerificationBtn) {
        submitVerificationBtn.disabled = false;
        submitVerificationBtn.innerHTML = `<i class="fa-solid fa-id-card" style="margin-right:6px;"></i> Submit Student ID Verification`;
      }
    }
  });
}

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}