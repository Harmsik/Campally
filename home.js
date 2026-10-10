const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const container = document.getElementById("category-rows");
const searchInput = document.getElementById("search-input");

let allListings = [];
let categoryMap = {};

async function init() {
  const { data: userData } = await supabase.auth.getUser();

  let campusId = null;
  if (userData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("campus_id")
      .eq("id", userData.user.id)
      .single();
    campusId = profile?.campus_id || null;
  }

  const { data: categories } = await supabase.from("categories").select("*");
  categories.forEach((cat) => { categoryMap[cat.id] = cat.name; });

  let query = supabase.from("listings").select("*").eq("status", "active");
  if (campusId) query = query.eq("campus_id", campusId);

  const { data, error } = await query;

  if (error || !data) {
    container.innerHTML = "<p style='text-align:center; color:#999; padding:40px 0;'>Error loading listings.</p>";
    return;
  }

  allListings = data;
  renderRows(allListings);
}

function makeCard(item) {
  const card = document.createElement("div");
  card.className = "listing-card";
  const imageHtml = item.image_url
    ? `<img src="${item.image_url}" class="listing-image" style="object-fit:cover;">`
    : `<div class="listing-image">No image</div>`;
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
  return card;
}

function renderRows(listings) {
  container.innerHTML = "";

  if (listings.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#999; padding:40px 0;'>No listings yet. Be the first to post!</p>";
    return;
  }

  const grouped = {};
  listings.forEach((item) => {
    const catName = categoryMap[item.category_id] || "Other";
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(item);
  });

  Object.keys(grouped).forEach((catName) => {
    const section = document.createElement("div");
    section.className = "category-row-section";

    const title = document.createElement("h3");
    title.className = "category-row-title";
    title.textContent = catName;
    section.appendChild(title);

    const row = document.createElement("div");
    row.className = "category-row";
    grouped[catName].forEach((item) => row.appendChild(makeCard(item)));
    section.appendChild(row);

    container.appendChild(section);
  });
}

function renderSearchResults(term) {
  const filtered = allListings.filter((item) =>
    item.title.toLowerCase().includes(term.toLowerCase())
  );

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#999; padding:40px 0;'>No listings match.</p>";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "listings-grid";
  filtered.forEach((item) => grid.appendChild(makeCard(item)));
  container.appendChild(grid);
}

searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim();
  if (term === "") {
    renderRows(allListings);
  } else {
    renderSearchResults(term);
  }
});

init();
