/**
 * Campally - Paystack Client Integration & Monetization Engine
 *
 * Payments are verified on a Supabase Edge Function (paystack-verify),
 * which holds the secret key safely and checks each payment with Paystack.
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
    initialized: false,
    ready: null
  };

  // Plans and public key are safe in the browser -- the public key is MEANT
  // to be public, and real price enforcement happens in the Edge Function.
  function fetchConfig() {
    if (CAMPALLY_PAY.config) return CAMPALLY_PAY.config;
    CAMPALLY_PAY.config = {
      publicKey: "pk_live_2c184fbcb27a4bb80487dfe2dc43c37bc17072d2",
      isLive: true,
      plans: {
        boost_3d: { id: "boost_3d", priceNaira: 300, amountKobo: 30000, name: "3-Day Boost" },
        boost_7d: { id: "boost_7d", priceNaira: 500, amountKobo: 50000, name: "7-Day Boost" },
        urgent: { id: "urgent", priceNaira: 200, amountKobo: 20000, name: "Urgent Sale Tag" },
        pro_seller: { id: "pro_seller", priceNaira: 500, amountKobo: 50000, name: "Pro Seller Badge" },
        business_spotlight: { id: "business_spotlight", priceNaira: 1500, amountKobo: 150000, name: "Business Spotlight" }
      }
    };
    return CAMPALLY_PAY.config;
  }

  // Turns < > & and quotes into harmless plain text, so nothing a
  // student types can run as code on the page.
  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Active promotions come straight from the database.
  async function fetchActivePromotions() {
    try {
      const nowIso = new Date().toISOString();

      const [{ data: boosted }, { data: urgent }, { data: pros }, { data: biz }] = await Promise.all([
        supabase.from("listings").select("id").gt("boosted_until", nowIso),
        supabase.from("listings").select("id").gt("urgent_until", nowIso),
        supabase.from("profiles").select("id").gt("pro_seller_until", nowIso),
        supabase
          .from("campus_businesses")
          .select("id, name, category, description, lodge, whatsapp, campus_id")
          .eq("active", true)
          .gt("expires_at", nowIso)
          .order("expires_at", { ascending: false })
      ]);

      CAMPALLY_PAY.activePromotions = {
        boosts: (boosted || []).map(r => String(r.id)),
        urgent: (urgent || []).map(r => String(r.id)),
        proSellers: (pros || []).map(r => String(r.id)),
        businesses: (biz || []).map(b => ({
          id: b.id,
          name: escapeHtml(b.name),
          category: escapeHtml(b.category),
          description: escapeHtml(b.description),
          lodge: escapeHtml(b.lodge),
          whatsapp: String(b.whatsapp || "").replace(/[^0-9]/g, ""),
          campus_id: b.campus_id
        }))
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

  CAMPALLY_PAY.getBusinesses = function (campusId) {
    const all = CAMPALLY_PAY.activePromotions.businesses || [];
    if (!campusId) return all;
    return all.filter(b => !b.campus_id || String(b.campus_id) === String(campusId));
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

 // Checkout: opens Paystack's own popup directly using only the public key.
  CAMPALLY_PAY.startCheckout = async function (options) {
    const { planId, itemId, itemTitle, userEmail, business, onSuccess, onClose } = options;

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

    try {
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: email,
        amount: plan.amountKobo,
        currency: "NGN",
        // NOTE: must be a plain function (NOT async) -- Paystack's older
        // script rejects async functions with "callback must be a valid function".
        callback: function (response) {
          if (window.showToast) window.showToast("Verifying your payment...", "info");
          doServerVerify({
            reference: response.reference,
            planId: plan.id,
            itemId: itemId || null,
            business: business || null
          }).then(function (verified) {
            if (verified && typeof onSuccess === "function") onSuccess(verified);
          });
        },
        onClose: function () {
          if (typeof onClose === "function") onClose();
        }
      });
      handler.openIframe();
    } catch (err) {
      console.error("Paystack popup failed to open:", err);
      alert("Could not open the payment window: " + (err?.message || "unknown error") + "\n\nIf this keeps happening, your Paystack account may still need approval for live payments.");
    }
  };

  // UI Modal: Pro Seller Badge (₦500)
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
          <h4 style="font-size:16px; color:#2B2B2B; margin-bottom:4px;">Pro Seller</h4>
          <p style="font-size:13px; color:#666; margin:0;">Stand out & get priority placement across campus</p>
        </div>

        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:12px; margin-bottom:14px;">
          <ul style="font-size:12px; color:#92400E; margin:0; padding-left:18px; line-height:1.7;">
            <li>⭐ <strong>Pro Seller Badge</strong> next to your name on all your items</li>
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
        itemTitle: "Pro Seller Badge",
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
          Pin <strong>"${escapeHtml(itemTitle || 'Your item')}"</strong> to the top of your campus feed and sell up to <strong>3x faster</strong>!
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
          Moving out or need quick cash? Add a bright <strong>🚨 Urgent Sale</strong> tag to <strong>"${escapeHtml(itemTitle || 'Your item')}"</strong> for 14 days.
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

  // UI Modal: Promote a Student Business (₦1,500 for 15 days)
  CAMPALLY_PAY.openBusinessModal = async function () {
    const { data: s } = await supabase.auth.getSession();
    if (!s?.session) {
      if (window.showToast) window.showToast("Please sign in first to promote your business.", "warning");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
      return;
    }

    const existing = document.getElementById("business-payment-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "business-payment-modal";
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    const defaultEmail = escapeHtml(s.session.user?.email || getCachedStudentEmail());
    const inputStyle = "width:100%; padding:10px 12px; border:1px solid #E5E0D8; border-radius:10px; font-size:13px; background:#FAF9F6;";
    const labelStyle = "font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px;";

    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px; text-align:left; border-radius:18px; max-height:90vh; overflow-y:auto;">
        <div class="modal-header" style="border-bottom:1px solid #F0EDE6; padding-bottom:12px; margin-bottom:14px;">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:18px; margin:0; color:#E8553D;">
            <i class="fa-solid fa-star"></i> Promote Your Business
          </h3>
          <button id="close-biz-modal-btn" class="modal-close-btn">&times;</button>
        </div>

        <p style="font-size:13px; color:#555; margin-bottom:12px;">
          Show your student business or service to your whole campus for <strong>15 days</strong>.
        </p>

        <form id="biz-checkout-form" style="display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="${labelStyle}">Business Name</label>
            <input type="text" id="biz-name" maxlength="60" required style="${inputStyle}" placeholder="e.g. Ada's Braids">
          </div>

          <div>
            <label style="${labelStyle}">Category</label>
            <select id="biz-category" style="${inputStyle}">
              <option>Food & Snacks</option>
              <option>Hair & Beauty</option>
              <option>Tutoring</option>
              <option>Graphics & Design</option>
              <option>Fashion</option>
              <option>Repairs</option>
              <option>Printing & Typing</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label style="${labelStyle}">WhatsApp Number</label>
            <input type="tel" id="biz-whatsapp" maxlength="15" required style="${inputStyle}" placeholder="e.g. 08012345678">
          </div>

          <div>
            <label style="${labelStyle}">Where to find you (hostel / lodge)</label>
            <input type="text" id="biz-lodge" maxlength="80" style="${inputStyle}" placeholder="e.g. Silver Hostel, or Campus Delivery">
          </div>

          <div>
            <label style="${labelStyle}">What do you offer?</label>
            <textarea id="biz-desc" maxlength="300" style="${inputStyle} min-height:60px; font-family:inherit;" placeholder="Short description of your service or products"></textarea>
          </div>

          <div>
            <label style="${labelStyle}">Your Email (for Paystack receipt)</label>
            <input type="email" id="biz-email" value="${defaultEmail}" required style="${inputStyle}">
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#FAF9F6; border:1px solid #E5E0D8; border-radius:12px;">
            <span style="font-size:13px; font-weight:600; color:#444;">15 Days Spotlight:</span>
            <span style="font-size:18px; font-weight:800; color:#E8553D;">₦1,500</span>
          </div>

          <button type="submit" class="btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; padding:13px;">
            <i class="fa-solid fa-lock"></i> Pay ₦1,500 with Paystack
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-biz-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector("#biz-checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = modal.querySelector("#biz-email").value.trim();
      const business = {
        name: modal.querySelector("#biz-name").value.trim(),
        category: modal.querySelector("#biz-category").value,
        whatsapp: modal.querySelector("#biz-whatsapp").value.trim(),
        lodge: modal.querySelector("#biz-lodge").value.trim(),
        description: modal.querySelector("#biz-desc").value.trim()
      };

      if (!business.name || business.whatsapp.replace(/[^0-9]/g, "").length < 10) {
        if (window.showToast) window.showToast("Please enter a business name and a valid WhatsApp number.", "warning");
        return;
      }

      modal.remove();
      CAMPALLY_PAY.startCheckout({
        planId: "business_spotlight",
        userEmail: email,
        business: business,
        onSuccess: () => { setTimeout(() => window.location.reload(), 1500); }
      });
    });
  };

  // Wire up the "Promote" button on the home page
  document.addEventListener("click", function (e) {
    if (e.target.closest("#open-promote-biz-btn")) {
      CAMPALLY_PAY.openBusinessModal();
    }
  });

  // Auto-init
  fetchConfig();
  CAMPALLY_PAY.ready = fetchActivePromotions();

  window.CampallyPay = CAMPALLY_PAY;
})();
                                          
