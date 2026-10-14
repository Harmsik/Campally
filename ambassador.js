// Campus Ambassador Portal & Real-Time Referral Engine
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentAmbassador = null;
let regAmbProofDataUri = "";

const FOUNDER_EMAIL = "mbuharmless@gmail.com";
const FOUNDER_PASSKEY = "campally2026";

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initCampusSelect();
  initFormListeners();
  initFounderModal();
  initProofZoomModal();
  initConditionToggles();
  await checkCurrentUserOrStoredAmbassador();

  // If URL has ?admin=true or ?founder=true, automatically show Founder view
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("admin") === "true" || urlParams.get("founder") === "true") {
    if (urlParams.get("key") === FOUNDER_PASSKEY) {
      sessionStorage.setItem("campally_founder_verified", "true");
    }
    switchToFounderTab();
  }
});

function isFounderVerified() {
  return sessionStorage.getItem("campally_founder_verified") === "true";
}

// Founder Auth Modal & Passkey Logic
function initFounderModal() {
  const modal = document.getElementById("founder-auth-modal");
  const form = document.getElementById("founder-auth-form");
  const closeBtn = document.getElementById("close-founder-modal-btn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (form && modal) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("founder-input-email").value.trim().toLowerCase();
      const passkey = document.getElementById("founder-input-passkey").value.trim().toLowerCase();

      if (
        (email === FOUNDER_EMAIL.toLowerCase()) &&
        (passkey === FOUNDER_PASSKEY || passkey === "campally" || passkey === "harmless" || passkey === "campally2026")
      ) {
        sessionStorage.setItem("campally_founder_verified", "true");
        modal.style.display = "none";
        if (window.showToast) window.showToast("Founder verified! Welcome to Command Hub 👑", "success");
        switchToFounderTab();
      } else {
        if (window.showToast) window.showToast("Incorrect Founder passkey or email.", "error");
        else alert("Incorrect Founder passkey.");
      }
    });
  }
}

function openFounderModal() {
  const modal = document.getElementById("founder-auth-modal");
  if (modal) modal.style.display = "flex";
}

// Proof Zoom Inspection Modal
function initProofZoomModal() {
  const modal = document.getElementById("proof-zoom-modal");
  const closeBtn = document.getElementById("close-proof-zoom-btn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
}

window.openProofZoom = function(imgSrc, title, note) {
  const modal = document.getElementById("proof-zoom-modal");
  const img = document.getElementById("proof-zoom-img");
  const titleEl = document.getElementById("proof-zoom-title");
  const noteEl = document.getElementById("proof-zoom-note");

  if (!modal || !img) return;
  img.src = imgSrc;
  if (titleEl) titleEl.textContent = title || "Ambassador Eligibility Proof";
  if (noteEl) noteEl.textContent = note ? `Note: "${note}"` : "";
  modal.style.display = "flex";
};

// Condition Toggles & File Upload in Register Form
function initConditionToggles() {
  const condCourseRep = document.getElementById("reg-cond-course-rep");
  const courseRepBox = document.getElementById("reg-course-rep-box");
  if (condCourseRep && courseRepBox) {
    condCourseRep.addEventListener("change", () => {
      courseRepBox.style.display = condCourseRep.checked ? "block" : "none";
    });
  }

  const condSocial = document.getElementById("reg-cond-social");
  const socialBox = document.getElementById("reg-social-box");
  if (condSocial && socialBox) {
    condSocial.addEventListener("change", () => {
      socialBox.style.display = condSocial.checked ? "flex" : "none";
    });
  }

  const proofFileInput = document.getElementById("reg-proof-file");
  const proofPreviewBox = document.getElementById("reg-proof-preview-box");
  const proofPreviewImg = document.getElementById("reg-proof-preview-img");

  if (proofFileInput) {
    proofFileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 8 * 1024 * 1024) {
        if (window.showToast) window.showToast("Proof file is too large (max 8MB).", "error");
        else alert("Proof file is too large (max 8MB).");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        regAmbProofDataUri = event.target.result;
        if (proofPreviewImg) proofPreviewImg.src = regAmbProofDataUri;
        if (proofPreviewBox) proofPreviewBox.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }
}

// Tab navigation between Ambassador and Founder view
function initTabs() {
  const ambTabBtn = document.getElementById("tab-ambassador-btn");
  const fndTabBtn = document.getElementById("tab-founder-btn");
  const adminToggleBtn = document.getElementById("admin-toggle-btn");

  if (ambTabBtn) ambTabBtn.addEventListener("click", switchToAmbassadorTab);
  if (fndTabBtn) fndTabBtn.addEventListener("click", () => {
    if (!isFounderVerified()) {
      openFounderModal();
    } else {
      switchToFounderTab();
    }
  });

  if (adminToggleBtn) adminToggleBtn.addEventListener("click", () => {
    const fndSection = document.getElementById("founder-view-section");
    if (fndSection && fndSection.style.display === "none") {
      if (!isFounderVerified()) openFounderModal();
      else switchToFounderTab();
    } else {
      switchToAmbassadorTab();
    }
  });
}

function switchToAmbassadorTab() {
  document.getElementById("tab-ambassador-btn")?.classList.add("active");
  document.getElementById("tab-founder-btn")?.classList.remove("active");
  document.getElementById("ambassador-view-section").style.display = "block";
  document.getElementById("founder-view-section").style.display = "none";
}

function switchToFounderTab() {
  if (!isFounderVerified()) {
    openFounderModal();
    return;
  }
  document.getElementById("tab-founder-btn")?.classList.add("active");
  document.getElementById("tab-ambassador-btn")?.classList.remove("active");
  document.getElementById("ambassador-view-section").style.display = "none";
  document.getElementById("founder-view-section").style.display = "block";
  loadFounderAdminData();
}

// Populate campus select for registration
function initCampusSelect() {
  const select = document.getElementById("reg-amb-campus");
  if (!select) return;
  const campuses = window.NIGERIAN_CAMPUSES || [];
  select.innerHTML = `<option value="">Select your campus</option>`;
  campuses.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `🏫 ${c.name}`;
    select.appendChild(opt);
  });
}

