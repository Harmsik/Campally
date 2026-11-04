/**
 * Campally - Campus Vendors page
 * Lists verified vendors with filters: campus, category, "Open now" and "Delivers to my hostel", plus search.
 * Opened from the Campus Vendors row on Home (with ?campus=ID when a campus is chosen).
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("vd-list");
  var searchEl = $("vd-search");
  var campusEl = $("vd-campus");
  var noteEl = $("vd-note");

  var CATEGORIES = [
    ["food", "Food & drinks"], ["groceries", "Groceries & provisions"], ["printing", "Printing & photocopy"],
    ["laundry", "Laundry"], ["gadgets", "Gadgets & repairs"], ["fashion_beauty", "Fashion & beauty"],
    ["stationery", "Stationery"], ["services", "Other services"], ["other", "Other"]
  ];
  var CAT_LABEL = {};
  CATEGORIES.forEach(function (c) { CAT_LABEL[c[0]] = c[1]; });

  var all = [];
  var campusId = null;
  var cat = "all";
  var onlyOpen = false;
  var onlyHostel = false;
  var hostelTokens = [];

  try {
    var c = new URLSearchParams(location.search).get("campus");
    if (c && /^\d+$/.test(c)) campusId = Number(c);
  } catch (e) {}

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // ----- open now (Nigerian time) -----
  function toMinutes(t) { var p = String(t).split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function openNow(v) {
    if (!v.open_days || !v.open_days.length || !v.open_time || !v.close_time) return null;
    var n = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
    var day = n.getDay(), mins = n.getHours() * 60 + n.getMinutes();
    var o = toMinutes(v.open_time), cl = toMinutes(v.close_time);
    var days = v.open_days.map(Number);
    if (cl > o) return days.indexOf(day) !== -1 && mins >= o && mins < cl;
    return (days.indexOf(day) !== -1 && mins >= o) || (days.indexOf((day + 6) % 7) !== -1 && mins < cl);
  }

  // ----- delivers to my hostel (matches the typed delivery areas against the words of my hostel name) -----
  var COMMON = ["hostel", "lodge", "hall", "block", "house", "the", "and", "room", "off", "campus", "hostels"];
  function tokensOf(hall) {
    return String(hall || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && COMMON.indexOf(w) === -1; });
  }
  function deliversToMe(v) {
    var t = String(v.delivery_areas || "").toLowerCase();
    return hostelTokens.some(function (w) { return t.indexOf(w) !== -1; });
  }

  function renderCats() {
    var box = $("vd-cats");
    var html = '<button type="button" class="category-chip' + (cat === "all" ? " active" : "") + '" data-cat="all">🌟 All vendors</button>';
    CATEGORIES.forEach(function (x) {
      html += '<button type="button" class="category-chip' + (cat === x[0] ? " active" : "") + '" data-cat="' + x[0] + '">' + esc(x[1]) + "</button>";
    });
    box.innerHTML = html;
  }

  function renderCampusLine() {
    if (!campusId) { campusEl.innerHTML = ""; return; }
    var name = (window.getCampusShort && window.getCampusShort(campusId)) || "your campus";
    campusEl.innerHTML = "Showing vendors for <b>" + esc(name) + "</b> · <a id=\"vd-all-link\">Show all campuses</a>";
    $("vd-all-link").addEventListener("click", function () { campusId = null; load(); });
  }

  function render() {
    var q = (searchEl.value || "").trim().toLowerCase();
    var rows = all.filter(function (v) {
      if (cat !== "all" && v.category !== cat) return false;
      if (onlyOpen && openNow(v) !== true) return false;
      if (onlyHostel && !deliversToMe(v)) return false;
      if (!q) return true;
      return [v.name, v.location, v.description, v.delivery_areas, CAT_LABEL[v.category] || ""].join(" ").toLowerCase().indexOf(q) !== -1;
    });

    if (!rows.length) {
      var filtered = cat !== "all" || onlyOpen || onlyHostel || q;
      listEl.innerHTML = '<p class="vd-empty">' + (all.length && filtered
        ? "No vendor matches these filters."
        : 'No verified vendors here yet.<br>Own a shop near campus? <a href="signup.html?type=vendor">Join as a vendor</a>') + "</p>";
      return;
    }

    listEl.innerHTML = rows.map(function (v) {
      var logo = v.avatar_url
        ? '<img class="vd-logo" src="' + esc(v.avatar_url) + '" alt="">'
        : '<div class="vd-logo-fallback"><i class="fa-solid fa-store"></i></div>';
      var campus = (v.campus_id && window.getCampusShort) ? window.getCampusShort(v.campus_id) : "";
      var o = openNow(v);
      var tags = '<span class="vd-pill"><i class="fa-solid fa-store"></i> Verified Vendor' + (campus ? " • " + esc(campus) : "") + "</span>";
      if (v.category && CAT_LABEL[v.category]) tags += '<span class="vd-tag" style="background:#FFFBEB; border:1px solid #FDE68A; color:#92400E;">' + esc(CAT_LABEL[v.category]) + "</span>";
      if (o === true) tags += '<span class="vd-tag" style="background:#ECFDF5; border:1px solid #A7F3D0; color:#047857;">● Open now</span>';
      if (o === false) tags += '<span class="vd-tag" style="background:#FEF2F2; border:1px solid #FECACA; color:#B91C1C;">● Closed now</span>';
      return '<a class="vd-card" href="seller.html?id=' + esc(v.id) + '">' + logo +
        '<div class="vd-info">' +
          '<div class="vd-name">' + esc(v.name) + "</div>" +
          "<div>" + tags + "</div>" +
          (v.location ? '<div class="vd-line">📍 ' + esc(v.location) + "</div>" : "") +
          (v.opening_hours ? '<div class="vd-line">🕒 ' + esc(v.opening_hours) + "</div>" : "") +
          (v.delivery_areas ? '<div class="vd-line">🛵 Delivers to: ' + esc(v.delivery_areas) + "</div>" : "") +
          (v.description ? '<div class="vd-about">' + esc(v.description) + "</div>" : "") +
        "</div></a>";
    }).join("");
  }

  async function load() {
    renderCampusLine();
    listEl.innerHTML = '<p class="vd-empty">Loading vendors...</p>';
    try {
      var q = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, campus_id")
        .eq("account_type", "vendor")
        .eq("is_vendor_verified", true)
        .order("vendor_verified_at", { ascending: false })
        .limit(100);
      if (campusId) q = q.eq("campus_id", campusId);
      var res = await q;
      if (res.error) throw res.error;
      var vendors = res.data || [];

      var shopMap = {};
      if (vendors.length) {
        var sh = await supabase.from("vendor_shops").select("*").in("user_id", vendors.map(function (v) { return v.id; }));
        (sh.data || []).forEach(function (s) { shopMap[s.user_id] = s; });
      }

      all = vendors.map(function (v) {
        var s = shopMap[v.id] || {};
        return {
          id: v.id,
          name: s.shop_name || v.full_name || "Campus vendor",
          avatar_url: v.avatar_url,
          campus_id: v.campus_id,
          category: s.category || "",
          location: s.location || "",
          opening_hours: s.opening_hours || "",
          open_days: s.open_days || null,
          open_time: s.open_time || null,
          close_time: s.close_time || null,
          delivery_areas: s.delivery_areas || "",
          description: s.description || ""
        };
      });
      render();
    } catch (err) {
      console.error("Vendors load error:", err);
      listEl.innerHTML = '<p class="vd-empty">Could not load vendors. Please try again.</p>';
    }
  }

  // my hostel, for the "Delivers to my hostel" filter
  async function loadMyHostel() {
    try {
      var s = await supabase.auth.getSession();
      var u = s.data && s.data.session && s.data.session.user;
      if (!u) return;
      var p = await supabase.from("profiles").select("hall").eq("id", u.id).maybeSingle();
      hostelTokens = tokensOf(p.data && p.data.hall);
    } catch (e) {}
  }

  $("vd-cats").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]");
    if (!b) return;
    cat = b.getAttribute("data-cat");
    renderCats();
    render();
  });

  $("vd-open-chip").addEventListener("click", function () {
    onlyOpen = !onlyOpen;
    this.classList.toggle("active", onlyOpen);
    render();
  });

  $("vd-hostel-chip").addEventListener("click", function () {
    if (!hostelTokens.length) {
      noteEl.style.display = "block";
      noteEl.innerHTML = 'Add your hostel in <a href="profile.html" style="color:#E8553D; font-weight:700;">your profile</a> to use this filter.';
      return;
    }
    noteEl.style.display = "none";
    onlyHostel = !onlyHostel;
    this.classList.toggle("active", onlyHostel);
    render();
  });

  searchEl.addEventListener("input", render);
  renderCats();
  loadMyHostel();
  load();
})();
