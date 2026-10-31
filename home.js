const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const container = document.getElementById("category-rows");
const searchInput = document.getElementById("search-input");
const campusSelect = document.getElementById("campus-select");
const campusSearchInput = document.getElementById("campus-search-input");
const campusSuggestionsDropdown = document.getElementById("campus-suggestions-dropdown");
const clearCampusBtn = document.getElementById("clear-campus-btn");
const hallFilter = document.getElementById("hall-filter");
const swapFilterBtn = document.getElementById("swap-filter-btn");
const savedFilterBtn = document.getElementById("saved-filter-btn");
const savedCounter = document.getElementById("saved-counter");

const tabListings = document.getElementById("tab-listings");
const tabRequests = document.getElementById("tab-requests");
const listingsView = document.getElementById("listings-view");
const requestsView = document.getElementById("requests-view");
const requestsList = document.getElementById("requests-list");

const openPostRequestBtn = document.getElementById("open-post-request-btn");
const postRequestModal = document.getElementById("post-request-modal");
const closeRequestModal = document.getElementById("close-request-modal");
const newRequestForm = document.getElementById("new-request-form");
const visitorBanner = document.getElementById("visitor-banner");

const whatsappDigestBtn = document.getElementById("whatsapp-digest-btn");
const openAmbassadorBtn = document.getElementById("open-ambassador-modal-btn");
const ambassadorModal = document.getElementById("ambassador-modal");
const closeAmbassadorBtn = document.getElementById("close-ambassador-modal");
const ambassadorForm = document.getElementById("ambassador-form");
const ambCampusSelect = document.getElementById("amb-campus");

let allListings = [];
let categoryMap = {};
let currentCampusId = null;
let activeHall = "all";
let activeCategory = "all";
let activeBudget = "all";
let swapsOnly = false;
let savedOnly = false;
let allRequests = [];
let currentUserId = null;

// Helper to extract course code like MTH101, CHM 111, GST102 from text
function extractCourseCode(text) {
  if (!text) return null;
  const match = text.match(/\b([A-Za-z]{3}\s?\d{3})\b/);
  return match ? match[1].replace(/\s+/, "").toUpperCase() : null;
}

// Update saved favorites count in UI
function updateSavedCounter() {
  if (!savedCounter) return;
  const savedIds = window.getSavedItemIds ? window.getSavedItemIds() : [];
  savedCounter.textContent = savedIds.length;
}

window.fetchListingsForCampus = fetchListingsForCampus;
async function fetchListingsForCampus(campusId) {
  if (!container) return;
  container.innerHTML = "<p id='loading-text' style='text-align:center; color:#999; padding:40px 0;'>Loading listings...</p>";

  try {
    let query = supabase
      .from("listings")
      .select("*, categories(id, name, slug), profiles(id, full_name, hall, department, avatar_url, is_verified)")
      .order("id", { ascending: false });

    if (campusId) {
      query = query.eq("campus_id", campusId);
    }

    let { data, error } = await query;

    // Resilient fallback if nested join or campus_id has any issue
    if (error) {
      console.warn("Retrying listings fetch with base query:", error.message);
      let baseQuery = supabase.from("listings").select("*");
      if (campusId) baseQuery = baseQuery.eq("campus_id", campusId);
      const res = await baseQuery;
      data = res.data;
      error = res.error;
    }

    if (error || !data) {
      container.innerHTML = "<p style='text-align:center; color:#999; padding:40px 0;'>Error loading listings. Please refresh.</p>";
      return;
    }

    // Services live on their own page (services.html), not the main product feed
    allListings = data.filter((item) => (item.listing_type || "product") !== "service");
    populateHallFilter();
    renderCurrentView();
    renderCampusBusinesses(campusId);
    if (window.renderTrendingSellers) window.renderTrendingSellers(campusId);
  } catch (err) {
    console.error("Listings fetch error:", err);
    container.innerHTML = "<p style='text-align:center; color:#999; padding:40px 0;'>Unable to load listings right now.</p>";
  }
}

// Render the Campus Spotlight: PAID student businesses only (never auto-added students)
let spotlightRaf = null;   // handle for the sliding animation, so we can stop it when re-drawing

function startSpotlightSlide(el) {
  if (spotlightRaf) { cancelAnimationFrame(spotlightRaf); spotlightRaf = null; }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const originals = Array.from(el.children);
  if (!originals.length) return;

  // Only slide when the cards are wider than the screen
  const gap = 12;
  const totalWidth = originals.reduce((sum, c) => sum + c.getBoundingClientRect().width + gap, 0);
  if (totalWidth <= el.clientWidth + 4) return;

  // Add a second copy of the cards so the loop never shows a gap
  originals.forEach((c) => {
    const copy = c.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
    el.appendChild(copy);
  });

  let pos = el.scrollLeft;
  let lastSet = el.scrollLeft;
  let last = performance.now();
  let pausedUntil = 0;
  // Where the second copy starts = the exact length of one full loop
  const loopWidth = el.children[originals.length].offsetLeft - el.children[0].offsetLeft;
  const SPEED = 0.035; // pixels per millisecond (about 35px per second)

  // Pause while the student touches or swipes, then continue after 2.5 seconds
  const pause = () => { pausedUntil = performance.now() + 2500; };
  ["touchstart", "mousedown", "wheel", "pointerdown"].forEach((evt) => el.addEventListener(evt, pause, { passive: true }));
  // If the position moved by something other than us (a swipe or momentum), follow the student's finger
  el.addEventListener("scroll", () => {
    if (Math.abs(el.scrollLeft - lastSet) > 1.5) {
      pos = el.scrollLeft;
      pausedUntil = performance.now() + 1500;
    }
  }, { passive: true });

  function step(now) {
    const dt = Math.min(now - last, 64);
    last = now;
    if (now >= pausedUntil && document.visibilityState === "visible") {
      pos += dt * SPEED;
      if (pos >= loopWidth) pos -= loopWidth;
      el.scrollLeft = pos;
      lastSet = el.scrollLeft;
    }
    spotlightRaf = requestAnimationFrame(step);
  }
  spotlightRaf = requestAnimationFrame(step);
}

