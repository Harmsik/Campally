/**
 * Campally - Profile hub
 * Draws the top card (photo, name, badges, followers/following/listings),
 * the verification status card, and opens the "Edit profile" and
 * "Student ID verification" screens. Uses the page's own Supabase connection,
 * so it must load after profile.js and follow-lists.js.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var me = null;

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  // ---------- Screens that slide up (Edit profile, Verification) ----------
  function sheetFor(name) { return $("sheet-" + name); }
  function openSheet(name, fromHash) {
    var s = sheetFor(name);
    if (!s) return;
    s.classList.add("open");
    s.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (!fromHash) history.pushState({ sheet: name }, "", "#" + name);
  }
  function closeAll() {
    ["edit", "verify"].forEach(function (n) {
      var s = sheetFor(n);
      if (s) { s.classList.remove("open"); s.setAttribute("aria-hidden", "true"); }
    });
    document.body.style.overflow = "";
  }
  function closeSheet() {
    if (location.hash === "#edit" || location.hash === "#verify") history.back();
    else closeAll();
  }

  document.addEventListener("click", function (e) {
    var o = e.target.closest && e.target.closest("[data-open]");
    if (o) { e.preventDefault(); openSheet(o.getAttribute("data-open")); return; }
    var c = e.target.closest && e.target.closest("[data-close]");
    if (c) { e.preventDefault(); closeSheet(); }
  });
  window.addEventListener("popstate", function () {
    var h = location.hash.replace("#", "");
    closeAll();
    if (h === "edit" || h === "verify") openSheet(h, true);
    else refresh();
  });

  // ---------- Hub data ----------
  function setVerifyCard(state, note) {
    var card = $("hub-verify-card");
    var ico = $("hub-verify-ico");
    var title = $("hub-verify-title");
    var text = $("hub-verify-text");
    var btn = $("hub-verify-btn");
    card.classList.remove("ok");
    btn.style.display = "";
    if (state === "approved") {
      card.classList.add("ok");
      ico.style.cssText = "background:#DCFCE7; color:#059669;";
      ico.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      title.textContent = "You are a Verified Student";
      text.textContent = "Your green badge shows on your profile and all your items.";
      btn.style.display = "none";
    } else if (state === "pending") {
      ico.style.cssText = "background:#FEF3C7; color:#D97706;";
      ico.innerHTML = '<i class="fa-solid fa-clock"></i>';
      title.textContent = "Verification under review";
      text.textContent = "The Campally team is checking your ID. You will get an alert when it is done.";
      btn.textContent = "View";
    } else if (state === "rejected") {
      ico.style.cssText = "background:#FEE2E2; color:#DC2626;";
      ico.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      title.textContent = "Verification not approved";
      text.textContent = (note || "Please upload a clearer photo of your ID and try again.");
      btn.textContent = "Try again";
    } else {
      ico.style.cssText = "background:#FDF1EE; color:#E8553D;";
      ico.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
      title.textContent = "Get your Verified badge";
      text.textContent = "Buyers trust verified students more. It takes about 2 minutes.";
      btn.textContent = "Start";
    }
  }

  function shopLink(show) {
    var old = $("hub-shop-link");
    if (old) old.remove();
    if (!show) return;
    var a = document.createElement("a");
    a.id = "hub-shop-link";
    a.href = "vendor-shop.html";
    a.textContent = "Set up your shop details";
    a.style.cssText = "display:inline-block; margin-top:6px; font-size:12px; font-weight:700; color:#E8553D; text-decoration:none;";
    $("hub-verify-text").insertAdjacentElement("afterend", a);
  }

  function setVendorCard(state, note) {
    var card = $("hub-verify-card");
    var ico = $("hub-verify-ico");
    var title = $("hub-verify-title");
    var text = $("hub-verify-text");
    var btn = $("hub-verify-btn");
    card.classList.remove("ok");
    btn.style.display = "";
    shopLink(state !== "approved");
    btn.removeAttribute("data-open");
    btn.onclick = function () { location.href = "vendor-verify.html"; };
    if (state === "approved") {
      card.classList.add("ok");
      ico.style.cssText = "background:#FEF3C7; color:#B45309;";
      ico.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      title.textContent = "You are a Verified Vendor";
      text.textContent = "Your gold badge shows on your profile. Add your shop details so students know when you are open.";
      btn.textContent = "Edit shop";
      btn.onclick = function () { location.href = "vendor-shop.html"; };
    } else if (state === "pending") {
      ico.style.cssText = "background:#FEF3C7; color:#D97706;";
      ico.innerHTML = '<i class="fa-solid fa-clock"></i>';
      title.textContent = "Vendor request under review";
      text.textContent = "The Campally team is checking your details. You will get an alert when it is done.";
      btn.textContent = "View";
    } else if (state === "rejected") {
      ico.style.cssText = "background:#FEE2E2; color:#DC2626;";
      ico.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      title.textContent = "Vendor request not approved";
      text.textContent = (note || "Please upload clearer photos and try again.");
      btn.textContent = "Try again";
    } else {
      ico.style.cssText = "background:#FEF3C7; color:#B45309;";
      ico.innerHTML = '<i class="fa-solid fa-store"></i>';
      title.textContent = "Get verified as a vendor";
      text.textContent = "You need to be verified before you can post products.";
      btn.textContent = "Start";
    }
  }

  var CAT_LABEL = {
    food: "Food & drinks", groceries: "Groceries & provisions", printing: "Printing & photocopy", laundry: "Laundry",
    gadgets: "Gadgets & repairs", fashion_beauty: "Fashion & beauty", stationery: "Stationery", services: "Other services", other: "Other"
  };

  function tile(num, label, color) {
    return '<div style="flex:1; min-width:0; background:#FAF9F6; border:1px solid #EEE7DD; border-radius:12px; padding:10px 4px; text-align:center;">' +
      '<div style="font-size:20px; font-weight:800; color:' + color + ';">' + num + '</div>' +
      '<div style="font-size:11px; color:#6B7280; margin-top:2px;">' + label + "</div></div>";
  }

  // Vendor view: shop name, shop numbers and shop buttons instead of the student layout
  async function renderVendorDashboard(p, vstate) {
    var old = $("hub-vendor-card");
    if (old) old.remove();

    var res = await Promise.all([
      supabase.from("listings").select("status").eq("seller_id", me.id),
      supabase.from("vendor_shops").select("shop_name, category, location, opening_hours").eq("user_id", me.id).maybeSingle(),
      supabase.rpc("get_my_listing_likes")
    ]);
    var rows = res[0].data || [];
    var shop = res[1].data;
    var live = 0, waiting = 0, sold = 0, likes = 0;
    rows.forEach(function (r) {
      if (r.status === "active") live++;
      else if (r.status === "pending") waiting++;
      else if (r.status === "sold") sold++;
    });
    (res[2].data || []).forEach(function (x) { likes += Number(x.count || 0); });

    // header: shop name and category instead of department / hostel
    if (shop && shop.shop_name) $("hub-name").textContent = shop.shop_name;
    $("hub-sub").textContent = "Campus vendor" + (shop && CAT_LABEL[shop.category] ? "  \u2022  " + CAT_LABEL[shop.category] : "");

    var verified = p.is_vendor_verified === true;
    var postBtn;
    if (verified) {
      postBtn = '<a href="post-listing.html" style="flex:1; text-align:center; background:#E8553D; color:#fff; font-weight:800; font-size:13px; padding:11px 8px; border-radius:12px; text-decoration:none;"><i class="fa-solid fa-plus"></i> Post product</a>';
    } else if (vstate === "pending") {
      postBtn = '<span style="flex:1; text-align:center; background:#FEF3C7; color:#92400E; font-weight:800; font-size:13px; padding:11px 8px; border-radius:12px;"><i class="fa-solid fa-clock"></i> Under review</span>';
    } else {
      postBtn = '<a href="vendor-verify.html" style="flex:1; text-align:center; background:#E8553D; color:#fff; font-weight:800; font-size:13px; padding:11px 8px; border-radius:12px; text-decoration:none;"><i class="fa-solid fa-shield-halved"></i> Verify to post</a>';
    }

    var shareText = "\uD83D\uDECD\uFE0F *" + ((shop && shop.shop_name) || p.full_name || "My shop") + "* is on Campally" +
      (shop && shop.location ? "\n\uD83D\uDCCD " + shop.location : "") +
      "\n\nSee our products: " + location.origin + "/seller.html?id=" + me.id;

    var card = document.createElement("section");
    card.className = "ph-card";
    card.id = "hub-vendor-card";
    card.innerHTML =
      '<div style="font-size:12px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#6B7280; margin-bottom:10px;"><i class="fa-solid fa-store" style="color:#B45309;"></i> My shop</div>' +
      '<div style="display:flex; gap:8px;">' +
        tile(live, "Live", "#059669") +
        tile(waiting, "Waiting", waiting ? "#D97706" : "#94A3B8") +
        tile(sold, "Sold", "#2563EB") +
        tile(likes, "Likes", "#E8553D") +
      "</div>" +
      '<div style="display:flex; gap:8px; margin-top:12px;">' + postBtn +
        '<a href="vendor-shop.html" style="flex:1; text-align:center; background:#fff; color:#1E1B4B; border:1.5px solid #E5E0D8; font-weight:800; font-size:13px; padding:10px 8px; border-radius:12px; text-decoration:none;"><i class="fa-solid fa-pen"></i> Edit shop</a>' +
      "</div>" +
      '<a href="https://wa.me/?text=' + encodeURIComponent(shareText) + '" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; margin-top:8px; background:#25D366; color:#fff; font-weight:800; font-size:13px; padding:11px 8px; border-radius:12px; text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> Share my shop on WhatsApp</a>' +
      (waiting ? '<p style="margin:10px 0 0 0; font-size:12px; color:#92400E;"><i class="fa-solid fa-hourglass-half"></i> ' + waiting + (waiting === 1 ? " product is" : " products are") + " waiting for the Campally team to approve. Your first 3 products are checked before they go live.</p>" : "");

    var anchor = $("hub-verify-card");
    anchor.parentNode.insertBefore(card, anchor);

    // student-only fields are not needed for a shop
    ["department", "hall"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.style.display = "none";
      var prev = el.previousElementSibling;
      if (prev && prev.tagName === "LABEL") prev.style.display = "none";
    });
    document.querySelectorAll("#sheet-edit .ph-section-t").forEach(function (h) {
      if (h.textContent.trim() === "Campus life") h.textContent = "Your campus";
    });
  }

  async function refresh() {
    if (typeof supabase === "undefined") return;
    try {
      if (!me) {
        var s = await supabase.auth.getSession();
        me = s.data && s.data.session && s.data.session.user;
        if (!me) { var u = await supabase.auth.getUser(); me = u.data && u.data.user; }
      }
      if (!me) return;

      var results = await Promise.all([
        supabase.from("profiles").select("full_name, department, hall, avatar_url, campus_id, is_verified, account_type, is_vendor_verified").eq("id", me.id).maybeSingle(),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", me.id).eq("status", "active"),
        supabase.from("student_verifications").select("status, review_note").eq("user_id", me.id).maybeSingle(),
        supabase.from("vendor_verifications").select("status, review_note").eq("user_id", me.id).maybeSingle()
      ]);
      var p = results[0].data || {};
      var listings = results[1].count || 0;
      var ver = results[2].data;
      var vendorVer = results[3] ? results[3].data : null;
      var isVendor = p.account_type === "vendor";

      // photo + name
      var av = $("hub-av");
      av.textContent = initials(p.full_name);
      if (p.avatar_url) {
        var im = document.createElement("img");
        im.alt = "";
        im.onerror = function () { im.remove(); };
        im.src = p.avatar_url;
        av.appendChild(im);
      }
      $("hub-name").textContent = (p.full_name || "Add your name").trim();
      $("hub-sub").textContent = p.account_type === "vendor"
        ? "Campus vendor"
        : ([p.department, p.hall].filter(Boolean).join("  \u2022  ") || "Add your department and hostel");
      $("hub-store").href = "seller.html?id=" + encodeURIComponent(me.id);

      // chips
      var chips = $("hub-chips");
      chips.innerHTML = "";
      function chip(cls, icon, text) {
        var c = document.createElement("span");
        c.className = "ph-chip " + cls;
        c.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
        c.appendChild(document.createTextNode(" " + text));
        chips.appendChild(c);
      }
      if (p.campus_id && window.getCampusShort) chip("", "fa-location-dot", window.getCampusShort(p.campus_id));
      if (isVendor) {
        if (p.is_vendor_verified) {
          chip("ok", "fa-store", "Verified Vendor");
          chips.lastChild.style.cssText = "background:#FEF3C7; color:#92400E;";
        } else chip("warn", "fa-store", "Vendor - not verified yet");
      } else if (p.is_verified) chip("ok", "fa-shield-check", "Verified Student");
      else chip("warn", "fa-shield-halved", "Not verified yet");

      // stats: followers + following (from follow-lists.js) and listings
      var stats = $("hub-stats");
      var oldL = $("hub-listings-stat");
      if (oldL) oldL.remove();
      if (window.CampallyFollows) { await window.CampallyFollows.mount($("my-follow-stats"), me.id); }
      var L = document.createElement("a");
      L.id = "hub-listings-stat";
      L.className = "ph-stat";
      L.href = "my-listings.html";
      L.style.textDecoration = "none";
      L.innerHTML = "<b>" + listings + "</b><span>Active items</span>";
      stats.appendChild(L);

      // verification card
      if (isVendor) {
        var vstate = p.is_vendor_verified ? "approved" : (vendorVer && vendorVer.status) || "none";
        setVendorCard(vstate, vendorVer && vendorVer.review_note);
        try { await renderVendorDashboard(p, vstate); } catch (e) { console.error("Vendor dashboard error:", e); }
      } else {
        var state = p.is_verified ? "approved" : (ver && ver.status) || "none";
        setVerifyCard(state === "approved" ? "approved" : state, ver && ver.review_note);
      }

      // unread messages dot
      try {
        var un = await supabase.rpc("get_unread_message_count");
        var dot = $("hub-msg-dot");
        if (un.data && un.data > 0 && dot) { dot.textContent = un.data > 9 ? "9+" : un.data; dot.style.display = "flex"; }
      } catch (e) {}
    } catch (e) {
      console.error("Profile hub error:", e);
    }
  }

  window.CampallyProfileHub = { refresh: refresh, close: closeAll };

  // open from a link like profile.html#verify
  var start = location.hash.replace("#", "");
  if (start === "edit" || start === "verify") openSheet(start, true);
  refresh();
})();