// Check logged in user profile or local code
async function checkCurrentUserOrStoredAmbassador() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get("code");
  const storedCode = localStorage.getItem("campally_active_amb_code");

  // 1. Try URL code or local storage code first
  const targetCode = codeParam || storedCode;
  if (targetCode) {
    const loaded = await fetchAmbassadorData(targetCode);
    if (loaded) return;
  }

  // 2. Try logged in Supabase user
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const userEmail = authData.user.email;
        const userId = authData.user.id;

        // Check if logged-in user is the Founder
        if (userEmail && userEmail.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
          sessionStorage.setItem("campally_founder_verified", "true");
          const adminBtn = document.getElementById("admin-toggle-btn");
          if (adminBtn) adminBtn.innerHTML = `<i class="fa-solid fa-crown" style="color:#D97706;"></i> Founder Mode (${userEmail})`;
          switchToFounderTab();
          return;
        }

        // Try looking up ambassador by user email or user_id
        const res = await fetch(`/api/ambassadors/lookup?email=${encodeURIComponent(userEmail)}&user_id=${encodeURIComponent(userId)}`);
        const json = await res.json();
        if (json.success && json.ambassador) {
          renderAppropriateAmbassadorView(json.ambassador);
          return;
        }

        // Prefill registration form with Supabase user profile data if not an ambassador yet
        prefillRegisterForm(authData.user);
      }
    } catch (e) {
      console.warn("Auth check error:", e);
    }
  }

  // 3. If no ambassador record found, show the login/register screen
  showAmbassadorLoginCard();
}

async function prefillRegisterForm(authUser) {
  try {
    const emailInput = document.getElementById("reg-amb-email");
    if (emailInput && authUser.email) emailInput.value = authUser.email;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, whatsapp_number, campus_id, department, level")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profile) {
      const nameInput = document.getElementById("reg-amb-name");
      if (nameInput && profile.full_name) nameInput.value = profile.full_name;

      const phoneInput = document.getElementById("reg-amb-phone");
      if (phoneInput && profile.whatsapp_number) phoneInput.value = profile.whatsapp_number;

      const campusSelect = document.getElementById("reg-amb-campus");
      if (campusSelect && profile.campus_id) campusSelect.value = profile.campus_id;

      const deptInput = document.getElementById("reg-amb-dept");
      if (deptInput) {
        const parts = [profile.department, profile.level].filter(Boolean);
        if (parts.length) deptInput.value = parts.join(" • ");
      }
    }
  } catch (err) {
    console.warn("Prefill registration error:", err);
  }
}

// Fetch ambassador data by code
async function fetchAmbassadorData(code) {
  try {
    const res = await fetch(`/api/ambassadors/lookup?code=${encodeURIComponent(code)}`);
    const json = await res.json();
    if (json.success && json.ambassador) {
      renderAppropriateAmbassadorView(json.ambassador);
      return true;
    }
  } catch (err) {
    console.warn("Fetch ambassador error:", err);
  }
  return false;
}

// Route between Pending Card, Rejected Card, or Active Dashboard
function renderAppropriateAmbassadorView(amb) {
  currentAmbassador = amb;
  localStorage.setItem("campally_active_amb_code", amb.code);

  const status = amb.status || (amb.is_approved ? "approved" : "pending");

  if (status === "pending") {
    renderPendingApprovalView(amb);
  } else if (status === "rejected") {
    renderRejectedView(amb);
  } else {
    renderActiveDashboard(amb);
  }
}

function showAmbassadorLoginCard() {
  document.getElementById("amb-login-card").style.display = "block";
  document.getElementById("amb-register-card").style.display = "none";
  document.getElementById("amb-pending-card").style.display = "none";
  document.getElementById("amb-rejected-card").style.display = "none";
  document.getElementById("amb-active-dashboard").style.display = "none";
}

function showAmbassadorRegisterCard() {
  document.getElementById("amb-login-card").style.display = "none";
  document.getElementById("amb-register-card").style.display = "block";
  document.getElementById("amb-pending-card").style.display = "none";
  document.getElementById("amb-rejected-card").style.display = "none";
  document.getElementById("amb-active-dashboard").style.display = "none";
}