async function renderCampusBusinesses(campusId) {
  const bizContainer = document.getElementById("business-spotlight-cards");
  if (!bizContainer) return;

  if (spotlightRaf) { cancelAnimationFrame(spotlightRaf); spotlightRaf = null; }
  if (window.CampallyPay && window.CampallyPay.ready) await window.CampallyPay.ready;

  // Only businesses that PAID (active and not expired)
  const paidBusinesses = window.CampallyPay && window.CampallyPay.getBusinesses
    ? window.CampallyPay.getBusinesses(campusId)
    : [];

  if (paidBusinesses.length === 0) {
    bizContainer.style.overflowX = "hidden";
    bizContainer.innerHTML = `
      <div style="flex:1; background:#FFFFFF; border:1px dashed #E5E0D8; border-radius:14px; padding:16px 20px; text-align:center; font-size:12px; color:#777;">
        <span>No businesses are featured on this campus yet. Be the first to <strong style="color:#E8553D; cursor:pointer;" onclick="document.getElementById('open-promote-biz-btn')?.click()">promote your business</strong>!</span>
      </div>
    `;
    return;
  }

  bizContainer.style.overflowX = "auto";
  bizContainer.style.scrollbarWidth = "none";
  bizContainer.innerHTML = "";

  paidBusinesses.forEach((biz) => {
    const card = document.createElement("div");
    card.style.cssText = "flex: 0 0 250px; background: #FFFFFF; border: 1.5px solid #FCD34D; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);";

    const cleanWa = (biz.whatsapp || "").replace(/[^0-9]/g, "");
    const waUrl = cleanWa
      ? `https://wa.me/234${cleanWa.startsWith("0") ? cleanWa.slice(1) : cleanWa}?text=${encodeURIComponent(`Hello ${biz.name}, I found your student service on Campally and I'd like to make an inquiry!`)}`
      : "#";

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="width:36px; height:36px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">
          <i class="fa-solid fa-store"></i>
        </div>
        <div style="overflow:hidden;">
          <div style="font-weight:700; font-size:13px; color:#2B2B2B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${biz.name}</div>
          <div style="font-size:11px; color:#D97706; font-weight:700;"><i class="fa-solid fa-crown"></i> Featured • ${biz.category || "Service"}</div>
        </div>
      </div>
      <p style="font-size:12px; color:#555; margin:0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
        ${biz.description || "Campus student service available on Campally."}
      </p>
      <div style="font-size:11px; color:#777; display:flex; align-items:center; gap:4px;">
        <i class="fa-solid fa-location-dot" style="color:#E8553D;"></i> ${biz.lodge || "Campus Delivery"}
      </div>
      ${cleanWa ? `
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="margin-top:auto; background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; font-size:12px; font-weight:700; padding:6px 10px; border-radius:8px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i class="fa-brands fa-whatsapp" style="color:#22C55E;"></i> Chat on WhatsApp
      </a>
      ` : ""}
    `;
    bizContainer.appendChild(card);
  });

  // Make the row slide by itself (after the browser has measured the cards)
  requestAnimationFrame(() => startSpotlightSlide(bizContainer));
}

// Dynamically populate Hall / Hostel filter dropdown with campus-specific hostels
function populateHallFilter() {
  if (!hallFilter) return;
  const halls = new Set();

  // 1. Add hostels from current campus directory
  if (window.getHostelsForCampus) {
    const campusHostels = window.getHostelsForCampus(currentCampusId || 1);
    campusHostels.forEach(h => halls.add(h));
  }

  // 2. Add hostels from active listings
  allListings.forEach((item) => {
    const h = item.profiles?.hall || item.hall;
    if (h && typeof h === "string" && h.trim()) {
      halls.add(h.trim());
    }
  });

  hallFilter.innerHTML = `<option value="all">📍 All Hostels / Lodges</option>`;
  halls.forEach((hall) => {
    const opt = document.createElement("option");
    opt.value = hall.toLowerCase();
    opt.textContent = `📍 ${hall}`;
    hallFilter.appendChild(opt);
  });
}

function makeCard(item) {
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

  const isBoosted = Boolean(
    (window.CampallyPay && window.CampallyPay.isListingBoosted(item.id)) ||
    item.is_boosted === true
  );

  const isUrgent = Boolean(
    (window.CampallyPay && window.CampallyPay.isListingUrgent(item.id)) ||
    item.is_urgent === true
  );

  const isProSeller = Boolean(
    (window.CampallyPay && window.CampallyPay.isSellerPro(item.seller_id)) ||
    (item.profiles && item.profiles.is_pro === true)
  );

  if (isBoosted) {
    card.classList.add("is-boosted-card");
  }

  // All launch listings are verified FUNAI student listings!
  const campusShort = window.getCampusShort ? window.getCampusShort(item.campus_id || 1) : "FUNAI";
  const sellerHall = item.profiles?.hall || item.hall;
  const courseCode = item.course_code || extractCourseCode((item.title || "") + " " + (item.description || ""));

  const cleanTitle = (item.title || "Untitled Item").replace(/^\[(SWAP|SOLD|FEATURED|BOOSTED|URGENT)\]\s*/gi, "");
  const formattedPrice = window.formatPrice ? window.formatPrice(item.price, isSwap) : `₦${item.price ?? "N/A"}`;

  let imageHtml = item.image_url
    ? `<img src="${item.image_url}" alt="${cleanTitle}" class="listing-image" style="object-fit:cover;" loading="lazy">`
    : `<div class="listing-image"><i class="fa-solid fa-box-open" style="font-size:20px; margin-bottom:4px; display:block;"></i>No image</div>`;

  if (isSold) {
    imageHtml += `<div class="sold-card-overlay">SOLD</div>`;
  }

  const isSaved = window.isItemSaved ? window.isItemSaved(item.id) : false;

  let badgesHtml = "";
  if (isSold) {
    badgesHtml += `<span class="badge-pill badge-sold"><i class="fa-solid fa-tag"></i> SOLD</span> `;
  }
  if (isBoosted) {
    badgesHtml += `<span class="badge-pill" style="background:#FFF1EE; color:#DC2626; border:1px solid #FECACA; font-weight:800;"><i class="fa-solid fa-fire" style="color:#EF4444;"></i> Featured</span> `;
  }
  if (isUrgent) {
    badgesHtml += `<span class="badge-pill" style="background:#FFF1F2; color:#BE123C; border:1px solid #FDA4AF; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Urgent</span> `;
  }
  if (isSwap) {
    badgesHtml += `<span class="badge-pill badge-swap"><i class="fa-solid fa-repeat"></i> Swap</span> `;
  }
  if (courseCode) {
    badgesHtml += `<span class="badge-pill badge-course"><i class="fa-solid fa-book-open"></i> ${courseCode}</span> `;
  }
  if (isProSeller) {
    badgesHtml += `<span class="badge-pill" style="background:#FEF3C7; color:#92400E; border:1px solid #FDE68A; font-weight:700;"><i class="fa-solid fa-crown"></i> Pro</span> `;
  }
  // Green badge ONLY for sellers the Founder has approved; everyone else just shows their campus
  if (item.profiles && item.profiles.is_verified === true) {
    badgesHtml += `<span class="badge-pill badge-verified"><i class="fa-solid fa-shield-check"></i> Verified • ${campusShort}</span>`;
  } else {
    badgesHtml += `<span class="badge-pill badge-hall"><i class="fa-solid fa-graduation-cap"></i> ${campusShort}</span>`;
  }
  if (sellerHall) {
    badgesHtml += ` <span class="badge-pill badge-hall"><i class="fa-solid fa-location-dot"></i> ${sellerHall}</span>`;
  }

  card.innerHTML = `
    <div style="position:relative;">
      ${imageHtml}
      <button class="save-item-btn ${isSaved ? 'saved' : ''}" data-id="${item.id}" title="Save item">
        <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
      </button>
      ${(Array.isArray(item.image_urls) && item.image_urls.length > 1 && !isSold) ? `<div style="position:absolute; left:8px; top:8px; background:rgba(0,0,0,.6); color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px;"><i class="fa-solid fa-images"></i> ${item.image_urls.length}</div>` : ""}
    </div>
    <div class="listing-info">
      <div class="listing-title">${cleanTitle}</div>
      <div class="listing-price">${formattedPrice}</div>
      ${badgesHtml ? `<div class="card-badges">${badgesHtml}</div>` : ""}
    </div>
  `;

  // Favorite Heart Click Handler
  const heartBtn = card.querySelector(".save-item-btn");
  if (heartBtn) {
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.toggleSaveItem) {
        const nowSaved = window.toggleSaveItem(item.id);
        heartBtn.classList.toggle("saved", nowSaved);
        heartBtn.querySelector("i").className = nowSaved ? "fa-solid fa-heart" : "fa-regular fa-heart";
        updateSavedCounter();
        if (window.showToast) {
          window.showToast(nowSaved ? "Saved to your favorites!" : "Removed from favorites", "info");
        }
        if (savedOnly) {
          renderCurrentView();
        }
      }
    });
  }

  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    window.location.href = "listing.html?id=" + item.id;
  });

  return card;
}

