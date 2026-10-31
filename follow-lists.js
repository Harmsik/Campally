/**
 * Campally - Followers / Following counts and lists
 * CampallyFollows.mount(element, userId)  -> shows "12 Followers | 5 Following" for that person
 * CampallyFollows.mountMine(element)      -> same, for the signed-in student
 * Tap a number to see the list, with a button to visit each profile.
 * Uses the page's own Supabase connection, so load this file after the page script.
 */
(function () {
  "use strict";

  var css =
    ".fl-stats{display:flex;justify-content:center;gap:10px;margin:6px 0 10px 0;}" +
    ".fl-stat{background:#fff;border:1px solid #E5E0D8;border-radius:12px;padding:7px 16px;text-align:center;cursor:pointer;min-width:96px;}" +
    ".fl-stat b{display:block;font-size:17px;color:#1E1B4B;line-height:1.2;}" +
    ".fl-stat span{font-size:11px;color:#777;font-weight:600;}" +
    ".fl-sheet{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;}" +
    ".fl-panel{background:#fff;width:100%;max-width:520px;max-height:78vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;}" +
    ".fl-top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #EEE;}" +
    ".fl-top h3{margin:0;font-size:16px;color:#1E1B4B;}" +
    ".fl-close{background:#F3F4F6;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;}" +
    ".fl-list{overflow-y:auto;padding:6px 18px 24px 18px;}" +
    ".fl-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F3F0EA;}" +
    ".fl-av{width:42px;height:42px;border-radius:50%;overflow:hidden;background:#FDE8E3;color:#E8553D;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;}" +
    ".fl-av img{width:100%;height:100%;object-fit:cover;}" +
    ".fl-info{flex:1;min-width:0;}" +
    ".fl-name{font-size:14px;font-weight:700;color:#2B2B2B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".fl-dept{font-size:11px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".fl-go{background:#FFF5F3;border:1px solid #FCD8D0;color:#E8553D;font-size:12px;font-weight:700;text-decoration:none;padding:6px 12px;border-radius:10px;}" +
    ".fl-empty{text-align:center;color:#94A3B8;font-size:13px;padding:30px 0;}";
  var styled = false;
  function addStyle() {
    if (styled) return;
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
    styled = true;
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  // Count rows in "follows" where column = this person
  async function countWhere(column, userId) {
    var res = await supabase.from("follows").select("id", { count: "exact", head: true }).eq(column, userId);
    return res.count || 0;
  }

  async function showList(userId, kind) {
    addStyle();
    var sheet = document.createElement("div");
    sheet.className = "fl-sheet";
    sheet.innerHTML =
      '<div class="fl-panel"><div class="fl-top"><h3></h3>' +
      '<button type="button" class="fl-close" aria-label="Close">\u00d7</button></div>' +
      '<div class="fl-list"><div class="fl-empty">Loading...</div></div></div>';
    sheet.querySelector("h3").textContent = kind === "followers" ? "Followers" : "Following";
    document.body.appendChild(sheet);
    var close = function () { sheet.remove(); };
    sheet.querySelector(".fl-close").addEventListener("click", close);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });

    var listEl = sheet.querySelector(".fl-list");
    try {
      var mineCol = kind === "followers" ? "following_id" : "follower_id";   // whose row we match
      var otherCol = kind === "followers" ? "follower_id" : "following_id";   // the person to show
      var rel = await supabase.from("follows").select(otherCol + ", created_at")
        .eq(mineCol, userId).order("created_at", { ascending: false }).limit(100);
      var ids = (rel.data || []).map(function (r) { return r[otherCol]; });
      if (!ids.length) {
        listEl.innerHTML = '<div class="fl-empty">' + (kind === "followers" ? "No followers yet." : "Not following anyone yet.") + "</div>";
        return;
      }
      var pr = await supabase.from("profiles").select("id, full_name, avatar_url, department").in("id", ids);
      var byId = {};
      (pr.data || []).forEach(function (p) { byId[p.id] = p; });

      listEl.innerHTML = "";
      ids.forEach(function (id) {
        var p = byId[id] || { id: id, full_name: "Campally student" };
        var row = document.createElement("div");
        row.className = "fl-row";

        var av = document.createElement("div");
        av.className = "fl-av";
        av.textContent = initials(p.full_name);
        if (p.avatar_url) {
          var im = document.createElement("img");
          im.alt = "";
          im.onerror = function () { im.remove(); };
          im.src = p.avatar_url;
          av.appendChild(im);
        }

        var info = document.createElement("div");
        info.className = "fl-info";
        var nm = document.createElement("div");
        nm.className = "fl-name";
        nm.textContent = (p.full_name || "Campally student").trim();
        var dp = document.createElement("div");
        dp.className = "fl-dept";
        dp.textContent = (p.department || "").trim();
        info.appendChild(nm);
        info.appendChild(dp);

        var go = document.createElement("a");
        go.className = "fl-go";
        go.href = "seller.html?id=" + encodeURIComponent(id);
        go.textContent = "View";

        row.appendChild(av);
        row.appendChild(info);
        row.appendChild(go);
        listEl.appendChild(row);
      });
    } catch (e) {
      listEl.innerHTML = '<div class="fl-empty">Could not load the list. Please try again.</div>';
    }
  }

  async function mount(el, userId) {
    if (!el || !userId || typeof supabase === "undefined") return;
    addStyle();
    // followers = people who follow them; following = people they follow
    var counts = await Promise.all([countWhere("following_id", userId), countWhere("follower_id", userId)]);
    var followers = counts[0], following = counts[1];

    el.className = "fl-stats";
    el.innerHTML =
      '<div class="fl-stat" data-kind="followers" role="button" tabindex="0"><b>' + followers + "</b><span>Follower" + (followers === 1 ? "" : "s") + "</span></div>" +
      '<div class="fl-stat" data-kind="following" role="button" tabindex="0"><b>' + following + "</b><span>Following</span></div>";
    Array.prototype.forEach.call(el.querySelectorAll(".fl-stat"), function (box) {
      var open = function () { showList(userId, box.getAttribute("data-kind")); };
      box.addEventListener("click", open);
      box.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
  }

  async function mountMine(el) {
    if (!el || typeof supabase === "undefined") return;
    var user = null;
    try {
      var s = await supabase.auth.getSession();
      user = s.data && s.data.session && s.data.session.user;
      if (!user) { var u = await supabase.auth.getUser(); user = u.data && u.data.user; }
    } catch (e) {}
    if (user) mount(el, user.id);
  }

  window.CampallyFollows = { mount: mount, mountMine: mountMine };
})();
