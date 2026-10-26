// Campally Global Utilities & Navigation
// Proactively clear stale ServiceWorker caches to prevent stale UI across browser updates
(function clearStaleAppCache() {
  try {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        }).catch(() => {});
      }
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        }).catch(() => {});
      }
    }
  } catch (_) {}
})();

// Universal Campus Ambassador Referral Tracker
(function initAmbassadorReferralTracking() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      const cleanRef = ref.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (cleanRef) {
        localStorage.setItem("campally_ref_code", cleanRef);
        sessionStorage.setItem("campally_ref_code", cleanRef);
        // Ping link click counter
        fetch(`/api/ambassadors/click?code=${encodeURIComponent(cleanRef)}`).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Referral tracking error:", e);
  }
})();

window.getCampallyReferralCode = function() {
  try {
    return localStorage.getItem("campally_ref_code") || sessionStorage.getItem("campally_ref_code") || null;
  } catch (e) {
    return null;
  }
};

window.CAMPUS_SAFE_SPOTS = [
  "University Main Library Foyer",
  "Student Union Building (SUB) Front Atrium",
  "Faculty Lecture Theater Corridor",
  "Hostel Porter's Lodge / Reception Desk",
  "Campus Main Gate Security Center"
];

// Service types shared by the Post form and the Book a Service page
window.CAMPALLY_SERVICE_TYPES = [
  { name: "Barbing", icon: "fa-scissors" },
  { name: "Hair & Braiding", icon: "fa-spa" },
  { name: "Make-up", icon: "fa-wand-magic-sparkles" },
  { name: "Nails & Lashes", icon: "fa-hand-sparkles" },
  { name: "Photography & Video", icon: "fa-camera" },
  { name: "Graphic Design", icon: "fa-palette" },
  { name: "Web & App Design", icon: "fa-laptop-code" },
  { name: "Tutoring & Lessons", icon: "fa-chalkboard-user" },
  { name: "Baking & Cakes", icon: "fa-cake-candles" },
  { name: "Catering & Cooking", icon: "fa-utensils" },
  { name: "Laundry & Ironing", icon: "fa-shirt" },
  { name: "Cleaning", icon: "fa-broom" },
  { name: "Phone & Laptop Repair", icon: "fa-screwdriver-wrench" },
  { name: "Printing & Typing", icon: "fa-print" },
  { name: "Tailoring", icon: "fa-ruler-combined" },
  { name: "Delivery & Errands", icon: "fa-motorcycle" },
  { name: "Events, DJ & MC", icon: "fa-music" },
  { name: "Fitness Training", icon: "fa-dumbbell" },
  { name: "Moving & Hauling", icon: "fa-truck" },
  { name: "Other", icon: "fa-ellipsis" }
];

// Currency and Swap Price Formatter
window.formatPrice = function(val, isSwap) {
  if (isSwap) {
    if (!val || Number(val) === 0) return "🔄 Open to Swap";
    return `₦${Number(val).toLocaleString()} (or Swap)`;
  }
  if (val === null || val === undefined || val === "") return "₦0 (Free / Negotiable)";
  const num = Number(val);
  if (!isNaN(num)) {
    return `₦${num.toLocaleString()}`;
  }
  return `₦${val}`;
};

// Sold Status Management (Synced locally & with Supabase)
window.isItemSold = function(itemId) {
  if (!itemId) return false;
  try {
    const soldList = JSON.parse(localStorage.getItem("campally_sold_items") || "[]");
    return soldList.includes(String(itemId));
  } catch (e) {
    return false;
  }
};

window.setItemSoldStatus = function(itemId, isSold) {
  if (!itemId) return;
  try {
    let soldList = JSON.parse(localStorage.getItem("campally_sold_items") || "[]");
    const strId = String(itemId);
    if (isSold) {
      if (!soldList.includes(strId)) soldList.push(strId);
    } else {
      soldList = soldList.filter(id => id !== strId);
    }
    localStorage.setItem("campally_sold_items", JSON.stringify(soldList));
  } catch (e) {}
};

