/**
 * Campally - Messages inbox
 * Lists this student's chats (newest first) with unread counts.
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listEl = document.getElementById("inbox-list");
let me = null;
let loading = false;

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function shortTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function emptyState(title, text, showBrowse) {
  listEl.innerHTML = "";
  const box = document.createElement("div");
  box.style.cssText = "text-align:center; padding:60px 20px; color:#94A3B8;";
  box.innerHTML = '<i class="fa-regular fa-comments" style="font-size:42px; margin-bottom:12px; display:block;"></i>';
  const h = document.createElement("div");
  h.style.cssText = "font-size:15px; font-weight:700; color:#475569; margin-bottom:6px;";
  h.textContent = title;
  const p = document.createElement("div");
  p.style.cssText = "font-size:13px; line-height:1.5; margin-bottom:16px;";
  p.textContent = text;
  box.appendChild(h);
  box.appendChild(p);
  if (showBrowse) {
    const a = document.createElement("a");
    a.href = "home.html";
    a.textContent = "Browse the marketplace";
    a.style.cssText = "background:#E8553D; color:#fff; padding:10px 22px; border-radius:22px; font-weight:700; text-decoration:none; font-size:13px; display:inline-block;";
    box.appendChild(a);
  }
  listEl.appendChild(box);
}

function row(c) {
  const a = document.createElement("a");
  a.href = "chat.html?c=" + encodeURIComponent(c.conversation_id);
  a.style.cssText = "display:flex; align-items:center; gap:12px; padding:12px 10px; background:#fff; border:1px solid #EEE7DD; border-radius:14px; margin-bottom:8px; text-decoration:none; color:inherit;" + (c.i_blocked ? " opacity:.55;" : "");

  const av = document.createElement("div");
  av.style.cssText = "width:48px; height:48px; border-radius:50%; overflow:hidden; background:#FDE8E3; color:#E8553D; display:flex; align-items:center; justify-content:center; font-weight:800; flex-shrink:0;";
  av.textContent = initials(c.other_name);
  if (c.other_avatar) {
    const im = document.createElement("img");
    im.alt = "";
    im.style.cssText = "width:100%; height:100%; object-fit:cover;";
    im.onerror = () => im.remove();
    im.src = c.other_avatar;
    av.appendChild(im);
  }
  a.appendChild(av);

  const mid = document.createElement("div");
  mid.style.cssText = "flex:1; min-width:0;";
  const name = document.createElement("div");
  name.style.cssText = "font-size:14px; font-weight:800; color:#1E1B4B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
  name.textContent = (c.other_name || "Campally student").trim();
  if (c.other_verified) {
    const v = document.createElement("i");
    v.className = "fa-solid fa-circle-check";
    v.style.cssText = "color:#059669; font-size:12px; margin-left:4px;";
    name.appendChild(v);
  }
  const prev = document.createElement("div");
  const unread = c.unread_count > 0;
  prev.style.cssText = "font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; color:" + (unread ? "#1E1B4B" : "#777") + "; font-weight:" + (unread ? "700" : "400") + ";";
  if (c.i_blocked) prev.textContent = "Blocked";
  else prev.textContent = (c.last_sender_id === me.id ? "You: " : "") + (c.last_message_preview || "Say hello");
  mid.appendChild(name);
  mid.appendChild(prev);
  a.appendChild(mid);

  const right = document.createElement("div");
  right.style.cssText = "display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;";
  const t = document.createElement("span");
  t.style.cssText = "font-size:11px; color:" + (unread ? "#E8553D" : "#94A3B8") + ";";
  t.textContent = shortTime(c.last_message_at);
  right.appendChild(t);
  if (unread && !c.i_blocked) {
    const b = document.createElement("span");
    b.style.cssText = "background:#E8553D; color:#fff; font-size:11px; font-weight:800; min-width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; padding:0 6px; box-sizing:border-box;";
    b.textContent = c.unread_count > 99 ? "99+" : String(c.unread_count);
    right.appendChild(b);
  }
  a.appendChild(right);
  return a;
}

async function loadInbox() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase.rpc("get_inbox");
    if (error) { emptyState("Could not load messages", "Please check your connection and try again.", false); return; }
    // Only chats that actually have a message in them
    const chats = (data || []).filter((c) => c.last_message_preview);
    if (!chats.length) {
      emptyState("No messages yet", "Open an item you like and tap Message to start a chat with the seller.", true);
      return;
    }
    listEl.innerHTML = "";
    chats.forEach((c) => listEl.appendChild(row(c)));
  } finally {
    loading = false;
  }
}

async function init() {
  try {
    const { data } = await supabase.auth.getSession();
    me = data && data.session && data.session.user;
    if (!me) { const u = await supabase.auth.getUser(); me = u.data && u.data.user; }
  } catch (_) {}

  if (!me) {
    listEl.innerHTML = "";
    const box = document.createElement("div");
    box.style.cssText = "text-align:center; padding:60px 20px;";
    box.innerHTML = '<div style="font-size:15px; font-weight:700; color:#475569; margin-bottom:12px;">Sign in to see your messages</div>' +
      '<a href="login.html?redirect=messages.html" style="background:#E8553D; color:#fff; padding:10px 22px; border-radius:22px; font-weight:700; text-decoration:none; font-size:13px;">Sign In</a>';
    listEl.appendChild(box);
    return;
  }

  await loadInbox();

  // New message arrives: refresh the list
  try {
    supabase.channel("inbox-" + me.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadInbox())
      .subscribe();
  } catch (_) {}
  setInterval(() => { if (document.visibilityState === "visible") loadInbox(); }, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadInbox(); });
}

init();