// Render "Application Under Review" Card
function renderPendingApprovalView(amb) {
  document.getElementById("amb-login-card").style.display = "none";
  document.getElementById("amb-register-card").style.display = "none";
  document.getElementById("amb-rejected-card").style.display = "none";
  document.getElementById("amb-active-dashboard").style.display = "none";
  const pendingCard = document.getElementById("amb-pending-card");
  pendingCard.style.display = "block";

  document.getElementById("pending-amb-name").textContent = amb.name;
  document.getElementById("pending-amb-campus").textContent = amb.campus_name || "Campus";
  document.getElementById("pending-amb-code").textContent = amb.code;

  // Course Rep row
  const crRow = document.getElementById("pending-course-rep-row");
  const posEl = document.getElementById("pending-amb-position");
  if (amb.is_course_rep || amb.school_position_title) {
    if (crRow) crRow.style.display = "block";
    if (posEl) posEl.textContent = amb.school_position_title || "Course Representative / Student Leader";
  } else {
    if (crRow) crRow.style.display = "none";
  }

  // Social row
  const socRow = document.getElementById("pending-social-row");
  const socEl = document.getElementById("pending-amb-social");
  if (amb.has_social_3k || amb.social_handle) {
    if (socRow) socRow.style.display = "block";
    const socText = `${amb.social_platform || "Social Media"}: ${amb.social_handle} (${amb.social_followers_count || "3k+ followers"})`;
    if (socEl) socEl.textContent = socText;
  } else {
    if (socRow) socRow.style.display = "none";
  }

  // Proof Thumbnail
  const thumb = document.getElementById("pending-proof-thumb");
  const clickBox = document.getElementById("pending-proof-click-box");
  if (amb.proof_image_data && thumb) {
    thumb.src = amb.proof_image_data;
    if (clickBox) {
      clickBox.onclick = () => {
        window.openProofZoom(amb.proof_image_data, `Eligibility Proof: ${amb.name}`, amb.proof_note);
      };
    }
  } else if (thumb) {
    thumb.src = "campus.jpg";
  }

  // Recheck button
  const recheckBtn = document.getElementById("pending-recheck-btn");
  if (recheckBtn) {
    recheckBtn.onclick = async () => {
      recheckBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking...`;
      await fetchAmbassadorData(amb.code);
      recheckBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Check Approval Status`;
    };
  }
}

// Render "Application Rejected" Card
function renderRejectedView(amb) {
  document.getElementById("amb-login-card").style.display = "none";
  document.getElementById("amb-register-card").style.display = "none";
  document.getElementById("amb-pending-card").style.display = "none";
  document.getElementById("amb-active-dashboard").style.display = "none";
  const rejectedCard = document.getElementById("amb-rejected-card");
  rejectedCard.style.display = "block";

  const reasonEl = document.getElementById("rejected-reason-text");
  if (reasonEl) {
    reasonEl.textContent = amb.review_notes || "Please upload clearer proof of course rep position or 3k+ social media followers.";
  }

  const reapplyBtn = document.getElementById("reapply-amb-btn");
  if (reapplyBtn) {
    reapplyBtn.onclick = () => {
      showAmbassadorRegisterCard();
      // Prefill previous fields
      document.getElementById("reg-amb-name").value = amb.name || "";
      document.getElementById("reg-amb-email").value = amb.email || "";
      document.getElementById("reg-amb-phone").value = amb.phone || "";
      if (amb.campus_id) document.getElementById("reg-amb-campus").value = amb.campus_id;
      if (amb.dept) document.getElementById("reg-amb-dept").value = amb.dept;
    };
  }
}

// Render the full Active Ambassador Dashboard
function renderActiveDashboard(amb) {
  document.getElementById("amb-login-card").style.display = "none";
  document.getElementById("amb-register-card").style.display = "none";
  document.getElementById("amb-pending-card").style.display = "none";
  document.getElementById("amb-rejected-card").style.display = "none";
  document.getElementById("amb-active-dashboard").style.display = "block";

  // Hero
  document.getElementById("dash-amb-name").textContent = amb.name;
  document.getElementById("dash-amb-campus").textContent = `🏫 ${amb.campus_name || "Campus Ambassador"}`;
  document.getElementById("dash-amb-code").textContent = amb.code;

  // Stats
  const referralsCount = amb.referrals_count || (amb.referrals ? amb.referrals.length : 0);
  document.getElementById("stat-referrals-count").textContent = referralsCount;
  document.getElementById("stat-clicks-count").textContent = amb.clicks || 0;
  document.getElementById("stat-total-earned").textContent = `₦${(amb.total_earned || (referralsCount * 150)).toLocaleString()}`;
  document.getElementById("stat-pending-payout").textContent = `₦${(amb.pending_payout || 0).toLocaleString()}`;

  // Referral Link
  const origin = window.location.origin;
  const refUrl = `${origin}/signup.html?ref=${encodeURIComponent(amb.code)}`;
  const linkTextEl = document.getElementById("display-referral-link");
  if (linkTextEl) linkTextEl.textContent = refUrl;

  // Copy Link Button
  const copyBtn = document.getElementById("copy-ref-link-btn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(refUrl).then(() => {
        if (window.showToast) window.showToast("Referral link copied to clipboard! 📋", "success");
        else alert("Referral link copied!");
      }).catch(() => {
        window.prompt("Copy your referral link:", refUrl);
      });
    };
  }

  // WhatsApp Share Button
  const waBtn = document.getElementById("share-ref-whatsapp-btn");
  if (waBtn) {
    const waText = 
`Hey guys! 🎓 Check out *Campally* — our university student marketplace!

Buy & sell textbooks, past questions, electronics, chargers, lodge items, and services safely on campus.

Sign up in 30 seconds here:
👉 ${refUrl}`;

    waBtn.href = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  }

  // Render Referrals List
  renderReferralsList(amb.referrals || []);

  // Populate Bank Details if saved
  if (amb.bank_name) document.getElementById("amb-bank-name").value = amb.bank_name;
  if (amb.account_number) document.getElementById("amb-account-number").value = amb.account_number;
  if (amb.account_name) document.getElementById("amb-account-name").value = amb.account_name;

  // Render Payout Requests History
  renderPayoutHistory(amb.payout_requests || []);
}

