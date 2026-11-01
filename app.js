const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Finds the ambassador referral code: from the link (?ref=...) or saved earlier on this phone.
function getRefCode() {
  const fromUrl = new URLSearchParams(window.location.search).get("ref");
  if (fromUrl) {
    // Remember it, in case the student looks around before signing up
    try { localStorage.setItem("campally_ref_code", fromUrl); } catch (e) {}
    return fromUrl;
  }
  return (window.getCampallyReferralCode && window.getCampallyReferralCode()) ||
         localStorage.getItem("campally_ref_code") ||
         null;
}

// Show the "Invited by ..." banner when someone arrives through an ambassador's link
document.addEventListener("DOMContentLoaded", () => {
  const refCode = getRefCode();

  if (refCode) {
    const banner = document.getElementById("ambassador-referral-banner");
    const bannerTitle = document.getElementById("ambassador-banner-title");
    const bannerDesc = document.getElementById("ambassador-banner-desc");
    if (banner) {
      // Ask the database who this code belongs to (only approved ambassadors are found)
      supabase.rpc("get_ambassador_public", { p_code: refCode })
        .then(({ data }) => {
          if (data && data.name) {
            banner.style.display = "block";
            if (bannerTitle) bannerTitle.textContent = `🎓 Invited by ${data.name} (${data.campus_name})`;
            if (bannerDesc) bannerDesc.textContent = `You're joining through an official campus referral link. Sign up to unlock safe campus buying & selling!`;
          }
          // If the code is not a real approved ambassador, the banner stays hidden.
        })
        .catch(() => {});
    }
  }
});

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const fullName = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const privacyConsent = document.getElementById("privacy-consent");
  const marketingConsent = document.getElementById("marketing-consent"); // NEW
  const submitBtn = document.getElementById("signup-submit-btn");

  if (privacyConsent && !privacyConsent.checked) {
    UI.formError(signupForm, "Please tick the box to agree to the Privacy Policy before you sign up.", { fields: [privacyConsent] });
    return;
  }
  if (password.length < 6) {
    UI.formError(signupForm, "Your password needs at least 6 characters.", { fields: [document.getElementById("password")] });
    return;
  }

  UI.clearFormError(signupForm);
  const restoreBtn = UI.busy(submitBtn, "Creating your account...");

  try {
    // The referral code travels with the signup. The database saves it
    // on the new student's profile (only if it is a real approved ambassador).
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: fullName, ref_code: getRefCode() }
      }
    });
    
    if (error) {
      const exists = /already (been )?registered/i.test(error.message || "");
      UI.formError(signupForm, UI.friendly(error), {
        fields: exists ? [document.getElementById("email")] : [],
        href: exists ? "login.html" : "",
        label: "Log in"
      });
      restoreBtn();
    } else {
      // NEW: save the optional "email me updates" choice (never blocks signup)
      if (marketingConsent && marketingConsent.checked && data && data.user) {
        try {
          await supabase.from("profiles")
            .update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() })
            .eq("id", data.user.id);
        } catch (e) {}
      }

      sessionStorage.removeItem("campally_visitor_mode");
      localStorage.setItem("campally_just_signed_up", "true");
      localStorage.setItem("campally_show_guide_suggestion", "true");
      if (fullName) localStorage.setItem("campally_user_name", fullName);

      if (window.showToast) window.showToast("Account created. Welcome to Campally!", "success");

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
    UI.formError(signupForm, UI.friendly(err));
    restoreBtn();
  }
  });
}

const browseVisitorLink = document.getElementById("browse-visitor-link");
if (browseVisitorLink) {
  browseVisitorLink.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("campally_visitor_mode", "true");
    window.location.href = "home.html?visitor=true";
  });
                 }
