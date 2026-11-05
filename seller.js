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
let ownStore = false;   // true when the logged-in seller is looking at their own store
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
  ownStore = isOwnProfile;
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sellerId)
    .single();
  
  if (error || !profile) {
    nameEl.textContent = "Profile not found";
    return;
  }
  
  const isVendor = profile.account_type === "vendor" && profile.is_vendor_verified === true;
  const isVendorAccount = profile.account_type === "vendor";

  if (isOwnProfile) applyOwnStoreView();

  avatarEl.src = profile.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + (profile.full_name || "student");
  nameEl.textContent = profile.full_name || "Unnamed Student";
  departmentEl.textContent = profile.department ? `📚 ${profile.department}` : "";
  hallEl.textContent = profile.hall ? `📍 ${profile.hall}` : "";
  
  const badgeContainer = document.getElementById("seller-badge-container");
  if (badgeContainer) {
    badgeContainer.innerHTML = "";
    const campusShort = (profile.campus_id && window.getCampusShort) ? window.getCampusShort(profile.campus_id) : "";
    const campusPart = campusShort ? " • " + campusShort : "";
    if (isVendor) {
      badgeContainer.innerHTML += `<span class="badge-pill" style="background:#FFF7D6; color:#8A5A00; border:1px solid #F5C451; font-weight:700;"><i class="fa-solid fa-store"></i> Verified Vendor${campusPart}</span>`;
      const vSince = profile.vendor_verified_at ? new Date(profile.vendor_verified_at).getTime() : 0;
      if (vSince && Date.now() - vSince < 30 * 24 * 60 * 60 * 1000) {
        badgeContainer.innerHTML += `<span class="badge-pill badge-hall"><i class="fa-solid fa-seedling"></i> New vendor</span>`;
      }
    } else if (profile.is_verified === true) {
      badgeContainer.innerHTML += `<span class="badge-pill badge-verified"><i class="fa-solid fa-shield-check"></i> Verified Student${campusPart}</span>`;
    } else {
      if (isVendorAccount) {
        badgeContainer.innerHTML += `<span class="badge-pill badge-hall"><i class="fa-solid fa-store"></i> Vendor • not verified yet</span>`;
      } else if (campusShort) {
        badgeContainer.innerHTML += `<span class="badge-pill badge-hall"><i class="fa-solid fa-graduation-cap"></i> ${campusShort}</span>`;
      }
    }
  }

  if (isVendorAccount) loadShopInfo(badgeContainer);

  const settingsIcon = document.getElementById("header-settings-link");
  if (settingsIcon) {
    settingsIcon.style.display = isOwnProfile ? "inline-block" : "none";
  }

  if (isOwnProfile) {
    actionEl.innerHTML = `<a href="profile.html" class="edit-btn">Edit Profile</a>` +
      (isVendorAccount ? ` <a href="vendor-shop.html" class="edit-btn" style="margin-left:6px;">Edit shop</a>` : "");
  } else if (!currentUserId) {
    actionEl.innerHTML = `
      <div style="margin-top:10px;">
        <a href="login.html?redirect=seller.html%3Fid%3D${sellerId}" class="btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; padding:10px 20px; font-size:13px; width:auto;">
          <i class="fa-solid fa-lock"></i> Sign In to Contact Seller
        </a>
      </div>
    `;
  } else {
    const waBtn = profile.whatsapp_number
      ? `<a href="https://wa.me/${profile.whatsapp_number.replace(/\D/g, "")}" target="_blank" class="whatsapp-btn" style="margin-top:8px;"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>`
      : "";
    actionEl.innerHTML = `
      <a href="chat.html?with=${encodeURIComponent(sellerId)}" class="btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; padding:10px 20px; font-size:14px; width:auto;">
        <i class="fa-solid fa-comment-dots"></i> Message
      </a>
      ${waBtn ? `<div>${waBtn}</div>` : ""}`;
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

// "My store": the seller sees only their products with manage buttons (their profile is edited on profile.html)
function applyOwnStoreView() {
  const card = document.querySelector(".profile-card");
  if (card) card.style.display = "none";
  const title = document.querySelector(".logo-small");
  if (title) title.textContent = "My store";
  document.querySelectorAll("h3").forEach((h) => {
    if (h.textContent.trim() === "Listings") h.textContent = "My products";
  });
}

function wireOwnActions(card, item, isSold, likeInfo) {
  const bar = document.createElement("div");
  bar.className = "own-actions";
  bar.style.cssText = "display:flex; flex-direction:column; gap:6px; padding:0 10px 10px 10px;";

  const likeCount = likeInfo ? likeInfo.count : 0;
  const likers = likeInfo && Array.isArray(likeInfo.likers) ? likeInfo.likers : [];
  const likersHtml = likers.map((l) =>
    '<a href="seller.html?id=' + shopEsc(l.id) + '" style="display:block; padding:4px 0; color:#334155; text-decoration:none; font-size:12px;">' +
    '<i class="fa-solid fa-heart" style="color:#E8553D; font-size:10px;"></i> ' + shopEsc(l.name || "Campus student") + "</a>"
  ).join("");

  bar.innerHTML =
    '<button type="button" class="own-likes-btn" style="width:100%; padding:7px 0; font-size:12px; border-radius:8px; background:#FFF5F3; color:#E8553D; border:1px solid #FCD8D0; font-weight:700; ' + (likeCount ? "cursor:pointer;" : "cursor:default;") + '">' +
      '<i class="fa-solid fa-heart"></i> ' + likeCount + (likeCount === 1 ? " like" : " likes") + "</button>" +
    '<div class="own-likers" style="display:none; background:#FAF9F6; border:1px solid #EEE7DD; border-radius:8px; padding:6px 10px; max-height:140px; overflow-y:auto;">' + likersHtml + "</div>" +
    '<div style="display:flex; gap:6px;">' +
      '<button type="button" class="own-sold-btn" style="flex:2; padding:8px 0; font-size:12px; border-radius:8px; cursor:pointer; background:#fff; font-weight:700; border:1px solid ' + (isSold ? "#059669" : "#DC2626") + "; color:" + (isSold ? "#059669" : "#DC2626") + ';">' +
        (isSold ? "Relist as Active" : "Mark as Sold") + "</button>" +
      '<button type="button" class="own-del-btn" style="flex:1; padding:8px 0; font-size:12px; border-radius:8px; cursor:pointer; background:#FEE2E2; color:#991B1B; border:1px solid #FECACA; font-weight:700;">Delete</button>' +
    "</div>";
  card.appendChild(bar);

  const likesBtn = bar.querySelector(".own-likes-btn");
  const likersBox = bar.querySelector(".own-likers");
  likesBtn.addEventListener("click", () => {
    if (!likeCount) return;
    likersBox.style.display = likersBox.style.display === "none" ? "block" : "none";
  });

  const soldBtn = bar.querySelector(".own-sold-btn");
  if (item.status === "pending" && soldBtn) {
    const note = document.createElement("div");
    note.style.cssText = "flex:2; padding:8px 6px; font-size:12px; border-radius:8px; background:#FFFBEB; color:#92400E; border:1px solid #FDE68A; font-weight:700; text-align:center;";
    note.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Waiting for approval';
    soldBtn.replaceWith(note);
  } else if (soldBtn) soldBtn.addEventListener("click", async () => {
    const newStatus = isSold ? "active" : "sold";
    soldBtn.disabled = true;
    soldBtn.textContent = "Updating...";
    const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", item.id);
    if (error) {
      if (window.showToast) window.showToast("Could not update: " + error.message, "error");
      soldBtn.disabled = false;
      soldBtn.textContent = isSold ? "Relist as Active" : "Mark as Sold";
      return;
    }
    if (window.setItemSoldStatus) window.setItemSoldStatus(item.id, newStatus === "sold");
    if (window.showToast) window.showToast(newStatus === "sold" ? "Item marked as Sold! Other students won't ping you." : "Item relisted as Active!", "success");
    loadSellerListings();
  });

  bar.querySelector(".own-del-btn").addEventListener("click", () => {
    const doDelete = async () => {
      const { error } = await supabase.from("listings").delete().eq("id", item.id);
      if (error) {
        if (window.showToast) window.showToast("Failed to delete: " + error.message, "error");
        return;
      }
      if (window.showToast) window.showToast("Listing removed successfully.", "success");
      loadSellerListings();
    };
    if (window.showConfirm) window.showConfirm("Delete Listing", "Are you sure you want to remove this item from Campally?", doDelete);
    else if (confirm("Delete this listing?")) doDelete();
  });
}

function shopEsc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SHOP_CATEGORIES = {
  food: "Food & drinks", groceries: "Groceries & provisions", printing: "Printing & photocopy", laundry: "Laundry",
  gadgets: "Gadgets & repairs", fashion_beauty: "Fashion & beauty", stationery: "Stationery", services: "Other services", other: "Other"
};

function lagosNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
}
function toMinutes(t) { const p = String(t).split(":"); return Number(p[0]) * 60 + Number(p[1]); }
// true = open now, false = closed now, null = the vendor did not set hours
function shopOpenNow(shop) {
  if (!shop || !shop.open_days || !shop.open_days.length || !shop.open_time || !shop.close_time) return null;
  const n = lagosNow();
  const day = n.getDay();
  const mins = n.getHours() * 60 + n.getMinutes();
  const o = toMinutes(shop.open_time);
  const c = toMinutes(shop.close_time);
  const days = shop.open_days.map(Number);
  if (c > o) return days.indexOf(day) !== -1 && mins >= o && mins < c;
  return (days.indexOf(day) !== -1 && mins >= o) || (days.indexOf((day + 6) % 7) !== -1 && mins < c);
}

