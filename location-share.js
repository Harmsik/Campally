/**
 * Campally - "Share my location" helper
 * Lets a seller or vendor tap one button to save a Google Maps pin of where they are.
 * No Google Maps account or billing is needed: it only makes a normal Google Maps link.
 * The pin is stored as a small tag at the end of a text, like:  Backgate, beside pharmacy [Map: https://www.google.com/maps?q=5.123456,7.123456]
 *
 *   CampallyLoc.split(text)       -> { text, url }   (url is "" when there is no pin)
 *   CampallyLoc.pack(text, url)   -> text with the tag added
 *   CampallyLoc.stripTag(text)    -> text without the tag
 *   CampallyLoc.linkHtml(url)     -> "Open in Maps" link (safe HTML)
 *   CampallyLoc.attach(anchor)    -> adds the Share button after an input, returns { get, set, pack }
 */
(function () {
  "use strict";

  // Only real Google Maps pins of this exact shape are accepted (keeps the tag safe)
  var TAG = /\s*\[Map:\s*(https:\/\/www\.google\.com\/maps\?q=-?\d{1,3}(?:\.\d+)?,-?\d{1,3}(?:\.\d+)?)\]/i;
  var MAX_TEXT = 140; // the database allows 200 characters in total, the tag needs about 60

  function split(str) {
    str = String(str == null ? "" : str);
    var m = str.match(TAG);
    if (!m) return { text: str.trim(), url: "" };
    return { text: str.replace(new RegExp(TAG.source, "gi"), "").trim(), url: m[1] };
  }
  function stripTag(str) { return split(str).text; }
  function pack(text, url) {
    text = String(text == null ? "" : text).replace(/[\[\]]/g, "").trim();
    return url && TAG.test(" [Map: " + url + "]") ? (text + " [Map: " + url + "]").trim() : text;
  }
  function urlFor(lat, lng) { return "https://www.google.com/maps?q=" + lat.toFixed(6) + "," + lng.toFixed(6); }
  function isPin(url) { return TAG.test(" [Map: " + url + "]"); }

  function linkHtml(url, label) {
    if (!url || !isPin(url)) return "";
    return '<a href="' + url + '" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:5px; margin-left:6px; background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:12px; font-weight:700; padding:2px 9px; border-radius:999px; text-decoration:none;" onclick="event.stopPropagation();"><i class="fa-solid fa-map-location-dot"></i> ' + (label || "Open in Maps") + "</a>";
  }

  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type || "info");
    else alert(msg);
  }

  function attach(anchor, opts) {
    opts = opts || {};
    var url = "";
    if (!anchor) return { get: function () { return ""; }, set: function () {}, pack: function (t) { return t; } };
    if (anchor.tagName === "INPUT" && (anchor.maxLength < 0 || anchor.maxLength > MAX_TEXT)) anchor.maxLength = MAX_TEXT;

    var box = document.createElement("div");
    box.style.cssText = "margin:8px 0 4px 0;";
    box.innerHTML =
      '<button type="button" class="loc-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:#EFF6FF; border:1.5px solid #BFDBFE; color:#1D4ED8; border-radius:12px; padding:11px 12px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;">' +
        '<i class="fa-solid fa-location-crosshairs"></i><span>Share my location</span></button>' +
        '<div class="loc-note" style="font-size:11.5px; color:#6B7280; line-height:1.45; margin-top:5px;"></div>';
    anchor.parentNode.insertBefore(box, anchor.nextSibling);

    var btn = box.querySelector(".loc-btn");
    var label = btn.querySelector("span");
    var note = box.querySelector(".loc-note");
    var defaultNote = opts.note || "Stand where you want to be found, then tap the button. People can open it in Google Maps to find you. Anyone can see this pin.";

    function refresh() {
      if (url) {
        btn.style.background = "#ECFDF5"; btn.style.borderColor = "#A7F3D0"; btn.style.color = "#047857";
        label.textContent = "Location saved. Tap to update";
        note.innerHTML = 'Pin saved. ' + linkHtml(url, "Check it in Maps").replace("margin-left:6px;", "") +
          ' <a href="#" class="loc-remove" style="color:#B91C1C; font-weight:700; margin-left:8px;">Remove</a>';
        var rm = note.querySelector(".loc-remove");
        if (rm) rm.addEventListener("click", function (e) { e.preventDefault(); url = ""; refresh(); });
      } else {
        btn.style.background = "#EFF6FF"; btn.style.borderColor = "#BFDBFE"; btn.style.color = "#1D4ED8";
        label.textContent = "Share my location";
        note.textContent = defaultNote;
      }
    }

    btn.addEventListener("click", function () {
      if (!navigator.geolocation) { toast("Your phone or browser can't share location here. You can still type the place.", "error"); return; }
      btn.disabled = true;
      label.textContent = "Finding you...";
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.disabled = false;
        url = urlFor(pos.coords.latitude, pos.coords.longitude);
        refresh();
        toast("Location saved!", "success");
      }, function (err) {
        btn.disabled = false;
        refresh();
        var msg = err && err.code === 1
          ? "Location is blocked. Allow location for your browser in your phone settings, then try again."
          : "We could not find your location. Check that your phone's location is on and try again.";
        toast(msg, "error");
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });

    refresh();
    return {
      get: function () { return url; },
      set: function (u) { url = u && isPin(u) ? u : ""; refresh(); },
      pack: function (text) { return pack(text, url); }
    };
  }

  window.CampallyLoc = { split: split, pack: pack, stripTag: stripTag, linkHtml: linkHtml, attach: attach, isPin: isPin, MAX_TEXT: MAX_TEXT };
})();
