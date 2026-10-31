/**
 * Campally - Chat screen (one-to-one messages between students)
 * Open with chat.html?c=<chat id>  or  chat.html?with=<student id>&listing=<item id>
 * The database rules (who can read/send, blocking, spam limits) live in Supabase.
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(location.search);
let convId = params.get("c");
const withId = params.get("with");
let pendingListingId = params.get("listing");

let me = null;
let other = null;
let iBlocked = false;
let sending = false;
let channel = null;
let pollTimer = null;
const known = new Map();        // message id -> message row
const listingCache = new Map(); // listing id -> listing row

const $ = (id) => document.getElementById(id);
const threadEl = $("thread");
const inputEl = $("chat-input");
const sendBtn = $("send-btn");

function toast(msg, type) {
  if (window.showToast) window.showToast(msg, type || "error");
  else alert(msg);
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function dayKey(iso) {
  const d = new Date(iso);
  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}
function dayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  if (dayKey(iso) === dayKey(now.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yest.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function fmtPrice(p) {
  const n = Number(p);
  return isNaN(n) ? "" : "\u20A6" + n.toLocaleString();
}
function waNumber(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d;
}

async function getMe() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) return data.session.user;
  } catch (_) {}
  try {
    const { data } = await supabase.auth.getUser();
    return (data && data.user) || null;
  } catch (_) {}
  return null;
}

function showFatal(text) {
  threadEl.innerHTML = "";
  const d = document.createElement("div");
  d.className = "chat-empty";
  d.textContent = text;
  threadEl.appendChild(d);
  $("compose").style.display = "none";
}

// ---------- Header ----------
function renderHeader() {
  const av = $("who-av");
  av.textContent = initials(other.full_name);
  if (other.avatar_url) {
    const im = document.createElement("img");
    im.alt = "";
    im.onerror = () => im.remove();
    im.src = other.avatar_url;
    av.appendChild(im);
  }
  const nm = $("who-name");
  nm.textContent = (other.full_name || "Campally student").trim();
  if (other.is_verified) {
    const v = document.createElement("i");
    v.className = "fa-solid fa-circle-check";
    v.title = "Verified Student";
    nm.appendChild(v);
  }
  $("who-sub").textContent = (other.department || "").trim();
  $("who-link").href = "seller.html?id=" + encodeURIComponent(other.id);
  if (other.whatsapp_number) {
    const wa = $("wa-btn");
    wa.href = "https://wa.me/" + waNumber(other.whatsapp_number);
    wa.style.display = "flex";
  }
}

// ---------- Messages ----------
async function loadListings(ids) {
  const need = ids.filter((id) => id && !listingCache.has(id));
  if (!need.length) return;
  const { data } = await supabase.from("listings").select("id, title, price, image_url").in("id", need);
  (data || []).forEach((l) => listingCache.set(l.id, l));
}

function messageNode(m, isLastMine) {
  const mine = m.sender_id === me.id;
  const row = document.createElement("div");
  row.className = "msg-row " + (mine ? "mine" : "theirs");
  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const l = m.listing_id && listingCache.get(m.listing_id);
  if (l) {
    const chip = document.createElement("a");
    chip.className = "chat-listing";
    chip.href = "listing.html?id=" + encodeURIComponent(l.id);
    if (l.image_url) {
      const im = document.createElement("img");
      im.alt = "";
      im.src = l.image_url;
      im.onerror = () => im.remove();
      chip.appendChild(im);
    }
    const box = document.createElement("div");
    const t = document.createElement("b");
    t.textContent = l.title || "Item";
    const p = document.createElement("span");
    p.textContent = fmtPrice(l.price);
    box.appendChild(t);
    box.appendChild(p);
    chip.appendChild(box);
    bubble.appendChild(chip);
  }

  const text = document.createElement("span");
  text.textContent = m.body;
  bubble.appendChild(text);

  const meta = document.createElement("span");
  meta.className = "meta";
  let label = fmtTime(m.created_at);
  if (mine && m._tmp) label += " \u2022 Sending...";
  else if (mine && isLastMine) label += m.read_at ? " \u2022 Seen" : " \u2022 Sent";
  meta.textContent = label;
  bubble.appendChild(meta);

  row.appendChild(bubble);
  return row;
}

function renderThread(scrollToEnd) {
  const nearBottom = threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight < 120;
  const list = Array.from(known.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  threadEl.innerHTML = "";

  if (!list.length) {
    const e = document.createElement("div");
    e.className = "chat-empty";
    e.textContent = "Say hello to " + ((other.full_name || "this student").trim().split(" ")[0]) + ". Ask if the item is still available, or agree a safe place to meet.";
    threadEl.appendChild(e);
    return;
  }

  let lastMineId = null;
  list.forEach((m) => { if (m.sender_id === me.id) lastMineId = m.id; });

  let lastDay = null;
  list.forEach((m) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      const sep = document.createElement("div");
      sep.className = "day-sep";
      const s = document.createElement("span");
      s.textContent = dayLabel(m.created_at);
      sep.appendChild(s);
      threadEl.appendChild(sep);
      lastDay = k;
    }
    threadEl.appendChild(messageNode(m, m.id === lastMineId));
  });

  if (scrollToEnd || nearBottom) threadEl.scrollTop = threadEl.scrollHeight;
}

async function syncRecent(forceScroll) {
  if (!convId) return;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return;

  let changed = false;
  let incoming = false;
  data.forEach((row) => {
    const old = known.get(row.id);
    if (!old || old.read_at !== row.read_at) {
      if (!old && row.sender_id !== me.id) incoming = true;
      known.set(row.id, row);
      changed = true;
    }
  });
  if (!changed) return;

  await loadListings(data.map((r) => r.listing_id));
  renderThread(forceScroll || incoming);
  if (incoming && document.visibilityState === "visible") markRead();
}

function handleRealtime(row) {
  if (!row || !row.id) return;
  const old = known.get(row.id);
  if (old && old.read_at === row.read_at) return;
  syncRecent(false);
}

function startLive() {
  if (!convId || channel) return;
  try {
    channel = supabase
      .channel("chat-" + convId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + convId }, (p) => handleRealtime(p.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "conversation_id=eq." + convId }, (p) => handleRealtime(p.new))
      .subscribe();
  } catch (e) { console.error("Realtime unavailable, using refresh instead", e); }
  // Safety net: also check every 6 seconds (covers weak networks)
  if (!pollTimer) pollTimer = setInterval(() => { if (document.visibilityState === "visible") syncRecent(false); }, 6000);
}

function markRead() {
  if (!convId) return;
  supabase.rpc("mark_conversation_read", { p_conversation: convId }).then(() => {}, () => {});
}

// ---------- Sending ----------
function autoGrow() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + "px";
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || sending || iBlocked) return;
  sending = true;
  sendBtn.disabled = true;

  const tmpId = "tmp-" + Date.now();
  known.set(tmpId, { id: tmpId, sender_id: me.id, body: text, created_at: new Date().toISOString(), listing_id: pendingListingId || null, _tmp: true });
  inputEl.value = "";
  autoGrow();
  renderThread(true);

  try {
    if (!convId) {
      const { data, error } = await supabase.rpc("send_direct_message", { p_other: other.id, p_body: text, p_listing: pendingListingId || null });
      if (error) throw error;
      convId = data;
      history.replaceState(null, "", "chat.html?c=" + convId);
      startLive();
    } else {
      const { error } = await supabase.rpc("send_message", { p_conversation: convId, p_body: text, p_listing: pendingListingId || null });
      if (error) throw error;
    }
    pendingListingId = null;
    renderComposeChip();
    known.delete(tmpId);
    await syncRecent(true);
  } catch (err) {
    known.delete(tmpId);
    inputEl.value = text;
    autoGrow();
    renderThread(true);
    toast((err && err.message) || "Message not sent. Please try again.", "error");
  } finally {
    sending = false;
    sendBtn.disabled = false;
  }
}

// ---------- "About this item" chip ----------
function renderComposeChip() {
  const host = $("compose-chip-host");
  host.innerHTML = "";
  const l = pendingListingId && listingCache.get(pendingListingId);
  if (!l) return;
  const chip = document.createElement("div");
  chip.className = "compose-chip";
  if (l.image_url) {
    const im = document.createElement("img");
    im.alt = "";
    im.src = l.image_url;
    im.onerror = () => im.remove();
    chip.appendChild(im);
  }
  const box = document.createElement("div");
  const hint = document.createElement("span");
  hint.style.color = "#777";
  hint.textContent = "About this item";
  const t = document.createElement("b");
  t.textContent = (l.title || "Item") + " \u2022 " + fmtPrice(l.price);
  box.appendChild(hint);
  box.appendChild(t);
  const x = document.createElement("button");
  x.type = "button";
  x.setAttribute("aria-label", "Remove item");
  x.textContent = "\u00d7";
  x.addEventListener("click", () => { pendingListingId = null; renderComposeChip(); });
  chip.appendChild(box);
  chip.appendChild(x);
  host.appendChild(chip);
}

// ---------- Blocking, reporting, menu ----------
function renderComposerState() {
  $("compose").style.display = iBlocked ? "none" : "block";
  const host = $("blocked-host");
  host.style.display = iBlocked ? "block" : "none";
  host.innerHTML = "";
  if (!iBlocked) return;
  const bar = document.createElement("div");
  bar.className = "blocked-bar";
  bar.textContent = "You blocked this student.";
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = "Unblock";
  b.addEventListener("click", unblock);
  bar.appendChild(b);
  host.appendChild(bar);
}

async function block() {
  if (!confirm("Block " + (other.full_name || "this student") + "? They will not be able to message you.")) return;
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: me.id, blocked_id: other.id });
  if (error && error.code !== "23505") { toast("Could not block. Please try again.", "error"); return; }
  iBlocked = true;
  renderComposerState();
  toast("Student blocked.", "success");
}
async function unblock() {
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", me.id).eq("blocked_id", other.id);
  if (error) { toast("Could not unblock. Please try again.", "error"); return; }
  iBlocked = false;
  renderComposerState();
  toast("Student unblocked.", "success");
}
async function report() {
  if (!convId) { toast("Send a message first, then you can report the chat.", "info"); return; }
  const reason = prompt("What went wrong? (a few words, e.g. scam, rude, spam)");
  if (reason === null) return;
  if (reason.trim().length < 3) { toast("Please write at least a few words.", "error"); return; }
  const { error } = await supabase.rpc("report_conversation", { p_conversation: convId, p_reason: reason.trim() });
  if (error) { toast("Could not send the report. Please try again.", "error"); return; }
  toast("Thanks. The Campally team will review this chat.", "success");
}

function openMenu() {
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  const panel = document.createElement("div");
  panel.className = "sheet-panel";
  const close = () => sheet.remove();

  const profile = document.createElement("a");
  profile.href = "seller.html?id=" + encodeURIComponent(other.id);
  profile.innerHTML = '<i class="fa-solid fa-user"></i><span>View profile</span>';
  panel.appendChild(profile);

  const mk = (icon, label, cls, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    if (cls) b.className = cls;
    b.innerHTML = '<i class="fa-solid ' + icon + '"></i><span></span>';
    b.querySelector("span").textContent = label;
    b.addEventListener("click", () => { close(); fn(); });
    panel.appendChild(b);
  };
  mk("fa-flag", "Report this chat", "danger", report);
  mk(iBlocked ? "fa-lock-open" : "fa-ban", iBlocked ? "Unblock student" : "Block student", "danger", iBlocked ? unblock : block);
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.style.justifyContent = "center";
  cancel.style.borderBottom = "none";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", close);
  panel.appendChild(cancel);

  sheet.appendChild(panel);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
  document.body.appendChild(sheet);
}

// ---------- Start ----------
async function init() {
  me = await getMe();
  if (!me) {
    location.href = "login.html?redirect=" + encodeURIComponent("chat.html" + location.search);
    return;
  }

  let otherId = withId;
  if (convId) {
    const { data: conv } = await supabase.from("conversations").select("id, user_a, user_b").eq("id", convId).maybeSingle();
    if (!conv) { showFatal("This chat could not be found."); return; }
    otherId = conv.user_a === me.id ? conv.user_b : conv.user_a;
  } else if (withId) {
    if (withId === me.id) { location.replace("messages.html"); return; }
    const { data } = await supabase.rpc("find_conversation", { p_other: withId });
    if (data) {
      convId = data;
      history.replaceState(null, "", "chat.html?c=" + convId + (pendingListingId ? "&listing=" + encodeURIComponent(pendingListingId) : ""));
    }
  } else {
    location.replace("messages.html");
    return;
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, department, is_verified, whatsapp_number")
    .eq("id", otherId)
    .maybeSingle();
  if (!prof) { showFatal("This student could not be found."); return; }
  other = prof;
  renderHeader();

  const { data: blk } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me.id).eq("blocked_id", other.id).maybeSingle();
  iBlocked = !!blk;

  if (pendingListingId) await loadListings([pendingListingId]);
  if (pendingListingId && !listingCache.has(pendingListingId)) pendingListingId = null;

  if (convId) {
    await syncRecent(true);
    startLive();
    markRead();
  }
  renderThread(true);
  renderComposeChip();
  renderComposerState();

  // Starting from an item page: suggest the first message
  if (pendingListingId && known.size === 0) {
    const l = listingCache.get(pendingListingId);
    inputEl.value = 'Hi, is "' + (l.title || "this item") + '" still available?';
    autoGrow();
  }
}

$("back-btn").addEventListener("click", () => {
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back();
  else location.href = "messages.html";
});
$("menu-btn").addEventListener("click", () => { if (other) openMenu(); });
sendBtn.addEventListener("click", send);
inputEl.addEventListener("input", autoGrow);
inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && convId) { syncRecent(false); markRead(); } });

try { if (sessionStorage.getItem("campally_chat_safety_closed")) $("safety-bar").style.display = "none"; } catch (_) {}
$("safety-close").addEventListener("click", () => {
  $("safety-bar").style.display = "none";
  try { sessionStorage.setItem("campally_chat_safety_closed", "1"); } catch (_) {}
});

init();