// Shop details for campus vendors (name, category, about, location, hours, delivery areas, video)
async function loadShopInfo(afterEl) {
  if (!afterEl) return;
  const { data: shop } = await supabase.from("vendor_shops").select("*").eq("user_id", sellerId).maybeSingle();
  if (!shop) return;
  if (shop.shop_name) nameEl.textContent = shop.shop_name;

  const open = shopOpenNow(shop);
  const top = [];
  if (shop.category && SHOP_CATEGORIES[shop.category]) {
    top.push('<span style="background:#fff; border:1px solid #FDE68A; color:#92400E; font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px;">' + shopEsc(SHOP_CATEGORIES[shop.category]) + "</span>");
  }
  if (open === true) top.push('<span style="background:#ECFDF5; border:1px solid #A7F3D0; color:#047857; font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px;">● Open now</span>');
  if (open === false) top.push('<span style="background:#FEF2F2; border:1px solid #FECACA; color:#B91C1C; font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px;">● Closed now</span>');

  const rows = [];
  if (shop.location) rows.push('<div><i class="fa-solid fa-location-dot" style="width:18px; color:#E8553D;"></i> ' + shopEsc(shop.location) + "</div>");
  if (shop.opening_hours) rows.push('<div><i class="fa-solid fa-clock" style="width:18px; color:#E8553D;"></i> ' + shopEsc(shop.opening_hours) + "</div>");
  if (shop.delivery_areas) rows.push('<div><i class="fa-solid fa-motorcycle" style="width:18px; color:#E8553D;"></i> Delivers to: ' + shopEsc(shop.delivery_areas) + "</div>");

  let videoHtml = "";
  if (shop.video_path) {
    const pub = supabase.storage.from("vendor-videos").getPublicUrl(shop.video_path);
    const url = pub && pub.data && pub.data.publicUrl;
    if (url) videoHtml += '<video controls preload="none" playsinline src="' + shopEsc(url) + '" style="width:100%; max-height:320px; border-radius:12px; background:#000; margin-top:8px;"></video>';
  }
  if (shop.video_url) {
    videoHtml += '<a href="' + shopEsc(shop.video_url) + '" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:8px; background:#fff; border:1px solid #FDE68A; color:#92400E; font-weight:800; font-size:12.5px; padding:8px 14px; border-radius:12px; text-decoration:none;"><i class="fa-solid fa-circle-play"></i> Watch our video</a>';
  }

  if (!top.length && !rows.length && !shop.description && !videoHtml) return;

  const box = document.createElement("div");
  box.id = "vendor-shop-info";
  box.style.cssText = "background:#FFFBEB; border:1px solid #FDE68A; border-radius:14px; padding:12px 14px; margin:8px 14px 12px 14px; text-align:left; font-size:13px; color:#334155; line-height:1.7;";
  box.innerHTML =
    (top.length ? '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">' + top.join("") + "</div>" : "") +
    (shop.description ? '<div style="margin-bottom:6px; color:#475569;">' + shopEsc(shop.description) + "</div>" : "") +
    rows.join("") + videoHtml;
  // Share this shop on WhatsApp
  const shopName = shop.shop_name || "this shop";
  const shareText = "🛍️ *" + shopName + "* is on Campally" +
    (shop.location ? "\n📍 " + shop.location : "") +
    (shop.opening_hours ? "\n🕒 " + shop.opening_hours : "") +
    "\n\nSee their products: " + window.location.href;
  const shareBtn = document.createElement("a");
  shareBtn.href = "https://wa.me/?text=" + encodeURIComponent(shareText);
  shareBtn.target = "_blank";
  shareBtn.rel = "noopener noreferrer";
  shareBtn.style.cssText = "display:inline-block; margin-top:10px; background:#25D366; color:#fff; font-weight:800; font-size:12.5px; padding:8px 14px; border-radius:12px; text-decoration:none;";
  shareBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Share this shop';
  box.appendChild(shareBtn);

  afterEl.insertAdjacentElement("afterend", box);
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
  // Followers + Following boxes (tap one to see the list)
  let box = document.getElementById("follow-stats");
  if (!box) {
    box = document.createElement("div");
    box.id = "follow-stats";
    hallEl.insertAdjacentElement("afterend", box);
  }
  if (window.CampallyFollows) {
    await window.CampallyFollows.mount(box, sellerId);
    return;
  }

  // Fallback: plain follower count if follow-lists.js is missing
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", sellerId);
  box.className = "tagline";
  box.textContent = (count || 0) + " followers";
}

async function loadSellerListings() {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  
  if (error || !data || data.length === 0) {
    listingsEl.innerHTML = "<p id='loading-text'>No listings posted yet.</p>";
    return;
  }
  
  // Likes on my own products (who liked them)
  const likesMap = {};
  if (ownStore) {
    const lr = await supabase.rpc("get_my_listing_likes");
    if (!lr.error && Array.isArray(lr.data)) lr.data.forEach((x) => { likesMap[x.listing_id] = x; });
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

    if (ownStore) wireOwnActions(card, item, isSold, likesMap[item.id]);

    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest(".own-actions")) return;
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