// Multi-Filter Pipeline (Search + Hall + Swaps + Category Chips + Budget Pills + Saved)
function getFilteredListings() {
  let list = allListings;

  // 1. Hall / Hostel Filter
  if (activeHall !== "all") {
    list = list.filter((item) => {
      const h = (item.profiles?.hall || item.hall || "").toLowerCase();
      return h.includes(activeHall);
    });
  }

  // 2. Swaps Only
  if (swapsOnly) {
    list = list.filter((item) => {
      return item.is_swap === true ||
        (item.title && item.title.toUpperCase().includes("[SWAP]")) ||
        (item.description && item.description.toUpperCase().includes("[SWAP]")) ||
        (item.title && item.title.toLowerCase().includes("swap"));
    });
  }

  // 3. Saved Favorites Only
  if (savedOnly) {
    const savedIds = window.getSavedItemIds ? window.getSavedItemIds() : [];
    list = list.filter((item) => savedIds.includes(String(item.id)));
  }

  // 4. Category Filter Chip
  if (activeCategory !== "all") {
    list = list.filter((item) => {
      const catName = (categoryMap[item.category_id] || "").toLowerCase();
      const slug = (item.categories?.slug || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const text = `${catName} ${slug} ${title} ${desc}`;

      if (activeCategory === "academic") return text.includes("academic") || text.includes("book") || text.includes("course") || text.includes("calc") || text.includes("past") || text.includes("handout");
      if (activeCategory === "electronics") return text.includes("elect") || text.includes("phone") || text.includes("laptop") || text.includes("powerbank") || text.includes("charger") || text.includes("fan");
      if (activeCategory === "hostel") return text.includes("hostel") || text.includes("bed") || text.includes("gas") || text.includes("cylinder") || text.includes("mirror") || text.includes("curtain") || text.includes("mat") || text.includes("selfcon");
      if (activeCategory === "fashion") return text.includes("fashion") || text.includes("wear") || text.includes("shoe") || text.includes("bag") || text.includes("vintage") || text.includes("cloth");
      if (activeCategory === "services") return text.includes("service") || text.includes("skill") || text.includes("hair") || text.includes("type") || text.includes("tutor") || text.includes("graphic");
      if (activeCategory === "food") return text.includes("food") || text.includes("snack") || text.includes("choco") || text.includes("drink") || text.includes("provision");
      return slug === activeCategory;
    });
  }

  // 5. Budget Filter Pill
  if (activeBudget !== "all") {
    list = list.filter((item) => {
      const p = Number(item.price) || 0;
      if (activeBudget === "2000") return p > 0 && p <= 2000;
      if (activeBudget === "5000") return p > 0 && p <= 5000;
      if (activeBudget === "15000") return p > 0 && p <= 15000;
      if (activeBudget === "above15000") return p > 15000;
      return true;
    });
  }

  // 6. Authoritative Monetization Ranking: Boosted items FIRST, then Urgent, then newest
  const sorted = [...list].sort((a, b) => {
    const aBoost = (window.CampallyPay && window.CampallyPay.isListingBoosted(a.id)) ||
      a.is_boosted === true || a.is_featured === true ||
      (a.title && (a.title.includes("[FEATURED]") || a.title.includes("[BOOSTED]"))) ? 1 : 0;
    const bBoost = (window.CampallyPay && window.CampallyPay.isListingBoosted(b.id)) ||
      b.is_boosted === true || b.is_featured === true ||
      (b.title && (b.title.includes("[FEATURED]") || b.title.includes("[BOOSTED]"))) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;

    const aUrgent = (window.CampallyPay && window.CampallyPay.isListingUrgent(a.id)) ||
      a.is_urgent === true || (a.title && a.title.includes("[URGENT]")) ? 1 : 0;
    const bUrgent = (window.CampallyPay && window.CampallyPay.isListingUrgent(b.id)) ||
      b.is_urgent === true || (b.title && b.title.includes("[URGENT]")) ? 1 : 0;
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;

    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  return sorted;
}

function renderRows(listings) {
  if (!container) return;
  container.innerHTML = "";

  const displayListings = getFilteredListings();

  if (displayListings.length === 0) {
    const campusName = currentCampusId && window.getCampusName ? window.getCampusName(currentCampusId) : "this campus";
    const postLink = currentUserId ? "post-listing.html" : "login.html?redirect=post-listing.html";
    
    if (savedOnly) {
      container.innerHTML = `
        <div style="text-align:center; padding:50px 20px; color:#888;">
          <i class="fa-regular fa-heart" style="font-size:36px; color:#D1D5DB; margin-bottom:12px; display:block;"></i>
          <h3 style="font-size:16px; color:#2B2B2B; margin-bottom:6px;">No saved items yet</h3>
          <p style="font-size:13px; color:#777; max-width:320px; margin:0 auto 16px auto; line-height:1.4;">
            Tap the heart icon on any listing to save it here for quick access later!
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px; color:#888;">
        <i class="fa-solid fa-graduation-cap" style="font-size:36px; color:#D1D5DB; margin-bottom:12px; display:block;"></i>
        <h3 style="font-size:16px; color:#2B2B2B; margin-bottom:6px;">No listings matching these filters</h3>
        <p style="font-size:13px; color:#777; max-width:320px; margin:0 auto 16px auto; line-height:1.4;">
          Be the first student to post on ${campusName}!
        </p>
        <a href="${postLink}" class="btn-primary" style="display:inline-block; text-decoration:none; padding:10px 24px; font-size:14px; margin:0;">
          Post First Listing Here
        </a>
      </div>
    `;
    return;
  }

  // If a category filter is active, show flat grid
  if (activeCategory !== "all") {
    const grid = document.createElement("div");
    grid.className = "listings-grid";
    grid.style.padding = "10px 20px 40px 20px";
    displayListings.forEach((item) => grid.appendChild(makeCard(item)));
    container.appendChild(grid);
    return;
  }

  // Otherwise group by Category rows
  const grouped = {};
  displayListings.forEach((item) => {
    const catName = categoryMap[item.category_id] || "Campus Items";
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(item);
  });

  Object.keys(grouped).forEach((catName) => {
    const section = document.createElement("div");
    section.className = "category-row-section";

    const titleRow = document.createElement("div");
    titleRow.className = "category-row-header";

    const title = document.createElement("h3");
    title.className = "category-row-title";
    title.textContent = catName;

    const seeAll = document.createElement("a");
    seeAll.className = "see-all-link";
    seeAll.textContent = `See all (${grouped[catName].length})`;
    seeAll.href = "#";
    seeAll.addEventListener("click", (e) => {
      e.preventDefault();
      renderCategoryGrid(catName, grouped[catName]);
    });

    titleRow.appendChild(title);
    titleRow.appendChild(seeAll);
    section.appendChild(titleRow);

    const row = document.createElement("div");
    row.className = "category-row";
    grouped[catName].forEach((item) => row.appendChild(makeCard(item)));
    section.appendChild(row);

    container.appendChild(section);
  });
}

function renderCategoryGrid(catName, items) {
  if (!container) return;
  container.innerHTML = "";

  const backBtn = document.createElement("a");
  backBtn.href = "#";
  backBtn.className = "see-all-link";
  backBtn.style.display = "inline-block";
  backBtn.style.margin = "10px 20px";
  backBtn.textContent = "← Back to Home";
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    renderCurrentView();
  });
  container.appendChild(backBtn);

  const heading = document.createElement("h3");
  heading.className = "category-row-title";
  heading.style.padding = "0 20px";
  heading.textContent = `${catName} (${items.length})`;
  container.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "listings-grid";
  items.forEach((item) => grid.appendChild(makeCard(item)));
  container.appendChild(grid);
}

function renderSearchResults(term) {
  if (!container) return;
  container.innerHTML = "";

  let list = getFilteredListings();

  const filtered = list.filter((item) => {
    const t = (item.title || "").toLowerCase();
    const d = (item.description || "").toLowerCase();
    const h = (item.profiles?.hall || item.hall || "").toLowerCase();
    const dept = (item.profiles?.department || "").toLowerCase();
    const course = (item.course_code || extractCourseCode((item.title || "") + " " + (item.description || "")) || "").toLowerCase();

    return t.includes(term) || d.includes(term) || h.includes(term) || dept.includes(term) || course.includes(term);
  });

  const heading = document.createElement("h3");
  heading.className = "category-row-title";
  heading.style.padding = "0 20px";
  heading.textContent = `Results for "${term}" (${filtered.length})`;
  container.appendChild(heading);

  if (filtered.length === 0) {
    container.innerHTML += `
      <div style="text-align:center; padding:40px 20px; color:#888;">
        <i class="fa-solid fa-search" style="font-size:28px; color:#CCC; margin-bottom:8px; display:block;"></i>
        <p>No products found matching "${term}".</p>
      </div>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "listings-grid";
  filtered.forEach((item) => grid.appendChild(makeCard(item)));
  container.appendChild(grid);
}

function renderCurrentView() {
  const term = (searchInput?.value || "").trim().toLowerCase();
  if (term === "") {
    renderRows(allListings);
  } else {
    renderSearchResults(term);
  }
}

// Category Chips Listeners
document.querySelectorAll(".category-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.cat || "all";
    renderCurrentView();
  });
});

// Budget Pills Listeners
document.querySelectorAll(".budget-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".budget-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeBudget = btn.dataset.budget || "all";
    renderCurrentView();
  });
});

// Swaps Only Filter
if (swapFilterBtn) {
  swapFilterBtn.addEventListener("click", () => {
    swapsOnly = !swapsOnly;
    if (swapsOnly) {
      swapFilterBtn.style.background = "#FDF1EE";
      swapFilterBtn.style.borderColor = "#FCD8D0";
      swapFilterBtn.style.color = "#E8553D";
    } else {
      swapFilterBtn.style.background = "#FFFFFF";
      swapFilterBtn.style.borderColor = "#E5E0D8";
      swapFilterBtn.style.color = "#444";
    }
    renderCurrentView();
  });
}

// Saved Favorites Filter
if (savedFilterBtn) {
  savedFilterBtn.addEventListener("click", () => {
    savedOnly = !savedOnly;
    if (savedOnly) {
      savedFilterBtn.style.background = "#FFF5F3";
      savedFilterBtn.style.borderColor = "#E8553D";
      savedFilterBtn.style.color = "#E8553D";
    } else {
      savedFilterBtn.style.background = "#FFFFFF";
      savedFilterBtn.style.borderColor = "#E5E0D8";
      savedFilterBtn.style.color = "#444";
    }
    renderCurrentView();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderCurrentView();
  });
}

if (hallFilter) {
  hallFilter.addEventListener("change", (e) => {
    activeHall = e.target.value.toLowerCase();
    renderCurrentView();
  });
}

// ==========================================================
// WHATSAPP TOP DEALS DIGEST GENERATOR
// ==========================================================
if (whatsappDigestBtn) {
  whatsappDigestBtn.addEventListener("click", () => {
    const campusName = currentCampusId && window.getCampusShort ? window.getCampusShort(currentCampusId) : "Campus";
    const available = allListings.filter(item => item.status !== "sold").slice(0, 5);

    if (available.length === 0) {
      if (window.showToast) window.showToast("No active listings to share yet.", "info");
      return;
    }

    let messageLines = [
      `🔥 *HOT DEALS ON CAMPALLY (${campusName})* 🔥`,
      `Verified student marketplace for your campus:\n`
    ];

    available.forEach((item, idx) => {
      const priceText = item.price ? `₦${Number(item.price).toLocaleString()}` : "Free/Swap";
      messageLines.push(`${idx + 1}. *${item.title.trim()}* - ${priceText}`);
    });

    messageLines.push(`\n👉 *Browse deals & post what you need here:*`);
    messageLines.push(`${window.location.origin}/home.html`);

    const fullText = messageLines.join("\n");
    const encoded = encodeURIComponent(fullText);

    // Try opening WhatsApp directly, fallback to copying
    if (window.showConfirm) {
      window.showConfirm(
        "Share Deals on WhatsApp",
        "Open WhatsApp to share this formatted deals digest with your department or hall group?",
        () => {
          window.open(`https://wa.me/?text=${encoded}`, "_blank");
        }
      );
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  });
}

