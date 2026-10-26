// Campally: Book a Service page
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const TYPES = window.CAMPALLY_SERVICE_TYPES || [];
let allServices = [];
let activeType = "all";
let searchText = "";
let myCampusId = null;
let showAllCampuses = false;
let bookingItem = null;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function cleanDesc(d) {
  return String(d || "").replace(/\[[^\]]*\]/g, "").trim();
}
function toast(msg, type) {
  if (window.showToast) window.showToast(msg, type || "info");
  else alert(msg);
}

function buildChips() {
  const bar = $("svc-chips");
  let html = '<button class="category-chip active" data-type="all">🌟 All Services</button>';
  TYPES.forEach((t) => {
    html += `<button class="category-chip" data-type="${esc(t.name)}"><i class="fa-solid ${t.icon}"></i> ${esc(t.name)}</button>`;
  });
  bar.innerHTML = html;
  bar.querySelectorAll(".category-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      bar.querySelectorAll(".category-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeType = chip.getAttribute("data-type");
      render();
    });
  });
}

function renderCampusLine() {
  const el = $("svc-campus");
  if (!myCampusId) { el.innerHTML = ""; return; }
  el.innerHTML = showAllCampuses
    ? 'Showing all campuses · <a id="svc-toggle">Show only my campus</a>'
    : 'Showing your campus · <a id="svc-toggle">Show all campuses</a>';
  $("svc-toggle").addEventListener("click", () => {
    showAllCampuses = !showAllCampuses;
    renderCampusLine();
    render();
  });
}

function render() {
  const grid = $("svc-grid");
  let list = allServices.filter((i) => i.status !== "sold");

  if (myCampusId && !showAllCampuses) list = list.filter((i) => i.campus_id === myCampusId);
  if (activeType !== "all") list = list.filter((i) => (i.service_category || "Other") === activeType);
  if (searchText) {
    const q = searchText.toLowerCase();
    list = list.filter((i) =>
      `${i.title} ${i.description} ${i.service_category} ${i.profiles && i.profiles.full_name}`.toLowerCase().includes(q));
  }

  if (!list.length) {
    grid.innerHTML = '<div class="svc-empty">No services here yet.<br>Do you offer one? <a href="post-listing.html?type=service">Post your service</a> and students can book you.</div>';
    return;
  }

  grid.innerHTML = list.map((i) => {
    const p = i.profiles || {};
    const price = i.price ? "From ₦" + Number(i.price).toLocaleString() : "Ask for price";
    const img = i.image_url
      ? `<img class="svc-img" src="${esc(i.image_url)}" alt="" loading="lazy">`
      : '<div class="svc-img"><i class="fa-solid fa-calendar-check"></i></div>';
    const desc = cleanDesc(i.description);
    return `<div class="svc-card">
      ${img}
      <div class="svc-body">
        <span class="svc-tag">${esc(i.service_category || "Other")}</span>
        <div class="svc-title">${esc(i.title)}</div>
        <div class="svc-by">by ${esc(p.full_name || "Campus student")}${p.hall ? " · " + esc(p.hall) : ""}</div>
        ${desc ? `<div class="svc-desc">${esc(desc.slice(0, 110))}${desc.length > 110 ? "…" : ""}</div>` : ""}
        <div class="svc-price">${price}</div>
        <div class="svc-actions">
          <button class="svc-book" data-id="${esc(i.id)}"><i class="fa-solid fa-calendar-check"></i> Book</button>
          <a class="svc-view" href="listing.html?id=${esc(i.id)}">Details</a>
        </div>
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".svc-book").forEach((btn) => {
    btn.addEventListener("click", () => openBooking(btn.getAttribute("data-id")));
  });
}

function openBooking(id) {
  bookingItem = allServices.find((i) => String(i.id) === String(id));
  if (!bookingItem) return;
  const p = bookingItem.profiles || {};
  $("svc-modal-title").textContent = "Book: " + bookingItem.title;
  $("svc-modal-by").textContent = "with " + (p.full_name || "this student");
  $("svc-modal").style.display = "flex";
}
function closeBooking() {
  $("svc-modal").style.display = "none";
  bookingItem = null;
}

function sendBooking() {
  if (!bookingItem) return;
  const p = bookingItem.profiles || {};
  let phone = String(p.whatsapp_number || "").replace(/\D/g, "");
  if (!phone) {
    toast("This provider has not added a WhatsApp number yet. Open Details to contact them.", "error");
    return;
  }
  if (phone.startsWith("0")) phone = "234" + phone.slice(1);
  const when = $("svc-when").value.trim();
  const where = $("svc-where").value.trim();
  const note = $("svc-note").value.trim();
  if (!when) { toast("Please tell them when you need it.", "error"); return; }

  const lines = [
    `Hello ${p.full_name || ""}, I found your "${bookingItem.title}" service on Campally and I'd like to book.`,
    `When: ${when}`
  ];
  if (where) lines.push(`Where: ${where}`);
  if (note) lines.push(`Note: ${note}`);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  closeBooking();
}

async function loadServices() {
  $("svc-grid").innerHTML = '<div class="svc-empty">Loading services...</div>';
  const { data, error } = await supabase
    .from("listings")
    .select("*, profiles(id, full_name, hall, avatar_url, whatsapp_number)")
    .eq("listing_type", "service")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Services load error:", error.message);
    $("svc-grid").innerHTML = '<div class="svc-empty">Services are being set up. Please check back soon.</div>';
    return;
  }
  allServices = data || [];
  render();
}

async function init() {
  buildChips();
  $("svc-search").addEventListener("input", (e) => { searchText = e.target.value.trim(); render(); });
  $("svc-send").addEventListener("click", sendBooking);
  $("svc-cancel").addEventListener("click", closeBooking);
  $("svc-modal").addEventListener("click", (e) => { if (e.target.id === "svc-modal") closeBooking(); });

  try {
    const { data } = await supabase.auth.getSession();
    const user = data && data.session && data.session.user;
    if (user) {
      const res = await supabase.from("profiles").select("campus_id").eq("id", user.id).single();
      if (res.data && res.data.campus_id) myCampusId = res.data.campus_id;
    }
  } catch (e) {}
  renderCampusLine();
  await loadServices();
}

init();