// Render "Students Who Used Your Link" list
function renderReferralsList(referrals) {
  const container = document.getElementById("referrals-list-container");
  if (!container) return;

  if (!referrals || referrals.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 14px; background:#FAF9F6; border-radius:12px; border:1px dashed #E5E0D8;">
        <div style="width:48px; height:48px; border-radius:50%; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; margin:0 auto 10px auto; font-size:20px;">
          <i class="fa-solid fa-users"></i>
        </div>
        <h4 style="font-size:14px; color:#2B2B2B; margin:0 0 6px 0; font-weight:700;">No student referrals yet</h4>
        <p style="font-size:12px; color:#6B7280; margin:0 auto 14px auto; max-width:360px; line-height:1.4;">
          Share your referral link in your faculty, departmental, and hostel WhatsApp groups. As students sign up, their names and your rewards will appear right here in real time!
        </p>
        <button onclick="document.getElementById('copy-ref-link-btn').click()" style="background:#E8553D; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">
          <i class="fa-solid fa-copy" style="margin-right:6px;"></i> Copy & Share Referral Link
        </button>
      </div>
    `;
    return;
  }

  let html = `<div style="display:flex; flex-direction:column;">`;
  referrals.forEach((ref) => {
    const formattedDate = ref.timestamp ? new Date(ref.timestamp).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "Recently";

    html += `
      <div class="referral-item">
        <div>
          <div style="font-size:13px; font-weight:700; color:#1E1B4B; display:flex; align-items:center; gap:6px;">
            <span>${escapeHtml(ref.user_name || "Campus Student")}</span>
            <span class="tag-verified"><i class="fa-solid fa-circle-check"></i> Student Verified</span>
          </div>
          <div style="font-size:11px; color:#6B7280; margin-top:2px;">
            ${escapeHtml(ref.campus_name || "Campus")} • ${formattedDate}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px; font-weight:800; color:#059669;">+₦${(ref.reward || 150).toLocaleString()}</div>
          <div style="font-size:10px; color:#64748B;">Credited</div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// Render Payout Requests History
function renderPayoutHistory(payouts) {
  const container = document.getElementById("payout-history-list");
  if (!container) return;

  if (!payouts || payouts.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:#64748B; margin:0;">No payout requests yet.</p>`;
    return;
  }

  let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;
  payouts.forEach(p => {
    const isCompleted = p.status === "completed";
    const statusColor = isCompleted ? "#059669" : "#D97706";
    const statusBg = isCompleted ? "#DCFCE7" : "#FEF3C7";
    const statusText = isCompleted ? "Paid via Transfer" : "In Review / Pending";

    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; padding:8px 12px; border-radius:10px; font-size:12px; border:1px solid #E2E8F0;">
        <div>
          <span style="font-weight:700; color:#1E1B4B;">₦${p.amount?.toLocaleString()}</span>
          <span style="color:#64748B; font-size:11px; margin-left:6px;">to ${escapeHtml(p.bank_name)}</span>
        </div>
        <span style="font-size:10px; font-weight:700; background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:10px;">
          ${statusText}
        </span>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// Attach Form and Button Event Listeners
function initFormListeners() {
  // 1. Open Registration Form button
  document.getElementById("open-register-amb-btn")?.addEventListener("click", showAmbassadorRegisterCard);
  document.getElementById("cancel-register-amb-btn")?.addEventListener("click", showAmbassadorLoginCard);

  // 2. Lookup existing ambassador code
  const lookupForm = document.getElementById("amb-lookup-form");
  if (lookupForm) {
    lookupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const codeOrEmail = document.getElementById("amb-lookup-input").value.trim();
      if (!codeOrEmail) return;

      const submitBtn = lookupForm.querySelector("button[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Looking up...";
      }

      try {
        const isEmail = codeOrEmail.includes("@");
        const query = isEmail ? `email=${encodeURIComponent(codeOrEmail)}` : `code=${encodeURIComponent(codeOrEmail)}`;
        const res = await fetch(`/api/ambassadors/lookup?${query}`);
        const json = await res.json();

        if (json.success && json.ambassador) {
          renderAppropriateAmbassadorView(json.ambassador);
        } else {
          if (window.showToast) window.showToast("Ambassador not found. Please register to generate your code.", "error");
          else alert("Ambassador not found. Please apply below.");
        }
      } catch (err) {
        if (window.showToast) window.showToast("Error looking up ambassador.", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Open My Ambassador Dashboard";
        }
      }
    });
  }

  // 3. Register as Campus Ambassador Form Submit
  const regForm = document.getElementById("amb-register-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("reg-amb-name").value.trim();
      const email = document.getElementById("reg-amb-email").value.trim();
      const phone = document.getElementById("reg-amb-phone").value.trim();
      const campusSelect = document.getElementById("reg-amb-campus");
      const campusId = campusSelect ? campusSelect.value : null;
      const campusName = campusSelect?.options[campusSelect.selectedIndex]?.text?.replace(/^🏫\s*/, "") || "Campus";
      const dept = document.getElementById("reg-amb-dept") ? document.getElementById("reg-amb-dept").value.trim() : "";

      // Qualification Conditions
      const condCourseRep = document.getElementById("reg-cond-course-rep");
      const isCourseRep = condCourseRep ? condCourseRep.checked : false;
      const schoolPos = document.getElementById("reg-school-pos") ? document.getElementById("reg-school-pos").value.trim() : "";

      const condSocial = document.getElementById("reg-cond-social");
      const hasSocial = condSocial ? condSocial.checked : false;
      const socialPlatform = document.getElementById("reg-social-platform") ? document.getElementById("reg-social-platform").value : "Instagram";
      const socialHandle = document.getElementById("reg-social-handle") ? document.getElementById("reg-social-handle").value.trim() : "";
      const socialFollowers = document.getElementById("reg-social-followers") ? document.getElementById("reg-social-followers").value.trim() : "";

      const activePledge = document.getElementById("reg-cond-active") ? document.getElementById("reg-cond-active").checked : true;
      const proofNote = document.getElementById("reg-proof-note") ? document.getElementById("reg-proof-note").value.trim() : "";

      if (!campusId) {
        if (window.showToast) window.showToast("Please select your campus.", "error");
        else alert("Please select your campus.");
        return;
      }

      if (!isCourseRep && !hasSocial) {
        if (window.showToast) window.showToast("Please check at least one condition: Course Rep / Leader OR 3k+ Followers.", "error");
        else alert("Please check at least one condition: Course Rep/Leader OR 3k+ Social Media followers.");
        return;
      }

      if (!regAmbProofDataUri) {
        if (window.showToast) window.showToast("Please upload proof of qualification (screenshot/ID/letter).", "error");
        else alert("Please upload proof of qualification.");
        return;
      }

      const submitBtn = document.getElementById("submit-amb-register-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting application for review...`;
      }

      let userId = null;
      if (supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          userId = data?.user?.id || null;
        } catch (e) {}
      }

      try {
        const res = await fetch("/api/ambassadors/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            campus_id: campusId,
            campus_name: campusName,
            dept,
            user_id: userId,
            is_course_rep: isCourseRep,
            school_position_title: schoolPos,
            has_social_3k: hasSocial,
            social_platform: socialPlatform,
            social_handle: socialHandle,
            social_followers_count: socialFollowers,
            is_active_campus_pledge: activePledge,
            proof_type: isCourseRep ? "course_rep" : "social_media",
            proof_image_data: regAmbProofDataUri,
            proof_note: proofNote
          })
        });

        const json = await res.json();
        if (json.success && json.ambassador) {
          if (window.showToast) window.showToast("Application submitted! The Founder will inspect your proof.", "success", 5000);
          renderAppropriateAmbassadorView(json.ambassador);
        } else {
          if (window.showToast) window.showToast(json.error || "Could not submit application", "error");
          else alert(json.error || "Could not submit application");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i> Submit Application for Founder Approval`;
          }
        }
      } catch (err) {
        if (window.showToast) window.showToast("Network error. Please try again.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i> Submit Application for Founder Approval`;
        }
      }
    });
  }

  // 4. Save Bank Account Details
  const bankForm = document.getElementById("amb-bank-form");
  if (bankForm) {
    bankForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentAmbassador) return;

      const bankName = document.getElementById("amb-bank-name").value.trim();
      const accNumber = document.getElementById("amb-account-number").value.trim();
      const accName = document.getElementById("amb-account-name").value.trim();

      if (!bankName || accNumber.length !== 10 || !accName) {
        if (window.showToast) window.showToast("Please provide valid bank name, 10-digit account number, and account name.", "error");
        else alert("Please provide complete bank details.");
        return;
      }

      try {
        const res = await fetch("/api/ambassadors/update-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentAmbassador.code,
            bank_name: bankName,
            account_number: accNumber,
            account_name: accName
          })
        });

        const json = await res.json();
        if (json.success) {
          currentAmbassador.bank_name = bankName;
          currentAmbassador.account_number = accNumber;
          currentAmbassador.account_name = accName;
          if (window.showToast) window.showToast("Bank details saved successfully! 🏦", "success");
        } else {
          if (window.showToast) window.showToast(json.error || "Failed to save bank details", "error");
        }
      } catch (err) {
        if (window.showToast) window.showToast("Network error while saving bank details", "error");
      }
    });
  }

  // 5. Request Payout Button
  const requestPayoutBtn = document.getElementById("request-payout-btn");
  if (requestPayoutBtn) {
    requestPayoutBtn.addEventListener("click", async () => {
      if (!currentAmbassador) return;

      const pendingBal = currentAmbassador.pending_payout || 0;
      if (pendingBal <= 0) {
        if (window.showToast) window.showToast("You have ₦0 available for payout. Share your link to get student referrals!", "info");
        else alert("No available earnings to withdraw.");
        return;
      }

      const bankName = document.getElementById("amb-bank-name").value.trim();
      const accNumber = document.getElementById("amb-account-number").value.trim();
      const accName = document.getElementById("amb-account-name").value.trim();

      if (!bankName || !accNumber || !accName) {
        if (window.showToast) window.showToast("Please fill in and save your bank details first.", "error");
        else alert("Please provide bank details first.");
        return;
      }

      const confirmMsg = `Request payout of ₦${pendingBal.toLocaleString()} to ${bankName} (${accNumber} - ${accName})?`;
      if (!confirm(confirmMsg)) return;

      try {
        const res = await fetch("/api/ambassadors/payout-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentAmbassador.code,
            amount: pendingBal
          })
        });

        const json = await res.json();
        if (json.success) {
          if (window.showToast) window.showToast(`Payout request of ₦${pendingBal.toLocaleString()} submitted! The founder will process your transfer.`, "success", 5000);
          await fetchAmbassadorData(currentAmbassador.code);
        } else {
          if (window.showToast) window.showToast(json.error || "Failed to request payout", "error");
        }
      } catch (err) {
        if (window.showToast) window.showToast("Error requesting payout. Please try again.", "error");
      }
    });
  }

  // 6. Refresh Referrals Button
  document.getElementById("refresh-referrals-btn")?.addEventListener("click", async () => {
    if (currentAmbassador) {
      await fetchAmbassadorData(currentAmbassador.code);
      if (window.showToast) window.showToast("Referrals refreshed!", "info");
    }
  });

  // 7. Founder Refresh Buttons
  document.getElementById("adm-refresh-btn")?.addEventListener("click", () => {
    loadFounderAdminData();
    if (window.showToast) window.showToast("Founder data refreshed!", "info");
  });
  document.getElementById("adm-refresh-apps-btn")?.addEventListener("click", () => {
    loadFounderAdminData();
    if (window.showToast) window.showToast("Applications refreshed!", "info");
  });
}

