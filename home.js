const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listingsContainer = document.getElementById("listings");
const categoryButtons = document.querySelectorAll(".category-pill");
const searchInput = document.getElementById("search-input");

let allListings = [];
let activeCategory = "all";

async function fetchListings() {
  const { data, error } = await supabase
    .from("listings")
    .select("*, categories(slug)")
    .eq("status", "active");
  
  if (error) {
    listingsContainer.innerHTML = "<p>Error loading listings.</p>";
    return;
  }
  
  allListings = data;
  renderListings();
}

function renderListings() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  
  let filtered = allListings;
  
  if (activeCategory !== "all") {
    filtered = filtered.filter((item) => item.categories?.slug === activeCategory);
  }
  
  if (searchTerm) {
    filtered = filtered.filter((item) => item.title.toLowerCase().includes(searchTerm));
  }
  
  if (filtered.length === 0) {
    listingsContainer.innerHTML = "<p id='loading-text'>No listings match.</p>";
    return;
  }
  
  listingsContainer.innerHTML = "";
  
  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "listing-card";
      const imageHtml = item.image_url ?
  `<img src="${item.image_url}" class="listing-image" style="object-fit:cover;">` :
  `<div class="listing-image">No image</div>`;

card.innerHTML = `
      ${imageHtml}
      <div class="listing-info">
        <div class="listing-title">${item.title}</div>
        <div class="listing-price">₦${item.price ?? "N/A"}</div>
      </div>
    `;
card.style.cursor = "pointer";
card.addEventListener("click", () => {
  window.location.href = "listing.html?id=" + item.id;
});
    listingsContainer.appendChild(card);
  });
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category;
    renderListings();
  });
});

searchInput.addEventListener("input", renderListings);

fetchListings();

supabase.auth.getUser().then(({ data }) => {
  const link = document.getElementById("profile-nav-link");
  if (link && data.user) {
    link.href = "seller.html?id=" + data.user.id;
  }
});