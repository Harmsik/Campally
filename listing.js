const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const listingId = params.get("id");

let currentListing = null;
let currentSeller = null;

// Helper to extract course code like MTH101, CHM 111, GST102 from text
function extractCourseCode(text) {
  if (!text) return null;
  const match = text.match(/\b([A-Za-z]{3}\s?\d{3})\b/);
  return match ? match[1].replace(/\s+/, "").toUpperCase() : null;
}

async function loadListing() {
  if (!listingId) {
    document.getElementById("detail-title").textContent = "No listing specified";
    return;
  }
  
  try {
    let { data: item, error } = await supabase
      .from("listings")
      .select("*, profiles(id, full_name, avatar_url, whatsapp_number, hall, department)")
      .eq("id", listingId)
      .single();
    
    if (error) {
      // Fallback in case of column issues
      const res = await supabase
        .from("listings")
        .select("*, profiles(id, full_name, avatar_url, whatsapp_number)")
        .eq("id", listingId)
        .single();
      item = res.data;
      error = res.error;
    }

    if (error || !item) {
      document.getElementById("detail-title").textContent = "Listing not found or removed";
      return;
    }
    
    currentListing = item;
    currentSeller = item.profiles;

    // Detect flags and tags
    const isSwap = Boolean(
      item.is_swap === true ||
      (item.title && item.title.toUpperCase().includes("[SWAP]")) ||
      (item.description && item.description.toUpperCase().includes("[SWAP]"))
    );

    const cleanTitle = (item.title || "Untitled Listing").replace(/^\[SWAP\]\s*/i, "");
    document.title = `${cleanTitle} - Campally`;

    // Render image
    const imgEl = document.getElementById("detail-image");
    if (item.image_url) {
      imgEl.outerHTML = `<img id="detail-image" src="${item.image_url}" alt="${cleanTitle}" style="width:100%; height:240px; object-fit:cover; display:block;">`;
    } else {
      imgEl.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-box-open" style="font-size:32px; margin-bottom:8px; display:block;"></i>No photo uploaded</div>`;
    }

    // Render title and price
    document.getElementById("detail-title").textContent = cleanTitle;
    document.getElementById("detail-price").textContent = window.formatPrice ? window.formatPrice(item.price, isSwap) : `₦${item.price ?? "N/A"}`;
    
    // Description (strip embedded tags if any)
    let cleanDesc = item.description || "No description provided.";
    cleanDesc = cleanDesc.replace(/\[SWAP\]/g, "").replace(/\[Course:\s*[^\]]+\]/g, "").replace(/\[Meetup:\s*[^\]]+\]/g, "").trim();
    document.getElementById("detail-description").textContent = cleanDesc || "No additional description provided.";

    // Render Badges
    const badgesContainer = document.getElementById("detail-badges");
    badgesContainer.innerHTML = "";

    const isBoosted = Boolean(
      (window.CampallyPay && window.CampallyPay.isListingBoosted(listingId)) ||
      item.is_boosted === true ||
      item.is_featured === true ||
      (item.title && (item.title.toUpperCase().includes("[FEATURED]") || item.title.toUpperCase().includes("[BOOSTED]")))
    );

    const isUrgent = Boolean(
      (window.CampallyPay && window.CampallyPay.isListingUrgent(listingId)) ||
      item.is_urgent === true ||
      (item.title && item.title.toUpperCase().includes("[URGENT]"))
    );

    const isProSeller = Boolean(
      (window.CampallyPay && window.CampallyPay.isSellerPro(item.seller_id)) ||
      (currentSeller && currentSeller.is_pro === true)
    );

    if (isBoosted) {
      badgesContainer.innerHTML += `<span class="badge-pill" style="background:#FFF1EE; color:#DC2626; border:1px solid #FECACA; font-weight:800;"><i class="fa-solid fa-fire" style="color:#EF4444;"></i> Featured Boost</span>`;
      const imgBadgeWrap = document.getElementById("image-badge-overlay");
      if (imgBadgeWrap) {
        imgBadgeWrap.innerHTML = `<span style="background:linear-gradient(135deg, #DC2626, #EA580C); color:white; font-size:12px; font-weight:800; padding:4px 10px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.25); display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-fire"></i> FEATURED</span>`;
      }
    }

    if (isUrgent) {
      badgesContainer.innerHTML += `<span class="badge-pill" style="background:#FFF1F2; color:#BE123C; border:1px solid #FDA4AF; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Urgent Sale</span>`;
    }
    
    if (isSwap) {
      badgesContainer.innerHTML += `<span class="badge-pill badge-swap"><i class="fa-solid fa-repeat"></i> Open to Swap / Trade</span>`;
    }

    const courseCode = item.course_code || extractCourseCode(item.title + " " + (item.description || ""));
    if (courseCode) {
      badgesContainer.innerHTML += `<span class="badge-pill badge-course"><i class="fa-solid fa-book-open"></i> Course: ${courseCode}</span>`;
    }

    if (currentSeller?.hall) {
      badgesContainer.innerHTML += `<span class="badge-pill badge-hall"><i class="fa-solid fa-location-dot"></i> ${currentSeller.hall}</span>`;
    }

    // Campus Information
    const campusShort = window.getCampusShort ? window.getCampusShort(item.campus_id || 1) : "FUNAI";
    const campusFullName = window.getCampusName ? window.getCampusName(item.campus_id || 1) : "Alex Ekwueme Federal University, Ndufu-Alike (FUNAI)";
    
    if (isProSeller) {
      badgesContainer.innerHTML += `<span class="badge-pill" style="background:#FEF3C7; color:#92400E; border:1px solid #FDE68A; font-weight:700;"><i class="fa-solid fa-crown"></i> Pro Seller</span>`;
    }
    badgesContainer.innerHTML += `<span class="badge-pill badge-verified"><i class="fa-solid fa-shield-check"></i> Verified Student • ${campusShort}</span>`;

    // Check Authentication State for Visitor Mode
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    // Seller Info
    if (currentSeller) {
      document.getElementById("seller-mini-avatar").src = currentSeller.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + (currentSeller.full_name || "student");
      document.getElementById("seller-mini-name").textContent = currentSeller.full_name || "Campally Student";
      document.getElementById("seller-mini-link").href = "seller.html?id=" + currentSeller.id;
      
      // Verified badge is active for current campus students
      document.getElementById("seller-verified-badge").style.display = "inline-flex";

      const locParts = [currentSeller.hall, currentSeller.department, campusShort].filter(Boolean);
      document.getElementById("seller-mini-location").textContent = locParts.join(" • ");

      const contactContainer = document.getElementById("contact-action");

    const isSold = Boolean(
      item.status === "sold" ||
      (item.title && item.title.toUpperCase().includes("[SOLD]")) ||
      (window.isItemSold && window.isItemSold(item.id))
    );

    if (isSold) {
      badgesContainer.innerHTML += `<span class="badge-pill badge-sold"><i class="fa-solid fa-tag"></i> SOLD</span>`;
      const imgWrap = document.getElementById("image-container");
      if (imgWrap && !imgWrap.querySelector(".sold-card-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "sold-card-overlay";
        overlay.textContent = "SOLD";
        imgWrap.appendChild(overlay);
      }
    }

    // Owner controls
    const ownerControls = document.getElementById("owner-listing-controls");
    if (ownerControls && currentUser && currentUser.id === item.seller_id) {
      ownerControls.style.display = "block";
      ownerControls.innerHTML = `
        <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:12px; padding:12px 14px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div>
            <strong style="font-size:13px; color:#92400E;">Your Listing</strong>
            <p style="font-size:12px; color:#78350F; margin:2px 0 0 0;">Status: <strong>${isSold ? 'Sold' : 'Active'}</strong></p>
          </div>
          <button id="owner-toggle-sold" style="padding:7px 14px; border-radius:8px; border:1px solid ${isSold ? '#059669' : '#DC2626'}; background:${isSold ? '#ECFDF5' : '#FEF2F2'}; color:${isSold ? '#065F46' : '#DC2626'}; font-size:12px; font-weight:700; cursor:pointer;">
            ${isSold ? '<i class="fa-solid fa-rotate-left"></i> Relist Item' : '<i class="fa-solid fa-check-circle"></i> Mark as Sold'}
          </button>
        </div>

        ${!isSold ? `
          <div style="background:#FFF5F3; border:1px solid #FCD8D0; border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size:13px; color:#9C2A18;"><i class="fa-solid fa-bolt" style="color:#E8553D;"></i> Sell This Item Faster</strong>
                <p style="font-size:12px; color:#777; margin:2px 0 0 0;">Reach hundreds of students across campus today</p>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="owner-boost-btn" style="flex:1; background:${isBoosted ? '#FFF7ED' : '#E8553D'}; color:${isBoosted ? '#C2410C' : 'white'}; border:1px solid ${isBoosted ? '#FDBA74' : '#E8553D'}; border-radius:8px; padding:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="fa-solid ${isBoosted ? 'fa-check' : 'fa-fire'}"></i> ${isBoosted ? 'Boosted Active' : 'Boost (₦300)'}
              </button>
              <button id="owner-urgent-btn" style="flex:1; background:${isUrgent ? '#FEF2F2' : '#FFFFFF'}; color:#DC2626; border:1px solid #FDA4AF; border-radius:8px; padding:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="fa-solid fa-triangle-exclamation"></i> ${isUrgent ? 'Urgent Active' : 'Urgent (₦200)'}
              </button>
            </div>
          </div>
        ` : ''}
      `;
      document.getElementById("owner-toggle-sold")?.addEventListener("click", async () => {
        const newStatus = isSold ? "active" : "sold";
        try {
          await supabase.from("listings").update({ status: newStatus }).eq("id", listingId);
        } catch (e) {}
        if (window.setItemSoldStatus) window.setItemSoldStatus(listingId, newStatus === "sold");
        if (window.showToast) {
          window.showToast(newStatus === "sold" ? "Listing marked as Sold! Buyers will no longer contact you." : "Listing relisted as Active!", "success");
        }
        setTimeout(() => location.reload(), 400);
      });

      document.getElementById("owner-boost-btn")?.addEventListener("click", () => {
        if (window.CampallyPay && window.CampallyPay.openBoostModal) {
          window.CampallyPay.openBoostModal(listingId, cleanTitle, () => location.reload());
        }
      });

      document.getElementById("owner-urgent-btn")?.addEventListener("click", () => {
        if (window.CampallyPay && window.CampallyPay.openUrgentModal) {
          window.CampallyPay.openUrgentModal(listingId, cleanTitle, () => location.reload());
        }
      });
    }

    // Favorite / Bookmark button
    const saveBtn = document.getElementById("detail-save-btn");
    if (saveBtn) {
      const isSaved = window.isItemSaved ? window.isItemSaved(listingId) : false;
      saveBtn.innerHTML = `<i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart" style="${isSaved ? 'color:#E8553D;' : ''}"></i> ${isSaved ? 'Saved in Favorites' : 'Save to Favorites'}`;
      saveBtn.onclick = () => {
        if (window.toggleSaveItem) {
          const nowSaved = window.toggleSaveItem(listingId);
          saveBtn.innerHTML = `<i class="${nowSaved ? 'fa-solid' : 'fa-regular'} fa-heart" style="${nowSaved ? 'color:#E8553D;' : ''}"></i> ${nowSaved ? 'Saved in Favorites' : 'Save to Favorites'}`;
          if (window.showToast) {
            window.showToast(nowSaved ? "Saved to your favorites!" : "Removed from favorites", "info");
          }
        }
      };
    }

    if (isSold) {
      contactContainer.innerHTML = `
        <div style="background:#FEE2E2; border:1px solid #FCA5A5; border-radius:12px; padding:16px; text-align:center;">
          <p style="font-size:15px; color:#DC2626; font-weight:700; margin:0 0 4px 0;"><i class="fa-solid fa-circle-check"></i> This Item Has Been Sold</p>
          <p style="font-size:13px; color:#666; margin:0;">The seller has concluded this sale. Browse other active listings!</p>
        </div>
      `;
    } else if (!currentUser) {
      // Visitor view: only see products, prompt to sign in to contact
      contactContainer.innerHTML = `
        <div style="background:#FFF8F6; border:1px solid #FED7AA; border-radius:12px; padding:16px; text-align:center;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; background:#FEE2E2; color:#DC2626; border-radius:50%; margin-bottom:8px;">
            <i class="fa-solid fa-lock"></i>
          </div>
          <h4 style="font-size:15px; color:#2B2B2B; margin-bottom:4px;">Sign In to Contact Seller</h4>
          <p style="font-size:13px; color:#666; margin-bottom:12px; line-height:1.4;">
            You are browsing as a visitor. Sign in with your campus account to chat with this verified seller on WhatsApp.
          </p>
          <div style="display:flex; gap:10px; justify-content:center;">
            <a href="login.html?redirect=listing.html%3Fid%3D${listingId}" class="btn-primary" style="display:inline-block; width:auto; padding:10px 22px; font-size:13px; text-decoration:none;">Log In</a>
            <a href="signup.html" class="edit-btn" style="display:inline-block; font-size:13px; padding:10px 18px; text-decoration:none;">Create Account</a>
          </div>
        </div>
      `;
    } else if (currentSeller.whatsapp_number) {
      const phone = currentSeller.whatsapp_number.replace(/\D/g, "");
      const msg = encodeURIComponent(`Hi ${currentSeller.full_name || "there"}, I saw your listing for "${cleanTitle}" on Campally. Is it still available?`);
      contactContainer.innerHTML = `
        <a href="https://wa.me/${phone}?text=${msg}" target="_blank" class="whatsapp-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; text-decoration:none;">
          <i class="fa-brands fa-whatsapp" style="font-size:20px;"></i> Contact Seller on WhatsApp
        </a>
      `;
    } else {
      contactContainer.innerHTML = `
        <p style="text-align:center; font-size:13px; color:#888;">Seller has not provided a WhatsApp contact yet.</p>
      `;
    }
  }

    // Preferred Safe Meetup Spot
    const meetupSpotMatch = (item.description || "").match(/\[Meetup:\s*([^\]]+)\]/i);
    const preferredSpot = item.safe_meetup_spot || (meetupSpotMatch ? meetupSpotMatch[1] : null);
    if (preferredSpot) {
      const spotEl = document.getElementById("seller-preferred-spot");
      spotEl.textContent = `📍 Seller's preferred campus spot: ${preferredSpot}`;
      spotEl.style.display = "block";
    }

  } catch (err) {
    console.error("Error loading listing details:", err);
  }
}