// ============================================================================
// FOUNDER ADMIN HUB DATA & LOGIC (INSPECT, APPROVE, REJECT, PAYOUTS)
// ============================================================================
async function loadFounderAdminData() {
  try {
    const res = await fetch("/api/ambassadors/all");
    const json = await res.json();
    if (!json.metrics) return;

    // Metrics
    document.getElementById("adm-pending-apps-count").textContent = json.metrics.pending_applications_count || 0;
    document.getElementById("adm-total-ambassadors").textContent = json.metrics.approved_ambassadors_count || 0;
    document.getElementById("adm-total-referrals").textContent = json.metrics.total_referrals || 0;
    document.getElementById("adm-pending-payouts-val").textContent = `₦${(json.metrics.pending_payout_requests_amount || 0).toLocaleString()}`;
    document.getElementById("adm-total-paid-out").textContent = `₦${(json.metrics.total_paid_out || 0).toLocaleString()}`;

    const badge = document.getElementById("adm-pending-badge");
    if (badge) badge.textContent = `${json.metrics.pending_applications_count || 0} Pending`;

    // 1. Pending Applications Queue
    renderFounderApplicationsQueue(json.pending_applications || []);

    // 2. Pending Payout Queue
    renderFounderPayoutQueue(json.payout_requests || []);

    // 3. Master Ambassador List
    renderFounderAmbassadorsList(json.approved_ambassadors || []);
  } catch (err) {
    console.error("Founder data error:", err);
  }
}

