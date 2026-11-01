/**
 * Campally - Bookstore page
 * Tabs: Textbooks, Manuals, Past questions (listings with a book type) and Tutors (tutoring services).
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COND = { new: "New", like_new: "Like new", good: "Good", fair: "Fair" };
const LEVELS = ["All", "100L", "200L", "300L", "400L", "500L", "Postgraduate"];
const TAB_INFO = {
  textbook:       { empty: "No textbooks here yet", cta: "Sell a textbook", sub: "Be the first to sell a textbook on your campus.", icon: "fa-book" },
  manual:         { empty: "No manuals or handouts yet", cta: "Sell a manual", sub: "Lab manuals, course handouts and workbooks sell fast.", icon: "fa-book-open" },
  past_questions: { empty: "No past questions yet", cta: "Sell past questions", sub: "Printed past questions and your own compiled notes are welcome. No PDFs.", icon: "fa-file-pen" },
  tutors:         { empty: "No tutors yet", cta: "Offer tutoring", sub: "Good at a course? Offer lessons and earn from your knowledge.", icon: "fa-chalkboard-user" }
};

const $ = (id) => document.getElementById(id);
const state = { tab: "textbook", level: "All", cond: "all", sort: "new", q: "", mine: true, campusId: null, token: 0 };

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(p) { return window.formatPrice ? window.formatPrice(p, false) : "\u20A6" + Number(p || 0).toLocaleString(); }
function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join("") || "?"; }
function cleanTitle(t) { return String(t || "").replace(/^\[SWAP\]\s*/i, ""); }

// ---------- filters bar ----------
function renderFilters() {
  const bar = $("bk-filters");
  bar.innerHTML = "";
  if (state.tab !== "tutors") {
    LEVELS.forEach((l) => {
      const b = document.createElement("button");
      b.className = "bk-chip" + (state.level === l ? " on" : "");
      b.textContent = l;
      b.addEventListener("click", () => { state.level = l; renderFilters(); load(); });
      bar.appendChild(b);
    });
    const c = document.createElement("select");
    c.className = "bk-sel";
    c.setAttribute("aria-label", "Condition");
    c.innerHTML = '<option value="all">Any condition</option><option value="new">New</option><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair</option>';
    c.value = state.cond;
    c.addEventListener("change", () => { state.cond = c.value; load(); });
    bar.appendChild(c);
  }
  const s = document.createElement("select");
  s.className = "bk-sel";
  s.setAttribute("aria-label", "Sort");
  s.innerHTML = '<option value="new">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>';
  s.value = state.sort;
  s.addEventListener("change", () => { state.sort = s.value; load(); });
  bar.appendChild(s);

  if (state.campusId) {
    const m = document.createElement("button");
    m.className = "bk-chip" + (state.mine ? " on" : "");
    m.innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + (state.mine ? "My campus" : "All campuses");
    m.addEventListener("click", () => { state.mine = !state.mine; renderFilters(); load(); });
    bar.appendChild(m);
  }
}

// ---------- results ----------
function emptyBlock() {
  const t = TAB_INFO[state.tab];
  const href = state.tab === "tutors" ? "post-listing.html" : "post-listing.html?book=1&type=" + state.tab;
  const d = document.createElement("div");
  d.className = "bk-empty";
  d.innerHTML = '<i class="fa-solid ' + t.icon + '"></i><b>' + t.empty + "</b><p>" + t.sub + '</p><a href="' + href + '">' + t.cta + "</a>";
  return d;
}

function bookCard(it) {
  const a = document.createElement("a");
  a.className = "bk-card";
  a.href = "listing.html?id=" + encodeURIComponent(it.id);
  const seller = it.profiles || {};
  const tags = [];
  if (it.course_code) tags.push('<span class="bk-tag course">' + esc(it.course_code) + "</span>");
  if (it.book_condition) tags.push('<span class="bk-tag cond-' + esc(it.book_condition) + '">' + esc(COND[it.book_condition] || it.book_condition) + "</span>");
  if (it.book_author) tags.push('<span class="bk-tag">' + esc(it.book_author) + "</span>");
  a.innerHTML =
    '<div class="bk-img"><i class="fa-solid fa-book"></i>' +
    (it.image_url ? '<img alt="" loading="lazy" src="' + esc(it.image_url) + '" onerror="this.remove()">' : "") +
    (it.book_level ? '<span class="bk-lvl">' + esc(it.book_level) + "</span>" : "") + "</div>" +
    '<div class="bk-info"><div class="bk-title">' + esc(cleanTitle(it.title)) + '</div><div class="bk-price">' + esc(money(it.price)) + "</div>" +
    '<div class="bk-meta">' + tags.join("") + "</div>" +
    '<div class="bk-seller">' + (seller.is_verified ? '<i class="fa-solid fa-circle-check"></i> ' : "") + esc(seller.full_name || "Campus seller") + (seller.hall ? " \u2022 " + esc(seller.hall) : "") + "</div></div>";
  return a;
}

