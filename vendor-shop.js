/**
 * Campally - Vendor shop editor
 * A campus vendor edits their public shop details: name, category, about, location, opening days and hours,
 * delivery areas, and one video (a link, or a short upload once verified).
 * The database only lets a vendor change their own shop, and only verified vendors can upload a video.
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var me = null;
  var verified = false;
  var oldVideoPath = null;       // video already saved on the shop
  var removeVideo = false;       // vendor tapped "Remove it"
  var VIDEO_MAX_BYTES = 15 * 1024 * 1024;
  var VIDEO_MAX_SECONDS = 30;
  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var VIDEO_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|instagram\.com)\//i;

  function show(id) {
    ["vs-loading", "vs-blocked", "vs-form-card"].forEach(function (s) { $(s).style.display = s === id ? "block" : "none"; });
  }
  function toast(msg, type) { if (window.UI) UI.toast(msg, type || "info", 5000); else alert(msg); }

  // ----- opening hours as text, e.g. "Mon-Sat, 8am-9pm" -----
  function to12(t) {
    var p = t.split(":"), h = Number(p[0]), m = p[1];
    var ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + (m === "00" ? "" : ":" + m) + ap;
  }
  function daysText(days) {
    var order = [1, 2, 3, 4, 5, 6, 0];
    var on = order.filter(function (d) { return days.indexOf(d) !== -1; });
    if (on.length === 7) return "Every day";
    var groups = [], cur = [];
    order.forEach(function (d) {
      if (days.indexOf(d) !== -1) cur.push(d);
      else { if (cur.length) groups.push(cur); cur = []; }
    });
    if (cur.length) groups.push(cur);
    return groups.map(function (g) {
      return g.length >= 3 ? DAY_NAMES[g[0]] + "-" + DAY_NAMES[g[g.length - 1]] : g.map(function (d) { return DAY_NAMES[d]; }).join(", ");
    }).join(", ");
  }

  function selectedDays() {
    return Array.prototype.slice.call(document.querySelectorAll("#vs-days input:checked")).map(function (i) { return Number(i.value); });
  }
  function setDays(list) {
    var set = (list || []).map(Number);
    document.querySelectorAll("#vs-days input").forEach(function (i) { i.checked = set.indexOf(Number(i.value)) !== -1; });
  }

  function videoDuration(file) {
    return new Promise(function (resolve) {
      var v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = function () { URL.revokeObjectURL(v.src); resolve(v.duration); };
      v.onerror = function () { resolve(NaN); };
      v.src = URL.createObjectURL(file);
    });
  }

  function refreshVideoBox() {
    $("vs-video-current").style.display = (oldVideoPath && !removeVideo) ? "block" : "none";
  }

  async function load() {
    var s = await supabase.auth.getSession();
    me = s.data && s.data.session && s.data.session.user;
    if (!me) { location.replace("login.html?redirect=vendor-shop.html"); return; }

    var res = await Promise.all([
      supabase.from("profiles").select("account_type, is_vendor_verified").eq("id", me.id).maybeSingle(),
      supabase.from("vendor_shops").select("*").eq("user_id", me.id).maybeSingle(),
      supabase.from("vendor_verifications").select("business_name, location").eq("user_id", me.id).maybeSingle()
    ]);
    var p = res[0].data || {};
    if (p.account_type !== "vendor") { show("vs-blocked"); return; }
    verified = p.is_vendor_verified === true;
    if (!verified) {
      $("vs-unverified-note").style.display = "block";
      $("vs-video-file").disabled = true;
      $("vs-video-hint").textContent = "Video upload unlocks once you are verified. You can still paste a video link above.";
    }

    var shop = res[1].data;
    var sent = res[2].data;
    if (!shop && sent) {
      $("vs-name").value = sent.business_name || "";
      $("vs-location").value = sent.location || "";
    }
    if (shop) {
      $("vs-name").value = shop.shop_name || "";
      $("vs-category").value = shop.category || "";
      $("vs-about").value = shop.description || "";
      $("vs-location").value = shop.location || "";
      $("vs-delivery").value = shop.delivery_areas || "";
      $("vs-video-url").value = shop.video_url || "";
      setDays(shop.open_days);
      $("vs-open").value = shop.open_time || "";
      $("vs-close").value = shop.close_time || "";
      oldVideoPath = shop.video_path || null;
    }
    refreshVideoBox();
    show("vs-form-card");
  }

  $("vs-video-remove").addEventListener("click", function () {
    removeVideo = true;
    refreshVideoBox();
    toast("The video will be removed when you save.", "info");
  });

  $("vs-video-file").addEventListener("change", async function () {
    var f = this.files[0];
    if (!f) return;
    if (f.size > VIDEO_MAX_BYTES) { toast("That video is bigger than 15 MB. Please pick a shorter one.", "error"); this.value = ""; return; }
    var d = await videoDuration(f);
    if (!isNaN(d) && d > VIDEO_MAX_SECONDS + 0.5) { toast("That video is longer than 30 seconds.", "error"); this.value = ""; }
  });

  $("vs-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = $("vs-name").value.trim();
    if (name.length < 2) return toast("Please enter your shop name.", "error");

    var days = selectedDays();
    var openT = $("vs-open").value;
    var closeT = $("vs-close").value;
    var anyHours = days.length || openT || closeT;
    if (anyHours && !(days.length && openT && closeT)) return toast("For opening hours, choose the days and both the opening and closing time. Or leave all of them empty.", "error");

    var videoUrl = $("vs-video-url").value.trim();
    if (videoUrl && !VIDEO_HOSTS.test(videoUrl)) return toast("The video link must start with https:// and come from TikTok, YouTube, Facebook or Instagram.", "error");

    var file = $("vs-video-file").files[0] || null;
    if (file && !verified) return toast("You can upload a video after you are verified.", "error");
    if (file && file.size > VIDEO_MAX_BYTES) return toast("That video is bigger than 15 MB.", "error");

    var btn = $("vs-save");
    var restore = window.UI ? UI.busy(btn, file ? "Uploading video..." : "Saving...") : function () {};
    var newPath = null;
    try {
      if (file) {
        var ext = /webm/i.test(file.type) ? "webm" : (/quicktime/i.test(file.type) ? "mov" : "mp4");
        newPath = me.id + "/shop-" + Date.now() + "." + ext;
        var up = await supabase.storage.from("vendor-videos").upload(newPath, file, { contentType: file.type || "video/mp4" });
        if (up.error) throw up.error;
      }

      var videoPath = oldVideoPath;
      if (newPath) videoPath = newPath;
      else if (removeVideo) videoPath = null;

      var r = await supabase.from("vendor_shops").upsert({
        user_id: me.id,
        shop_name: name,
        category: $("vs-category").value || null,
        description: $("vs-about").value.trim() || null,
        location: $("vs-location").value.trim() || null,
        open_days: days.length ? days : null,
        open_time: anyHours ? openT : null,
        close_time: anyHours ? closeT : null,
        opening_hours: anyHours ? daysText(days) + ", " + to12(openT) + "-" + to12(closeT) : null,
        delivery_areas: $("vs-delivery").value.trim() || null,
        video_url: videoUrl || null,
        video_path: videoPath,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (r.error) throw r.error;

      // Tidy up: the old uploaded video is no longer used
      if (oldVideoPath && oldVideoPath !== videoPath) {
        try { await supabase.storage.from("vendor-videos").remove([oldVideoPath]); } catch (_) {}
      }
      oldVideoPath = videoPath;
      removeVideo = false;
      $("vs-video-file").value = "";
      refreshVideoBox();
      restore();
      toast("Shop saved ✓", "success");
    } catch (err) {
      restore();
      if (newPath) { try { await supabase.storage.from("vendor-videos").remove([newPath]); } catch (_) {} }
      console.error("Shop save error:", err);
      toast((err && err.message) ? err.message : "That did not work. Please try again.", "error");
    }
  });

  load().catch(function (err) { console.error(err); show("vs-blocked"); });
})();