// Copy Listing Link
const copyLinkBtn = document.getElementById("copy-link-btn");
if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      if (window.showToast) {
        window.showToast("Listing link copied to clipboard!", "success");
      }
    }).catch(() => {
      if (window.showToast) {
        window.showToast("Unable to copy link automatically.", "error");
      }
    });
  });
}

// ==========================================================
// WHATSAPP STATUS IMAGE CARD GENERATOR (HTML5 CANVAS)
// ==========================================================

const openStatusBtn = document.getElementById("open-status-modal-btn");
const statusModal = document.getElementById("status-modal");
const closeStatusBtn = document.getElementById("close-status-modal");
const downloadCardBtn = document.getElementById("download-card-btn");
const shareWaDirectLink = document.getElementById("share-wa-direct-link");
const statusCanvas = document.getElementById("status-canvas");

function renderWhatsAppStatusCard() {
  if (!statusCanvas || !currentListing) return;
  const ctx = statusCanvas.getContext("2d");
  const width = statusCanvas.width;   // 720
  const height = statusCanvas.height; // 1280

  // 1. Draw Vibrant Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#E8553D");
  bgGrad.addColorStop(0.5, "#D84A33");
  bgGrad.addColorStop(1, "#9E2A18");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Background subtle decorative circles
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.arc(100, 150, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width - 50, height - 200, 320, 0, Math.PI * 2);
  ctx.fill();

  // 2. Top Header Brand
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 44px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CAMPALLY", width / 2, 90);

  ctx.font = "600 22px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText("Campus Marketplace • Verified Student Deals", width / 2, 130);

  // 3. Central White Card (Card shape)
  const cardX = 40;
  const cardY = 160;
  const cardW = width - 80;
  const cardH = 960;
  const radius = 32;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  // 4. Product Image Inside Card
  const imgBoxX = cardX + 30;
  const imgBoxY = cardY + 30;
  const imgBoxW = cardW - 60;
  const imgBoxH = 460;

  function finishDrawingCard(loadedImg) {
    ctx.save();
    roundRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 20);
    ctx.clip();

    if (loadedImg) {
      // Draw image scaled to cover
      const hRatio = imgBoxW / loadedImg.width;
      const vRatio = imgBoxH / loadedImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (imgBoxW - loadedImg.width * ratio) / 2;
      const centerShiftY = (imgBoxH - loadedImg.height * ratio) / 2;
      ctx.drawImage(
        loadedImg,
        0, 0, loadedImg.width, loadedImg.height,
        imgBoxX + centerShiftX, imgBoxY + centerShiftY,
        loadedImg.width * ratio, loadedImg.height * ratio
      );
    } else {
      // Placeholder
      ctx.fillStyle = "#F3EFEA";
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
      ctx.fillStyle = "#E8553D";
      ctx.font = "bold 64px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🛍️", imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2);
    }
    ctx.restore();

    // 5. Price Pill inside Card
    const isSwap = Boolean(currentListing.is_swap || (currentListing.title && currentListing.title.includes("[SWAP]")));
    const priceText = window.formatPrice(currentListing.price, isSwap);
    
    ctx.fillStyle = "#E8553D";
    ctx.font = "bold 46px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(priceText, cardX + 36, imgBoxY + imgBoxH + 60);

    // 6. Title
    const cleanTitle = (currentListing.title || "Item For Sale").replace(/^\[SWAP\]\s*/i, "");
    ctx.fillStyle = "#2B2B2B";
    ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
    wrapText(ctx, cleanTitle, cardX + 36, imgBoxY + imgBoxH + 115, cardW - 72, 44, 2);

    // 7. Seller Info Row
    const sellerName = currentSeller?.full_name || "Campus Student";
    const sellerHall = currentSeller?.hall || "Campus";
    ctx.fillStyle = "#555555";
    ctx.font = "600 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`📍 Location: ${sellerHall}`, cardX + 36, cardY + cardH - 180);
    ctx.fillText(`👤 Seller: ${sellerName} (Verified Student)`, cardX + 36, cardY + cardH - 140);

    // 8. Call to Action Button inside Card
    const btnY = cardY + cardH - 95;
    const btnH = 65;
    ctx.fillStyle = "#25D366"; // WhatsApp Green
    roundRect(ctx, cardX + 30, btnY, cardW - 60, btnH, 16);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💬 DM ON WHATSAPP TO BUY", width / 2, btnY + 42);

    // 9. Bottom Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "600 20px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Shared from Campally • Your Campus Marketplace", width / 2, height - 60);
  }

  // If there's an image, load with crossOrigin
  if (currentListing.image_url) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => finishDrawingCard(img);
    img.onerror = () => finishDrawingCard(null);
    img.src = currentListing.image_url;
  } else {
    finishDrawingCard(null);
  }
}