function tutorCard(it) {
  const a = document.createElement("a");
  a.className = "bk-tutor";
  a.href = "listing.html?id=" + encodeURIComponent(it.id);
  const s = it.profiles || {};
  a.innerHTML =
    '<div class="bk-tav">' + esc(initials(s.full_name)) + (s.avatar_url ? '<img alt="" src="' + esc(s.avatar_url) + '" onerror="this.remove()">' : "") + "</div>" +
    '<div style="min-width:0;"><div class="bk-title" style="min-height:0;">' + esc(cleanTitle(it.title)) + "</div>" +
    '<div class="bk-seller" style="margin-top:3px;">' + (s.is_verified ? '<i class="fa-solid fa-circle-check"></i> ' : "") + esc(s.full_name || "Campus tutor") + "</div>" +
    '<div class="bk-price" style="font-size:13.5px;">' + esc(it.price ? "From " + money(it.price) : "Ask for price") + "</div></div>" +
    '<span class="bk-tgo">View</span>';
  return a;
}

async function load() {
  const mine = ++state.token;
  const out = $("bk-results");
  const tutors = state.tab === "tutors";
  out.className = tutors ? "bk-tutors" : "bk-grid";
  if (window.UI) {
    if (tutors) UI.skeletonList(out, 4); else UI.skeletonGrid(out, 6, true);
  }

  let q = supabase.from("listings")
    .select("*, profiles(id, full_name, hall, avatar_url, is_verified)")
    .eq("status", "active");
  if (tutors) q = q.eq("listing_type", "service").eq("service_category", "Tutoring & Lessons");
  else {
    q = q.eq("book_type", state.tab);
    if (state.level !== "All") q = q.eq("book_level", state.level);
    if (state.cond !== "all") q = q.eq("book_condition", state.cond);
  }
  if (state.campusId && state.mine) q = q.eq("campus_id", state.campusId);
  const term = state.q.replace(/[,()%*\\]/g, " ").trim();
  if (term) q = q.or("title.ilike.%" + term + "%,course_code.ilike.%" + term + "%,book_author.ilike.%" + term + "%");
  if (state.sort === "low") q = q.order("price", { ascending: true, nullsFirst: false });
  else if (state.sort === "high") q = q.order("price", { ascending: false, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error } = await q.limit(60);
  if (mine !== state.token) return;   // a newer search replaced this one

  out.innerHTML = "";
  if (error) {
    out.innerHTML = '<div class="bk-empty"><i class="fa-solid fa-wifi"></i><b>Could not load the Bookstore</b><p>Please check your connection and try again.</p></div>';
    return;
  }
  if (!data || !data.length) { out.appendChild(emptyBlock()); return; }
  data.forEach((it) => out.appendChild(tutors ? tutorCard(it) : bookCard(it)));
}

// ---------- rules sheet ----------
function openRules() {
  const s = document.createElement("div");
  s.className = "bk-sheet";
  s.innerHTML = '<div class="bk-panel"><h3>Bookstore rules</h3><ul style="padding-left:18px; margin:0 0 6px 0;">' +
    "<li><b>Physical copies only.</b> Sell books you own, or your own notes. No PDFs, soft copies or downloads.</li>" +
    "<li><b>No photocopied textbooks.</b> Copying a whole book without the author's permission is illegal, so those listings are removed.</li>" +
    "<li><b>Past questions:</b> printed copies or your own compiled notes are fine. Do not sell material you do not have the right to share.</li>" +
    "<li><b>Be honest</b> about the condition. Meet in a public campus spot and check the book before you pay.</li>" +
    '<li><b>See something wrong?</b> Open the listing and tap "Report this listing". We review reports and remove anything that breaks these rules. Rights owners can also email mbuharmless@gmail.com.</li>' +
    '</ul><button type="button">Got it</button></div>';
  s.addEventListener("click", (e) => { if (e.target === s || e.target.tagName === "BUTTON") s.remove(); });
  document.body.appendChild(s);
}

// ---------- start ----------
async function init() {
  $("bk-tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".bk-tab");
    if (!b) return;
    state.tab = b.dataset.tab;
    document.querySelectorAll(".bk-tab").forEach((x) => x.classList.toggle("on", x === b));
    $("bk-sell").href = state.tab === "tutors" ? "post-listing.html" : "post-listing.html?book=1&type=" + state.tab;
    $("bk-sell").innerHTML = state.tab === "tutors" ? '<i class="fa-solid fa-plus"></i> Offer tutoring' : '<i class="fa-solid fa-plus"></i> Sell a book';
    renderFilters();
    load();
  });
  let t = null;
  $("bk-q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; load(); }, 350); });
  $("bk-rules").addEventListener("click", openRules);

  const want = new URLSearchParams(location.search).get("tab");
  if (want && TAB_INFO[want]) {
    state.tab = want;
    document.querySelectorAll(".bk-tab").forEach((x) => x.classList.toggle("on", x.dataset.tab === want));
  }

  renderFilters();
  load();

  // Learn the student's campus (if signed in) so results default to "My campus"
  try {
    const s = await supabase.auth.getSession();
    const user = s.data && s.data.session && s.data.session.user;
    if (user) {
      const p = await supabase.from("profiles").select("campus_id").eq("id", user.id).maybeSingle();
      if (p.data && p.data.campus_id) {
        state.campusId = Number(p.data.campus_id);
        renderFilters();
        load();
      }
    }
  } catch (_) {}
}

init();
