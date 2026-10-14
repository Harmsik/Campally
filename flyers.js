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

  // Marketing Campaign Content Presets
  const CAMPAIGN_CONTENT = {
    launch: {
      name: "Campus Launch & Marketplace",
      tag: "OFFICIAL NIGERIAN CAMPUS MARKETPLACE",
      headline: "YOUR CAMPUS.\nYOUR MARKETPLACE.",
      subhead: "Buy, sell & swap with verified coursemates right inside your university. No delivery fees. No internet scam risk.",
      perks: [
        { icon: "📚", title: "Textbooks, Past Questions & Notes", desc: "Find course handouts and seniors' study guides for cheap." },
        { icon: "💻", title: "Laptops, Gadgets & Electronics", desc: "Phones, power banks, chargers and calculators nearby." },
        { icon: "👗", title: "Campus Fashion, Sneakers & Thrift", desc: "Trendy wear from student stylists at student prices." },
        { icon: "🏠", title: "Hostel Essentials & Easy Swaps", desc: "Fans, hotplates, mattresses and bedsheets when moving." },
        { icon: "🛡️", title: "100% Safe On-Campus Meetups", desc: "Meet at library, faculty or porter's lodge in broad daylight." }
      ],
      ctaText: "SCAN WITH PHONE CAMERA TO START TRADING",
      footerNote: "Join thousands of Nigerian students trading safely on campus"
    },
    seller: {
      name: "Turn Your Clutter Into Cash",
      tag: "STUDENT HUSTLERS & SELLERS",
      headline: "TURN YOUR CLUTTER\nINTO CASH TODAY!",
      subhead: "Got old textbooks, handouts, sneakers, or gadgets you no longer use? Don't leave money on your hostel shelf.",
      perks: [
        { icon: "⏱️", title: "Post in 30 Seconds", desc: "Take a picture, set your price, and reach students instantly." },
        { icon: "🤝", title: "Direct WhatsApp Inquiries", desc: "Serious student buyers reach out straight to your phone." },
        { icon: "💰", title: "0% Commission on Standard Trades", desc: "You keep 100% of your earnings. No hidden middleman cuts." },
        { icon: "🔥", title: "Promote & Boost Priority", desc: "Pin your items to the top of your campus feed for pennies." },
        { icon: "🎓", title: "Ideal for Final-Year Students", desc: "Quickly clear out your room before graduating and packing." }
      ],
      ctaText: "SCAN TO POST YOUR FIRST LISTING FREE",
      footerNote: "Every student has something someone nearby wants to buy"
    },
    books: {
      name: "Never Pay Full Price: 70% Off",
      tag: "SMART CAMPUS SAVER",
      headline: "STOP OVERPAYING\nFOR TEXTBOOKS!",
      subhead: "Get verified past questions, departmental handouts and textbooks at up to 70% off from seniors on your campus.",
      perks: [
        { icon: "📖", title: "All Departmental Levels (100L - 500L)", desc: "From introductory courses to final-year project materials." },
        { icon: "🔄", title: "Open to Friendly Book Swaps", desc: "Exchange last semester's materials for this semester's books." },
        { icon: "📍", title: "Pick Up in 5 Minutes on Campus", desc: "No courier fees or waiting weeks for interstate delivery." },
        { icon: "🔍", title: "Inspect Before You Pay", desc: "Flip through pages in person before completing the deal." },
        { icon: "🏆", title: "Ace Exams with Real Past Questions", desc: "Real test records and revision solutions from top coursemates." }
      ],
      ctaText: "SCAN TO BROWSE TEXTBOOK DEALS",
      footerNote: "Save money on books. Spend it on what truly matters to you."
    },
    ambassador: {
      name: "Campus Ambassador Recruitment",
      tag: "STUDENT LEADERSHIP & EARNINGS",
      headline: "GET PAID EVERY WEEK\nON YOUR CAMPUS!",
      subhead: "Join the Campally Campus Ambassador League. Represent your faculty, share your referral link, and earn weekly cash.",
      perks: [
        { icon: "💸", title: "Weekly Direct Bank Payouts", desc: "Earn cash bonuses for every student signup and verified listing." },
        { icon: "🌟", title: "Official Verified Badge", desc: "Distinguish yourself as an elite student leader on the platform." },
        { icon: "📜", title: "Certificate of Marketing Leadership", desc: "Supercharge your CV, LinkedIn and post-graduation prospects." },
        { icon: "🤝", title: "Direct Founder Access", desc: "Collaborate closely with founders and sharpen tech startup skills." },
        { icon: "🎁", title: "Exclusive Campally Merch & Perks", desc: "Priority free listing boosts and access to exclusive student summits." }
      ],
      ctaText: "SCAN TO APPLY AS CAMPUS AMBASSADOR",
      footerNote: "Limited ambassador slots per faculty. Apply and get approved today."
    },
    services: {
      name: "Spotlight Your Campus Hustle",
      tag: "STUDENT BUSINESS DIRECTORY",
      headline: "PUT YOUR SKILL IN FRONT\nOF 20,000+ STUDENTS",
      subhead: "Are you a student barber, braider, baker, phone repairer, graphic designer, or tutor? Get fully booked every single week.",
      perks: [
        { icon: "🌟", title: "Verified Campus Spotlight", desc: "Showcase your business prominently on the campus home feed." },
        { icon: "📲", title: "Instant WhatsApp Bookings", desc: "Students tap to chat directly and book your service." },
        { icon: "💵", title: "Keep 100% of What You Charge", desc: "Zero booking commission or transaction deductions from clients." },
        { icon: "📍", title: "Target Only Nearby Students", desc: "Get clients from your own hostel block and faculty faculty." },
        { icon: "⭐", title: "Build Real Student Reviews", desc: "Grow a verified brand reputation that stays with you forever." }
      ],
      ctaText: "SCAN TO SPOTLIGHT YOUR CAMPUS BUSINESS",
      footerNote: "Turn your talent into a thriving student enterprise"
    }
  };

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
        renderFlyer();
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
    const base = "https://campally.publicvm.com";
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

  // Main Canvas Rendering Engine
  function renderFlyer() {
    const w = canvas.width;
    const h = canvas.height;
    const isNoticeboard = state.format === "noticeboard";
    const isStory = state.format === "story";
    const isSquare = state.format === "square";

    const content = CAMPAIGN_CONTENT[state.campaign] || CAMPAIGN_CONTENT.launch;

    // Update Preview Labels
    previewCampaignLabel.textContent = content.name;
    previewCampusLabel.textContent = state.campus === "All Campuses" 
      ? "Target: Nationwide Nigerian Campuses" 
      : `Target Campus: ${state.campus}`;

    // 1. Background Fill
    ctx.fillStyle = "#FDF6EC"; // Warm Campally Cream
    ctx.fillRect(0, 0, w, h);

    // Subtle modern geometric background gradients
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#FFF9F2");
    bgGrad.addColorStop(0.5, "#FDF6EC");
    bgGrad.addColorStop(1, "#F8EFE4");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic Top Header Ribbon (Sunset Coral & Deep Indigo)
    const headerHeight = isStory ? 340 : (isNoticeboard ? 280 : 220);
    const headerGrad = ctx.createLinearGradient(0, 0, w, headerHeight);
    headerGrad.addColorStop(0, "#1E1B4B"); // Midnight Indigo
    headerGrad.addColorStop(0.7, "#2C2766");
    headerGrad.addColorStop(1, "#312E81");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, w, headerHeight);

    // Top Coral Accent Bar
    ctx.fillStyle = "#E8553D";
    ctx.fillRect(0, 0, w, 14);

    // Decorative circle arcs on header
    ctx.save();
    ctx.strokeStyle = "rgba(232, 85, 61, 0.25)";
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.arc(w - 60, 40, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 80;
    ctx.beginPath();
    ctx.arc(w - 40, 60, 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Top Header Elements: Logo + Campus Edition Badge
    // Brand Logo Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Campally", 70, isStory ? 120 : (isNoticeboard ? 110 : 95));

    // Logo Dot Accent
    ctx.fillStyle = "#E8553D";
    ctx.beginPath();
    ctx.arc(335, isStory ? 95 : (isNoticeboard ? 85 : 70), 10, 0, Math.PI * 2);
    ctx.fill();

    // Official Tagline beside/under logo
    ctx.fillStyle = "#FCD34D"; // Campus Gold
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("YOUR CAMPUS, YOUR MARKETPLACE", 70, isStory ? 160 : (isNoticeboard ? 148 : 130));

    // Top Right Pill: Campus Edition Badge
    const campusBadgeText = state.campus === "All Campuses" ? "🇳🇬 NATIONWIDE NIGERIA" : `🏫 ${state.campus} OFFICIAL`;
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    const badgeWidth = ctx.measureText(campusBadgeText).width + 44;
    const badgeX = w - 70 - badgeWidth;
    const badgeY = isStory ? 90 : (isNoticeboard ? 80 : 65);

    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 54, 27, true, false);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 54, 27, false, true);

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(campusBadgeText, badgeX + badgeWidth / 2, badgeY + 35);

    // 3. Campaign Category Ribbon Overline (Inside Header)
    ctx.textAlign = "left";
    const overlineY = isStory ? 230 : (isNoticeboard ? 210 : 180);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "800 17px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.letterSpacing = "1.5px";
    ctx.fillText(content.tag, 70, overlineY);

    // Web URL banner on header edge
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(253, 211, 77, 0.9)";
    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("🌐 campally.publicvm.com", w - 70, overlineY);

    // 4. Main Body: Headline & Subheading
    let currentY = headerHeight + (isStory ? 70 : 60);

    // Campus Target Banner (if specific campus selected)
    if (state.campus !== "All Campuses") {
      ctx.fillStyle = "#FEF3C7";
      drawRoundedRect(ctx, 70, currentY - 24, w - 140, 46, 12, true, false);
      ctx.strokeStyle = "#FDE68A";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, 70, currentY - 24, w - 140, 46, 12, false, true);

      ctx.fillStyle = "#92400E";
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`📢 Calling All Students at ${state.campusFullName}!`, w / 2, currentY + 6);
      currentY += isStory ? 64 : 54;
    }

    // Bold Primary Headline
    ctx.textAlign = "left";
    ctx.fillStyle = "#1E1B4B";
    const headlineLines = content.headline.split("\n");
    const headlineFontSize = isSquare ? 50 : (isStory ? 60 : 56);
    ctx.font = `900 ${headlineFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;

    headlineLines.forEach((line, index) => {
      // Highlight the first or last word in Coral
      ctx.fillStyle = (index === 0) ? "#E8553D" : "#1E1B4B";
      ctx.fillText(line, 70, currentY);
      currentY += headlineFontSize + 10;
    });

    currentY += 8;

    // Subtitle Description
    ctx.fillStyle = "#4B5563";
    const subheadFontSize = isSquare ? 20 : (isStory ? 24 : 22);
    ctx.font = `500 ${subheadFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    
    // Wrap subtitle text nicely
    wrapText(ctx, content.subhead, 70, currentY, w - 140, subheadFontSize + 8);
    currentY += (subheadFontSize + 8) * (isNoticeboard ? 2.5 : 2.2) + 16;

    // 5. Value Proposition Cards / Perks
    const perkCount = isSquare ? 4 : (isStory ? 5 : 5);
    const perkCardHeight = isSquare ? 76 : (isStory ? 94 : 88);
    const perkGap = isStory ? 16 : 14;

    for (let i = 0; i < perkCount && i < content.perks.length; i++) {
      const perk = content.perks[i];
      const cardY = currentY;

      // Card Background
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, 70, cardY, w - 140, perkCardHeight, 16, true, false);
      
      // Card Subtle Border
      ctx.strokeStyle = "#EAE6DF";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, 70, cardY, w - 140, perkCardHeight, 16, false, true);

      // Left Accent Color Bar
      ctx.fillStyle = (i === 0) ? "#E8553D" : (i === 1 ? "#F59E0B" : (i === 2 ? "#059669" : "#3B82F6"));
      drawRoundedRect(ctx, 70, cardY, 8, perkCardHeight, 4, true, false);

      // Emoji Icon Circle
      ctx.fillStyle = "#F8F6F0";
      ctx.beginPath();
      ctx.arc(125, cardY + perkCardHeight / 2, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(perk.icon, 125, cardY + perkCardHeight / 2 + 10);

      // Perk Title & Subtext
      ctx.textAlign = "left";
      ctx.fillStyle = "#1E1B4B";
      ctx.font = "bold 21px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(perk.title, 175, cardY + (isSquare ? 32 : 36));

      ctx.fillStyle = "#6B7280";
      ctx.font = "500 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(perk.desc, 175, cardY + (isSquare ? 58 : 64));

      currentY += perkCardHeight + perkGap;
    }

    currentY += 10;

    // 6. Trust Badges Row (Safe Meetups, Verified Students, Paystack, WhatsApp)
    const badgeRowHeight = isSquare ? 42 : 48;
    ctx.fillStyle = "#EFF6FF";
    drawRoundedRect(ctx, 70, currentY, w - 140, badgeRowHeight, 12, true, false);
    ctx.strokeStyle = "#BFDBFE";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 70, currentY, w - 140, badgeRowHeight, 12, false, true);

    ctx.fillStyle = "#1E40AF";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🛡️ Verified Students Only  •  ⚡ Instant WhatsApp Chat  •  💳 Paystack Verified  •  🚫 0 Delivery Fees", w / 2, currentY + (isSquare ? 26 : 30));

    // 7. Bottom Conversion Zone: CTA Banner, Ambassador Code & QR Code
    const footerZoneHeight = isStory ? 380 : (isNoticeboard ? 330 : 260);
    const footerY = h - footerZoneHeight;

    // Footer Container Background (Navy Gradient)
    const footGrad = ctx.createLinearGradient(0, footerY, 0, h);
    footGrad.addColorStop(0, "#1E1B4B");
    footGrad.addColorStop(1, "#0F0D2E");
    ctx.fillStyle = footGrad;
    ctx.fillRect(0, footerY, w, footerZoneHeight);

    // Decorative top border on footer
    ctx.fillStyle = "#E8553D";
    ctx.fillRect(0, footerY, w, 8);

    // Left Column of Footer: Call to Action + Referral Code + Contact
    const qrSize = isSquare ? 150 : (isStory ? 190 : 180);
    const qrX = w - 70 - qrSize;
    const qrY = footerY + 36;
    const infoWidth = qrX - 100;

    ctx.textAlign = "left";
    ctx.fillStyle = "#FCD34D"; // Gold
    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("READY TO GET STARTED?", 70, footerY + 45);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(content.ctaText, 70, footerY + 86);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Scan with your phone camera or visit: ", 70, footerY + 120);

    ctx.fillStyle = "#FCD34D";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("campally.publicvm.com", 70 + ctx.measureText("Scan with your phone camera or visit: ").width + 4, footerY + 120);

    // Referral Code Box (if active)
    if (state.refCode) {
      const refY = footerY + 144;
      ctx.fillStyle = "rgba(232, 85, 61, 0.25)";
      drawRoundedRect(ctx, 70, refY, infoWidth - 20, 56, 12, true, false);
      ctx.strokeStyle = "#E8553D";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 70, refY, infoWidth - 20, 56, 12, false, true);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("USE AMBASSADOR CODE:", 90, refY + 35);

      ctx.fillStyle = "#FCD34D";
      ctx.font = "900 24px monospace";
      ctx.fillText(state.refCode, 320, refY + 36);
    }

    // Contact WhatsApp Row
    const contactY = state.refCode ? (footerY + 232) : (footerY + 175);
    ctx.fillStyle = "#25D366";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`💬 WhatsApp Helpline: ${state.phone}`, 70, contactY);

    // Disclaimer / Founder Note at bottom
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(content.footerNote, 70, h - 25);

    // Right Column: QR Code Plate
    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16, true, false);
    ctx.strokeStyle = "#FCD34D";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16, false, true);

    if (qrImageElement && qrImageElement.complete !== false) {
      try {
        ctx.drawImage(qrImageElement, qrX, qrY, qrSize, qrSize);
      } catch (e) {
        drawFallbackQR(ctx, qrX, qrY, qrSize);
      }
    } else {
      drawFallbackQR(ctx, qrX, qrY, qrSize);
    }

    // QR Label Underneath
    ctx.fillStyle = "#FCD34D";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO OPEN", qrX + qrSize / 2, qrY + qrSize + 28);
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
    const refBonus = state.refCode ? `\n🎁 Use Ambassador Referral Code: *${state.refCode}* for priority visibility!` : "";

    let text = "";
    let badgeText = "";

    switch (state.activeCopyTab) {
      case "whatsapp-group":
        badgeText = "Departmental, Faculty & Hostel WhatsApp Groups";
        text = `🚨 *URGENT NOTICE TO ALL ${campusName.toUpperCase()} STUDENTS* 🚨\n\n` +
          `Stop paying ridiculous campus bookshop prices or getting scammed online when looking for items on campus! 🛑\n\n` +
          `We now have *Campally* — the official student-to-student marketplace built for ${campusName} students. 🎓🤝\n\n` +
          `Here is what you can do right now on Campally:\n` +
          `✅ *Textbooks & Past Questions:* Buy course materials from seniors at 50% - 70% off.\n` +
          `✅ *Laptops & Gadgets:* Phones, power banks, chargers and calculators with zero delivery fees.\n` +
          `✅ *Sell Your Clutter:* Got old textbooks, fans, sneakers, or clothes? Cash out in 30 seconds!\n` +
          `✅ *Hostel Moves & Swaps:* Mattresses, hotplates, and dorm essentials.\n` +
          `✅ *Safe Meetups:* Chat directly on WhatsApp and meet safely in broad daylight at the Library foyer or Faculty hall.\n` +
          refBonus + `\n\n` +
          `👉 *Start browsing or post for free here:* \n${link}\n\n` +
          `_PS: Verified students only. Keep this link handy before exam rush!_ 🔥`;
        break;

      case "whatsapp-status":
        badgeText = "WhatsApp Status 3-Slide Story Sequence";
        text = `📱 *WHATSAPP STATUS 3-SLIDE CAMPAIGN:* \n\n` +
          `[SLIDE 1 - TEASER IMAGE / FLYER]\n` +
          `Caption: "Why did no one tell me about this earlier? 😭 Saved ₦15,000 on handouts and textbooks this week."\n\n` +
          `---\n\n` +
          `[SLIDE 2 - THE SOLUTION]\n` +
          `Caption: "If you're in ${campusName} and need textbooks, gadgets, hostel items, or want to sell your old stuff for quick cash — Campally is the answer! 📚💻"\n\n` +
          `---\n\n` +
          `[SLIDE 3 - CALL TO ACTION LINK]\n` +
          `Caption: "Check out active listings or post yours in 30 secs: 👉 ${link} ${state.refCode ? `(Code: ${state.refCode})` : ""}"`;
        break;

      case "instagram":
        badgeText = "Instagram / TikTok Feed & Reels Caption";
        text = `Student life just got 10x easier (and way cheaper) at ${campusName}! 🚀✨\n\n` +
          `Say goodbye to high delivery fees, shady online sellers, and overpriced faculty materials. @Campally connects students directly to buy, sell, and swap safely right on campus.\n\n` +
          `🔹 50%-70% off verified textbooks & past questions\n` +
          `🔹 Gadgets, dorm appliances & thrift fashion\n` +
          `🔹 Meet up safely at campus landmarks (Library, SUB, Faculties)\n` +
          `🔹 Instant WhatsApp connection with coursemates\n\n` +
          `🔗 Tap the link in bio to start trading now: ${link}\n` +
          `${state.refCode ? `💥 Use code ${state.refCode} for instant perks!\n\n` : "\n"}` +
          `#Campally #${campusName.replace(/[^a-zA-Z0-9]/g, "")} #CampusMarketplace #NaijaStudents #StudentHustle #CampusLife #FUNAI #UNILAG #UNN`;
        break;

      case "twitter":
        badgeText = "Viral Campus X (Twitter) Thread";
        text = `🧵 1/4 How students at ${campusName} are beating inflation and saving thousands every semester.\n\n` +
          `Instead of paying crazy money at bookshops or paying ₦4,000 for delivery from Lagos, students are trading directly with coursemates living 2 minutes away on @Campally. 👇\n\n` +
          `2/4 Got textbooks you'll never read again? Old laptop or phone gathering dust in your hostel? List it in 30 seconds. A junior student in your department needs it today.\n\n` +
          `3/4 100% On-Campus Safety: Zero strangers. Every transaction is student-to-student. Chat directly on WhatsApp and meet at the campus library or porter's lodge.\n\n` +
          `4/4 Sign up and post or browse deals in your university right now: \n🔗 ${link} ${state.refCode ? `\n(Referral code: ${state.refCode})` : ""}`;
        break;

      case "lecture-pitch":
        badgeText = "60-Second In-Person Lecture Hall Pitch (For Course Reps & Ambassadors)";
        text = `🗣️ *60-SECOND LECTURE HALL ANNOUNCEMENT SCRIPT* \n(Deliver right after class or during break before the lecturer arrives):\n\n` +
          `"Good day coursemates! Just a quick 60-second update that will save everyone money this semester.\n\n` +
          `How many of us have spent too much on textbooks or handouts, or currently have textbooks from 100L/200L sitting in our rooms doing nothing?\n\n` +
          `We now have an official campus marketplace called Campally at campally.publicvm.com.\n\n` +
          `You can buy and sell textbooks, past questions, laptops, chargers, and hostel appliances directly with students here in ${campusName}. There are zero delivery fees, zero middleman cuts, and you chat directly on WhatsApp to meet safely at the library.\n\n` +
          `I will drop the direct link in our class WhatsApp group right now${state.refCode ? ` with my code *${state.refCode}*` : ""}. Check it out before our next class!"`;
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