// ==========================================================
// CAMPUS AMBASSADOR MODAL & APPLICATION
// ==========================================================
if (openAmbassadorBtn && ambassadorModal) {
  openAmbassadorBtn.addEventListener("click", async () => {
    if (ambCampusSelect) {
      ambCampusSelect.innerHTML = `<option value="">Select your campus</option>`;
      const campusList = window.NIGERIAN_CAMPUSES || [];
      campusList.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `🏫 ${c.name}`;
        ambCampusSelect.appendChild(option);
      });
      if (currentCampusId) ambCampusSelect.value = currentCampusId;
    }

    // Pre-populate if student is already logged in
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const emailInput = document.getElementById("amb-email");
        if (emailInput && !emailInput.value && authData.user.email) {
          emailInput.value = authData.user.email;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, whatsapp_number, department, level, campus_id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profile) {
          const nameInput = document.getElementById("amb-name");
          if (nameInput && !nameInput.value && profile.full_name) {
            nameInput.value = profile.full_name;
          }
          const phoneInput = document.getElementById("amb-phone");
          if (phoneInput && !phoneInput.value && profile.whatsapp_number) {
            phoneInput.value = profile.whatsapp_number;
          }
          const deptInput = document.getElementById("amb-dept");
          if (deptInput && !deptInput.value) {
            const parts = [profile.department, profile.level].filter(Boolean);
            if (parts.length) deptInput.value = parts.join(" • ");
          }
          if (profile.campus_id && ambCampusSelect) {
            ambCampusSelect.value = profile.campus_id;
          }
        }
      }
    } catch (err) {
      console.warn("Ambassador prefill:", err);
    }

    ambassadorModal.style.display = "flex";
  });
}