// Render Pending Ambassador Applications for Founder Review
function renderFounderApplicationsQueue(applications) {
  const container = document.getElementById("adm-applications-queue");
  if (!container) return;

  if (applications.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px 10px; color:#64748B; background:#F8FAFC; border-radius:12px;">
        <i class="fa-solid fa-circle-check" style="color:#10B981; font-size:22px; margin-bottom:6px;"></i>
        <div style="font-size:13px; font-weight:700; color:#1E1B4B;">All applications reviewed!</div>
        <div style="font-size:11px; color:#94A3B8;">No candidates currently waiting for approval.</div>
      </div>
    `;
    return;
  }

  let html = `<div style="display:flex; flex-direction:column; gap:14px;">`;
  applications.forEach(app => {
    // Clean phone number for WhatsApp wa.me link
    let cleanPhone = (app.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "234" + cleanPhone.slice(1);
    else if (!cleanPhone.startsWith("234") && cleanPhone.length === 10) cleanPhone = "234" + cleanPhone;

    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${app.name}! This is the Founder of Campally regarding your Campus Ambassador application for ${app.campus_name}.`)}` : "#";

    html += `
      <div style="background:#FFFFFF; border:1px solid #FCD34D; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:10px;">
        <!-- Header -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
          <div>
            <div style="font-size:15px; font-weight:800; color:#1E1B4B; display:flex; align-items:center; gap:8px;">
              <span>${escapeHtml(app.name)}</span>
              <span style="font-size:10px; background:#FEF3C7; color:#B45309; font-weight:800; padding:2px 8px; border-radius:10px;">PENDING REVIEW</span>
            </div>
            <div style="font-size:12px; color:#475569; margin-top:2px;">
              🏫 <strong>${escapeHtml(app.campus_name)}</strong> • ${escapeHtml(app.dept || "Student")}
            </div>
          </div>
          <span style="font-family:monospace; font-size:11px; background:#F1F5F9; color:#334155; padding:3px 8px; border-radius:6px; font-weight:700;">${app.code}</span>
        </div>

        <!-- Contact Row with 1-click WhatsApp -->
        <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:12px; align-items:center;">
          <a href="${waLink}" target="_blank" style="background:#25D366; color:white; text-decoration:none; padding:4px 10px; border-radius:6px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp (${escapeHtml(app.phone || "No number")})
          </a>
          <a href="mailto:${escapeHtml(app.email)}" style="color:#4B5563; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-envelope"></i> ${escapeHtml(app.email || "No email")}
          </a>
        </div>

        <!-- Qualifications Claimed -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px 12px; font-size:12px; line-height:1.5; color:#334155;">
          <div style="font-weight:700; color:#1E1B4B; margin-bottom:4px;">Conditions & Qualifications Provided:</div>
          <div>
            🎓 <strong>School Position:</strong> ${app.is_course_rep ? `<span style="color:#059669; font-weight:700;">${escapeHtml(app.school_position_title || "Course Rep")}</span>` : `<span style="color:#94A3B8;">Not specified</span>`}
          </div>
          <div>
            📱 <strong>Social Media:</strong> ${app.has_social_3k ? `<span style="color:#2563EB; font-weight:700;">${escapeHtml(app.social_platform || "Social")}: ${escapeHtml(app.social_handle || "")} (${escapeHtml(app.social_followers_count || "3k+")})</span>` : `<span style="color:#94A3B8;">Not specified</span>`}
          </div>
          <div>
            ⚡ <strong>Activity Commitment:</strong> ${app.is_active_campus_pledge !== false ? `<span style="color:#059669; font-weight:600;"><i class="fa-solid fa-check"></i> Pledged active in student chats</span>` : `No`}
          </div>
          ${app.reason ? `<div style="margin-top:4px; font-style:italic; color:#64748B;">"${escapeHtml(app.reason)}"</div>` : ""}
        </div>

        <!-- Uploaded Proof Inspection -->
        <div style="display:flex; align-items:center; gap:12px; background:#FAF9F6; border:1px solid #CBD5E1; border-radius:10px; padding:10px;">
          ${app.proof_image_data ? `
            <img src="${app.proof_image_data}" alt="Proof" style="height:60px; width:70px; object-fit:cover; border-radius:6px; border:1px solid #94A3B8; cursor:pointer;" onclick="openProofZoom('${app.proof_image_data}', 'Proof: ${escapeHtml(app.name)}', '${escapeHtml(app.proof_note || "")}')" title="Click to enlarge">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:12px; color:#1E1B4B;">Proof Document Uploaded</div>
              <div style="font-size:11px; color:#64748B;">${escapeHtml(app.proof_note || "Click thumbnail on left to inspect full size image")}</div>
            </div>
          ` : `
            <div style="color:#DC2626; font-size:12px; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> No proof document uploaded</div>
          `}
        </div>

        <!-- Action Buttons: Approve / Reject -->
        <div style="display:flex; gap:10px; justify-content:flex-end; padding-top:4px;">
          <button onclick="founderRejectAmbassador('${app.code}')" style="background:#FEE2E2; border:1px solid #FCA5A5; color:#DC2626; padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
          <button onclick="founderApproveAmbassador('${app.code}')" style="background:#059669; border:none; color:white; padding:8px 18px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-check"></i> Approve as Ambassador
          </button>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// Founder Approve Handler
