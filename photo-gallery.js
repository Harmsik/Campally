/**
 * Campally - Swipeable photo gallery for the listing page
 * CampallyGallery.mount(elementToReplace, [photoUrls], "alt text")
 * Swipe through photos, see "2/4", tap a photo to open it full screen.
 */
(function () {
  "use strict";

  var css =
    ".cg-wrap{position:relative;background:#F0EDE6;}" +
    ".cg-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;}" +
    ".cg-track::-webkit-scrollbar{display:none;}" +
    ".cg-slide{flex:0 0 100%;scroll-snap-align:start;}" +
    ".cg-slide img{width:100%;height:240px;object-fit:cover;display:block;cursor:zoom-in;}" +
    ".cg-count{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;pointer-events:none;}" +
    ".cg-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:5px;pointer-events:none;}" +
    ".cg-dot{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.55);transition:all .2s ease;}" +
    ".cg-dot.on{width:16px;background:#fff;}" +
    ".cg-lb{position:fixed;inset:0;z-index:10000;background:#000;display:flex;flex-direction:column;}" +
    ".cg-lb-track{flex:1;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;}" +
    ".cg-lb-track::-webkit-scrollbar{display:none;}" +
    ".cg-lb-slide{flex:0 0 100%;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;}" +
    ".cg-lb-slide img{max-width:100%;max-height:100%;object-fit:contain;}" +
    ".cg-lb-close{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.18);color:#fff;font-size:22px;cursor:pointer;z-index:2;}" +
    ".cg-lb-count{position:absolute;top:22px;left:16px;color:#fff;font-size:13px;font-weight:700;z-index:2;}";

  var styled = false;
  function addStyle() {
    if (styled) return;
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
    styled = true;
  }

  function openLightbox(urls, start, alt) {
    var lb = document.createElement("div");
    lb.className = "cg-lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");

    var close = document.createElement("button");
    close.className = "cg-lb-close";
    close.setAttribute("aria-label", "Close photos");
    close.textContent = "\u00d7";

    var count = document.createElement("div");
    count.className = "cg-lb-count";

    var track = document.createElement("div");
    track.className = "cg-lb-track";
    urls.forEach(function (u, i) {
      var slide = document.createElement("div");
      slide.className = "cg-lb-slide";
      var im = document.createElement("img");
      im.src = u;
      im.alt = alt + " (" + (i + 1) + " of " + urls.length + ")";
      slide.appendChild(im);
      track.appendChild(slide);
    });

    function update() {
      var i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      count.textContent = (i + 1) + " / " + urls.length;
    }
    function shut() {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lb.remove();
    }
    function onKey(e) { if (e.key === "Escape") shut(); }

    close.addEventListener("click", shut);
    track.addEventListener("scroll", update, { passive: true });
    document.addEventListener("keydown", onKey);

    lb.appendChild(close);
    lb.appendChild(count);
    lb.appendChild(track);
    document.body.appendChild(lb);
    document.body.style.overflow = "hidden";
    track.scrollLeft = start * track.clientWidth;
    update();
  }

  function mount(target, urls, alt) {
    if (!target) return;
    addStyle();
    urls = (urls || []).filter(function (u) { return typeof u === "string" && u; });
    alt = alt || "Listing photo";
    if (!urls.length) return;

    var wrap = document.createElement("div");
    wrap.className = "cg-wrap";
    wrap.id = "detail-image";

    var track = document.createElement("div");
    track.className = "cg-track";
    urls.forEach(function (u, i) {
      var slide = document.createElement("div");
      slide.className = "cg-slide";
      var im = document.createElement("img");
      im.src = u;
      im.alt = alt + " (" + (i + 1) + " of " + urls.length + ")";
      if (i > 0) im.loading = "lazy";
      im.addEventListener("click", function () { openLightbox(urls, i, alt); });
      slide.appendChild(im);
      track.appendChild(slide);
    });
    wrap.appendChild(track);

    if (urls.length > 1) {
      var count = document.createElement("div");
      count.className = "cg-count";
      count.textContent = "1/" + urls.length;
      var dots = document.createElement("div");
      dots.className = "cg-dots";
      urls.forEach(function (_, i) {
        var d = document.createElement("span");
        d.className = "cg-dot" + (i === 0 ? " on" : "");
        dots.appendChild(d);
      });
      track.addEventListener("scroll", function () {
        var i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
        count.textContent = (i + 1) + "/" + urls.length;
        for (var k = 0; k < dots.children.length; k++) dots.children[k].classList.toggle("on", k === i);
      }, { passive: true });
      wrap.appendChild(dots);
      wrap.appendChild(count);
    }

    target.replaceWith(wrap);
  }

  window.CampallyGallery = { mount: mount };
})();