// Canvas Rounded Rectangle helper
function roundRect(ctx, x, y, width, height, radius) {
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
}

// Canvas Text Wrap helper
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
      linesDrawn++;
      if (linesDrawn >= maxLines - 1) {
        ctx.fillText(line + "...", x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Modal open/close
if (openStatusBtn) {
  openStatusBtn.addEventListener("click", () => {
    if (statusModal) statusModal.style.display = "flex";
    renderWhatsAppStatusCard();

    // Prepare direct WA link
    if (shareWaDirectLink && currentListing) {
      const isSwap = Boolean(currentListing.is_swap || (currentListing.title && currentListing.title.includes("[SWAP]")));
      const priceText = window.formatPrice(currentListing.price, isSwap);
      const cleanTitle = (currentListing.title || "").replace(/^\[SWAP\]\s*/i, "");
      const shareMsg = encodeURIComponent(`🔥 Found on Campally:\n\n*${cleanTitle}*\n💰 ${priceText}\n📍 ${currentSeller?.hall || "Campus"}\n\nCheck details here: ${window.location.href}`);
      shareWaDirectLink.href = `https://wa.me/?text=${shareMsg}`;
    }
  });
}

if (closeStatusBtn) {
  closeStatusBtn.addEventListener("click", () => {
    if (statusModal) statusModal.style.display = "none";
  });
}

if (statusModal) {
  statusModal.addEventListener("click", (e) => {
    if (e.target === statusModal) statusModal.style.display = "none";
  });
}

// Download Card
if (downloadCardBtn && statusCanvas) {
  downloadCardBtn.addEventListener("click", () => {
    try {
      const link = document.createElement("a");
      link.download = `campally-${listingId || "item"}-status.png`;
      link.href = statusCanvas.toDataURL("image/png");
      link.click();
      if (window.showToast) {
        window.showToast("Story card downloaded! Post it on your WhatsApp Status.", "success");
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast("Click 'Share Link' if direct image download is restricted.", "info");
      }
    }
  });
}

// Initial Boot
loadListing();

supabase.auth.getUser().then(({ data }) => {
  const link = document.getElementById("profile-nav-link");
  if (link && data && data.user) {
    link.href = "seller.html?id=" + data.user.id;
  }
}).catch(() => {});