if (closeAmbassadorBtn && ambassadorModal) {
  closeAmbassadorBtn.addEventListener("click", () => {
    ambassadorModal.style.display = "none";
  });
}

// Ambassador condition toggles & proof preview in home.js
let homeAmbProofDataUri = "";

const ambCondCourseRep = document.getElementById("amb-cond-course-rep");
const courseRepDetailsBox = document.getElementById("course-rep-details-box");
if (ambCondCourseRep && courseRepDetailsBox) {
  ambCondCourseRep.addEventListener("change", () => {
    courseRepDetailsBox.style.display = ambCondCourseRep.checked ? "block" : "none";
  });
}

const ambCondSocial = document.getElementById("amb-cond-social");
const socialDetailsBox = document.getElementById("social-details-box");
if (ambCondSocial && socialDetailsBox) {
  ambCondSocial.addEventListener("change", () => {
    socialDetailsBox.style.display = ambCondSocial.checked ? "flex" : "none";
  });
}

const ambProofFileInput = document.getElementById("amb-proof-file");
const ambProofPreviewBox = document.getElementById("amb-proof-preview-box");
const ambProofPreviewImg = document.getElementById("amb-proof-preview-img");
if (ambProofFileInput) {
  ambProofFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      if (window.showToast) window.showToast("Proof file is too large (max 8MB). Please choose a smaller image.", "error");
      else alert("Proof file is too large (max 8MB).");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      homeAmbProofDataUri = event.target.result;
      if (ambProofPreviewImg) ambProofPreviewImg.src = homeAmbProofDataUri;
      if (ambProofPreviewBox) ambProofPreviewBox.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
}

