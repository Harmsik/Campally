// Campally - Edit a listing (product or service) you already posted
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_PHOTOS = 5;
const $ = (id) => document.getElementById(id);
const statusBox = $("edit-status");
const container = $("edit-container");
const form = $("edit-form");

const listingId = new URLSearchParams(location.search).get("id");
let listing = null;
let isService = false;
let currentUser = null;

// Photos: each entry is { url } (already uploaded) or { file, preview } (new)
let photos = [];
const picker = document.createElement("input");
picker.type = "file";
picker.accept = "image/*";
picker.multiple = true;
picker.style.display = "none";

function toast(msg, type) {
  if (window.showToast) window.showToast(msg, type || "info");
  else alert(msg);
}

function showMessage(html) {
  container.style.display = "none";
  statusBox.style.display = "block";
  statusBox.innerHTML = html;
}

// Shrink a photo so uploads are fast on mobile data
function compress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1000 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : null);
      }, "image/jpeg", 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function renderPhotos() {
  const host = $("edit-photos");
  host.innerHTML = "";
  const grid = document.createElement("div");
  grid.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; margin-bottom:6px;";

  photos.forEach((p, i) => {
    const tile = document.createElement("div");
    tile.style.cssText = "position:relative; width:96px; height:96px; border-radius:14px; overflow:hidden; background:#F0EDE6; border:1px solid #E5E0D8;";
    const im = document.createElement("img");
    im.src = p.url || p.preview;
    im.style.cssText = "width:100%; height:100%; object-fit:cover; display:block;";
    tile.appendChild(im);

    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "\u00d7";
    x.setAttribute("aria-label", "Remove photo " + (i + 1));
    x.style.cssText = "position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:rgba(0,0,0,.6); color:#fff; border:none; font-size:13px; cursor:pointer; padding:0;";
    x.addEventListener("click", () => {
      if (p.preview) URL.revokeObjectURL(p.preview);
      photos.splice(i, 1);
      renderPhotos();
    });
    tile.appendChild(x);

    const tag = document.createElement(i === 0 ? "div" : "button");
    tag.style.cssText = "position:absolute; left:0; right:0; bottom:0; color:#fff; font-size:10px; font-weight:800; text-align:center; padding:3px 0; border:none; width:100%;";
    if (i === 0) {
      tag.textContent = "COVER";
      tag.style.background = "rgba(232,85,61,.92)";
    } else {
      tag.type = "button";
      tag.textContent = "Make cover";
      tag.style.background = "rgba(0,0,0,.55)";
      tag.style.cursor = "pointer";
      tag.addEventListener("click", () => { photos.unshift(photos.splice(i, 1)[0]); renderPhotos(); });
    }
    tile.appendChild(tag);
    grid.appendChild(tile);
  });

  if (photos.length < MAX_PHOTOS) {
    const add = document.createElement("button");
    add.type = "button";
    add.style.cssText = "width:96px; height:96px; border-radius:14px; border:2px dashed #E8553D; background:#FFF5F3; color:#E8553D; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:12px; font-weight:700; cursor:pointer;";
    add.innerHTML = '<i class="fa-solid fa-camera" style="font-size:20px;"></i><span>' + (photos.length ? "Add more" : "Add photos") + "</span>";
    add.addEventListener("click", () => picker.click());
    grid.appendChild(add);
  }

  const hint = document.createElement("div");
  hint.style.cssText = "font-size:12px; color:#777; margin:2px 0 8px 0; line-height:1.5;";
  hint.textContent = photos.length + " of " + MAX_PHOTOS + " photos. The first photo is the cover people see on Home.";
  host.appendChild(grid);
  host.appendChild(hint);
  host.appendChild(picker);
}

picker.addEventListener("change", async () => {
  let picked = Array.from(picker.files || []);
  picker.value = "";
  const room = MAX_PHOTOS - photos.length;
  if (picked.length > room) {
    toast("You can have up to " + MAX_PHOTOS + " photos. Extra photos were skipped.", "info");
    picked = picked.slice(0, room);
  }
  for (const f of picked) {
    const small = await compress(f);
    if (small) photos.push({ file: small, preview: URL.createObjectURL(small) });
    else toast("One photo could not be read. Please use JPG or PNG pictures.", "error");
  }
  renderPhotos();
});

// The post form saves extra details as tags at the end of the description.
// Pull them out so the seller sees clean text, and put them back when saving.
function splitDescription(text) {
  const out = { clean: text || "", swap: false, course: "", meetup: "", hall: "" };
  out.clean = out.clean.replace(/\[SWAP\]/gi, () => { out.swap = true; return ""; });
  out.clean = out.clean.replace(/\[Course:\s*([^\]]*)\]/gi, (_, v) => { out.course = v.trim(); return ""; });
  out.clean = out.clean.replace(/\[Meetup:\s*([^\]]*)\]/gi, (_, v) => { out.meetup = v.trim(); return ""; });
  out.clean = out.clean.replace(/\[Hall:\s*([^\]]*)\]/gi, (_, v) => { out.hall = v.trim(); return ""; });
  out.clean = out.clean.trim();
  return out;
}

