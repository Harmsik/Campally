const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: "image/jpeg" }));
      }, "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
  });
}

const categorySelect = document.getElementById("category");
const campusSelect = document.getElementById("listing-campus");
const listingForm = document.getElementById("listing-form");
const imageInput = document.getElementById("listing-image-input");
const imagePreview = document.getElementById("listing-image-preview");
const postFormContainer = document.getElementById("post-form-container");
const visitorPrompt = document.getElementById("visitor-post-prompt");

let currentUser = null;
let currentProfile = null;

async function checkAuthAndInit() {
  let user = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      user = sessionData.session.user;
    }
  } catch (_) {}

  if (!user) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) user = userData.user;
    } catch (_) {}
  }

  if (!user) {
    // Visitor: restrict selling, show visitor explanation card
    if (postFormContainer) postFormContainer.style.display = "none";
    if (visitorPrompt) visitorPrompt.style.display = "block";
    return;
  }

  currentUser = user;
  if (postFormContainer) postFormContainer.style.display = "block";
  if (visitorPrompt) visitorPrompt.style.display = "none";

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile;

  // Populate Campuses
  const campusSearchInput = document.getElementById("listing-campus-search");
  const campusDropdown = document.getElementById("listing-campus-dropdown");

  if (campusSelect) {
    campusSelect.innerHTML = `<option value="">Select your campus</option>`;
    const campusList = window.NIGERIAN_CAMPUSES || [];
    campusList.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = `🏫 ${c.name}`;
      campusSelect.appendChild(option);
    });

    const initialCampusId = profile?.campus_id ? Number(profile.campus_id) : 1;
    campusSelect.value = String(initialCampusId);

    if (campusSearchInput && campusDropdown && window.setupCampusAutocomplete) {
      window.setupCampusAutocomplete({
        input: campusSearchInput,
        dropdown: campusDropdown,
        initialCampusId: initialCampusId,
        onSelect: (campus) => {
          if (campus) {
            campusSelect.value = String(campus.id);
            updateHostelSuggestions(campus.id);
          } else {
            campusSelect.value = "";
            updateHostelSuggestions(null);
          }
        }
      });
    }

    updateHostelSuggestions(initialCampusId);

    campusSelect.addEventListener("change", () => {
      updateHostelSuggestions(campusSelect.value);
    });
  }

  const hallInput = document.getElementById("listing-hall");
  if (hallInput && profile?.hall) {
    hallInput.value = profile.hall;
  }

  loadCategories();
}

function updateHostelSuggestions(campusId) {
  const datalist = document.getElementById("campus-hostels-list");
  if (!datalist) return;
  datalist.innerHTML = "";
  const hostels = window.getHostelsForCampus ? window.getHostelsForCampus(campusId) : [];
  hostels.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h;
    datalist.appendChild(opt);
  });
}

