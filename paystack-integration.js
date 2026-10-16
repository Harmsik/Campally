/**
 * Campally - Paystack Client Integration & Monetization Engine
 *
 * Fixed version: no dependency on a separate server. Verification runs
 * on a Supabase Edge Function (paystack-verify), which holds the secret
 * key safely and checks the payment with Paystack directly.
 */

(function () {
  const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const CAMPALLY_PAY = {
    config: null,
    activePromotions: {
      boosts: [],
      urgent: [],
      proSellers: [],
      businesses: []
    },
    initialized: false
  };

  // Plans and public key are safe to keep directly in the browser --
  // the public key is MEANT to be public, and the real price enforcement
  // happens server-side in the Edge Function, not here.
  function fetchConfig() {
    if (CAMPALLY_PAY.config) return CAMPALLY_PAY.config;
    CAMPALLY_PAY.config = {
      publicKey: "pk_live_2c184fbcb27a4bb80487dfe2dc43c37bc17072d2",
      isLive: true,
      plans: {
        boost_3d: { id: "boost_3d", priceNaira: 300, amountKobo: 30000, name: "3-Day Boost" },
        boost_7d: { id: "boost_7d", priceNaira: 500, amountKobo: 50000, name: "7-Day Boost" },
        urgent: { id: "urgent", priceNaira: 200, amountKobo: 20000, name: "Urgent Sale Tag" },
        pro_seller: { id: "pro_seller", priceNaira: 500, amountKobo: 50000, name: "Pro Seller Badge" }
      }
    };
    return CAMPALLY_PAY.config;
  }

  // Active promotions now come straight from the database --
  // no more dependency on a server that can't run on GitHub Pages.
  async function fetchActivePromotions() {
    try {
      const nowIso = new Date().toISOString();

      const [{ data: boosted }, { data: urgent }, { data: pros }] = await Promise.all([
        supabase.from("listings").select("id").gt("boosted_until", nowIso),
        supabase.from("listings").select("id").gt("urgent_until", nowIso),
        supabase.from("profiles").select("id").gt("pro_seller_until", nowIso)
      ]);

      CAMPALLY_PAY.activePromotions = {
        boosts: (boosted || []).map(r => String(r.id)),
        urgent: (urgent || []).map(r => String(r.id)),
        proSellers: (pros || []).map(r => String(r.id)),
        businesses: [] // Business spotlight not migrated yet
      };
    } catch (e) {
      console.warn("Could not fetch active promotions:", e);
    }
    return CAMPALLY_PAY.activePromotions;
  }

  CAMPALLY_PAY.isListingBoosted = function (listingId) {
    if (!listingId) return false;
    return (CAMPALLY_PAY.activePromotions.boosts || []).includes(String(listingId));
  };

  CAMPALLY_PAY.isListingUrgent = function (listingId) {
    if (!listingId) return false;
    return (CAMPALLY_PAY.activePromotions.urgent || []).includes(String(listingId));
  };

  CAMPALLY_PAY.isSellerPro = function (sellerId) {
    if (!sellerId) return false;
    return (CAMPALLY_PAY.activePromotions.proSellers || []).includes(String(sellerId));
  };

  CAMPALLY_PAY.getBusinesses = function () {
    return CAMPALLY_PAY.activePromotions.businesses || [];
  };

  function getCachedStudentEmail() {
    return localStorage.getItem("campally_user_email") || "";
  }

  // Ask our Edge Function to verify the payment with Paystack and activate the feature.
  async function doServerVerify(params) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        const msg = "You must be logged in to verify a payment.";
        if (window.showToast) window.showToast(msg, "error"); else alert(msg);
        return null;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_ANON_KEY
        },
        body: JSON.stringify(params)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (window.showToast) {
          window.showToast(`🎉 Payment Confirmed! ${data.plan || "Upgrade"} is now active!`, "success");
        } else {
          alert(`🎉 Payment Confirmed! ${data.plan || "Upgrade"} is now active!`);
        }
        await fetchActivePromotions();
        return data;
      } else {
        const errorMsg = data.error || "Payment verification failed.";
        if (window.showToast) window.showToast(errorMsg, "warning"); else alert(errorMsg);
        return null;
      }
    } catch (err) {
      console.error("Verification network error:", err);
      if (window.showToast) window.showToast("Network error verifying transaction.", "error");
      return null;
    }
  }

  // Checkout: opens Paystack's own inline popup directly -- no separate
  // "initialize" server call needed, since the popup can start a payment
  // on its own using only the public key.
  CAMPALLY_PAY.startCheckout = async function (options) {
    const { planId, itemId, itemTitle, userEmail, onSuccess, onClose } = options;

    const config = fetchConfig();
    const plan = config?.plans?.[planId];

    if (!plan) {
      if (window.showToast) window.showToast("Invalid promotion package selected", "error");
      return;
    }

    if (!window.PaystackPop) {
      const msg = "Payment system failed to load. Please check your connection and try again.";
      if (window.showToast) window.showToast(msg, "error"); else alert(msg);
      return;
    }

    const email = userEmail || getCachedStudentEmail();
    if (!email || !email.includes("@")) {
      const msg = "A valid email is required for payment.";
      if (window.showToast) window.showToast(msg, "error"); else alert(msg);
      return;
    }
    localStorage.setItem("campally_user_email", email);

    const handler = window.PaystackPop.setup({
      key: config.publicKey,
      email: email,
      amount: plan.amountKobo,
      currency: "NGN",
      callback: async function (response) {
        if (window.showToast) window.showToast("Verifying your payment...", "info");
        const verified = await doServerVerify({
          reference: response.reference,
          planId: plan.id,
          itemId: itemId || null
        });
        if (verified && typeof onSuccess === "function") onSuccess(verified);
      },
      onClose: function () {
        if (typeof onClose === "function") onClose();
      }
    });
    handler.openIframe();
  };

  // UI Modal: Pro Verified Student Seller Badge (₦500)
  CAMPALLY_PAY.openProSellerModal = function (userData, onComplete) {
    const existing = document.getElementById("pro-seller-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "pro-seller-modal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    const defaultEmail = userData?.email || getCachedStudentEmail();

    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px; text-align:left; border-radius:18px;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#E8553D;">
            <i class="fa-solid fa-crown"></i> Campally Pro Seller
          </h3>
          <button id="close-pro-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <div style="text-align:center; margin-bottom:16px;">
          <div style="width:58px; height:58px; background:#FEF3C7; color:#D97706; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:26px; margin-bottom:8px;">
            <i class="fa-solid fa-crown"></i>
          </div>
          <h4 style="font-size:16px; color:#2B2B2B; margin-bottom:4px;">Pro Verified Student Seller</h4>
          <p style="font-size:13px; color:#666; margin:0;">Win instant trust & priority placement across campus</p>
        </div>

        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:12px; margin-bottom:14px;">
          <ul style="font-size:12px; color:#92400E; margin:0; padding-left:18px; line-height:1.7;">
            <li>⭐ <strong>Pro Verified Badge</strong> next to your name on all your items</li>
            <li>Priority ranking when students search for items</li>
            <li>Valid for the entire academic semester (120 Days)</li>
          </ul>
        </div>

        <form id="pro-seller-checkout-form" style="display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px;">
              Your Student Email (for Paystack payment receipt)
            </label>
            <input type="email" id="pro-checkout-email" value="${defaultEmail}" required style="width:100%; padding:10px 12px; border:1px solid #E5E0D8; border-radius:10px; font-size:13px; background:#FAF9F6;" placeholder="student@gmail.com">
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#FAF9F6; border:1px solid #E5E0D8; border-radius:12px;">
            <span style="font-size:13px; font-weight:600; color:#444;">Semester Pass:</span>
            <span style="font-size:18px; font-weight:800; color:#E8553D;">₦500</span>
          </div>

          <button type="submit" id="pay-pro-btn" class="btn-primary" style="margin-top:4px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; padding:13px; background:#E8553D;">
            <i class="fa-solid fa-lock"></i> Upgrade with Paystack (₦500)
          </button>
        </form>

        <div style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; color:#888; margin-top:12px;">
          <i class="fa-solid fa-shield-check" style="color:#059669;"></i> Official Paystack Integration • Card, Transfer, USSD
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-pro-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    const form = modal.querySelector("#pro-seller-checkout-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredEmail = modal.querySelector("#pro-checkout-email").value.trim();
      if (!enteredEmail || !enteredEmail.includes("@")) {
        if (window.showToast) window.showToast("Please enter a valid email address.", "warning");
        return;
      }
      localStorage.setItem("campally_user_email", enteredEmail);
      modal.remove();

      CAMPALLY_PAY.startCheckout({
        planId: "pro_seller",
        itemTitle: "Pro Verified Seller Badge",
        userEmail: enteredEmail,
        onSuccess: (data) => { if (typeof onComplete === "function") onComplete(data); }
      });
    });
  };

  // UI Modal: Boost Listing
  CAMPALLY_PAY.openBoostModal = function (itemId, itemTitle, onComplete) {
    const existing = document.getElementById("boost-payment-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "boost-payment-modal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    const defaultEmail = getCachedStudentEmail();

    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px; text-align:left; border-radius:18px;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#E8553D;">
            <i class="fa-solid fa-fire"></i> Boost Listing
          </h3>
          <button id="close-boost-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <p style="font-size:13px; color:#555; margin-bottom:14px;">
          Pin <strong>"${itemTitle || 'Your item'}"</strong> to the top of your campus feed and sell up to <strong>3x faster</strong>!
        </p>

        <form id="boost-checkout-form" style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="border:2px solid #E8553D; background:#FFF5F3; border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="radio" name="boost_tier" value="boost_3d" checked style="accent-color:#E8553D; width:18px; height:18px;">
                <div>
                  <div style="font-weight:700; font-size:14px; color:#2B2B2B;">⚡ 3-Day Campus Boost</div>
                  <div style="font-size:12px; color:#666;">Top spot for 3 days</div>
                </div>
              </div>
              <div style="font-weight:800; font-size:16px; color:#E8553D;">₦300</div>
            </label>

            <label style="border:1px solid #E5E0D8; background:#FFFFFF; border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="radio" name="boost_tier" value="boost_7d" style="accent-color:#E8553D; width:18px; height:18px;">
                <div>
                  <div style="font-weight:700; font-size:14px; color:#2B2B2B;">🔥 7-Day Mega Boost <span style="font-size:10px; background:#DC2626; color:white; padding:2px 6px; border-radius:6px; margin-left:4px;">POPULAR</span></div>
                  <div style="font-size:12px; color:#666;">Top spot for a full week</div>
                </div>
              </div>
              <div style="font-weight:800; font-size:16px; color:#2B2B2B;">₦500</div>
            </label>
          </div>

          <div>
            <label style="font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px; margin-top:6px;">
              Your Email (for Paystack receipt)
            </label>
            <input type="email" id="boost-checkout-email" value="${defaultEmail}" required style="width:100%; padding:10px 12px; border:1px solid #E5E0D8; border-radius:10px; font-size:13px; background:#FAF9F6;" placeholder="student@gmail.com">
          </div>

          <button type="submit" class="btn-primary" style="margin-top:4px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; padding:13px;">
            <i class="fa-solid fa-lock"></i> Pay with Paystack
          </button>
        </form>

        <div style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; color:#888; margin-top:10px;">
          <i class="fa-solid fa-shield-check" style="color:#059669;"></i> Cards • Bank Transfer • USSD
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-boost-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    const form = modal.querySelector("#boost-checkout-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedTier = modal.querySelector('input[name="boost_tier"]:checked')?.value || "boost_3d";
      const email = modal.querySelector("#boost-checkout-email").value.trim();
      modal.remove();

      CAMPALLY_PAY.startCheckout({
        planId: selectedTier,
        itemId: itemId,
        itemTitle: itemTitle,
        userEmail: email,
        onSuccess: (data) => { if (typeof onComplete === "function") onComplete(data); }
      });
    });
  };

  // UI Modal: Urgent Tag (₦200)
  CAMPALLY_PAY.openUrgentModal = function (itemId, itemTitle, onComplete) {
    const existing = document.getElementById("urgent-payment-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "urgent-payment-modal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    const defaultEmail = getCachedStudentEmail();

    modal.innerHTML = `
      <div class="modal-content" style="max-width:420px; text-align:left; border-radius:18px;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#DC2626;">
            <i class="fa-solid fa-triangle-exclamation"></i> Mark as Urgent Sale
          </h3>
          <button id="close-urgent-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <p style="font-size:13px; color:#555; margin-bottom:14px;">
          Moving out or need quick cash? Add a bright <strong>🚨 Urgent Sale</strong> tag to <strong>"${itemTitle || 'Your item'}"</strong> for 14 days.
        </p>

        <form id="urgent-checkout-form" style="display:flex; flex-direction:column; gap:10px;">
          <div style="background:#FEF2F2; border:1px solid #FEE2E2; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:13px; color:#991B1B;">🚨 Urgent Sale Tag (14 Days)</div>
              <div style="font-size:11px; color:#B91C1C;">Signals ready to negotiate & instant deal</div>
            </div>
            <div style="font-weight:800; font-size:18px; color:#DC2626;">₦200</div>
          </div>

          <div>
            <label style="font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px;">
              Your Email (for Paystack receipt)
            </label>
            <input type="email" id="urgent-checkout-email" value="${defaultEmail}" required style="width:100%; padding:10px 12px; border:1px solid #E5E0D8; border-radius:10px; font-size:13px; background:#FAF9F6;" placeholder="student@gmail.com">
          </div>

          <button type="submit" class="btn-primary" style="background:#DC2626; margin-top:4px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; padding:13px;">
            <i class="fa-solid fa-lock"></i> Pay ₦200 with Paystack
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-urgent-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    const form = modal.querySelector("#urgent-checkout-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = modal.querySelector("#urgent-checkout-email").value.trim();
      modal.remove();

      CAMPALLY_PAY.startCheckout({
        planId: "urgent",
        itemId: itemId,
        itemTitle: itemTitle,
        userEmail: email,
        onSuccess: (data) => { if (typeof onComplete === "function") onComplete(data); }
      });
    });
  };

  // Auto-init
  fetchConfig();
  fetchActivePromotions();

  window.CampallyPay = CAMPALLY_PAY;
})();