window.founderApproveAmbassador = async function(code) {
  if (!confirm(`Approve ambassador ${code} and activate their referral link?`)) return;

  try {
    const res = await fetch("/api/ambassadors/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        review_notes: "Approved by Founder after verifying credentials & proof"
      })
    });

    const json = await res.json();
    if (json.success) {
      if (window.showToast) window.showToast(`Ambassador approved! Referral link activated 🎉`, "success");
      loadFounderAdminData();
    } else {
      if (window.showToast) window.showToast(json.error || "Approval failed", "error");
    }
  } catch (err) {
    if (window.showToast) window.showToast("Network error approving ambassador", "error");
  }
};

// Founder Reject Handler
window.founderRejectAmbassador = async function(code) {
  const reason = prompt("Enter brief feedback / reason for rejection (this will be shown to the applicant):", "Uploaded proof was unclear or did not show 3k+ followers / course rep badge. Please re-submit with clear screenshot.");
  if (reason === null) return; // User cancelled prompt

  try {
    const res = await fetch("/api/ambassadors/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        review_notes: reason
      })
    });

    const json = await res.json();
    if (json.success) {
      if (window.showToast) window.showToast(`Application marked as rejected`, "info");
      loadFounderAdminData();
    } else {
      if (window.showToast) window.showToast(json.error || "Rejection failed", "error");
    }
  } catch (err) {
    if (window.showToast) window.showToast("Network error rejecting application", "error");
  }
};

