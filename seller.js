const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
let sellerId = params.get("id");

const avatarEl = document.getElementById("seller-avatar");
const nameEl = document.getElementById("seller-name");
const departmentEl = document.getElementById("seller-department");
const hallEl = document.getElementById("seller-hall");
const actionEl = document.getElementById("profile-action");
const followEl = document.getElementById("follow-section");
const listingsEl = document.getElementById("seller-listings");
const reviewFormEl = document.getElementById("review-form-container");
const reviewsListEl = document.getElementById("reviews-list");

let currentUserId = null;
let selectedRating = 0;

async function loadSellerProfile() {
  const { data: userData } = await supabase.auth.getUser();
  currentUserId = userData?.user ? userData.user.id : null;

  if (!sellerId) {
    if (currentUserId) {
      sellerId = currentUserId;
    } else {
      const { data: sampleListing } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (sampleListing && sampleListing.seller_id) {
        sellerId = sampleListing.seller_id;
      }
    }
  }

  if (!sellerId) {
    nameEl.textContent = "Seller Profile";
    listingsEl.innerHTML = "<p id='loading-text'>Please select any listing from the marketplace to view that seller's profile.</p>";
    return;
  }
  
  const isOwnProfile = currentUserId === sellerId;
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sellerId)
    .single();
  
  if (error || !profile) {
    nameEl.textContent = "Profile not found";
    return;
  }
  
  avatarEl.src = profile.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + (profile.full_name || "student");
  nameEl.textContent = profile.full_name || "Unnamed Student";
  departmentEl.textContent = profile.department ? `📚 ${profile.department}` : "";
  hallEl.textContent = profile.hall ? `📍 ${profile.hall}` : "";
  
  const badgeContainer = document.getElementById("seller-badge-container");
  if (badgeContainer) {
    badgeContainer.innerHTML = "";
    const campusShort = (profile.campus_id && window.getCampusShort) ? window.getCampusShort(profile.campus_id) : "FUNAI";
    if (profile.is_verified === true) {
      badgeContainer.innerHTML += `<span class="badge-pill badge-verified"><i class="fa-solid fa-shield-check"></i> Verified Student • ${campusShort}</span>`;
    } else {
      badgeContainer.innerHTML += `<span class="badge-pill badge-hall"><i class="fa-solid fa-graduation-cap"></i> ${campusShort}</span>`;
    }
  }

  const settingsIcon = document.getElementById("header-settings-link");
  if (settingsIcon) {
    settingsIcon.style.display = isOwnProfile ? "inline-block" : "none";
  }

  if (isOwnProfile) {
    actionEl.innerHTML = `<a href="profile.html" class="edit-btn">Edit Profile</a>`;
  } else if (!currentUserId) {
    actionEl.innerHTML = `
      <div style="margin-top:10px;">
        <a href="login.html?redirect=seller.html%3Fid%3D${sellerId}" class="btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; padding:10px 20px; font-size:13px; width:auto;">
          <i class="fa-solid fa-lock"></i> Sign In to Contact Seller
        </a>
      </div>
    `;
  } else if (profile.whatsapp_number) {
    const phone = profile.whatsapp_number.replace(/\D/g, "");
    actionEl.innerHTML = `<a href="https://wa.me/${phone}" target="_blank" class="whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>`;
  }
  
  if (!isOwnProfile && currentUserId) {
    loadFollowButton();
  }
  
  loadFollowerCount();
  loadSellerListings();
  loadReviews();
  
  if (!isOwnProfile) {
    if (currentUserId) {
      renderReviewForm();
    } else {
      reviewFormEl.innerHTML = `
        <div style="background:#FFF8F6; border:1px solid #FED7AA; border-radius:12px; padding:14px; text-align:center; margin-bottom:16px;">
          <p style="font-size:13px; color:#7C2D12; font-weight:600; margin-bottom:4px;"><i class="fa-solid fa-star" style="color:#F59E0B;"></i> Want to rate or review this seller?</p>
          <p style="font-size:12px; color:#666; margin-bottom:10px;">Sign in to rate sellers and leave reviews.</p>
          <a href="login.html?redirect=seller.html%3Fid%3D${sellerId}" class="btn-primary" style="display:inline-block; font-size:12px; padding:8px 18px; text-decoration:none; width:auto;">Sign In to Rate</a>
        </div>
      `;
    }
  }
}

async function loadFollowButton() {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", currentUserId)
    .eq("following_id", sellerId)
    .maybeSingle();
  
  renderFollowButton(!!data);
}