if (ambassadorForm) {
  ambassadorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("amb-name").value.trim();
    const email = document.getElementById("amb-email") ? document.getElementById("amb-email").value.trim() : "";
    const campusId = ambCampusSelect ? ambCampusSelect.value : null;
    let campusName = ambCampusSelect?.options[ambCampusSelect.selectedIndex]?.text || "Nigeria";
    campusName = campusName.replace(/^🏫\s*/, "");

    const dept = document.getElementById("amb-dept").value.trim();
    const phone = document.getElementById("amb-phone").value.trim();
    const reason = document.getElementById("amb-reason").value.trim();

    // Condition values
    const isCourseRep = ambCondCourseRep ? ambCondCourseRep.checked : false;
    const schoolPos = document.getElementById("amb-school-pos") ? document.getElementById("amb-school-pos").value.trim() : "";

    const hasSocial = ambCondSocial ? ambCondSocial.checked : false;
    const socialPlatform = document.getElementById("amb-social-platform") ? document.getElementById("amb-social-platform").value : "Instagram";
    const socialHandle = document.getElementById("amb-social-handle") ? document.getElementById("amb-social-handle").value.trim() : "";
    const socialFollowers = document.getElementById("amb-social-followers") ? document.getElementById("amb-social-followers").value.trim() : "";

    const activePledge = document.getElementById("amb-cond-active") ? document.getElementById("amb-cond-active").checked : true;
    const proofNote = document.getElementById("amb-proof-note") ? document.getElementById("amb-proof-note").value.trim() : "";

    if (!campusId) {
      if (window.showToast) window.showToast("Please select your campus.", "error");
      else alert("Please select your campus.");
      return;
    }

    if (!isCourseRep && !hasSocial) {
      if (window.showToast) window.showToast("Please check at least one qualification condition: Course Rep / Leader OR 3k+ Social Media followers.", "error");
      else alert("To qualify, please check at least one condition: Course Rep/Leader OR 3k+ followers.");
      return;
    }

    if (!homeAmbProofDataUri) {
      if (window.showToast) window.showToast("Please upload proof (screenshot/ID/letter) for Founder verification.", "error");
      else alert("Please upload proof of your qualification.");
      return;
    }

    const submitBtn = document.getElementById("amb-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting for review...`;
    }

    let userId = null;
    try {
      const { data: aData } = await supabase.auth.getUser();
      userId = aData?.user?.id || null;
    } catch (e) {}

    let registeredAmb = null;

    // Register application with proof in server
    try {
      const regRes = await fetch("/api/ambassadors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          campus_id: campusId,
          campus_name: campusName,
          dept,
          reason,
          user_id: userId,
          is_course_rep: isCourseRep,
          school_position_title: schoolPos,
          has_social_3k: hasSocial,
          social_platform: socialPlatform,
          social_handle: socialHandle,
          social_followers_count: socialFollowers,
          is_active_campus_pledge: activePledge,
          proof_type: isCourseRep ? "course_rep" : "social_media",
          proof_image_data: homeAmbProofDataUri,
          proof_note: proofNote
        })
      });
      const regJson = await regRes.json();
      if (regJson.success && regJson.ambassador) {
        registeredAmb = regJson.ambassador;
        localStorage.setItem("campally_active_amb_code", registeredAmb.code);
      }
    } catch (err) {
      console.warn("Ambassador server registration error:", err);
    }

    // Backup log in Supabase site_feedback
    try {
      await supabase.from("site_feedback").insert({
        name: `[AMBASSADOR APPLICANT] ${name} (${campusName})`,
        message: `Status: Pending Review | Course Rep: ${isCourseRep ? schoolPos : "No"} | Social: ${hasSocial ? (socialPlatform + " " + socialHandle + " " + socialFollowers) : "No"} | Email: ${email} | Phone: ${phone}`
      });
    } catch (err) {}

    if (window.showToast) {
      window.showToast("Application submitted for Founder review! Opening Ambassador Portal...", "success", 4000);
    }

    ambassadorModal.style.display = "none";
    ambassadorForm.reset();

    setTimeout(() => {
      const targetUrl = registeredAmb ? `ambassador.html?code=${encodeURIComponent(registeredAmb.code)}` : "ambassador.html";
      window.location.href = targetUrl;
    }, 1000);
  });
}

// ==========================================================
// STUDENT REQUESTS & WANTED BOARD (REAL STUDENT REQUESTS ONLY)
// ==========================================================