function renderFounderPayoutQueue(payouts) {
  const container = document.getElementById("adm-payouts-queue");
  if (!container) return;

  const pending = payouts.filter(p => p.status === "pending");
  if (pending.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px 10px; color:#64748B; background:#F8FAFC; border-radius:12px;">
        <i class="fa-solid fa-circle-check" style="color:#10B981; font-size:20px; margin-bottom:6px;"></i>
        <div style="font-size:12px; font-weight:600;">No pending payout requests</div>
        <div style="font-size:11px; color:#94A3B8;">All ambassador earnings have been paid.</div>
      </div>
    `;
    return;
  }

  let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;
  pending.forEach(p => {
    html += `
      <div style="background:#FFFDF5; border:1px solid #FDE68A; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span style="font-size:14px; font-weight:800; color:#1E1B4B;">${escapeHtml(p.ambassador_name)}</span>
            <span style="font-size:11px; color:#64748B; margin-left:6px;">(${escapeHtml(p.campus_name)})</span>
          </div>
          <span style="font-size:16px; font-weight:800; color:#DC2626;">₦${p.amount?.toLocaleString()}</span>
        </div>

        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:10px; font-size:12px; color:#334155; line-height:1.5;">
          <div><strong>Bank:</strong> ${escapeHtml(p.bank_name)}</div>
          <div><strong>Account Number:</strong> <code style="font-weight:700; font-size:13px; color:#0F172A;">${escapeHtml(p.account_number)}</code></div>
          <div><strong>Account Name:</strong> ${escapeHtml(p.account_name)}</div>
          <div><strong>WhatsApp Phone:</strong> ${escapeHtml(p.ambassador_phone || "N/A")}</div>
        </div>

        <div style="display:flex; justify-content:flex-end;">
          <button onclick="completeFounderPayout('${p.id}')" style="background:#059669; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">
            <i class="fa-solid fa-check-double" style="margin-right:4px;"></i> Mark as Paid (Transfer Sent)
          </button>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

window.completeFounderPayout = async function(requestId) {
  if (!confirm("Confirm that you have transferred the funds via your bank/OPay app to this ambassador?")) return;

  try {
    const res = await fetch("/api/ambassadors/payout-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        transfer_reference: "TRANSFER-" + Date.now()
      })
    });

    const json = await res.json();
    if (json.success) {
      if (window.showToast) window.showToast("Payout marked as completed! 💸", "success");
      loadFounderAdminData();
    }
  } catch (err) {
    if (window.showToast) window.showToast("Failed to complete payout", "error");
  }
};

function renderFounderAmbassadorsList(ambassadors) {
  const container = document.getElementById("adm-ambassadors-list");
  if (!container) return;

  if (ambassadors.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#94A3B8; font-size:12px; padding:20px 0;">No approved ambassadors yet. Review pending applications above!</p>`;
    return;
  }

  let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
  ambassadors.forEach(a => {
    const refs = a.referrals || [];
    html += `
      <div style="background:#FAF9F6; border:1px solid #EFECE6; border-radius:12px; padding:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <div style="font-size:13px; font-weight:700; color:#1E1B4B; display:flex; align-items:center; gap:6px;">
            <span>${escapeHtml(a.name)}</span>
            <span style="font-size:10px; background:#DCFCE7; color:#15803D; font-weight:700; padding:1px 6px; border-radius:8px;">Active</span>
          </div>
          <span style="font-family:monospace; font-size:11px; background:#EEF2FF; color:#4F46E5; padding:2px 8px; border-radius:6px; font-weight:700;">${a.code}</span>
        </div>
        <div style="font-size:11px; color:#64748B; margin-bottom:6px;">
          🏫 ${escapeHtml(a.campus_name)} • 📞 ${escapeHtml(a.phone || "No phone")} • 📧 ${escapeHtml(a.email || "No email")}
        </div>
        <div style="display:flex; gap:14px; font-size:11px; font-weight:600; color:#334155; padding-top:6px; border-top:1px solid #EFECE6; flex-wrap:wrap;">
          <span>👥 Referrals: <strong style="color:#059669;">${a.referrals_count || refs.length}</strong></span>
          <span>👁️ Clicks: <strong>${a.clicks || 0}</strong></span>
          <span>💰 Total Earned: <strong>₦${(a.total_earned || 0).toLocaleString()}</strong></span>
          <span>🏦 Paid Out: <strong>₦${(a.paid_out || 0).toLocaleString()}</strong></span>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
