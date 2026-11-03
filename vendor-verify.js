/**
 * Campally - Vendor verification page
 * A campus vendor sends their business details, a government ID photo, a selfie with the ID
 * and a shop photo. The Founder reviews them in the Founder Hub. The ID photo and selfie are
 * deleted as soon as the request is decided. Nobody can verify themselves: the rules live in Supabase.
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var BUCKET = "vendor-ids";
  var me = null;

  function show(id) {
    ["vv-loading", "vv-student", "vv-approved", "vv-pending", "vv-form-card"].forEach(function (s) {
      var el = $(s);
      if (el) el.style.display = s === id ? "block" : "none";
    });
  }

  function toast(msg, type) {
    if (window.UI) UI.toast(msg, type || "info", 5000); else alert(msg);
  }

  function compressImage(file, maxWidth, quality) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxWidth / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file);
        }, "image/jpeg", quality);
      };
      img.onerror = function () { resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }

  function fillCampuses() {
    var sel = $("vv-campus");
    var list = window.NIGERIAN_CAMPUSES || [];
    list.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
  }

  async function load() {
    var s = await supabase.auth.getSession();
    me = s.data && s.data.session && s.data.session.user;
    if (!me) { location.replace("login.html?redirect=vendor-verify.html"); return; }

    var res = await Promise.all([
      supabase.from("profiles").select("account_type, is_vendor_verified").eq("id", me.id).maybeSingle(),
      supabase.from("vendor_verifications").select("status, review_note, business_name, phone, location, campus_id").eq("user_id", me.id).maybeSingle()
    ]);
    var p = res[0].data || {};
    var v = res[1].data;

    if (p.account_type !== "vendor") { show("vv-student"); return; }
    if (p.is_vendor_verified) { show("vv-approved"); return; }
    if (v && v.status === "pending") { show("vv-pending"); return; }

    if (v && v.status === "rejected") {
      var box = $("vv-rejected");
      box.textContent = "Not approved: " + (v.review_note || "Please upload clearer photos.") + " You can send your details again below.";
      box.style.display = "block";
      $("vv-form-title").textContent = "Send your details again";
      if (v.business_name) $("vv-business").value = v.business_name;
      if (v.phone) $("vv-phone").value = v.phone;
      if (v.location) $("vv-location").value = v.location;
      if (v.campus_id) $("vv-campus").value = String(v.campus_id);
    }
    show("vv-form-card");
  }

  async function upload(file, kind) {
    var blob = await compressImage(file, 1400, 0.85);
    var path = me.id + "/" + kind + "-" + Date.now() + ".jpg";
    var up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) throw up.error;
    return path;
  }

  $("vv-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var form = $("vv-form");
    var business = $("vv-business").value.trim();
    var phone = $("vv-phone").value.trim();
    var campus = $("vv-campus").value;
    var location_ = $("vv-location").value.trim();
    var idFile = $("vv-id").files[0];
    var selfieFile = $("vv-selfie").files[0];
    var shopFile = $("vv-shop").files[0];

    if (business.length < 2) return toast("Please enter your business or shop name.", "error");
    if (phone.replace(/\D/g, "").length < 7) return toast("Please enter a valid phone number.", "error");
    if (!campus) return toast("Please choose the campus you sell to.", "error");
    if (location_.length < 3) return toast("Please tell us where your shop or stall is.", "error");
    if (!idFile) return toast("Please add a photo of your government ID.", "error");
    if (!selfieFile) return toast("Please add a selfie holding your ID.", "error");
    if (!shopFile) return toast("Please add a photo of your shop or stall.", "error");

    var btn = $("vv-submit");
    var restore = window.UI ? UI.busy(btn, "Sending for review...") : function () {};
    var uploaded = [];
    try {
      var idPath = await upload(idFile, "id"); uploaded.push(idPath);
      var selfiePath = await upload(selfieFile, "selfie"); uploaded.push(selfiePath);
      var shopPath = await upload(shopFile, "shop"); uploaded.push(shopPath);

      var r = await supabase.rpc("submit_vendor_verification", {
        p_business: business,
        p_phone: phone,
        p_campus: Number(campus),
        p_location: location_,
        p_id_path: idPath,
        p_selfie_path: selfiePath,
        p_shop_path: shopPath
      });
      if (r.error) throw r.error;

      restore();
      toast("Sent! The Campally team will review it soon.", "success");
      show("vv-pending");
      window.scrollTo(0, 0);
    } catch (err) {
      restore();
      if (uploaded.length) { try { await supabase.storage.from(BUCKET).remove(uploaded); } catch (_) {} }
      console.error("Vendor verification error:", err);
      toast((err && err.message) ? err.message : "That did not work. Please try again.", "error");
    }
  });

  fillCampuses();
  load().catch(function (err) {
    console.error(err);
    show("vv-form-card");
  });
})();
