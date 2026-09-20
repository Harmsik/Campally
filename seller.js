const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const sellerId = params.get("id");

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
  if (!sellerId) {
    nameEl.textContent = "No seller specified";
    return;
  }
  
  const { data: userData } = await supabase.auth.getUser();
  currentUserId = userData.user ? userData.user.id : null;
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
  
  avatarEl.src = profile.avatar_url || "";
  nameEl.textContent = profile.full_name || "Unnamed Student";
  departmentEl.textContent = profile.department || "";
  hallEl.textContent = profile.hall || "";
  
  if (isOwnProfile) {
    actionEl.innerHTML = `<a href="profile.html" class="edit-btn">Edit Profile</a>`;
  } else if (profile.whatsapp_number) {
    const phone = profile.whatsapp_number.replace(/\D/g, "");
    actionEl.innerHTML = `<a href="https://wa.me/${phone}" target="_blank" class="whatsapp-btn">Contact via WhatsApp</a>`;
  }
  
  if (!isOwnProfile && currentUserId) {
    loadFollowButton();
  }
  
  loadFollowerCount();
  loadSellerListings();
  loadReviews();
  
  if (!isOwnProfile && currentUserId) {
    renderReviewForm();
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
    .eq("status", "active");
  
  if (error || data.length === 0) {
    listingsEl.innerHTML = "<p id='loading-text'>No active listings.</p>";
    return;
  }
  
  listingsEl.innerHTML = "";
  
  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "listing-card";
    card.innerHTML = `
      <div class="listing-image">No image</div>
      <div class="listing-info">
        <div class="listing-title">${item.title}</div>
        <div class="listing-price">₦${item.price ?? "N/A"}</div>
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
      <textarea id="review-comment" placeholder="Share your experience..."></textarea>
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
      alert("Please select a star rating.");
      return;
    }
    
    const comment = document.getElementById("review-comment").value;
    
    const { error } = await supabase.from("reviews").upsert({
      reviewer_id: currentUserId,
      seller_id: sellerId,
      rating: selectedRating,
      comment: comment
    }, { onConflict: "reviewer_id,seller_id" });
    
    if (error) {
      alert("Failed to submit review: " + error.message);
    } else {
      alert("Review submitted!");
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