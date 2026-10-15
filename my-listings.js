const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const container = document.getElementById("my-listings");

async function loadMyListings() {
  let user = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      user = sessionData.session.user;
    }
  } catch (_) {}

  if (!user) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) user = userData.user;
    } catch (_) {}
  }
  
  if (!user) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px;">
        <div style="width:54px; height:54px; background:#FEE2E2; color:#DC2626; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px; font-size:24px;">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h3 style="font-size:18px; color:#2B2B2B; margin-bottom:8px;">Sign in to View Your Listings</h3>
        <p style="font-size:14px; color:#666; max-width:320px; margin:0 auto 18px auto; line-height:1.4;">
          You are currently browsing as a visitor. Sign in with your student account to manage your listings.
        </p>
        <a href="login.html?redirect=my-listings.html" class="btn-primary" style="display:inline-block; text-decoration:none; width:auto; padding:10px 24px;">Log In</a>
      </div>
    `;
    return;
  }
  
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id);
  
  if (error) {
    container.innerHTML = "<p>Error loading your listings.</p>";
    return;
  }
  
  if (data.length === 0) {
    container.innerHTML = "<p id='loading-text'>You haven't posted anything yet.</p>";
    return;
  }
  
  container.innerHTML = "";
  
  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "listing-card";

    const isSold = Boolean(
      item.status === "sold" ||
      (item.title && item.title.toUpperCase().includes("[SOLD]")) ||
      (window.isItemSold && window.isItemSold(item.id))
    );

    if (isSold) {
      card.classList.add("is-sold");
    }

    const isSwap = Boolean(
      item.is_swap === true ||
      (item.title && item.title.toUpperCase().includes("[SWAP]")) ||
      (item.description && item.description.toUpperCase().includes("[SWAP]"))
    );

    const cleanTitle = (item.title || "Untitled Item").replace(/^\[(SWAP|SOLD)\]\s*/gi, "");
    const formattedPrice = window.formatPrice ? window.formatPrice(item.price, isSwap) : `₦${item.price ?? "N/A"}`;
    
    let imageInner = item.image_url ?
      `<img src="${item.image_url}" class="listing-image" style="object-fit:cover;" alt="${cleanTitle}">` :
      `<div class="listing-image"><i class="fa-solid fa-box-open" style="font-size:24px; margin-bottom:4px;"></i> No image</div>`;

    if (isSold) {
      imageInner += `<div class="sold-card-overlay">SOLD</div>`;
    }

    const isBoosted = Boolean(
      (window.CampallyPay && window.CampallyPay.isListingBoosted(item.id)) ||
      item.is_boosted === true ||
      item.is_featured === true ||
      (item.title && (item.title.toUpperCase().includes("[FEATURED]") || item.title.toUpperCase().includes("[BOOSTED]")))
    );

    const isUrgent = Boolean(
      (window.CampallyPay && window.CampallyPay.isListingUrgent(item.id)) ||
      item.is_urgent === true ||
      (item.title && item.title.toUpperCase().includes("[URGENT]"))
    );

    let badgeHtml = "";
    if (isSold) {
      badgeHtml += `<span class="badge-pill badge-sold" style="margin-top:4px;"><i class="fa-solid fa-tag"></i> SOLD</span> `;
    }
    if (isBoosted) {
      badgeHtml += `<span class="badge-pill" style="margin-top:4px; background:#FFF1EE; color:#DC2626; border:1px solid #FECACA; font-weight:800;"><i class="fa-solid fa-fire" style="color:#EF4444;"></i> Featured</span> `;
    }
    if (isUrgent) {
      badgeHtml += `<span class="badge-pill" style="margin-top:4px; background:#FFF1F2; color:#BE123C; border:1px solid #FDA4AF; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Urgent</span> `;
    }
    if (isSwap) {
      badgeHtml += `<span class="badge-pill badge-swap" style="margin-top:4px;"><i class="fa-solid fa-repeat"></i> Swap</span>`;
    }

    // Promotion actions for active items
    let promoActionsHtml = "";
    if (!isSold) {
      promoActionsHtml = `
        <div style="display:flex; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed #E5E0D8;">
          <button class="boost-listing-btn" data-id="${item.id}" data-title="${cleanTitle}" style="flex:1; background:${isBoosted ? '#FFF7ED' : '#FDF1EE'}; border:1px solid ${isBoosted ? '#FDBA74' : '#FCD8D0'}; color:${isBoosted ? '#C2410C' : '#E8553D'}; font-size:11px; font-weight:700; padding:6px 4px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            <i class="fa-solid ${isBoosted ? 'fa-check' : 'fa-bolt'}"></i> ${isBoosted ? 'Boost Active' : 'Boost (₦300)'}
          </button>
          <button class="urgent-listing-btn" data-id="${item.id}" data-title="${cleanTitle}" style="flex:1; background:${isUrgent ? '#FEF2F2' : '#FFFFFF'}; border:1px solid ${isUrgent ? '#FCA5A5' : '#E5E0D8'}; color:${isUrgent ? '#DC2626' : '#666'}; font-size:11px; font-weight:700; padding:6px 4px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            <i class="fa-solid fa-triangle-exclamation"></i> ${isUrgent ? 'Urgent Active' : 'Urgent (₦200)'}
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div style="position:relative;">
        ${imageInner}
      </div>
      <div class="listing-info">
        <div class="listing-title">${cleanTitle}</div>
        <div class="listing-price">${formattedPrice}</div>
        ${badgeHtml ? `<div class="card-badges">${badgeHtml}</div>` : ""}
        ${promoActionsHtml}
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          <div style="display:flex; gap:6px;">
            <a href="listing.html?id=${item.id}" class="edit-btn" style="flex:1; padding:6px 0; font-size:12px; margin:0; text-align:center; text-decoration:none; border-radius:8px; background:#4B5563;">View</a>
            <button class="delete-btn" data-id="${item.id}" style="flex:1; margin:0; padding:6px 0;">Delete</button>
          </div>
          <button class="toggle-sold-btn" data-id="${item.id}" data-sold="${isSold}" style="width:100%; padding:7px 0; font-size:12px; margin:0; text-align:center; border-radius:8px; border:1px solid ${isSold ? '#059669' : '#DC2626'}; background:${isSold ? '#ECFDF5' : '#FEF2F2'}; color:${isSold ? '#065F46' : '#DC2626'}; font-weight:600; cursor:pointer;">
            ${isSold ? '<i class="fa-solid fa-rotate-left"></i> Relist as Active' : '<i class="fa-solid fa-check-circle"></i> Mark as Sold'}
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach Boost & Urgent button listeners
  document.querySelectorAll(".boost-listing-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const title = btn.dataset.title;
      if (window.CampallyPay && window.CampallyPay.openBoostModal) {
        window.CampallyPay.openBoostModal(id, title, () => loadMyListings());
      }
    });
  });

  document.querySelectorAll(".urgent-listing-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const title = btn.dataset.title;
      if (window.CampallyPay && window.CampallyPay.openUrgentModal) {
        window.CampallyPay.openUrgentModal(id, title, () => loadMyListings());
      }
    });
  });
  
  // Toggle Sold Status
  document.querySelectorAll(".toggle-sold-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const currentlySold = btn.dataset.sold === "true";
      const newStatus = currentlySold ? "active" : "sold";

      btn.disabled = true;
      btn.textContent = "Updating...";

      // Try updating in Supabase
      try {
        await supabase.from("listings").update({ status: newStatus }).eq("id", id);
      } catch (e) {
        console.warn("Supabase status update error:", e);
      }

      if (window.setItemSoldStatus) {
        window.setItemSoldStatus(id, newStatus === "sold");
      }

      if (window.showToast) {
        window.showToast(newStatus === "sold" ? "Item marked as Sold! Other students won't ping you." : "Item relisted as Active!", "success");
      }
      loadMyListings();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      
      const doDelete = async () => {
        const { error } = await supabase.from("listings").delete().eq("id", id);
        if (error) {
          if (window.showToast) window.showToast("Failed to delete: " + error.message, "error");
          else alert("Failed to delete: " + error.message);
        } else {
          if (window.showToast) window.showToast("Listing removed successfully.", "success");
          loadMyListings();
        }
      };

      if (window.showConfirm) {
        window.showConfirm("Delete Listing", "Are you sure you want to remove this item from Campally?", doDelete);
      } else {
        if (confirm("Delete this listing?")) doDelete();
      }
    });
  });
}

window.loadMyListings = loadMyListings;
loadMyListings();
supabase.auth.getUser().then(({ data }) => {
  const link = document.getElementById("profile-nav-link");
  if (link && data.user) {
    link.href = "seller.html?id=" + data.user.id;
  }
});