/**
 * Campally - Notifications page
 * Shows alerts for this student (followers, ratings, ID review)
 * plus announcements the Founder sends to everyone.
 */
const listEl = document.getElementById("notif-list");

const STYLES = {
  follow:       { icon: "fa-user-plus",   color: "#2563EB", bg: "#EFF6FF" },
  review:       { icon: "fa-star",        color: "#D97706", bg: "#FFFBEB" },
  verification: { icon: "fa-shield-check", color: "#059669", bg: "#ECFDF5" },
  announcement: { icon: "fa-bullhorn",    color: "#E8553D", bg: "#FFF5F3" }
};

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Only allow links to pages inside Campally (never other websites)
function safeLink(link) {
  if (!link || typeof link !== "string") return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) return "";
  return /^[a-z0-9_\-./?=&#%]+$/i.test(link) ? link : "";
}

function timeAgo(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + " min ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(iso).toLocaleDateString();
}

function render(items, seen) {
  if (!items.length) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#94A3B8;">
        <i class="fa-regular fa-bell" style="font-size:42px; margin-bottom:12px; display:block;"></i>
        <div style="font-size:15px; font-weight:700; color:#475569; margin-bottom:6px;">Nothing here yet</div>
        <div style="font-size:13px; line-height:1.5;">When someone follows you, rates you, or the Campally team has news, it shows up here.</div>
      </div>`;
    return;
  }

  listEl.innerHTML = items.map((n) => {
    const st = STYLES[n.type] || STYLES.announcement;
    const isNew = new Date(n.created_at).getTime() > new Date(seen).getTime();
    const href = safeLink(n.link);
    const open = href ? `<a href="${esc(href)}" style="text-decoration:none; color:inherit; display:block;">` : `<div style="display:block;">`;
    const close = href ? "</a>" : "</div>";
    return `
      <div style="background:${isNew ? "#FFFDF5" : "#FFFFFF"}; border:1px solid ${isNew ? "#FDE68A" : "#E5E0D8"}; border-radius:14px; padding:14px; margin-bottom:10px;">
        ${open}
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="flex-shrink:0; width:38px; height:38px; border-radius:50%; background:${st.bg}; color:${st.color}; display:flex; align-items:center; justify-content:center; font-size:16px;">
              <i class="fa-solid ${st.icon}"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:14px; font-weight:700; color:#1E1B4B; line-height:1.4;">${esc(n.title)}${isNew ? ' <span style="background:#DC2626; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; margin-left:4px; vertical-align:middle;">NEW</span>' : ""}</div>
              ${n.body ? `<div style="font-size:13px; color:#4B5563; line-height:1.5; margin-top:3px;">${esc(n.body)}</div>` : ""}
              <div style="font-size:11px; color:#94A3B8; margin-top:6px;">${esc(timeAgo(n.created_at))}</div>
            </div>
          </div>
        ${close}
      </div>`;
  }).join("");
}

async function init() {
  let user = null;
  try {
    const { data } = await supabase.auth.getSession();
    user = data && data.session && data.session.user;
  } catch (_) {}

  if (!user) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:15px; font-weight:700; color:#475569; margin-bottom:12px;">Sign in to see your notifications</div>
        <a href="login.html" style="background:#E8553D; color:#fff; padding:10px 22px; border-radius:22px; font-weight:700; text-decoration:none; font-size:13px;">Sign In</a>
      </div>`;
    return;
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("notifications_seen_at")
    .eq("id", user.id)
    .maybeSingle();
  const seen = (me && me.notifications_seen_at) || new Date(0).toISOString();

  const { data: items, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    listEl.innerHTML = '<p style="text-align:center; color:#B91C1C; font-size:13px; padding:40px 0;">Could not load notifications. Please try again.</p>';
    return;
  }

  render(items || [], seen);

  // Mark everything as read. We use the newest alert's own (server) time, so a wrong phone clock cannot break it.
  if (items && items.length && new Date(items[0].created_at).getTime() > new Date(seen).getTime()) {
    await supabase
      .from("profiles")
      .update({ notifications_seen_at: items[0].created_at })
      .eq("id", user.id);
  }
}

init();