async function loadCategories() {
  if (!categorySelect) return;
  const { data, error } = await supabase.from("categories").select("*");
  if (error || !data) return;

  categorySelect.innerHTML = `<option value="">Select a category</option>`;
  data.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

checkAuthAndInit();

if (imageInput) {
  imageInput.addEventListener("change", async () => {
    let file = imageInput.files[0];
    if (file) {
      file = await compressImage(file);
      imagePreview.src = URL.createObjectURL(file);
    }
  });
}

if (listingForm) {
  listingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      window.location.href = "login.html?redirect=post-listing.html";
      return;
    }

    const title = document.getElementById("title").value.trim();
    const typeInfo = window.getPostTypeInfo ? window.getPostTypeInfo() : { type: "product" };
    if (typeInfo.type === "service" && !typeInfo.serviceCategory) {
      if (window.showToast) window.showToast("Please choose the type of service.", "error");
      else alert("Please choose the type of service.");
      return;
    }
    const categoryId = typeInfo.type === "service"
      ? (typeInfo.categoryId || document.getElementById("category").value)
      : document.getElementById("category").value;
    const rawDescription = document.getElementById("description").value.trim();
    const price = document.getElementById("price").value;
    const campusIdVal = campusSelect ? campusSelect.value : null;
    const chosenCampusId = campusIdVal ? Number(campusIdVal) : (currentProfile?.campus_id || 1);
    const hallVal = document.getElementById("listing-hall")?.value.trim() || "";

    const courseCodeInput = document.getElementById("course-code");
    const courseCode = courseCodeInput ? courseCodeInput.value.trim().toUpperCase() : null;

    const isSwapInput = document.getElementById("is-swap");
    const isSwap = isSwapInput ? isSwapInput.checked : false;

    const meetupSpotInput = document.getElementById("meetup-spot");
    const meetupSpot = meetupSpotInput ? meetupSpotInput.value : null;

    let imageUrl = null;
    let file = imageInput.files[0];

    if (file) {
      file = await compressImage(file);
      const filePath = `${currentUser.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, file);

      if (uploadError) {
        if (window.showToast) window.showToast("Image upload failed: " + uploadError.message, "error");
        else alert("Image upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    // Build metadata tags to guarantee full feature support
    let metaTags = [];
    if (isSwap) metaTags.push("[SWAP]");
    if (courseCode) metaTags.push(`[Course: ${courseCode}]`);
    if (meetupSpot) metaTags.push(`[Meetup: ${meetupSpot}]`);
    if (hallVal) metaTags.push(`[Hall: ${hallVal}]`);

    const enrichedDescription = (rawDescription + (metaTags.length ? "\n\n" + metaTags.join(" ") : "")).trim();
    const formattedTitle = isSwap ? `[SWAP] ${title}` : title;

    const extendedPayload = {
      title: formattedTitle,
      category_id: categoryId,
      description: enrichedDescription,
      price: price ? Number(price) : null,
      seller_id: currentUser.id,
      image_url: imageUrl,
      is_swap: isSwap,
      course_code: courseCode || null,
      safe_meetup_spot: meetupSpot || null,
      campus_id: chosenCampusId,
      listing_type: typeInfo.type,
      service_category: typeInfo.serviceCategory || null
    };
      

    let { error: insertError } = await supabase.from("listings").insert(extendedPayload);

    // Resilient fallback if optional columns are absent in table
    if (insertError) {
      console.warn("Retrying with campus schema payload:", insertError.message);
      const payloadWithCampus = {
        title: formattedTitle,
        category_id: categoryId,
        description: enrichedDescription,
        price: price ? Number(price) : null,
        seller_id: currentUser.id,
        image_url: imageUrl,
        campus_id: chosenCampusId
      };

      let res = await supabase.from("listings").insert(payloadWithCampus);
      if (res.error) {
        delete payloadWithCampus.campus_id;
        res = await supabase.from("listings").insert(payloadWithCampus);
      }
      insertError = res.error;
    }

    if (insertError) {
      if (window.showToast) window.showToast("Failed to post: " + insertError.message, "error");
      else alert("Failed to post: " + insertError.message);
    } else {
      const selectedPromo = document.querySelector('input[name="listing_promo"]:checked')?.value || "free";
      
      if (selectedPromo !== "free" && window.CampallyPay) {
        if (window.showToast) window.showToast("Listing created! Opening Paystack checkout...", "info");
        
        // Fetch created item ID
        const { data: latestData } = await supabase
          .from("listings")
          .select("id, title")
          .eq("seller_id", currentUser.id)
          .order("id", { ascending: false })
          .limit(1);

        const newItemId = latestData && latestData[0] ? latestData[0].id : null;

        window.CampallyPay.startCheckout({
          planId: selectedPromo,
          itemId: newItemId,
          itemTitle: title,
          userId: currentUser.id,
          userEmail: currentUser.email,
          onSuccess: () => {
            setTimeout(() => { window.location.href = "home.html"; }, 800);
          },
          onClose: () => {
            setTimeout(() => { window.location.href = "home.html"; }, 800);
          }
        });
        return;
      }

      if (window.showToast) window.showToast("Listing posted successfully!", "success");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 600);
    }
  });
}
