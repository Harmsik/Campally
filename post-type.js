// Post form: choose "product" or "service" (services go to the Book a Service page)
(function () {
  const form = document.getElementById("listing-form");
  const catSelect = document.getElementById("category");
  const titleInput = document.getElementById("title");
  const priceInput = document.getElementById("price");
  if (!form || !catSelect || !titleInput) return;

  const TYPES = window.CAMPALLY_SERVICE_TYPES || [];
  let current = new URLSearchParams(location.search).get("type") === "service" ? "service" : "product";

  const catLabel = catSelect.previousElementSibling;
  const courseBox = document.getElementById("course-code-container");
  const swapEl = document.getElementById("is-swap");
  const swapWrap = swapEl ? swapEl.parentElement : null;
  const priceLabel = priceInput ? priceInput.previousElementSibling : null;

  const box = document.createElement("div");
  box.innerHTML =
    '<label>What are you posting?</label>' +
    '<div style="display:flex; gap:8px; margin-bottom:14px;">' +
      '<button type="button" id="type-product" class="category-chip">📦 A product</button>' +
      '<button type="button" id="type-service" class="category-chip">🛠️ A service</button>' +
    '</div>' +
    '<div id="service-type-box" style="display:none;">' +
      '<label>Type of service</label>' +
      '<select id="service-category"><option value="">Select service type</option>' +
      TYPES.map(function (t) { return '<option value="' + t.name + '">' + t.name + '</option>'; }).join("") +
      '</select>' +
    '</div>';
  titleInput.previousElementSibling.parentNode.insertBefore(box, titleInput.previousElementSibling);

  const serviceSelect = document.getElementById("service-category");

  function show(el, on) { if (el) el.style.display = on ? "" : "none"; }

  function apply() {
    const isService = current === "service";
    document.getElementById("type-product").classList.toggle("active", !isService);
    document.getElementById("type-service").classList.toggle("active", isService);
    show(document.getElementById("service-type-box"), isService);
    show(catLabel, !isService);
    show(catSelect, !isService);
    show(courseBox, !isService);
    show(swapWrap, !isService);
    catSelect.required = !isService;
    titleInput.placeholder = isService ? "e.g. Haircuts & Beard Trims" : "e.g. Calculus Past Questions";
    if (priceLabel) priceLabel.textContent = isService ? "Starting price (₦)" : "Price (₦)";
  }

  document.getElementById("type-product").addEventListener("click", function () { current = "product"; apply(); });
  document.getElementById("type-service").addEventListener("click", function () { current = "service"; apply(); });
  apply();

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
