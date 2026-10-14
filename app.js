const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check for ambassador referral on load
document.addEventListener("DOMContentLoaded", () => {
  const refCode = (window.getCampallyReferralCode && window.getCampallyReferralCode()) || 
                  localStorage.getItem("campally_ref_code") || 
                  new URLSearchParams(window.location.search).get("ref");

  if (refCode) {
    const banner = document.getElementById("ambassador-referral-banner");
    const bannerTitle = document.getElementById("ambassador-banner-title");
    const bannerDesc = document.getElementById("ambassador-banner-desc");
    if (banner) {
      banner.style.display = "block";
      if (bannerTitle) bannerTitle.textContent = `🎓 Invited by Campus Ambassador (${refCode})`;
      fetch(`/api/ambassadors/lookup?code=${encodeURIComponent(refCode)}`)
        .then(res => res.json())
        .then(info => {
          if (info.success && info.ambassador) {
            if (bannerTitle) bannerTitle.textContent = `🎓 Invited by ${info.ambassador.name} (${info.ambassador.campus_name})`;
            if (bannerDesc) bannerDesc.textContent = `You're joining through an official campus referral link. Sign up to unlock safe campus buying & selling!`;
          }
        })
        .catch(() => {});
    }
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const fullName = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const privacyConsent = document.getElementById("privacy-consent");
  const submitBtn = document.getElementById("signup-submit-btn");

  if (privacyConsent && !privacyConsent.checked) {
    if (window.showToast) window.showToast("Please agree to the Privacy Policy to sign up.", "error");
    else alert("Please agree to the Privacy Policy before creating an account.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: fullName }
      }
    });
    
    if (error) {
      if (window.showToast) window.showToast("Signup failed: " + error.message, "error");
      else alert("Signup failed: " + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
      }
    } else {
      sessionStorage.removeItem("campally_visitor_mode");
      localStorage.setItem("campally_just_signed_up", "true");
      localStorage.setItem("campally_show_guide_suggestion", "true");
      if (fullName) localStorage.setItem("campally_user_name", fullName);

      // Attribute referral to Campus Ambassador
      const referralCode = (window.getCampallyReferralCode && window.getCampallyReferralCode()) || 
                           localStorage.getItem("campally_ref_code") || 
                           new URLSearchParams(window.location.search).get("ref");
      if (referralCode) {
        fetch("/api/ambassadors/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: referralCode,
            user_id: data?.user?.id || null,
            user_name: fullName,
            user_email: email
          })
        })
        .then(r => r.json())
        .then(refRes => {
          if (refRes.success) {
            console.log("[Ambassador] Referral credited to:", refRes.ambassador_name);
          }
        })
        .catch(err => console.warn("Referral crediting error:", err));
      }

      if (window.showToast) window.showToast("Account created successfully!", "success");

      const modal = document.getElementById("new-user-welcome-modal");
      const heading = document.getElementById("welcome-modal-heading");
      if (modal) {
        if (heading && fullName) {
          heading.textContent = `Welcome to Campally, ${fullName}! 🎉`;
        }
        modal.style.display = "flex";

        const seeHowBtn = document.getElementById("see-how-to-use-btn");
        if (seeHowBtn) {
          seeHowBtn.onclick = () => {
            window.location.href = "how-to-use.html?from=signup";
          };
        }

        const continueBtn = document.getElementById("continue-to-profile-btn");
        if (continueBtn) {
          continueBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = "profile.html?welcome=1";
          };
        }
      } else {
        setTimeout(() => {
          window.location.href = "how-to-use.html?from=signup";
        }, 600);
      }
    }
  } catch (err) {
    if (window.showToast) window.showToast("Error: " + err.message, "error");
    else alert("Error: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  }
});

const browseVisitorLink = document.getElementById("browse-visitor-link");
if (browseVisitorLink) {
  browseVisitorLink.addEventListener("click", async (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    window.location.href = "home.html?visitor=true";
  });
}