function renderFollowButton(isFollowing) {
  followEl.innerHTML = isFollowing ?
    `<button id="follow-btn" class="edit-btn" style="background:#999;">Following</button>` :
    `<button id="follow-btn" class="edit-btn">Follow</button>`;
  
  document.getElementById("follow-btn").addEventListener("click", async () => {
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", sellerId);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: sellerId });
    }
    loadFollowButton();
    loadFollowerCount();
  });
}

async function loadFollowerCount() {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", sellerId);
  
  const existing = document.getElementById("follower-count");
  if (existing) existing.remove();
  
  const countEl = document.createElement("p");
  countEl.id = "follower-count";
  countEl.className = "tagline";
  countEl.textContent = (count || 0) + " followers";
  hallEl.insertAdjacentElement("afterend", countEl);
}

async function loadSellerListings() {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("id", { ascending: false });
  
  if (error || !data || data.length === 0) {
    listingsEl.innerHTML = "<p id='loading-text'>No listings posted yet.</p>";
    return;
  }
  
  listingsEl.innerHTML = "";
  
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

    let badgeHtml = "";
    if (isSold) {
      badgeHtml += `<span class="badge-pill badge-sold" style="margin-top:4px;"><i class="fa-solid fa-tag"></i> SOLD</span> `;
    }
    if (isSwap) {
      badgeHtml += `<span class="badge-pill badge-swap" style="margin-top:4px;"><i class="fa-solid fa-repeat"></i> Swap</span>`;
    }

    card.innerHTML = `
      <div style="position:relative;">
        ${imageInner}
      </div>
      <div class="listing-info">
        <div class="listing-title">${cleanTitle}</div>
        <div class="listing-price">${formattedPrice}</div>
        ${badgeHtml ? `<div class="card-badges">${badgeHtml}</div>` : ""}
      </div>
    `;

    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = "listing.html?id=" + item.id;
    });

    listingsEl.appendChild(card);
  });
}


function renderReviewForm() {
  reviewFormEl.innerHTML = `
    <div class="review-form">
      <div class="star-rating" id="star-rating">
        <span class="star" data-value="1">★</span>
        <span class="star" data-value="2">★</span>
        <span class="star" data-value="3">★</span>
        <span class="star" data-value="4">★</span>
        <span class="star" data-value="5">★</span>
      </div>
      <textarea id="review-comment" placeholder="Share your experience dealing with this student..."></textarea>
      <button id="submit-review-btn" class="btn-primary" style="margin-top:10px;">Submit Review</button>
    </div>
  `;
  
  const stars = document.querySelectorAll("#star-rating .star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.value);
      stars.forEach((s) => {
        s.classList.toggle("selected", parseInt(s.dataset.value) <= selectedRating);
      });
    });
  });
  
  document.getElementById("submit-review-btn").addEventListener("click", async () => {
    if (selectedRating === 0) {
      if (window.showToast) window.showToast("Please select a star rating (1 to 5).", "error");
      else alert("Please select a star rating.");
      return;
    }
    
    const comment = document.getElementById("review-comment").value.trim();
    
    const { error } = await supabase.from("reviews").upsert({
      reviewer_id: currentUserId,
      seller_id: sellerId,
      rating: selectedRating,
      comment: comment
    }, { onConflict: "reviewer_id,seller_id" });
    
    if (error) {
      if (window.showToast) window.showToast("Failed to submit review: " + error.message, "error");
      else alert("Failed to submit review: " + error.message);
    } else {
      if (window.showToast) window.showToast("Review submitted successfully!", "success");
      else alert("Review submitted!");
      loadReviews();
    }
  });
}

async function loadReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles!reviews_reviewer_id_fkey(full_name)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  
  if (error || !data || data.length === 0) {
    reviewsListEl.innerHTML = "<p id='loading-text'>No reviews yet.</p>";
    return;
  }
  
  const avg = (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1);
  
  let html = `<p style="font-weight:600; margin-bottom:10px;">⭐ ${avg} average (${data.length} review${data.length > 1 ? "s" : ""})</p>`;
  
  data.forEach((r) => {
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    html += `
      <div class="review-card">
        <div class="review-stars">${stars}</div>
        <div class="review-name">${r.profiles?.full_name || "Anonymous"}</div>
        ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ""}
      </div>
    `;
  });
  
  reviewsListEl.innerHTML = html;
}

loadSellerProfile();