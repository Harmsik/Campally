// Post form: first a pop-up asks "Product or Service?", then the right form shows.
// (Services go to the Book a Service page, products go to the main feed.)
(function () {
  const form = document.getElementById("listing-form");
  const catSelect = document.getElementById("category");
  const titleInput = document.getElementById("title");
  const priceInput = document.getElementById("price");
  if (!form || !catSelect || !titleInput) return;

  const TYPES = window.CAMPALLY_SERVICE_TYPES || [];
  const params = new URLSearchParams(location.search);
  // Links like post-listing.html?type=service or ?book=1 already say what the person is posting
  const typeFromLink = params.get("type") === "service" ? "service" : (params.get("type") === "product" || params.get("book") ? "product" : "");
  let current = typeFromLink || "product";
  let chosen = !!typeFromLink;

  const catLabel = catSelect.previousElementSibling;
  const courseBox = document.getElementById("course-code-container");
  const swapEl = document.getElementById("is-swap");
  const swapWrap = swapEl ? swapEl.parentElement : null;
  const priceLabel = priceInput ? priceInput.previousElementSibling : null;

  // Small banner at the top of the form: shows what you picked, with a Change button
  const box = document.createElement("div");
  box.innerHTML =
    '<div id="type-banner" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#F0EDE6; border-radius:12px; padding:10px 12px; margin-bottom:14px;">' +
      '<span id="type-banner-text" style="font-size:14px; font-weight:700; color:#2B2B2B;"></span>' +
      '<button type="button" id="type-change" style="background:#fff; border:1px solid #E5E0D8; border-radius:8px; padding:5px 12px; font-size:12px; font-weight:700; color:#E8553D; cursor:pointer;">Change</button>' +
    '</div>' +
    '<div id="service-type-box" style="display:none;">' +
      '<label>Type of service</label>' +
      '<select id="service-category"><option value="">Select service type</option>' +
      TYPES.map(function (t) { return '<option value="' + t.name + '">' + t.name + '</option>'; }).join("") +
      '</select>' +
    '</div>';
  const photoLabel = form.querySelector("label");
  form.insertBefore(box, photoLabel);

  const serviceSelect = document.getElementById("service-category");

  function show(el, on) { if (el) el.style.display = on ? "" : "none"; }

  function apply() {
    const isService = current === "service";
    document.getElementById("type-banner-text").textContent = isService ? "🛠️ Posting a service" : "📦 Posting a product";
    show(document.getElementById("service-type-box"), isService);
    show(catLabel, !isService);
    show(catSelect, !isService);
    show(courseBox, !isService);
    show(swapWrap, !isService);
    catSelect.required = !isService;
    titleInput.placeholder = isService ? "e.g. Haircuts & Beard Trims" : "e.g. Calculus Past Questions";
    if (priceLabel) priceLabel.textContent = isService ? "Starting price (₦)" : "Price (₦)";
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = isService ? "Post Service" : "Post Product";
  }

  // ---------- The pop-up ----------
  let overlay = null;

  function closeChooser() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.body.style.overflow = "";
  }

  function pick(type) {
    current = type;
    chosen = true;
    apply();
    closeChooser();
    window.scrollTo(0, 0);
  }

  function openChooser() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;";
    overlay.innerHTML =
      '<div style="background:#fff; border-radius:20px; padding:22px 18px 16px; width:100%; max-width:380px; box-shadow:0 20px 50px rgba(0,0,0,.3);">' +
        '<h2 style="margin:0 0 4px; font-size:19px; color:#2B2B2B; text-align:center;">What do you want to post?</h2>' +
        '<p style="margin:0 0 16px; font-size:13px; color:#777; text-align:center;">Choose one to continue.</p>' +
        '<button type="button" id="pick-product" style="display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:#FFF5F3; border:2px solid #FCD8D0; border-radius:16px; padding:14px; margin-bottom:10px; cursor:pointer; font-family:inherit;">' +
          '<span style="font-size:30px;">📦</span>' +
          '<span><b style="display:block; font-size:15px; color:#2B2B2B;">A Product</b><span style="font-size:12px; color:#666; line-height:1.4;">Something you want to sell: books, phones, clothes, food, etc.</span></span>' +
        '</button>' +
        '<button type="button" id="pick-service" style="display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:#EFF6FF; border:2px solid #BFDBFE; border-radius:16px; padding:14px; cursor:pointer; font-family:inherit;">' +
          '<span style="font-size:30px;">🛠️</span>' +
          '<span><b style="display:block; font-size:15px; color:#2B2B2B;">A Service</b><span style="font-size:12px; color:#666; line-height:1.4;">Work you do for people: barbing, braiding, tutoring, repairs, etc.</span></span>' +
        '</button>' +
        '<a href="home.html" style="display:block; text-align:center; margin-top:14px; font-size:13px; color:#888; text-decoration:none;">Cancel</a>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    document.getElementById("pick-product").addEventListener("click", function () { pick("product"); });
    document.getElementById("pick-service").addEventListener("click", function () { pick("service"); });
  }

  document.getElementById("type-change").addEventListener("click", openChooser);
  apply();

  // post-listing.js calls this once it knows the person is signed in
  window.openPostTypeChooser = function () { if (!chosen) openChooser(); };

  // The post form reads this when you tap Post
  window.getPostTypeInfo = function () {
    if (current !== "service") return { type: "product" };
    const opt = Array.from(catSelect.options).find(function (o) { return /service/i.test(o.textContent); });
    return {
      type: "service",
      serviceCategory: serviceSelect.value,
      categoryId: opt ? opt.value : "3"
    };
  };
})();
