/**
 * Campally - Paystack Client Integration & Monetization Engine
 * 
 * Bulletproof Multi-Platform Checkout:
 * - Public key and plans are dynamically retrieved from /api/paystack/config
 * - Secret key is strictly protected server-side on /api/paystack/verify
 * - NO window.prompt() (safe in all iframe and mobile browser contexts)
 * - Dual payment paths: Official Paystack Payment Redirect & Paystack Inline Popup
 * - Automated verification on return from Paystack checkout (handles ?reference= query parameter)
 */

(function () {
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

  // Safe Public Configuration Fetcher
  async function fetchConfig() {
    if (CAMPALLY_PAY.config) return CAMPALLY_PAY.config;
    try {
      const res = await fetch("/api/paystack/config");
      if (res.ok) {
        CAMPALLY_PAY.config = await res.json();
      }
    } catch (e) {
      console.warn("Using default Paystack public configuration");
    }

    if (!CAMPALLY_PAY.config) {
      CAMPALLY_PAY.config = {
        publicKey: "pk_live_2c184fbcb27a4bb80487dfe2dc43c37bc17072d2",
        isLive: true,
        plans: {
          boost_3d: { id: "boost_3d", priceNaira: 300, amountKobo: 30000, name: "3-Day Boost" },
          boost_7d: { id: "boost_7d", priceNaira: 500, amountKobo: 50000, name: "7-Day Boost" },
          urgent: { id: "urgent", priceNaira: 200, amountKobo: 20000, name: "Urgent Sale Tag" },
          pro_seller: { id: "pro_seller", priceNaira: 500, amountKobo: 50000, name: "Pro Seller Badge" },
          campus_business: { id: "campus_business", priceNaira: 1500, amountKobo: 150000, name: "Business Showcase" }
        }
      };
    }
    return CAMPALLY_PAY.config;
  }

  // Fetch active promotions
  async function fetchActivePromotions() {
    try {
      const res = await fetch("/api/promotions/active");
      if (res.ok) {
        const data = await res.json();
        CAMPALLY_PAY.activePromotions = data;
        return data;
      }
    } catch (e) {
      console.warn("Could not fetch active promotions:", e);
    }
    return CAMPALLY_PAY.activePromotions;
  }

  // Query helpers
  CAMPALLY_PAY.isListingBoosted = function (listingId) {
    if (!listingId) return false;
    const strId = String(listingId);
    return (CAMPALLY_PAY.activePromotions.boosts || []).includes(strId);
  };

  CAMPALLY_PAY.isListingUrgent = function (listingId) {
    if (!listingId) return false;
    const strId = String(listingId);
    return (CAMPALLY_PAY.activePromotions.urgent || []).includes(strId);
  };

  CAMPALLY_PAY.isSellerPro = function (sellerId) {
    if (!sellerId) return false;
    const strId = String(sellerId);
    return (CAMPALLY_PAY.activePromotions.proSellers || []).includes(strId);
  };

  CAMPALLY_PAY.getBusinesses = function (campusId) {
    const list = CAMPALLY_PAY.activePromotions.businesses || [];
    if (!campusId) return list;
    return list.filter(b => !b.campusId || Number(b.campusId) === Number(campusId));
  };

  // Helper to get fallback student email
  function getCachedStudentEmail() {
    return localStorage.getItem("campally_user_email") || "mbuharmless@gmail.com";
  }

  // Primary Checkout Engine (Never uses window.prompt)
  CAMPALLY_PAY.startCheckout = async function (options) {
    const {
      planId,
      itemId,
      itemTitle,
      userId,
      userEmail,
      metadata = {},
      onSuccess,
      onClose
    } = options;

    const config = await fetchConfig();
    const plan = config?.plans?.[planId];

    if (!plan) {
      if (window.showToast) window.showToast("Invalid promotion package selected", "error");
      return;
    }

    const email = userEmail || getCachedStudentEmail();
    localStorage.setItem("campally_user_email", email);

    // Show persistent Loading/Checkout Modal
    const existing = document.getElementById("paystack-active-checkout-modal");
    if (existing) existing.remove();

    const checkoutModal = document.createElement("div");
    checkoutModal.id = "paystack-active-checkout-modal";
    checkoutModal.className = "modal-backdrop";
    checkoutModal.style.display = "flex";

    checkoutModal.innerHTML = `
      <div class="modal-content" style="max-width:440px; text-align:left; border-radius:18px;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#E8553D;">
            <i class="fa-solid fa-lock"></i> Paystack Secure Payment
          </h3>
          <button id="close-checkout-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <div id="checkout-status-panel" style="text-align:center; padding:16px 0;">
          <div style="font-size:24px; color:#E8553D; margin-bottom:12px;">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <h4 style="font-size:15px; color:#2B2B2B; margin-bottom:4px;">Connecting to Paystack...</h4>
          <p style="font-size:13px; color:#777; margin:0;">Initializing payment session for <strong>${plan.name}</strong> (₦${plan.priceNaira})</p>
        </div>
      </div>
    `;

    document.body.appendChild(checkoutModal);

    checkoutModal.querySelector("#close-checkout-modal-btn").addEventListener("click", () => {
      checkoutModal.remove();
      if (typeof onClose === "function") onClose();
    });

    try {
      const initRes = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          planId: plan.id,
          itemId: itemId,
          userId: userId,
          callbackUrl: `${window.location.origin}${window.location.pathname}?paystack_ref=success&planId=${plan.id}&itemId=${itemId || ''}&userId=${userId || ''}`,
          metadata: metadata
        })
      });

      const initData = await initRes.json();

      if (!initRes.ok || !initData.success) {
        checkoutModal.querySelector("#checkout-status-panel").innerHTML = `
          <div style="color:#DC2626; font-size:28px; margin-bottom:10px;"><i class="fa-solid fa-circle-exclamation"></i></div>
          <h4 style="font-size:15px; color:#991B1B; margin-bottom:6px;">Initialization Error</h4>
          <p style="font-size:13px; color:#666; margin-bottom:16px;">${initData.error || "Unable to start Paystack checkout session."}</p>
          <button class="btn-primary" onclick="document.getElementById('paystack-active-checkout-modal')?.remove()" style="margin:0;">Close</button>
        `;
        return;
      }

      const reference = initData.reference;
      const authUrl = initData.authorizationUrl;

      const isLive = Boolean(config && (config.isLive || (config.publicKey && config.publicKey.startsWith("pk_live_"))));

      // Update modal with active Paystack action buttons
      checkoutModal.querySelector("#checkout-status-panel").innerHTML = `
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:14px; padding:14px; margin-bottom:16px; text-align:center;">
          <div style="width:42px; height:42px; background:#D1FAE5; color:#059669; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:8px;">
            <i class="fa-solid fa-credit-card"></i>
          </div>
          <h4 style="font-size:15px; color:#065F46; margin:0 0 4px 0; font-weight:700;">Paystack Checkout Ready</h4>
          <p style="font-size:12px; color:#047857; margin:0;">
            Reference: <strong style="font-family:monospace; background:#E6F4EA; padding:1px 6px; border-radius:4px;">${reference}</strong>
          </p>
          <div style="font-size:18px; font-weight:800; color:#065F46; margin-top:6px;">₦${plan.priceNaira}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <a href="${authUrl}" target="_blank" rel="noopener noreferrer" id="paystack-redirect-link-btn" class="btn-primary" style="background:#059669; text-decoration:none; text-align:center; padding:13px; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; border-radius:12px; box-shadow:0 4px 12px rgba(5,150,105,0.25);">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Paystack Checkout (${'₦' + plan.priceNaira}) &rarr;
          </a>

          <button id="verify-payment-btn" class="edit-btn" style="padding:12px; font-size:13px; font-weight:700; cursor:pointer; background:#FFFFFF; border:1px solid #E5E0D8; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fa-solid fa-rotate"></i> I Have Paid — Verify & Activate Now
          </button>

            <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:8px 12px; font-size:11px; color:#166534; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:600;">
              <i class="fa-solid fa-circle-check"></i> Secured by Paystack Official Gateway
            </div>
        </div>

        <div style="font-size:11px; color:#888; text-align:center; margin-top:14px; line-height:1.4;">
          <i class="fa-solid fa-shield-check" style="color:#059669;"></i> Cards • Bank Transfer • USSD • OPay • Apple Pay
        </div>
      `;

      // Verify on button click
      const verifyBtn = checkoutModal.querySelector("#verify-payment-btn");
      verifyBtn.addEventListener("click", async () => {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking with Paystack...`;

        const verified = await doServerVerify({
          reference: reference,
          planId: plan.id,
          itemId: itemId,
          userId: userId,
          userEmail: email,
          metadata: metadata
        });

        if (verified) {
          checkoutModal.remove();
          if (typeof onSuccess === "function") onSuccess(verified);
        } else {
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> I Have Paid — Verify & Activate Now`;
        }
      });

      // Also try inline popup if supported in the current frame
      if (window.PaystackPop) {
        try {
          const handler = window.PaystackPop.setup({
            key: config.publicKey,
            email: email,
            amount: plan.amountKobo,
            currency: "NGN",
            ref: reference,
            callback: async function (response) {
              const verified = await doServerVerify({
                reference: response.reference,
                planId: plan.id,
                itemId: itemId,
                userId: userId,
                userEmail: email,
                metadata: metadata,
                testSimulate: false
              });
              if (verified) {
                checkoutModal.remove();
                if (typeof onSuccess === "function") onSuccess(verified);
              }
            }
          });
          handler.openIframe();
        } catch (popupErr) {
          console.warn("Inline popup not available in this frame, standard checkout link is active:", popupErr);
        }
      }

    } catch (err) {
      console.error("Checkout launch error:", err);
      checkoutModal.querySelector("#checkout-status-panel").innerHTML = `
        <div style="color:#DC2626; font-size:24px; margin-bottom:8px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <p style="font-size:13px; color:#444;">Failed to connect to payment server. Please check your network connection.</p>
        <button class="btn-primary" onclick="document.getElementById('paystack-active-checkout-modal')?.remove()" style="margin:0;">Close</button>
      `;
    }
  };

  // Central Server Verification Request
  async function doServerVerify(params) {
    try {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (window.showToast) {
          window.showToast(`🎉 Payment Confirmed! ${data.plan || 'Upgrade'} is now active!`, "success");
        } else {
          alert(`🎉 Payment Confirmed! ${data.plan || 'Upgrade'} is now active!`);
        }
        await fetchActivePromotions();
        return data;
      } else {
        const errorMsg = data.error || "Payment not yet confirmed by bank.";
        if (window.showToast) window.showToast(errorMsg, "warning");
        else alert(errorMsg);
        return null;
      }
    } catch (err) {
      console.error("Verification network error:", err);
      if (window.showToast) window.showToast("Network error verifying transaction.", "error");
      return null;
    }
  }

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
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

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
        userId: userData?.id || null,
        userEmail: enteredEmail,
        onSuccess: (data) => {
          if (typeof onComplete === "function") onComplete(data);
        }
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
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

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
        onSuccess: (data) => {
          if (typeof onComplete === "function") onComplete(data);
        }
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
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

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
        onSuccess: (data) => {
          if (typeof onComplete === "function") onComplete(data);
        }
      });
    });
  };

  // UI Modal: Campus Business Spotlight & Banner (₦1,500)
  CAMPALLY_PAY.openCampusBusinessModal = function (campusId, onComplete) {
    const existing = document.getElementById("biz-spotlight-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "biz-spotlight-modal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    const defaultCampus = window.getCampusShort ? window.getCampusShort(campusId || 1) : "FUNAI";
    const defaultEmail = getCachedStudentEmail();

    modal.innerHTML = `
      <div class="modal-content" style="max-width:460px; text-align:left; border-radius:18px;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#E8553D;">
            <i class="fa-solid fa-store"></i> Promote Campus Business
          </h3>
          <button id="close-biz-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <p style="font-size:13px; color:#555; margin-bottom:12px;">
          Feature your campus service (barbing, baking, laundry, printing, repair) on the homepage showcase for <strong>30 days</strong>!
        </p>

        <form id="biz-spotlight-form" class="auth-form" style="gap:10px;">
          <div>
            <label style="margin-top:2px; font-size:12px;">Business Name</label>
            <input type="text" id="biz-name" placeholder="e.g. Ebube Cuts & Braids" required style="padding:10px 12px; font-size:13px;">
          </div>

          <div>
            <label style="margin-top:2px; font-size:12px;">Service Category</label>
            <select id="biz-category" required style="width:100%; padding:10px 12px; font-size:13px; border:1px solid #E5E0D8; border-radius:10px; background:#FAF9F6;">
              <option value="Salon & Grooming">💇 Hair Styling / Barbing</option>
              <option value="Food & Pastries">🍔 Campus Food & Pastries</option>
              <option value="Gadgets & Repairs">💻 Tech / Phone / Laptop Repairs</option>
              <option value="Printing & Project Binding">🖨️ Printing & Project Binding</option>
              <option value="Laundry & Cleaning">🧺 Laundry & Dry Cleaning</option>
              <option value="Hostel & Lodge Agent">🏠 Lodge & Hostel Finder</option>
              <option value="Other Student Services">⭐ Other Campus Service</option>
            </select>
          </div>

          <div>
            <label style="margin-top:2px; font-size:12px;">Hostel, Lodge, or Campus Location</label>
            <input type="text" id="biz-location" placeholder="e.g. Perm Site Gate or Room Delivery" required style="padding:10px 12px; font-size:13px;">
          </div>

          <div>
            <label style="margin-top:2px; font-size:12px;">Active WhatsApp Number</label>
            <input type="tel" id="biz-whatsapp" placeholder="e.g. 08012345678" required style="padding:10px 12px; font-size:13px;">
          </div>

          <div>
            <label style="margin-top:2px; font-size:12px;">Tagline / Short Description</label>
            <textarea id="biz-desc" placeholder="What do you offer to students..." required style="width:100%; padding:10px; border:1px solid #E5E0D8; border-radius:10px; font-size:13px; background:#FAF9F6; min-height:50px; font-family:inherit;"></textarea>
          </div>

          <div>
            <label style="margin-top:2px; font-size:12px;">Your Email (for Paystack receipt)</label>
            <input type="email" id="biz-email" value="${defaultEmail}" required style="padding:10px 12px; font-size:13px;">
          </div>

          <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:13px; color:#065F46;">🌟 30 Days Homepage Spotlight</div>
              <div style="font-size:11px; color:#047857;">Featured banner with 1-tap WhatsApp chat</div>
            </div>
            <div style="font-weight:800; font-size:16px; color:#059669;">₦1,500</div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top:4px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; padding:12px;">
            <i class="fa-solid fa-lock"></i> Pay ₦1,500 with Paystack
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-biz-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    const form = modal.querySelector("#biz-spotlight-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = modal.querySelector("#biz-name").value.trim();
      const category = modal.querySelector("#biz-category").value;
      const lodge = modal.querySelector("#biz-location").value.trim();
      const whatsapp = modal.querySelector("#biz-whatsapp").value.trim();
      const desc = modal.querySelector("#biz-desc").value.trim();
      const email = modal.querySelector("#biz-email").value.trim();

      modal.remove();

      CAMPALLY_PAY.startCheckout({
        planId: "campus_business",
        itemTitle: name + " (" + category + ")",
        userEmail: email,
        metadata: {
          business: {
            name: name,
            category: category,
            lodge: lodge,
            whatsapp: whatsapp,
            description: desc,
            campusId: campusId || 1,
            campusName: defaultCampus
          }
        },
        onSuccess: (data) => {
          if (typeof onComplete === "function") onComplete(data);
        }
      });
    });
  };

  // Automated return verification on page load (?reference=... or ?trxref=...)
  async function checkUrlForPaystackReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("reference") || urlParams.get("trxref");
    const planId = urlParams.get("planId") || "pro_seller";
    const itemId = urlParams.get("itemId") || null;
    const userId = urlParams.get("userId") || null;

    if (ref) {
      console.log("[Paystack] Detected transaction reference in URL, verifying:", ref);
      if (window.showToast) window.showToast("Verifying your payment with Paystack...", "info");

      const verified = await doServerVerify({
        reference: ref,
        planId: planId,
        itemId: itemId,
        userId: userId,
        testSimulate: false
      });

      // Clean query params so user doesn't re-trigger on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      if (verified) {
        // Trigger UI refresh
        if (typeof window.checkProSellerStatus === "function") window.checkProSellerStatus();
        if (typeof window.loadMyListings === "function") window.loadMyListings();
        if (typeof window.fetchListingsForCampus === "function") window.fetchListingsForCampus(null);
      }
    }
  }

  // Auto-init on script load
  fetchConfig();
  fetchActivePromotions();
  checkUrlForPaystackReturn();

  window.CampallyPay = CAMPALLY_PAY;
})();