async function init() {
  if (!listingId) { showMessage('No listing was chosen. <a href="my-listings.html">Go back to My Listings</a>'); return; }

  let user = null;
  try {
    const { data } = await supabase.auth.getSession();
    user = data && data.session && data.session.user;
  } catch (_) {}
  if (!user) {
    try { const { data } = await supabase.auth.getUser(); user = data && data.user; } catch (_) {}
  }
  if (!user) {
    showMessage('Please log in to edit your listing.<br><br><a href="login.html?redirect=my-listings.html" class="btn-primary" style="display:inline-block; text-decoration:none; padding:10px 24px;">Log In</a>');
    return;
  }
  currentUser = user;

  const { data: item, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
  if (error || !item) { showMessage('We could not find this listing. <a href="my-listings.html">Go back to My Listings</a>'); return; }
  if (item.seller_id !== user.id) { showMessage('You can only edit your own listings. <a href="my-listings.html">Go back to My Listings</a>'); return; }

  listing = item;
  isService = item.listing_type === "service";

  // Categories
  const { data: cats } = await supabase.from("categories").select("*");
  const catSelect = $("e-category");
  const currentCat = (cats || []).find((c) => String(c.id) === String(item.category_id));
  const currentIsAcademic = !!(currentCat && /academic/i.test(currentCat.name));
  catSelect.innerHTML = "";
  (cats || []).forEach((c) => {
    // Book and past-question details have their own rules, so Academic can't be picked here
    if (/academic/i.test(c.name) && !currentIsAcademic) return;
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    catSelect.appendChild(o);
  });
  catSelect.value = String(item.category_id);
  if (currentIsAcademic) catSelect.disabled = true; // keep Academic items in Academic

  // Service types
  const svcSelect = $("e-service");
  (window.CAMPALLY_SERVICE_TYPES || []).forEach((t) => {
    const o = document.createElement("option");
    o.value = t.name;
    o.textContent = t.name;
    svcSelect.appendChild(o);
  });
  if (item.service_category) svcSelect.value = item.service_category;

  // Fill the form
  const parts = splitDescription(item.description);
  const swap = !!(item.is_swap || parts.swap || /^\[SWAP\]/i.test(item.title || ""));
  $("e-title").value = (item.title || "").replace(/^\[(SWAP|SOLD)\]\s*/gi, "");
  $("e-desc").value = parts.clean;
  $("e-price").value = item.price != null ? item.price : "";
  $("e-swap").checked = swap;
  $("e-course").value = item.course_code || parts.course || "";
  $("e-hall").value = parts.hall || "";
  const meetup = item.safe_meetup_spot || parts.meetup;
  if (meetup) {
    const sel = $("e-meetup");
    if (!Array.from(sel.options).some((o) => o.value === meetup)) {
      const o = document.createElement("option");
      o.value = meetup;
      o.textContent = meetup;
      sel.appendChild(o);
    }
    sel.value = meetup;
  }

  if (isService) {
    $("edit-type-banner").innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i> Editing a service';
    $("e-category-box").style.display = "none";
    $("e-service-box").style.display = "block";
    $("e-course-box").style.display = "none";
    $("e-swap-box").style.display = "none";
    $("e-price-label").textContent = "Starting price (₦)";
  } else {
    $("edit-type-banner").innerHTML = '<i class="fa-solid fa-box"></i> Editing a product';
  }

  const urls = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : (item.image_url ? [item.image_url] : []);
  photos = urls.map((u) => ({ url: u }));
  renderPhotos();

  statusBox.style.display = "none";
  container.style.display = "block";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!listing || !currentUser) return;

  const saveBtn = $("e-save");
  const label = saveBtn.innerHTML;
  const unlock = () => { saveBtn.disabled = false; saveBtn.innerHTML = label; };
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const title = $("e-title").value.trim();
  if (!title) { toast("Please enter a title.", "error"); unlock(); return; }
  if (isService && !$("e-service").value) { toast("Please choose the type of service.", "error"); unlock(); return; }

  // Upload any new photos
  const newOnes = photos.filter((p) => p.file);
  if (newOnes.length) {
    saveBtn.textContent = "Uploading photos...";
    const stamp = Date.now();
    const results = await Promise.all(newOnes.map(async (p, i) => {
      const path = currentUser.id + "/" + stamp + "_e" + (i + 1) + ".jpg";
      const { error } = await supabase.storage.from("listing-images").upload(path, p.file, { contentType: "image/jpeg" });
      if (error) return { error };
      return { url: supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl };
    }));
    const failed = results.find((r) => r.error);
    if (failed) { toast("Photo upload failed: " + failed.error.message, "error"); unlock(); return; }
    newOnes.forEach((p, i) => { p.url = results[i].url; });
    saveBtn.textContent = "Saving...";
  }
  const imageUrls = photos.map((p) => p.url).filter(Boolean);

  const swap = !isService && $("e-swap").checked;
  const course = isService ? "" : $("e-course").value.trim().toUpperCase();
  const meetup = $("e-meetup").value;
  const hall = $("e-hall").value.trim();
  const rawDesc = $("e-desc").value.trim();
  const price = $("e-price").value;

  // Same tags the Post form adds, so everything else on the site keeps working
  const tags = [];
  if (swap) tags.push("[SWAP]");
  if (course) tags.push("[Course: " + course + "]");
  if (meetup) tags.push("[Meetup: " + meetup + "]");
  if (hall) tags.push("[Hall: " + hall + "]");
  const description = (rawDesc + (tags.length ? "\n\n" + tags.join(" ") : "")).trim();

  const update = {
    title: swap ? "[SWAP] " + title : title,
    description: description,
    price: price ? Number(price) : null,
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
    is_swap: swap,
    course_code: course || null,
    safe_meetup_spot: meetup || null
  };
  if (isService) update.service_category = $("e-service").value;
  else if (!$("e-category").disabled) update.category_id = $("e-category").value;

  const { error } = await supabase.from("listings").update(update).eq("id", listing.id).eq("seller_id", currentUser.id);
  if (error) {
    toast("Could not save: " + error.message, "error");
    unlock();
    return;
  }

  toast("Changes saved!", "success");
  setTimeout(() => { window.location.href = "my-listings.html"; }, 700);
});

init();