async function loadRequests() {
  if (!requestsList) return;
  requestsList.innerHTML = "<p style='text-align:center; color:#888; padding:30px 0;'>Loading student requests...</p>";

  const combined = [];

  // 1. Fetch real requests from server storage
  try {
    const sUrl = currentCampusId ? `/api/requests?campus_id=${currentCampusId}` : '/api/requests';
    const sRes = await fetch(sUrl);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (Array.isArray(sData)) {
        combined.push(...sData);
      }
    }
  } catch (err) {
    console.warn("Could not fetch server requests:", err);
  }

  // 2. Fetch real requests from Supabase if table exists
  try {
    let query = supabase.from("requests").select("*").order("id", { ascending: false });
    if (currentCampusId) query = query.eq("campus_id", currentCampusId);

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      data.forEach((item) => {
        if (!combined.some((c) => String(c.id) === String(item.id))) {
          combined.push(item);
        }
      });
    }
  } catch (_) {}

  // 3. Fallback to localStorage for any real requests submitted locally
  try {
    const stored = localStorage.getItem("campally_requests");
    if (stored) {
      const localList = JSON.parse(stored);
      if (Array.isArray(localList)) {
        localList.forEach((item) => {
          // Exclude any leftover mock items
          if (item && item.id && !['req-1', 'req-2', 'req-3'].includes(String(item.id))) {
            if (!combined.some((c) => String(c.id) === String(item.id))) {
              if (!currentCampusId || !item.campus_id || Number(item.campus_id) === Number(currentCampusId)) {
                combined.push(item);
              }
            }
          }
        });
      }
    }
  } catch (_) {}

  allRequests = combined;
  renderRequests();
}

function renderRequests() {
  if (!requestsList) return;
  if (allRequests.length === 0) {
    requestsList.innerHTML = "<p style='text-align:center; color:#888; padding:30px 0;'>No active requests on this campus. Be the first to post what you need!</p>";
    return;
  }

  requestsList.innerHTML = "";

  allRequests.forEach((req) => {
    const card = document.createElement("div");
    card.className = "request-card";

    const budgetText = req.budget ? `Target Budget: ₦${Number(req.budget).toLocaleString()}` : "Budget Negotiable";
    const phone = (req.whatsapp_number || "").replace(/\D/g, "");
    const waMessage = encodeURIComponent(`Hi! I saw your Campally request for "${req.title}". I have one available!`);

    let contactButtonHtml = "";
    if (currentUserId && phone) {
      contactButtonHtml = `
        <a href="https://wa.me/${phone}?text=${waMessage}" target="_blank" class="whatsapp-btn" style="padding:6px 14px; font-size:12px; margin:0; text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> I Have This!
        </a>
      `;
    } else if (!currentUserId) {
      contactButtonHtml = `
        <a href="login.html?redirect=home.html" class="whatsapp-btn" style="padding:6px 14px; font-size:12px; margin:0; text-decoration:none; background:#4B5563;">
          <i class="fa-solid fa-lock"></i> Sign In to Contact
        </a>
      `;
    }

    card.innerHTML = `
      <div class="request-header">
        <div>
          <div class="request-title"><i class="fa-solid fa-bullhorn" style="color:#E8553D; margin-right:4px;"></i> ${req.title}</div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            ${req.course_code ? `<span class="badge-pill badge-course">${req.course_code}</span>` : ""}
            ${req.hall ? `<span class="badge-pill badge-hall">📍 ${req.hall}</span>` : ""}
          </div>
        </div>
        <div class="request-budget">${budgetText}</div>
      </div>
      ${req.details ? `<p class="request-details">${req.details}</p>` : ""}
      <div class="request-meta">
        <span>Posted by student</span>
        ${contactButtonHtml}
      </div>
    `;

    requestsList.appendChild(card);
  });
}

// Tab Switching (Listings vs Requests)
if (tabListings && tabRequests && listingsView && requestsView) {
  tabListings.addEventListener("click", () => {
    tabListings.classList.add("active");
    tabRequests.classList.remove("active");
    listingsView.style.display = "block";
    requestsView.style.display = "none";
  });

  tabRequests.addEventListener("click", () => {
    tabRequests.classList.add("active");
    tabListings.classList.remove("active");
    listingsView.style.display = "none";
    requestsView.style.display = "block";
    loadRequests();
  });
}

// Post Request Modal Handling
if (openPostRequestBtn && postRequestModal) {
  openPostRequestBtn.addEventListener("click", async () => {
    if (!currentUserId) {
      if (window.showToast) {
        window.showToast("Please sign in to post what you need on Campally", "info");
      }
      setTimeout(() => {
        window.location.href = "login.html?redirect=home.html";
      }, 700);
      return;
    }
    postRequestModal.style.display = "flex";
  });
}

if (closeRequestModal && postRequestModal) {
  closeRequestModal.addEventListener("click", () => {
    postRequestModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === postRequestModal) postRequestModal.style.display = "none";
  if (e.target === ambassadorModal) ambassadorModal.style.display = "none";
});

if (newRequestForm) {
  newRequestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUserId) {
      window.location.href = "login.html?redirect=home.html";
      return;
    }

    const title = document.getElementById("req-title").value.trim();
    const course = document.getElementById("req-course").value.trim();
    const hall = document.getElementById("req-hall").value.trim();
    const budget = document.getElementById("req-budget").value.trim();
    const details = document.getElementById("req-details").value.trim();
    const whatsapp = document.getElementById("req-whatsapp").value.trim();

    const newReq = {
      id: "req-" + Date.now(),
      title,
      course_code: course || null,
      hall: hall || null,
      budget: budget ? Number(budget) : null,
      details: details || null,
      whatsapp_number: whatsapp,
      campus_id: currentCampusId || 1,
      created_at: new Date().toISOString()
    };

    try {
      let res = await supabase.from("requests").insert(newReq);
      if (res && res.error && res.error.message && res.error.message.includes("campus_id")) {
        const payloadWithoutCampus = { ...newReq };
        delete payloadWithoutCampus.campus_id;
        await supabase.from("requests").insert(payloadWithoutCampus);
      }
    } catch (err) {
      console.log("Saved request locally:", err);
    }

    // Save to persistent server endpoint
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq)
      });
    } catch (err) {
      console.warn("Could not save to server requests endpoint:", err);
    }

    allRequests.unshift(newReq);
    localStorage.setItem("campally_requests", JSON.stringify(allRequests));

    if (window.showToast) {
      window.showToast("Your request was published to the campus board!", "success");
    }

    postRequestModal.style.display = "none";
    newRequestForm.reset();
    renderRequests();
  });
}

