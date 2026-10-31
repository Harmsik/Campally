/**
 * Campally - Home page extras
 *  1. Hero slider (auto-sliding photo/banner cards at the top)
 *  2. Wrapped category list (with a "Show all" button)
 *  3. First-time quick tour (Next / auto-next / Skip)
 * Loads after home.js. Needs nothing from Supabase.
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Styles ----------
  var css = "" +
    /* hero */
    "#hero-carousel{padding:12px 20px 4px 20px;}" +
    ".hero-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-radius:16px;}" +
    ".hero-track::-webkit-scrollbar{display:none;}" +
    ".hero-slide{flex:0 0 100%;scroll-snap-align:start;position:relative;height:150px;border-radius:16px;overflow:hidden;cursor:pointer;color:#fff;}" +
    ".hero-slide img.hero-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}" +
    ".hero-slide .hero-icon{position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:64px;opacity:.22;}" +
    ".hero-slide .hero-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.68),rgba(0,0,0,0) 70%);}" +
    ".hero-slide .hero-text{position:absolute;left:16px;right:16px;bottom:14px;}" +
    ".hero-slide .hero-title{font-size:17px;font-weight:800;line-height:1.25;margin:0 0 3px 0;}" +
    ".hero-slide .hero-sub{font-size:12px;line-height:1.4;opacity:.92;margin:0;}" +
    ".hero-dots{display:flex;justify-content:center;gap:6px;padding:8px 0 2px 0;}" +
    ".hero-dot{width:7px;height:7px;border-radius:4px;background:#D6CFC4;transition:all .25s ease;border:none;padding:0;}" +
    ".hero-dot.active{width:20px;background:#E8553D;}" +
    /* categories */
    "#category-chips.category-chips-bar{flex-wrap:wrap;overflow:visible;position:relative;}" +
    "#category-chips.is-collapsed{overflow:hidden;}" +
    "#cat-toggle{display:block;margin:0 auto 4px auto;background:none;border:none;color:#E8553D;font-size:12px;font-weight:700;padding:4px 10px;cursor:pointer;}" +
    /* tour */
    "#tour-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:20px;}" +
    ".tour-card{position:relative;width:100%;max-width:360px;background:#fff;border-radius:22px;padding:34px 24px 22px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden;}" +
    ".tour-progress{position:absolute;left:0;top:0;right:0;height:4px;background:#F1ECE4;}" +
    ".tour-progress-bar{height:100%;width:0;background:#E8553D;}" +
    ".tour-progress-bar.run{animation:tourfill 7s linear forwards;}" +
    "@keyframes tourfill{from{width:0}to{width:100%}}" +
    ".tour-skip{position:absolute;top:14px;right:14px;background:#F8F6F0;border:1px solid #E5E0D8;color:#475569;font-size:12px;font-weight:700;padding:5px 12px;border-radius:14px;cursor:pointer;}" +
    ".tour-icon{width:78px;height:78px;border-radius:50%;margin:6px auto 14px auto;display:flex;align-items:center;justify-content:center;font-size:32px;}" +
    ".tour-title{font-size:20px;font-weight:800;color:#1E1B4B;margin:0 0 8px 0;}" +
    ".tour-text{font-size:14px;color:#4B5563;line-height:1.6;margin:0 0 16px 0;min-height:68px;}" +
    ".tour-dots{display:flex;justify-content:center;gap:6px;margin-bottom:16px;}" +
    ".tour-dot{width:7px;height:7px;border-radius:4px;background:#E5E0D8;transition:all .25s ease;}" +
    ".tour-dot.active{width:20px;background:#E8553D;}" +
    ".tour-next{width:100%;background:#E8553D;color:#fff;border:none;border-radius:14px;padding:13px;font-size:15px;font-weight:800;cursor:pointer;}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // =====================================================
  // 1. HERO SLIDER
  // =====================================================
  // To use real photos: upload an image with the file name in "img" next to home.html.
  var SLIDES = [
    { title: "Search for available lodges", sub: "Find housing & rentals near your campus", icon: "fa-house-chimney", grad: "linear-gradient(135deg,#1E1B4B,#4338CA)", img: "hero-lodges.jpg", action: "lodges" },
    { title: "Graduating soon? Sell what you don't need", sub: "Turn gadgets, books and hostel items into cash", icon: "fa-sack-dollar", grad: "linear-gradient(135deg,#E8553D,#F59E0B)", img: "hero-sell.jpg", href: "post-listing.html" },
    { title: "Can't find it? Post a request", sub: "Tell students what you need and let sellers come to you", icon: "fa-bullhorn", grad: "linear-gradient(135deg,#047857,#10B981)", img: "hero-request.jpg", action: "requests" },
    { title: "Hire a student service", sub: "Tutors, repairs, hair, delivery and more", icon: "fa-screwdriver-wrench", grad: "linear-gradient(135deg,#0F172A,#475569)", img: "hero-services.jpg", href: "services.html" },
    { title: "Swap instead of paying", sub: "Trade your item for something you need", icon: "fa-repeat", grad: "linear-gradient(135deg,#7C3AED,#EC4899)", img: "hero-swap.jpg", action: "swap" }
  ];

  function runAction(name) {
    var tab, btn;
    if (name === "lodges") {
      tab = document.getElementById("tab-listings"); if (tab) tab.click();
      btn = document.querySelector('.category-chip[data-cat="housing"]'); if (btn) btn.click();
      var lv = document.getElementById("listings-view");
      if (lv) lv.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (name === "requests") {
      tab = document.getElementById("tab-requests"); if (tab) tab.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (name === "swap") {
      tab = document.getElementById("tab-listings"); if (tab) tab.click();
      btn = document.getElementById("swap-filter-btn"); if (btn) btn.click();
      var lv2 = document.getElementById("listings-view");
      if (lv2) lv2.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function buildHero() {
    var host = document.getElementById("hero-carousel");
    if (!host) return;

    var track = document.createElement("div");
    track.className = "hero-track";
    var dots = document.createElement("div");
    dots.className = "hero-dots";

    SLIDES.forEach(function (s, i) {
      var slide = document.createElement("div");
      slide.className = "hero-slide";
      slide.style.background = s.grad;
      slide.setAttribute("role", "button");
      slide.setAttribute("tabindex", "0");
      slide.innerHTML =
        '<i class="fa-solid ' + s.icon + ' hero-icon"></i>' +
        '<img class="hero-photo" src="' + s.img + '" alt="" loading="lazy" onerror="this.remove()">' +
        '<div class="hero-shade"></div>' +
        '<div class="hero-text"><p class="hero-title">' + s.title + '</p><p class="hero-sub">' + s.sub + "</p></div>";
      var go = function () { if (s.href) { window.location.href = s.href; } else { runAction(s.action); } };
      slide.addEventListener("click", go);
      slide.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      track.appendChild(slide);

      var dot = document.createElement("button");
      dot.className = "hero-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); pause(); });
      dots.appendChild(dot);
    });

    host.appendChild(track);
    host.appendChild(dots);

    var index = 0;
    var pausedUntil = 0;

    function goTo(i) {
      index = i;
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    }
    function pause() { pausedUntil = Date.now() + 6000; }

    track.addEventListener("scroll", function () {
      var i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      if (i !== index) { index = i; }
      var all = dots.children;
      for (var k = 0; k < all.length; k++) { all[k].classList.toggle("active", k === i); }
    }, { passive: true });

    ["touchstart", "pointerdown", "mouseenter"].forEach(function (evt) {
      track.addEventListener(evt, pause, { passive: true });
    });

    if (!REDUCED) {
      setInterval(function () {
        if (document.visibilityState !== "visible" || Date.now() < pausedUntil) return;
        goTo((index + 1) % SLIDES.length);
      }, 4500);
    }
  }

  // =====================================================
  // 2. WRAPPED CATEGORIES (3 rows, "Show all" button)
  // =====================================================
  function setupCategories() {
    var bar = document.getElementById("category-chips");
    if (!bar) return;

    var toggle = document.createElement("button");
    toggle.id = "cat-toggle";
    toggle.type = "button";
    bar.insertAdjacentElement("afterend", toggle);

    var expanded = false;

    function apply() {
      var chips = Array.prototype.slice.call(bar.querySelectorAll(".category-chip"));
      if (!chips.length) return;
      bar.classList.remove("is-collapsed");
      bar.style.maxHeight = "";
      var tops = [];
      chips.forEach(function (c) { if (tops.indexOf(c.offsetTop) === -1) tops.push(c.offsetTop); });
      tops.sort(function (a, b) { return a - b; });

      if (tops.length <= 3) { toggle.style.display = "none"; return; }
      toggle.style.display = "block";
      if (expanded) {
        toggle.innerHTML = 'Show fewer categories <i class="fa-solid fa-chevron-up"></i>';
      } else {
        bar.classList.add("is-collapsed");
        bar.style.maxHeight = (tops[3] - 4) + "px";
        toggle.innerHTML = 'Show all ' + chips.length + ' categories <i class="fa-solid fa-chevron-down"></i>';
      }
    }

    toggle.addEventListener("click", function () { expanded = !expanded; apply(); });
    window.addEventListener("resize", apply);
    // Fonts / icons may load a moment later and change chip widths
    setTimeout(apply, 50);
    setTimeout(apply, 600);
    window.addEventListener("load", apply);
  }

  // =====================================================
  // 3. FIRST-TIME QUICK TOUR
  // =====================================================
  var STEPS = [
    { icon: "fa-graduation-cap", bg: "#FFF5F3", color: "#E8553D", title: "Welcome to Campally", text: "Your campus marketplace. Take this quick tour to see how everything works. It takes less than a minute." },
    { icon: "fa-bag-shopping", bg: "#EFF6FF", color: "#2563EB", title: "Buy products", text: "Browse items from students on your campus. Tap an item you like, then message the seller on WhatsApp to agree a price and meet." },
    { icon: "fa-square-plus", bg: "#FFFBEB", color: "#D97706", title: "Sell your stuff", text: "Tap Post at the bottom, add a photo and a price, and your item is live. Books, gadgets, clothes, anything you no longer need." },
    { icon: "fa-repeat", bg: "#F5F3FF", color: "#7C3AED", title: "Swap products", text: "Don't want to spend cash? Offer to swap your item for something you need. Tap Swaps Only on Home to see swap offers." },
    { icon: "fa-bullhorn", bg: "#ECFDF5", color: "#059669", title: "Request a product or service", text: "Can't find what you need? Post a request on the Wanted board and sellers will come to you." },
    { icon: "fa-screwdriver-wrench", bg: "#F1F5F9", color: "#334155", title: "Find student services", text: "Open the Services tab to hire fellow students for things like tutoring and repairs, or offer your own skills." },
    { icon: "fa-shield-halved", bg: "#ECFDF5", color: "#059669", title: "Stay safe", text: "Look for the green Verified badge. Meet in public campus spots, check the item first, and only pay when you are happy." }
  ];
  var TOUR_KEY = "campally_tour_seen";
  var AUTO_SECONDS = 7;

  function hasLoginToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("sb-") === 0 && k.slice(-11) === "-auth-token") return true;
      }
    } catch (e) {}
    return false;
  }

  function shouldAutoShow() {
    try {
      if (localStorage.getItem(TOUR_KEY)) return false;
      // New sign-ups get the tour. Returning logged-in students do not (they can replay it from How to Use).
      if (localStorage.getItem("campally_show_guide_suggestion") === "true") return true;
      return !hasLoginToken();
    } catch (e) { return false; }
  }

  function startTour() {
    if (document.getElementById("tour-overlay")) return;
    var step = 0;

    var overlay = document.createElement("div");
    overlay.id = "tour-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Campally quick tour");
    overlay.innerHTML =
      '<div class="tour-card">' +
        '<div class="tour-progress"><div class="tour-progress-bar"></div></div>' +
        '<button type="button" class="tour-skip">Skip</button>' +
        '<div class="tour-icon"></div>' +
        '<h2 class="tour-title"></h2>' +
        '<p class="tour-text"></p>' +
        '<div class="tour-dots"></div>' +
        '<button type="button" class="tour-next">Next</button>' +
      "</div>";
    document.body.appendChild(overlay);

    var bar = overlay.querySelector(".tour-progress-bar");
    var iconEl = overlay.querySelector(".tour-icon");
    var titleEl = overlay.querySelector(".tour-title");
    var textEl = overlay.querySelector(".tour-text");
    var dotsEl = overlay.querySelector(".tour-dots");
    var nextBtn = overlay.querySelector(".tour-next");
    var skipBtn = overlay.querySelector(".tour-skip");

    function finish() {
      try {
        localStorage.setItem(TOUR_KEY, "1");
        localStorage.removeItem("campally_show_guide_suggestion");
      } catch (e) {}
      var banner = document.getElementById("home-new-user-suggestion");
      if (banner) banner.style.display = "none";
      overlay.remove();
      if (window.location.hash === "#tour") {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    function render() {
      var s = STEPS[step];
      var last = step === STEPS.length - 1;
      iconEl.style.background = s.bg;
      iconEl.style.color = s.color;
      iconEl.innerHTML = '<i class="fa-solid ' + s.icon + '"></i>';
      titleEl.textContent = s.title;
      textEl.textContent = s.text;
      nextBtn.textContent = last ? "Get started" : "Next";
      dotsEl.innerHTML = "";
      STEPS.forEach(function (_, i) {
        var d = document.createElement("span");
        d.className = "tour-dot" + (i === step ? " active" : "");
        dotsEl.appendChild(d);
      });
      // restart the countdown bar (not on the last step: it waits for "Get started")
      bar.classList.remove("run");
      bar.style.width = last ? "100%" : "0";
      if (!last && !REDUCED) {
        void bar.offsetWidth; // restart animation
        bar.style.animationDuration = AUTO_SECONDS + "s";
        bar.classList.add("run");
      }
    }

    function next() {
      if (step >= STEPS.length - 1) { finish(); return; }
      step += 1;
      render();
    }

    bar.addEventListener("animationend", next);
    nextBtn.addEventListener("click", next);
    skipBtn.addEventListener("click", finish);
    render();
  }
  window.startCampallyTour = startTour;

  // ---------- Go ----------
  function init() {
    buildHero();
    setupCategories();
    var replay = window.location.hash === "#tour" || /[?&]tour=1/.test(window.location.search);
    if (replay) {
      setTimeout(startTour, 400);
    } else if (shouldAutoShow()) {
      setTimeout(startTour, 900);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
