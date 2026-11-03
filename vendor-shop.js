/**
 * Campally - Vendor shop editor
 * A verified campus vendor edits their public shop details (name, about, location, hours, delivery areas).
 * The database only lets a verified vendor change their own shop.
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var me = null;

  function show(id) {
    ["vs-loading", "vs-blocked", "vs-form-card"].forEach(function (s) {
      $(s).style.display = s === id ? "block" : "none";
    });
  }
  function toast(msg, type) {
    if (window.UI) UI.toast(msg, type || "info", 5000); else alert(msg);
  }

  async function load() {
    var s = await supabase.auth.getSession();
    me = s.data && s.data.session && s.data.session.user;
    if (!me) { location.replace("login.html?redirect=vendor-shop.html"); return; }

    var res = await Promise.all([
      supabase.from("profiles").select("account_type, is_vendor_verified").eq("id", me.id).maybeSingle(),
      supabase.from("vendor_shops").select("*").eq("user_id", me.id).maybeSingle()
    ]);
    var p = res[0].data || {};
    if (p.account_type !== "vendor" || p.is_vendor_verified !== true) { show("vs-blocked"); return; }

    var shop = res[1].data;
    if (shop) {
      $("vs-name").value = shop.shop_name || "";
      $("vs-about").value = shop.description || "";
      $("vs-location").value = shop.location || "";
      $("vs-hours").value = shop.opening_hours || "";
      $("vs-delivery").value = shop.delivery_areas || "";
    }
    show("vs-form-card");
  }

  $("vs-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = $("vs-name").value.trim();
    if (name.length < 2) return toast("Please enter your shop name.", "error");

    var btn = $("vs-save");
    var restore = window.UI ? UI.busy(btn, "Saving...") : function () {};
    try {
      var r = await supabase.from("vendor_shops").upsert({
        user_id: me.id,
        shop_name: name,
        description: $("vs-about").value.trim() || null,
        location: $("vs-location").value.trim() || null,
        opening_hours: $("vs-hours").value.trim() || null,
        delivery_areas: $("vs-delivery").value.trim() || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (r.error) throw r.error;
      restore();
      toast("Shop saved ✓", "success");
    } catch (err) {
      restore();
      console.error("Shop save error:", err);
      toast((err && err.message) ? err.message : "That did not work. Please try again.", "error");
    }
  });

  load().catch(function (err) { console.error(err); show("vs-blocked"); });
})();