// Saved / Favorites Management (Bookmarks)
window.getSavedItemIds = function() {
  try {
    return JSON.parse(localStorage.getItem("campally_saved_items") || "[]");
  } catch (e) {
    return [];
  }
};

window.isItemSaved = function(itemId) {
  if (!itemId) return false;
  const list = window.getSavedItemIds();
  return list.includes(String(itemId));
};

window.toggleSaveItem = function(itemId) {
  if (!itemId) return false;
  const strId = String(itemId);
  let list = window.getSavedItemIds();
  const exists = list.includes(strId);
  if (exists) {
    list = list.filter(id => id !== strId);
  } else {
    list.push(strId);
  }
  localStorage.setItem("campally_saved_items", JSON.stringify(list));
  return !exists;
};


// In-App Toast Notification
window.showToast = function(message, type = "info", duration = 3200) {
  let container = document.getElementById("campally-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "campally-toast-container";
    container.className = "campally-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `campally-toast ${type}`;
  
  let icon = "fa-circle-info";
  if (type === "success") icon = "fa-circle-check";
  if (type === "error") icon = "fa-triangle-exclamation";
  
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// In-App Confirmation Modal
window.showConfirm = function(title, message, onConfirm) {
  const existing = document.getElementById("campally-confirm-modal");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "campally-confirm-modal";
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-content" style="max-width:340px; text-align:center;">
      <h3 style="font-size:18px; margin-bottom:8px; color:#2B2B2B;">${title}</h3>
      <p style="font-size:14px; color:#666; margin-bottom:20px; line-height:1.4;">${message}</p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="confirm-cancel-btn" style="flex:1; padding:10px; border:1px solid #E5E0D8; background:#FAF9F6; border-radius:10px; font-weight:600; cursor:pointer; color:#555;">Cancel</button>
        <button id="confirm-ok-btn" style="flex:1; padding:10px; border:none; background:#E8553D; color:white; border-radius:10px; font-weight:600; cursor:pointer;">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector("#confirm-cancel-btn").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#confirm-ok-btn").addEventListener("click", () => {
    backdrop.remove();
    if (typeof onConfirm === "function") onConfirm();
  });
};

function loadNav(activePage) {
  // Ensure FontAwesome stylesheet is included if not present
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    document.head.appendChild(fa);
  }

  const pages = [
    { id: "home", href: "home.html", icon: "fa-house", label: "Home" },
    { id: "services", href: "services.html", icon: "fa-calendar-check", label: "Services" },
    { id: "post", href: "post-listing.html", icon: "fa-square-plus", label: "Post" },
    { id: "listings", href: "my-listings.html", icon: "fa-bag-shopping", label: "Listings" },
    { id: "profile", href: "profile.html", label: "Profile", icon: "fa-user", isProfile: true }
  ];
  
  // Remove existing bottom nav if any
  const existingNav = document.querySelector(".bottom-nav");
  if (existingNav) existingNav.remove();

  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  
  pages.forEach((page) => {
    const link = document.createElement("a");
    link.href = page.href;
    link.className = "nav-item" + (page.id === activePage ? " active" : "");
    if (page.isProfile) link.id = "profile-nav-link";
    link.innerHTML = `<i class="fa-solid ${page.icon}"></i><span>${page.label}</span>`;
    nav.appendChild(link);
  });
  
  document.body.appendChild(nav);
  
  if (window.supabase) {
    const supabase = window.supabase.createClient(
      "https://mhshjusbtrkkkktymiyg.supabase.co",
      "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4"
    );
    const isVisitor = sessionStorage.getItem("campally_visitor_mode") === "true";
    const link = document.getElementById("profile-nav-link");
    if (isVisitor) {
      if (link) link.href = "login.html";
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (link) {
        if (user) {
          link.href = "seller.html?id=" + user.id;
        } else {
          link.href = "login.html";
        }
      }
    }).catch(() => {
      if (link) link.href = "login.html";
    });
  }
}
