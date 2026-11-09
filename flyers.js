// Campally Professional Marketing Campaign Flyers & Campus Media Kit
// High-DPI Canvas Rendering Engine & Multi-Channel Copy Generator

(function() {
  "use strict";

  // State Management
  const state = {
    campaign: "launch", // launch | seller | books | ambassador | services
    format: "noticeboard", // noticeboard (3:4) | story (9:16) | square (1:1)
    campus: "FUNAI",
    campusFullName: "Alex Ekwueme Federal University, Ndufu-Alike (FUNAI)",
    refCode: "",
    phone: "+234 911 920 6177",
    activeCopyTab: "whatsapp-group",
    qrReady: false
  };

  // Dimension Matrix (High DPI for crisp print & mobile displays)
  const DIMENSIONS = {
    noticeboard: { width: 1200, height: 1600, label: "1200 × 1600 px • Noticeboard (3:4)" },
    story: { width: 1080, height: 1920, label: "1080 × 1920 px • WhatsApp Status & Story (9:16)" },
    square: { width: 1200, height: 1200, label: "1200 × 1200 px • Social Media Feed (1:1)" }
  };

  // Marketing Campaign Content Presets (only claims Campally can stand behind)
  const CAMPAIGN_CONTENT = {
    launch: {
      name: "Campus Launch & Marketplace",
      tag: "YOUR CAMPUS MARKETPLACE",
      headline: "BUY. SELL.\nSWAP ON CAMPUS.",
      subhead: "Books, gadgets, hostel items and campus shops, all from verified students and vendors near you.",
      sticker: ["FREE TO", "JOIN"],
      perks: [
        { icon: "📚", title: "Textbooks & notes", desc: "Handouts and past questions from seniors" },
        { icon: "💻", title: "Phones & gadgets", desc: "Laptops, chargers and power banks nearby" },
        { icon: "🏪", title: "Campus shops", desc: "Food, printing and laundry close to you" },
        { icon: "🛡️", title: "Verified sellers", desc: "Students and vendors are checked first" }
      ],
      ctaText: "SCAN TO JOIN FREE",
      footerNote: "Free to join  •  Verified students & vendors  •  Chat on WhatsApp"
    },
    seller: {
      name: "Turn Your Clutter Into Cash",
      tag: "STUDENT SELLERS",
      headline: "TURN YOUR CLUTTER\nINTO CASH.",
      subhead: "Old textbooks, sneakers or gadgets? Post them in minutes and reach students on your own campus.",
      sticker: ["FREE TO", "POST"],
      perks: [
        { icon: "⏱️", title: "Post in minutes", desc: "Add a photo and set your price" },
        { icon: "💬", title: "Chat on WhatsApp", desc: "Buyers message you directly" },
        { icon: "💰", title: "No commission", desc: "Campally takes nothing from your sales" },
        { icon: "🔥", title: "Boost to get seen", desc: "Optional boost to appear first" }
      ],
      ctaText: "SCAN TO POST YOUR FIRST ITEM",
      footerNote: "Every student has something someone nearby wants"
    },
    books: {
      name: "Textbook & Past Question Deals",
      tag: "TEXTBOOK DEALS",
      headline: "BOOKS FOR LESS,\nRIGHT ON CAMPUS.",
      subhead: "Find textbooks, handouts and past questions from seniors, and swap what you no longer need.",
      sticker: ["BUY OR", "SWAP"],
      perks: [
        { icon: "📖", title: "All levels", desc: "From 100L to final year" },
        { icon: "🔄", title: "Swap your books", desc: "Trade last semester's books" },
        { icon: "📍", title: "Meet on campus", desc: "No courier fees, no waiting" },
        { icon: "🔍", title: "Check before you pay", desc: "Look through the book in person" }
      ],
      ctaText: "SCAN TO BROWSE BOOKS",
      footerNote: "Save money on books. Spend it on what matters."
    },
    ambassador: {
      name: "Campus Ambassador Recruitment",
      tag: "CAMPUS AMBASSADORS",
      headline: "EARN ₦150 FOR\nEVERY STUDENT\nYOU BRING.",
      subhead: "Become a Campally ambassador. Share your link in your class and hostel groups and track every signup.",
      sticker: ["EARN", "CASH"],
      perks: [
        { icon: "💸", title: "₦150 per signup", desc: "For each student who joins with your link" },
        { icon: "🏦", title: "Paid to your bank", desc: "Request a payout to your account" },
        { icon: "📊", title: "Track signups live", desc: "See who joined through you" },
        { icon: "🚀", title: "Easy to start", desc: "Apply, get approved, share your link" }
      ],
      ctaText: "SCAN TO APPLY",
      footerNote: "Ambassadors are approved by the Founder  •  Apply today"
    },
    services: {
      name: "Spotlight Your Campus Hustle",
      tag: "STUDENT BUSINESSES",
      headline: "GET FOUND BY\nSTUDENTS NEARBY.",
      subhead: "Barber, braider, baker, phone repairer, designer or tutor? Put your service where students are already looking.",
      sticker: ["GET", "BOOKED"],
      perks: [
        { icon: "🌟", title: "Business Spotlight", desc: "Show up on the campus home feed" },
        { icon: "📲", title: "WhatsApp bookings", desc: "Students tap to chat and book" },
        { icon: "💵", title: "Keep what you earn", desc: "No booking commission from Campally" },
        { icon: "⭐", title: "Build your name", desc: "Collect real student reviews" }
      ],
      ctaText: "SCAN TO LIST YOUR SERVICE",
      footerNote: "Turn your talent into a business students trust"
    },
    vendor: {
      name: "Open Your Shop on Campally",
      tag: "CAMPUS VENDORS",
      headline: "OPEN YOUR SHOP\nON CAMPALLY.",
      subhead: "Food, provisions, printing, laundry or repairs near campus? Put your shop in front of every student.",
      sticker: ["FREE SHOP", "PAGE"],
      perks: [
        { icon: "🏪", title: "Free shop page", desc: "Your name, hours and delivery areas" },
        { icon: "✅", title: "Verified Vendor badge", desc: "Students trust shops that are checked" },
        { icon: "🕒", title: "Open now status", desc: "Show when you are open for orders" },
        { icon: "💬", title: "Orders on WhatsApp", desc: "Students message you directly" }
      ],
      ctaText: "SCAN TO OPEN YOUR SHOP",
      footerNote: "Free shop page  •  ID-checked vendors  •  Students on your campus"
    }
  };

  // Colour themes: every campaign gets its own look
  const THEMES = {
    launch:     { a: "#E8553D", b: "#B93A24", ink: "#FFFFFF", sub: "rgba(255,255,255,0.92)", mark: "#FCD34D", markInk: "#1E1B4B", tile: "#FFF1EE", sticker: "#FCD34D", stickerInk: "#1E1B4B", deco: "255,255,255" },
    seller:     { a: "#FCD34D", b: "#F59E0B", ink: "#1E1B4B", sub: "rgba(30,27,75,0.88)",    mark: "#1E1B4B", markInk: "#FCD34D", tile: "#FFF7D6", sticker: "#1E1B4B", stickerInk: "#FCD34D", deco: "30,27,75" },
    books:      { a: "#4338CA", b: "#1E1B4B", ink: "#FFFFFF", sub: "rgba(255,255,255,0.9)",  mark: "#FCD34D", markInk: "#1E1B4B", tile: "#EEF0FF", sticker: "#E8553D", stickerInk: "#FFFFFF", deco: "255,255,255" },
    ambassador: { a: "#1E1B4B", b: "#0B0A24", ink: "#FFFFFF", sub: "rgba(255,255,255,0.88)", mark: "#E8553D", markInk: "#FFFFFF", tile: "#FFF1EE", sticker: "#FCD34D", stickerInk: "#1E1B4B", deco: "252,211,77" },
    services:   { a: "#059669", b: "#064E3B", ink: "#FFFFFF", sub: "rgba(255,255,255,0.92)", mark: "#FCD34D", markInk: "#1E1B4B", tile: "#ECFDF5", sticker: "#FCD34D", stickerInk: "#1E1B4B", deco: "255,255,255" },
    vendor:     { a: "#D97706", b: "#7C2D12", ink: "#FFFFFF", sub: "rgba(255,255,255,0.94)", mark: "#FCD34D", markInk: "#1E1B4B", tile: "#FFF7ED", sticker: "#FFFFFF", stickerInk: "#B45309", deco: "255,255,255" }
  };

  const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

  // DOM Elements
  const canvas = document.getElementById("flyer-canvas");
  const ctx = canvas.getContext("2d");
  const campusSelect = document.getElementById("input-campus-select");
  const refCodeInput = document.getElementById("input-ref-code");
  const phoneInput = document.getElementById("input-contact-phone");
  const downloadPngBtn = document.getElementById("btn-download-png");
  const printFlyerBtn = document.getElementById("btn-print-flyer");
  const copyFlyerLinkBtn = document.getElementById("btn-copy-flyer-link");
  const copyTextDisplay = document.getElementById("copy-text-display");
  const copyTargetBadge = document.getElementById("copy-target-badge");
  const copyActiveTextBtn = document.getElementById("btn-copy-active-text");
  const previewCampaignLabel = document.getElementById("preview-campaign-label");
  const previewCampusLabel = document.getElementById("preview-campus-label");
  const previewDimensionsLabel = document.getElementById("preview-dimensions-label");
  const hiddenQrContainer = document.getElementById("hidden-qr-render");

  let qrImageElement = null;
  const logoImg = new Image();
  let logoReady = false;
  logoImg.onload = function () { logoReady = true; if (typeof renderFlyer === "function") renderFlyer(); };
  logoImg.src = "campally-logo.png";

  // Initialize
  function init() {
    // Read URL params if pre-filled (e.g. from ambassador portal)
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref")) {
        state.refCode = params.get("ref").trim().toUpperCase();
        refCodeInput.value = state.refCode;
      } else {
        const storedRef = window.getCampallyReferralCode ? window.getCampallyReferralCode() : localStorage.getItem("campally_ref_code");
        if (storedRef) {
          state.refCode = storedRef;
          refCodeInput.value = storedRef;
        }
      }

      if (params.get("campaign") && CAMPAIGN_CONTENT[params.get("campaign")]) {
        state.campaign = params.get("campaign");
        updateCampaignButtons();
      }

      if (params.get("campus")) {
        const cVal = params.get("campus").trim();
        state.campus = cVal;
        if (campusSelect.querySelector(`option[value="${cVal}"]`)) {
          campusSelect.value = cVal;
        }
      }
    } catch (e) {}

    // Populate full campus directory if available
    populateCampuses();

    // Event Listeners
    setupEventListeners();

    // Generate Initial QR and Render Flyer
    generateQR(getAppUrlWithRef());
    updateMarketingCopy();
  }

  function populateCampuses() {
    if (window.NIGERIAN_CAMPUSES && Array.isArray(window.NIGERIAN_CAMPUSES)) {
      // Keep existing top choices and add distinct campuses
      const existingVals = new Set(Array.from(campusSelect.options).map(o => o.value));
      window.NIGERIAN_CAMPUSES.forEach(c => {
        const shortName = c.short || c.name;
        if (!existingVals.has(shortName)) {
          const opt = document.createElement("option");
          opt.value = shortName;
          opt.textContent = `${c.name}`;
          campusSelect.appendChild(opt);
          existingVals.add(shortName);
        }
      });
    }
  }

  function setupEventListeners() {
    // Campaign Selector Buttons
    document.querySelectorAll(".campaign-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".campaign-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.campaign = btn.getAttribute("data-campaign");
        generateQR(getAppUrlWithRef());
        updateMarketingCopy();
      });
    });

    // Format Chips
    document.querySelectorAll(".format-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".format-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        state.format = chip.getAttribute("data-format");
        updateCanvasDimensions();
        renderFlyer();
      });
    });

    // Inputs
    campusSelect.addEventListener("change", (e) => {
      state.campus = e.target.value;
      const selectedOption = e.target.options[e.target.selectedIndex];
      state.campusFullName = selectedOption ? selectedOption.textContent : state.campus;
      renderFlyer();
      updateMarketingCopy();
    });

    refCodeInput.addEventListener("input", (e) => {
      state.refCode = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      generateQR(getAppUrlWithRef());
      renderFlyer();
      updateMarketingCopy();
    });

    phoneInput.addEventListener("input", (e) => {
      state.phone = e.target.value.trim();
      renderFlyer();
      updateMarketingCopy();
    });

    // Action Buttons
    downloadPngBtn.addEventListener("click", downloadHighResPng);
    printFlyerBtn.addEventListener("click", () => window.print());
    copyFlyerLinkBtn.addEventListener("click", copyShareableFlyerUrl);

    // Copy Tabs
    document.querySelectorAll(".copy-tab-btn").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".copy-tab-btn").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeCopyTab = tab.getAttribute("data-copy");
        updateMarketingCopy();
      });
    });

    copyActiveTextBtn.addEventListener("click", copyActiveScriptToClipboard);
  }

  function updateCampaignButtons() {
    document.querySelectorAll(".campaign-btn").forEach(b => {
      if (b.getAttribute("data-campaign") === state.campaign) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });
  }

  function updateCanvasDimensions() {
    const dim = DIMENSIONS[state.format] || DIMENSIONS.noticeboard;
    canvas.width = dim.width;
    canvas.height = dim.height;
    previewDimensionsLabel.textContent = dim.label;
  }

  function getAppUrlWithRef() {
    const base = "https://campally.com.ng";
    if (state.campaign === "vendor") {
      return `${base}/signup.html?type=vendor` + (state.refCode ? `&ref=${encodeURIComponent(state.refCode)}` : "");
    }
    if (state.refCode) {
      return `${base}/?ref=${encodeURIComponent(state.refCode)}`;
    }
    return `${base}/`;
  }

  // QR Code Generation using QRCode.js or Fallback Canvas Matrix
  function generateQR(text) {
    hiddenQrContainer.innerHTML = "";
    if (window.QRCode) {
      try {
        new window.QRCode(hiddenQrContainer, {
          text: text,
          width: 256,
          height: 256,
          colorDark: "#1E1B4B",
          colorLight: "#FFFFFF",
          correctLevel: window.QRCode.CorrectLevel.H
        });

        setTimeout(() => {
          const img = hiddenQrContainer.querySelector("img") || hiddenQrContainer.querySelector("canvas");
          if (img) {
            qrImageElement = img;
            state.qrReady = true;
            renderFlyer();
          }
        }, 80);
        return;
      } catch (err) {
        console.warn("QRCode generation fallback:", err);
      }
    }
    // Fallback: draw synthetic QR marker directly
    qrImageElement = null;
    state.qrReady = true;
    renderFlyer();
  }

  // Canvas Drawing Utilities
  function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ---------- drawing helpers for the flyer ----------
  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // largest font size (between min and start) at which every line fits the width
  function fitSize(ctx, texts, weight, maxW, start, min) {
    let size = start;
    while (size > min) {
      ctx.font = weight + " " + size + "px " + FONT;
      if (texts.every((t) => ctx.measureText(t).width <= maxW)) break;
      size -= 2;
    }
    return size;
  }

  function drawStarburst(ctx, cx, cy, rOuter, rInner, spikes, rotation) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = rotation + (Math.PI * i) / spikes;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function setShadow(ctx, color, blur, offY) {
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = offY;
  }
  function clearShadow(ctx) {
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  // Main Canvas Rendering Engine
  function renderFlyer() {
    const w = canvas.width;
    const h = canvas.height;
    const fmt = state.format;
    const content = CAMPAIGN_CONTENT[state.campaign] || CAMPAIGN_CONTENT.launch;
    const T = THEMES[state.campaign] || THEMES.launch;

    previewCampaignLabel.textContent = content.name;
    previewCampusLabel.textContent = state.campus === "All Campuses"
      ? "Target: Nationwide Nigerian Campuses"
      : `Target Campus: ${state.campus}`;

    ctx.clearRect(0, 0, w, h);
    clearShadow(ctx);
    ctx.letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    const M = fmt === "square" ? 60 : 70;
    const footerH = fmt === "story" ? 470 : (fmt === "square" ? 330 : 400);
    const footerTop = h - footerH;

    // ---------- 1. background ----------
    const g = ctx.createLinearGradient(0, 0, w, footerTop);
    g.addColorStop(0, T.a);
    g.addColorStop(1, T.b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(${T.deco},0.08)`;
    ctx.beginPath(); ctx.arc(w * 0.94, h * 0.1, w * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${T.deco},0.07)`;
    ctx.beginPath(); ctx.arc(-w * 0.06, footerTop * 0.82, w * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${T.deco},0.16)`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w * 0.84, footerTop * 0.5, w * 0.17, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(${T.deco},0.22)`;
    for (let dx = 0; dx < 7; dx++) {
      for (let dy = 0; dy < 6; dy++) {
        ctx.beginPath(); ctx.arc(w - M - 8 - dx * 34, 190 + dy * 34, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---------- 2. header: logo and campus ----------
    const logoW = 300, logoH = 90, logoY = fmt === "square" ? 44 : 56;
    setShadow(ctx, "rgba(0,0,0,0.20)", 22, 8);
    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(ctx, M, logoY, logoW, logoH, 45, true, false);
    clearShadow(ctx);
    if (logoReady) {
      const lw = 236, lh = lw * (logoImg.naturalHeight / logoImg.naturalWidth);
      ctx.drawImage(logoImg, M + (logoW - lw) / 2, logoY + (logoH - lh) / 2, lw, lh);
    } else {
      ctx.fillStyle = "#1E1B4B";
      ctx.font = "800 40px " + FONT;
      ctx.textAlign = "center";
      ctx.fillText("Campally", M + logoW / 2, logoY + 58);
      ctx.textAlign = "left";
    }

    const campusText = (state.campus === "All Campuses" ? "ALL CAMPUSES" : state.campus).toUpperCase();
    ctx.font = "800 " + (fmt === "square" ? 24 : 27) + "px " + FONT;
    const cw = ctx.measureText(campusText).width + 70;
    const chipH = 62, chipX = w - M - cw, chipY = logoY + (logoH - chipH) / 2;
    ctx.fillStyle = T.ink === "#FFFFFF" ? "rgba(0,0,0,0.24)" : "rgba(30,27,75,0.14)";
    drawRoundedRect(ctx, chipX, chipY, cw, chipH, 31, true, false);
    ctx.fillStyle = T.mark;
    ctx.beginPath(); ctx.arc(chipX + 30, chipY + chipH / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = T.ink;
    ctx.fillText(campusText, chipX + 48, chipY + chipH / 2 + 9);

    // ---------- 3. text block, laid out top to bottom; shrinks the headline if the tiles would not fit ----------
    const lines = content.headline.split("\n");
    const startSize = fmt === "story" ? 128 : (fmt === "square" ? 92 : 116);
    const tagY = fmt === "square" ? 196 : 222;
    const subSize = fmt === "story" ? 40 : (fmt === "square" ? 30 : 36);

    const cols = fmt === "notice" ? 2 : (fmt === "noticeboard" ? 2 : (fmt === "story" ? 1 : 3));
    const perks = fmt === "square" ? content.perks.slice(0, 3) : content.perks.slice(0, 4);
    const rows = Math.ceil(perks.length / cols);
    const gap = fmt === "story" ? 14 : 18;
    const tileH = fmt === "story" ? 136 : (fmt === "square" ? 232 : 176);
    const tilesH = rows * tileH + (rows - 1) * gap;

    const sr = fmt === "square" ? 66 : 80;            // sticker radius
    const subMaxW = w - 2 * M - 2 * sr - 28;          // the subhead leaves room for the sticker
    let hs = fitSize(ctx, lines, "900", w - 2 * M, startSize, 56);
    let layout;
    let tileHUsed = tileH;
    for (;;) {
      ctx.font = "900 " + hs + "px " + FONT;
      const headTop = tagY + 34;
      const headBase0 = headTop + hs * 0.92;
      const lineH = hs * 1.06;
      const headBottom = headBase0 + (lines.length - 1) * lineH + hs * 0.22;
      ctx.font = "600 " + subSize + "px " + FONT;
      const subLines = wrapLines(ctx, content.subhead, subMaxW).slice(0, 4);
      const subTop = headBottom + 36;
      const subBase0 = subTop + subSize * 0.8;
      const subBottom = subBase0 + (subLines.length - 1) * subSize * 1.35;
      const stickerBottom = subTop + 2 * sr;
      const tilesTop = Math.max(subBottom, stickerBottom) + 34;
      const stickerY = subTop + Math.max((subBottom - subTop) / 2, sr);
      layout = { hs, headBase0, lineH, subLines, subBase0, tilesTop, subTop, stickerY };
      if (tilesTop + tilesH <= footerTop - 24 || hs <= 56) break;
      hs -= 6;
    }
    // spread any spare room into taller tiles (up to a limit) so the flyer feels full
    {
      const slack = footerTop - 24 - (layout.tilesTop + tilesH - 0);
      const minTile = fmt === "square" ? 196 : 100;
      if (slack < 0) tileHUsed = Math.max(minTile, tileH + Math.floor(slack / rows));   // safety: never run into the footer
      else if (slack > 30) tileHUsed = tileH + Math.min(Math.floor(slack / rows), fmt === "story" ? 34 : 44);
    }

    // tag line
    ctx.fillStyle = T.mark;
    drawRoundedRect(ctx, M, tagY - 22, 54, 8, 4, true, false);
    ctx.fillStyle = T.ink;
    ctx.font = "800 " + (fmt === "square" ? 24 : 27) + "px " + FONT;
    ctx.letterSpacing = "4px";
    ctx.fillText(content.tag, M + 72, tagY - 10);
    ctx.letterSpacing = "0px";

    // headline: the last line sits on a highlight bar
    ctx.font = "900 " + layout.hs + "px " + FONT;
    lines.forEach((line, i) => {
      const base = layout.headBase0 + i * layout.lineH;
      if (i === lines.length - 1) {
        const tw = ctx.measureText(line).width;
        ctx.fillStyle = T.mark;
        drawRoundedRect(ctx, M - 16, base - layout.hs * 0.84, tw + 32, layout.hs * 1.04, 16, true, false);
        ctx.fillStyle = T.markInk;
      } else {
        ctx.fillStyle = T.ink;
      }
      ctx.fillText(line, M, base);
    });

    // subhead
    ctx.fillStyle = T.sub;
    ctx.font = "600 " + subSize + "px " + FONT;
    layout.subLines.forEach((l, i) => ctx.fillText(l, M, layout.subBase0 + i * subSize * 1.35));

    // ---------- 4. feature tiles ----------
    const tileW = (w - 2 * M - (cols - 1) * (fmt === "square" ? 16 : 18)) / cols;
    const colGap = fmt === "square" ? 16 : 18;
    perks.forEach((perk, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = M + col * (tileW + colGap);
      const y = layout.tilesTop + row * (tileHUsed + gap);

      setShadow(ctx, "rgba(0,0,0,0.20)", 24, 9);
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, x, y, tileW, tileHUsed, 30, true, false);
      clearShadow(ctx);

      if (fmt === "square") {
        const r = 38;
        ctx.fillStyle = T.tile;
        ctx.beginPath(); ctx.arc(x + 26 + r, y + 24 + r, r, 0, Math.PI * 2); ctx.fill();
        ctx.font = "40px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(perk.icon, x + 26 + r, y + 24 + r + 3);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        const tw = tileW - 52;
        ctx.font = "800 26px " + FONT;
        const tl = wrapLines(ctx, perk.title, tw).slice(0, 2);
        ctx.fillStyle = "#1E1B4B";
        tl.forEach((l, k) => ctx.fillText(l, x + 26, y + 24 + 2 * r + 38 + k * 30));
        ctx.font = "600 20px " + FONT;
        ctx.fillStyle = "#64748B";
        const dl = wrapLines(ctx, perk.desc, tw).slice(0, 2);
        dl.forEach((l, k) => ctx.fillText(l, x + 26, y + 24 + 2 * r + 38 + tl.length * 30 + 8 + k * 25));
      } else {
        const r = fmt === "story" ? 40 : 52;
        ctx.fillStyle = T.tile;
        ctx.beginPath(); ctx.arc(x + 28 + r, y + tileHUsed / 2, r, 0, Math.PI * 2); ctx.fill();
        ctx.font = Math.round(r * 1.0) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(perk.icon, x + 28 + r, y + tileHUsed / 2 + 3);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

        const tx = x + 28 + 2 * r + 24;
        const tw = tileW - (tx - x) - 22;
        const titleSize = fitSize(ctx, [perk.title], "800", tw, fmt === "story" ? 32 : 30, 22);
        ctx.font = "600 " + (fmt === "story" ? 24 : 22) + "px " + FONT;
        const dl = wrapLines(ctx, perk.desc, tw).slice(0, 2);
        const dLH = fmt === "story" ? 30 : 28;
        const block = titleSize + 8 + dl.length * dLH;
        const top = y + (tileHUsed - block) / 2;
        ctx.font = "800 " + titleSize + "px " + FONT;
        ctx.fillStyle = "#1E1B4B";
        ctx.fillText(perk.title, tx, top + titleSize * 0.85);
        ctx.font = "600 " + (fmt === "story" ? 24 : 22) + "px " + FONT;
        ctx.fillStyle = "#64748B";
        dl.forEach((l, k) => ctx.fillText(l, tx, top + titleSize + 8 + dLH * (k + 0.8)));
      }
    });

    // sticker beside the subhead
    {
      const sx = w - M - sr, sy = layout.stickerY;
      setShadow(ctx, "rgba(0,0,0,0.28)", 22, 8);
      ctx.fillStyle = T.sticker;
      drawStarburst(ctx, sx, sy, sr, sr * 0.86, 16, -0.2);
      ctx.fill();
      clearShadow(ctx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.21);
      ctx.fillStyle = T.stickerInk;
      ctx.textAlign = "center";
      const stSize = fmt === "square" ? 21 : 25;
      ctx.font = "900 " + fitSize(ctx, content.sticker, "900", sr * 1.5, stSize, 16) + "px " + FONT;
      ctx.fillText(content.sticker[0], 0, -4);
      ctx.fillText(content.sticker[1], 0, stSize + 2);
      ctx.restore();
      ctx.textAlign = "left";
    }

    // ---------- 5. footer panel with the QR code ----------
    const pr = 56;
    setShadow(ctx, "rgba(0,0,0,0.22)", 34, -8);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(0, footerTop + pr);
    ctx.quadraticCurveTo(0, footerTop, pr, footerTop);
    ctx.lineTo(w - pr, footerTop);
    ctx.quadraticCurveTo(w, footerTop, w, footerTop + pr);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    clearShadow(ctx);

    const qrSize = fmt === "story" ? 270 : (fmt === "square" ? 200 : 250);
    const plate = qrSize + 32;
    const plateX = w - M - plate;
    const plateY = footerTop + (fmt === "square" ? 38 : 46);
    ctx.fillStyle = "#FFFFFF";
    setShadow(ctx, "rgba(30,27,75,0.18)", 18, 6);
    drawRoundedRect(ctx, plateX, plateY, plate, plate, 28, true, false);
    clearShadow(ctx);
    ctx.strokeStyle = "#E8553D";
    ctx.lineWidth = 6;
    drawRoundedRect(ctx, plateX, plateY, plate, plate, 28, false, true);
    const qx = plateX + 16, qy = plateY + 16;
    if (qrImageElement && qrImageElement.complete !== false) {
      try { ctx.drawImage(qrImageElement, qx, qy, qrSize, qrSize); }
      catch (e) { drawFallbackQR(ctx, qx, qy, qrSize); }
    } else {
      drawFallbackQR(ctx, qx, qy, qrSize);
    }
    {
      const label = "SCAN ME";
      ctx.font = "800 " + (fmt === "square" ? 21 : 24) + "px " + FONT;
      ctx.letterSpacing = "3px";
      const lw = ctx.measureText(label).width + 44, lh = fmt === "square" ? 40 : 46;
      const lx = plateX + plate / 2 - lw / 2, ly = plateY + plate - lh / 2;
      ctx.fillStyle = "#E8553D";
      drawRoundedRect(ctx, lx, ly, lw, lh, lh / 2, true, false);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(label, plateX + plate / 2 + 1, ly + lh / 2 + 8);
      ctx.letterSpacing = "0px";
      ctx.textAlign = "left";
    }

    // left column: call to action, link, code, phone
    const leftW = plateX - M - 36;
    const ctaStart = fmt === "story" ? 54 : (fmt === "square" ? 40 : 48);
    ctx.font = "900 " + ctaStart + "px " + FONT;
    let ctaSize = ctaStart;
    let ctaLines = wrapLines(ctx, content.ctaText, leftW);
    while (ctaLines.length > 3 && ctaSize > 30) {
      ctaSize -= 2; ctx.font = "900 " + ctaSize + "px " + FONT; ctaLines = wrapLines(ctx, content.ctaText, leftW);
    }
    ctx.fillStyle = "#1E1B4B";
    let cy = footerTop + (fmt === "square" ? 38 : 46) + ctaSize * 0.9;
    ctaLines.forEach((l, i) => { ctx.fillText(l, M, cy + i * ctaSize * 1.08); });
    cy += (ctaLines.length - 1) * ctaSize * 1.08 + 26;

    const limitY = h - 78;
    // link pill
    const urlText = "campally.com.ng";
    ctx.font = "800 " + (fmt === "square" ? 28 : 32) + "px " + FONT;
    const uw = ctx.measureText(urlText).width + 56;
    const uh = fmt === "square" ? 54 : 62;
    if (cy + uh <= limitY) {
      ctx.fillStyle = "#E8553D";
      drawRoundedRect(ctx, M, cy, uw, uh, uh / 2, true, false);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(urlText, M + 28, cy + uh / 2 + 11);
      cy += uh + 18;
    }
    // ambassador code
    if (state.refCode) {
      const codeText = "CODE: " + state.refCode;
      ctx.font = "800 " + (fmt === "square" ? 24 : 27) + "px " + FONT;
      const kw = ctx.measureText(codeText).width + 44;
      const kh = fmt === "square" ? 46 : 52;
      if (cy + kh <= limitY && kw <= leftW) {
        ctx.fillStyle = "#FFF5F3";
        drawRoundedRect(ctx, M, cy, kw, kh, kh / 2, true, false);
        ctx.strokeStyle = "#FCD8D0"; ctx.lineWidth = 3;
        drawRoundedRect(ctx, M, cy, kw, kh, kh / 2, false, true);
        ctx.fillStyle = "#E8553D";
        ctx.fillText(codeText, M + 22, cy + kh / 2 + 9);
        cy += kh + 16;
      }
    }
    // phone
    if (state.phone && cy + 30 <= limitY + 8) {
      ctx.fillStyle = "#22C55E";
      ctx.beginPath(); ctx.arc(M + 11, cy + 12, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#334155";
      ctx.font = "700 " + (fmt === "square" ? 23 : 26) + "px " + FONT;
      ctx.fillText("Chat with us: " + state.phone, M + 32, cy + 22);
    }

    // bottom strip: trust line and brand bar
    ctx.fillStyle = "#E8553D";
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = "#94A3B8";
    const noteW = plateX - M - 30;   // keep clear of the QR label
    const fnSize = fitSize(ctx, [content.footerNote], "600", noteW, fmt === "square" ? 22 : 24, 15);
    ctx.font = "600 " + fnSize + "px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(content.footerNote, M, h - 34);
  }

  // Fallback QR pattern if external image isn't loaded yet
  function drawFallbackQR(ctx, x, y, size) {
    ctx.fillStyle = "#1E1B4B";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + 10, y + 10, size - 20, size - 20);

    // Outer and Inner Anchor Markers
    const drawAnchor = (ax, ay) => {
      ctx.fillStyle = "#1E1B4B";
      ctx.fillRect(ax, ay, 36, 36);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(ax + 6, ay + 6, 24, 24);
      ctx.fillStyle = "#E8553D";
      ctx.fillRect(ax + 12, ay + 12, 12, 12);
    };

    drawAnchor(x + 16, y + 16);
    drawAnchor(x + size - 52, y + 16);
    drawAnchor(x + 16, y + size - 52);

    // Decorative Data Blocks
    ctx.fillStyle = "#1E1B4B";
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(x + 60 + c * 10, y + 60 + r * 10, 8, 8);
        }
      }
    }

    // Center Mini Campally Heart/Shield
    ctx.fillStyle = "#E8553D";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Canvas Text Wrap Helper
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lineY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, lineY);
        line = words[n] + " ";
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, lineY);
  }

  // Download High-Resolution PNG
  function downloadHighResPng() {
    try {
      const filename = `Campally_Flyer_${state.campaign.toUpperCase()}_${state.campus.replace(/[^a-zA-Z0-9]/g, "_")}_${state.format}.png`;
      canvas.toBlob((blob) => {
        if (!blob) {
          showNotification("Unable to generate image blob. Please try right-clicking the flyer to save.", "error");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 300);
        showNotification("High-resolution flyer downloaded successfully!", "success");
      }, "image/png", 1.0);
    } catch (e) {
      console.error("Download error:", e);
      showNotification("Error downloading flyer. Use Print / Save PDF instead.", "error");
    }
  }

  // Copy Shareable Flyer Studio Link
  function copyShareableFlyerUrl() {
    const params = new URLSearchParams();
    params.set("campaign", state.campaign);
    params.set("campus", state.campus);
    if (state.refCode) params.set("ref", state.refCode);

    const shareUrl = `${window.location.origin}/flyers.html?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showNotification("Flyer link copied with your custom settings attached!", "success");
    }).catch(() => {
      showNotification("Failed to copy link.", "error");
    });
  }

  // Multi-Channel Marketing Copy Templates
  function updateMarketingCopy() {
    const campusName = state.campus === "All Campuses" ? "our campus" : state.campus;
    const link = getAppUrlWithRef();
    const code = state.refCode ? `\n🎁 Ambassador code: *${state.refCode}*` : "";
    const tag = campusName.replace(/[^a-zA-Z0-9]/g, "");
    const vendor = state.campaign === "vendor";

    let text = "";
    let badgeText = "";

    switch (state.activeCopyTab) {
      case "whatsapp-group":
        if (vendor) {
          badgeText = "WhatsApp message to a shop owner or vendor";
          text = `Hello! 👋 I'm reaching out from *Campally*, the campus marketplace for ${campusName}.\n\n` +
            `If you run a shop or service near campus (food, provisions, printing, laundry, repairs), you can open a *free shop page* on Campally:\n\n` +
            `🏪 Your shop name, location and opening hours\n` +
            `🛵 The hostels you deliver to\n` +
            `✅ A Verified Vendor badge once we check your details\n` +
            `💬 Students message you directly on WhatsApp\n\n` +
            `It takes a few minutes to set up. Open your shop here:\n${link}${code}`;
        } else {
          badgeText = "Departmental, Faculty & Hostel WhatsApp Groups";
          text = `📢 *${campusName} students, check this out!*\n\n` +
            `*Campally* is a campus marketplace where verified students and campus vendors buy, sell and swap. 🎓🤝\n\n` +
            `📚 Textbooks, handouts and past questions\n` +
            `💻 Phones, laptops and gadgets\n` +
            `🏪 Food, printing and laundry shops near campus\n` +
            `🔄 Swap what you no longer need\n\n` +
            `It is free to join. Chat sellers directly on WhatsApp and meet on campus.` +
            code + `\n\n👉 ${link}`;
        }
        break;

      case "whatsapp-status":
        if (vendor) {
          badgeText = "WhatsApp Status 3-Slide Story Sequence (for vendors)";
          text = `📱 *WHATSAPP STATUS 3-SLIDE CAMPAIGN:*\n\n` +
            `[SLIDE 1 - FLYER]\nCaption: "Own a shop near ${campusName}? Students are searching for you. 👀"\n\n---\n\n` +
            `[SLIDE 2 - THE OFFER]\nCaption: "Open a free shop page on Campally: your hours, your location, the hostels you deliver to, and orders straight to your WhatsApp. 🏪"\n\n---\n\n` +
            `[SLIDE 3 - LINK]\nCaption: "Open yours in a few minutes: 👉 ${link} ${state.refCode ? `(Code: ${state.refCode})` : ""}"`;
        } else {
          badgeText = "WhatsApp Status 3-Slide Story Sequence";
          text = `📱 *WHATSAPP STATUS 3-SLIDE CAMPAIGN:*\n\n` +
            `[SLIDE 1 - FLYER]\nCaption: "Buying or selling on campus? There is a simpler way. 👇"\n\n---\n\n` +
            `[SLIDE 2 - THE SOLUTION]\nCaption: "If you are in ${campusName} and need textbooks, gadgets or hostel items, or want to sell what you no longer use, Campally is built for you. 📚💻"\n\n---\n\n` +
            `[SLIDE 3 - LINK]\nCaption: "Browse or post for free: 👉 ${link} ${state.refCode ? `(Code: ${state.refCode})` : ""}"`;
        }
        break;

      case "instagram":
        badgeText = "Instagram / TikTok Feed & Reels Caption";
        if (vendor) {
          text = `Own a shop near ${campusName}? Students are looking for you. 👀\n\n` +
            `Open a free shop page on @Campally: show your hours and location, list the hostels you deliver to, and get orders on WhatsApp.\n\n` +
            `✅ Free shop page\n✅ Verified Vendor badge\n✅ Shown to students on your campus\n\n` +
            `🔗 Link in bio: ${link}\n${state.refCode ? `Code: ${state.refCode}\n\n` : "\n"}` +
            `#Campally #CampusVendors #${tag} #NaijaStudents #SmallBusinessNigeria #CampusLife`;
        } else {
          text = `Campus life, made simpler at ${campusName}. 🚀\n\n` +
            `@Campally connects verified students and campus vendors to buy, sell and swap right where you study.\n\n` +
            `🔹 Textbooks, handouts & past questions\n` +
            `🔹 Gadgets, hostel items & thrift fashion\n` +
            `🔹 Food, printing & laundry shops near campus\n` +
            `🔹 Chat directly on WhatsApp and meet on campus\n\n` +
            `🔗 Link in bio: ${link}\n${state.refCode ? `Code: ${state.refCode}\n\n` : "\n"}` +
            `#Campally #${tag} #CampusMarketplace #NaijaStudents #StudentHustle #CampusLife`;
        }
        break;

      case "twitter":
        badgeText = "Campus X (Twitter) Thread";
        if (vendor) {
          text = `🧵 1/3 Own a shop or run a service near ${campusName}? Read this.\n\n` +
            `Students search for food, printing, laundry and repairs every day. Most can't find you online. 👇\n\n` +
            `2/3 On @Campally you can open a free shop page with your opening hours, location and delivery hostels. Students message you straight on WhatsApp.\n\n` +
            `3/3 Open yours in a few minutes: \n🔗 ${link} ${state.refCode ? `\n(Code: ${state.refCode})` : ""}`;
        } else {
          text = `🧵 1/3 A simpler way to buy and sell at ${campusName}.\n\n` +
            `Instead of searching group chats for a textbook or a charger, students trade directly with coursemates nearby on @Campally. 👇\n\n` +
            `2/3 Got books, gadgets or clothes you no longer use? Post them for free. Someone in your school may need them this week.\n\n` +
            `3/3 Chat with sellers on WhatsApp and meet on campus. Sign up and browse: \n🔗 ${link} ${state.refCode ? `\n(Code: ${state.refCode})` : ""}`;
        }
        break;

      case "lecture-pitch":
        if (vendor) {
          badgeText = "30-Second In-Person Pitch (for ambassadors visiting shops)";
          text = `🗣️ *30-SECOND SHOP VISIT SCRIPT*\n\n` +
            `"Good day! I'm with Campally, the campus marketplace for ${campusName}.\n\n` +
            `We help shops near campus get found by students. You get a free shop page with your opening hours, your location and the hostels you deliver to, and students message you directly on WhatsApp.\n\n` +
            `We check your details first, so you get a Verified Vendor badge. It takes a few minutes to set up. Can I open it with you on your phone now?"\n\n` +
            `Link: ${link}${state.refCode ? ` (code ${state.refCode})` : ""}`;
        } else {
          badgeText = "60-Second In-Person Lecture Hall Pitch (For Course Reps & Ambassadors)";
          text = `🗣️ *60-SECOND LECTURE HALL ANNOUNCEMENT SCRIPT*\n(Deliver right after class or during break):\n\n` +
            `"Good day coursemates! A quick 60-second update.\n\n` +
            `We now have a campus marketplace called Campally, at campally.com.ng.\n\n` +
            `You can buy and sell textbooks, past questions, gadgets and hostel items with students here in ${campusName}, and find shops near campus for food, printing and laundry. It is free to join, and you chat with sellers directly on WhatsApp.\n\n` +
            `I will drop the link in our class group right now${state.refCode ? ` with my code *${state.refCode}*` : ""}. Please check it out!"`;
        }
        break;
    }

    copyTargetBadge.textContent = badgeText;
    copyTextDisplay.textContent = text;
  }

  // Copy Active Script to Clipboard
  function copyActiveScriptToClipboard() {
    const text = copyTextDisplay.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      showNotification("Marketing message copied to clipboard! Ready to paste into WhatsApp/Socials.", "success");
    }).catch(() => {
      showNotification("Failed to copy text automatically.", "error");
    });
  }

  // Toast Notification Helper
  function showNotification(message, type = "info") {
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === "success" ? "#059669" : (type === "error" ? "#DC2626" : "#1E1B4B")};
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      z-index: 10000;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
    `;
    toast.innerHTML = `<i class="fa-solid fa-${type === "success" ? "circle-check" : "circle-info"}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