// ==========================================================
// NEW USER GUIDE SUGGESTION BANNER
// ==========================================================

function checkNewUserGuideSuggestion() {
  const container = document.getElementById("home-new-user-suggestion");
  if (!container) return;

  const showSuggestion = localStorage.getItem("campally_show_guide_suggestion") === "true";
  if (!showSuggestion) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FEF2F2 100%); border: 1.5px solid #FDBA74; border-radius: 14px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 4px 12px rgba(232, 85, 61, 0.08);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #E8553D; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
          <i class="fa-solid fa-graduation-cap"></i>
        </div>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: #9A3412;">Welcome to Campally! 🎉</div>
          <div style="font-size: 11px; color: #7C2D12;">New student? See how to buy safely, sell items quickly, and post campus requests.</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <a href="how-to-use.html?from=home" style="background: #E8553D; color: #FFFFFF; font-weight: 700; font-size: 11px; padding: 7px 12px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;">
          <i class="fa-solid fa-book-open"></i> See How to Use
        </a>
        <button id="dismiss-home-guide-btn" style="background: transparent; border: none; font-size: 18px; color: #9A3412; cursor: pointer; padding: 2px 6px; line-height: 1;">&times;</button>
      </div>
    </div>
  `;

  const dismissBtn = document.getElementById("dismiss-home-guide-btn");
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      container.style.display = "none";
      localStorage.removeItem("campally_show_guide_suggestion");
    };
  }
}

// ==========================================================
// INIT APP
// ==========================================================

async function init() {
  updateSavedCounter();
  checkNewUserGuideSuggestion();

  try {
    const { data: categories } = await supabase.from("categories").select("*");
    if (categories) {
      categories.forEach((cat) => { categoryMap[cat.id] = cat.name; });
    }

    // Populate all Nigerian campuses from campuses directory
    if (campusSelect) {
      campusSelect.innerHTML = `<option value="">🏫 All Campuses (Nigeria)</option>`;
      const campusList = window.NIGERIAN_CAMPUSES || [];
      campusList.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `🏫 ${c.name}`;
        campusSelect.appendChild(option);
      });
    }

    // Check if user specifically requested to browse as visitor
    const urlParams = new URLSearchParams(window.location.search);
    const forceVisitor = urlParams.get("visitor") === "true" || sessionStorage.getItem("campally_visitor_mode") === "true";

    if (forceVisitor) {
      currentUserId = null;
      if (visitorBanner) visitorBanner.style.display = "flex";
      const link = document.getElementById("profile-nav-link");
      if (link) link.href = "login.html";
    } else {
      // Check user auth state: read local session instantly
      let authenticatedUser = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          authenticatedUser = sessionData.session.user;
        }
      } catch (_) {}

      if (!authenticatedUser) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) authenticatedUser = userData.user;
        } catch (_) {}
      }

      if (authenticatedUser) {
        currentUserId = authenticatedUser.id;
        if (visitorBanner) visitorBanner.style.display = "none";

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("campus_id")
            .eq("id", authenticatedUser.id)
            .maybeSingle();
          if (profile?.campus_id) {
            currentCampusId = Number(profile.campus_id);
            if (campusSelect) campusSelect.value = currentCampusId;
          }
        } catch (_) {}
      } else {
        currentUserId = null;
        if (visitorBanner) visitorBanner.style.display = "flex";
      }
    }

    // Set up interactive Campus Search Autocomplete
    if (campusSearchInput && campusSuggestionsDropdown && window.setupCampusAutocomplete) {
      const autocomplete = window.setupCampusAutocomplete({
        input: campusSearchInput,
        dropdown: campusSuggestionsDropdown,
        showAllOption: true,
        allOptionLabel: "🏫 All Campuses (Nigeria)",
        initialCampusId: currentCampusId,
        onSelect: (campus) => {
          if (campus) {
            currentCampusId = campus.id;
            if (campusSelect) campusSelect.value = campus.id;
            if (clearCampusBtn) clearCampusBtn.style.display = "block";
          } else {
            currentCampusId = null;
            if (campusSelect) campusSelect.value = "";
            if (clearCampusBtn) clearCampusBtn.style.display = "none";
          }
          fetchListingsForCampus(currentCampusId);
          if (requestsView && requestsView.style.display !== "none") {
            loadRequests();
          }
        }
      });

      if (currentCampusId && clearCampusBtn) {
        clearCampusBtn.style.display = "block";
      }

      if (clearCampusBtn) {
        clearCampusBtn.addEventListener("click", () => {
          currentCampusId = null;
          campusSearchInput.value = "";
          campusSearchInput.placeholder = "Type campus name or abbreviation (e.g. FUNAI, UNILAG, UNN, Ibadan)...";
          if (campusSelect) campusSelect.value = "";
          clearCampusBtn.style.display = "none";
          fetchListingsForCampus(null);
          if (requestsView && requestsView.style.display !== "none") {
            loadRequests();
          }
        });
      }
    }

    if (campusSelect) {
      campusSelect.addEventListener("change", () => {
        currentCampusId = campusSelect.value ? Number(campusSelect.value) : null;
        fetchListingsForCampus(currentCampusId);
        if (requestsView && requestsView.style.display !== "none") {
          loadRequests();
        }
      });
    }

    
    fetchListingsForCampus(currentCampusId);
  } catch (e) {
    console.error("Init error:", e);
    fetchListingsForCampus(null);
  }
}

init();

// Sync user profile bottom nav link if not in visitor mode
const isVisitorSession = new URLSearchParams(window.location.search).get("visitor") === "true" || sessionStorage.getItem("campally_visitor_mode") === "true";
if (!isVisitorSession) {
  supabase.auth.getSession().then(({ data }) => {
    const link = document.getElementById("profile-nav-link");
    const user = data?.session?.user;
    if (link && user) {
      link.href = "seller.html?id=" + user.id;
    }
  }).catch(() => {});
}
