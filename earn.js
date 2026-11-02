/**
 * Campally - Earn page (affiliate dashboard)
 * Tabs: Promote (find items to share), My earnings (as the affiliate), My items' sales (as the seller).
 */
const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const body = $("ea-body");
let me = null, dash = null, myCode = null, tab = location.hash === "#sales" ? "sales" : "promote";
const DAY = 86400000;

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(n) { return "\u20A6" + Math.round(Number(n || 0)).toLocaleString(); }
function ago(iso) { const d = Math.floor((Date.now() - new Date(iso)) / DAY); return d <= 0 ? "today" : d === 1 ? "1 day ago" : d + " days ago"; }
function older(iso, days) { return iso && Date.now() - new Date(iso).getTime() > days * DAY; }
function toast(m, t) { if (window.UI) UI.toast(m, t || "success", 5000); else alert(m); }

async function call(fn, args, okMsg) {
  const { error } = await supabase.rpc(fn, args);
  if (error) { toast(error.message || "Something went wrong.", "error"); return false; }
  if (okMsg) toast(okMsg, "success");
  await load();
  return true;
}

const PILL = {
  open: ["Waiting", "#FEF3C7", "#92400E"], confirmed: ["Sale confirmed", "#DCFCE7", "#166534"], paid: ["Marked paid", "#DBEAFE", "#1E40AF"],
  settled: ["Paid", "#DCFCE7", "#166534"], denied: ["Not confirmed", "#F3F4F6", "#6B7280"], disputed: ["In review", "#FEE2E2", "#991B1B"], expired: ["Expired", "#F3F4F6", "#6B7280"]
};
function pill(s) { const p = PILL[s] || PILL.open; return '<span class="ea-pill" style="background:' + p[1] + ";color:" + p[2] + ';">' + p[0] + "</span>"; }
function empty(icon, text) { return '<div class="ea-empty"><i class="fa-solid ' + icon + '"></i>' + text + "</div>"; }

// ---------- Promote ----------
async function renderPromote() {
  if (window.UI) UI.skeletonList(body, 3);
  const { data } = await supabase.from("listings")
    .select("id, title, price, image_url, affiliate_percent, seller_id")
    .eq("status", "active").eq("affiliate_enabled", true).neq("seller_id", me.id)
    .order("created_at", { ascending: false }).limit(40);
  if (tab !== "promote") return;
  if (!data || !data.length) { body.innerHTML = empty("fa-hand-holding-dollar", "No items to promote yet.<br>Verified sellers switch on affiliates when they post. Check back soon."); return; }
  body.innerHTML = "";
  data.forEach((it) => {
    const c = Math.round(Number(it.price || 0) * it.affiliate_percent / 100);
    const card = document.createElement("div");
    card.className = "ea-card";
    card.innerHTML = '<div class="ea-row"><div class="ea-img"><i class="fa-solid fa-box"></i>' + (it.image_url ? '<img alt="" src="' + esc(it.image_url) + '" onerror="this.remove()">' : "") + "</div>" +
      '<div style="min-width:0;flex:1;"><div class="ea-title">' + esc(String(it.title).replace(/^\[SWAP\]\s*/i, "")) + '</div><div class="ea-sub">' + money(it.price) + " &bull; " + it.affiliate_percent + '% commission</div><div class="ea-earn">You earn ' + money(c) + "</div></div></div>" +
      '<div class="ea-btns"><button class="ea-btn gold" data-link="' + esc(it.id) + '" data-c="' + c + '">Get my link</button><a class="ea-btn ghost" href="listing.html?id=' + encodeURIComponent(it.id) + '">View item</a></div>';
    body.appendChild(card);
  });
}

// ---------- My earnings (as the affiliate) ----------
function renderMine() {
  const list = dash.as_affiliate || [];
  if (!list.length) { body.innerHTML = empty("fa-link", "No leads yet.<br>Share an item from the Promote tab. A lead appears here when a buyer contacts the seller through your link."); return; }
  body.innerHTML = "";
  list.forEach((l) => {
    let msg = "", btns = "";
    if (l.status === "open") {
      if (!l.flagged_at) { msg = "A buyer contacted " + esc(l.seller) + " through your link. We will ask the buyer in a couple of days."; btns = '<button class="ea-btn ghost" data-act="flag" data-id="' + l.id + '">I think this sold</button>'; }
      else if (l.seller_answer === "no" || older(l.flagged_at, 3)) { msg = "You asked about this sale. No confirmation yet."; btns = '<button class="ea-btn red" data-act="escalate" data-id="' + l.id + '">Send to Campally</button>'; }
      else msg = "You asked the seller and buyer. Waiting for their answers.";
    } else if (l.status === "confirmed") {
      msg = esc(l.seller) + " owes you " + money(l.commission) + ". Message them to get paid.";
      btns = '<a class="ea-btn pri" href="chat.html?with=' + encodeURIComponent(l.seller_id) + '">Message seller</a>' +
        (older(l.confirmed_at, 3) ? '<button class="ea-btn red" data-act="unpaid" data-id="' + l.id + '">Report unpaid</button>' : "") +
        '<button class="ea-btn ok" data-act="received" data-id="' + l.id + '">I received it</button>';
    } else if (l.status === "paid") {
      msg = esc(l.seller) + " says they paid you " + money(l.commission) + ". Confirm when it arrives.";
      btns = '<button class="ea-btn ok" data-act="received" data-id="' + l.id + '">I received it</button>' + (older(l.paid_marked_at, 3) ? '<button class="ea-btn red" data-act="unpaid" data-id="' + l.id + '">Not received</button>' : "");
    } else if (l.status === "settled") msg = "Paid. Well done!";
    else if (l.status === "disputed") msg = "Campally is reviewing this sale and will decide soon.";
    else if (l.status === "denied") msg = "The sale was not confirmed.";
    else msg = "No outcome after 30 days.";
    const c = document.createElement("div");
    c.className = "ea-card";
    c.innerHTML = '<div class="ea-title">' + esc(l.title) + pill(l.status) + '</div><div class="ea-sub">' + money(l.price) + " &bull; " + l.percent + "% &bull; you earn <b>" + money(l.commission) + "</b> &bull; " + ago(l.created_at) + '</div><div class="ea-sub" style="margin-top:6px;">' + msg + "</div>" + (btns ? '<div class="ea-btns">' + btns + "</div>" : "");
    body.appendChild(c);
  });
}

// ---------- My items' sales (as the seller) ----------
function renderSales() {
  const list = dash.as_seller || [];
  if (!list.length) { body.innerHTML = empty("fa-store", "No affiliate sales yet.<br>When you post an item with <b>Let other students promote this</b> switched on, leads show up here."); return; }
  body.innerHTML = "";
  list.forEach((l) => {
    let msg = "", btns = "";
    if (l.status === "open") {
      msg = esc(l.affiliate) + " sent you a buyer for this item. Did it sell?";
      btns = '<button class="ea-btn ok" data-act="s-yes" data-id="' + l.id + '">Yes, it sold</button><button class="ea-btn ghost" data-act="s-no" data-id="' + l.id + '">No</button>';
    } else if (l.status === "confirmed") {
      msg = "Sale confirmed. Pay <b>" + money(l.commission) + "</b> to " + esc(l.affiliate) + " by transfer, then tap the button.";
      btns = '<a class="ea-btn pri" href="chat.html?with=' + encodeURIComponent(l.affiliate_id) + '">Message ' + esc(String(l.affiliate).split(" ")[0]) + '</a><button class="ea-btn ok" data-act="paid" data-id="' + l.id + '">I have paid</button>';
    } else if (l.status === "paid") msg = "You marked this paid. Waiting for " + esc(l.affiliate) + " to confirm.";
    else if (l.status === "settled") msg = "Settled. Thank you for paying on time.";
    else if (l.status === "disputed") msg = "Campally is reviewing this. We may read the recent chat between you and the buyer.";
    else if (l.status === "denied") msg = "Not counted as a sale.";
    else msg = "Expired.";
    const c = document.createElement("div");
    c.className = "ea-card";
    c.innerHTML = '<div class="ea-title">' + esc(l.title) + pill(l.status) + '</div><div class="ea-sub">' + money(l.price) + " &bull; " + l.percent + "% = <b>" + money(l.commission) + "</b> &bull; " + ago(l.created_at) + '</div><div class="ea-sub" style="margin-top:6px;">' + msg + "</div>" + (btns ? '<div class="ea-btns">' + btns + "</div>" : "");
    body.appendChild(c);
  });
}

// ---------- actions ----------
body.addEventListener("click", async (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    link.disabled = true;
    const { data: code } = await supabase.rpc("get_my_affiliate_code");
    link.disabled = false;
    if (!code) { toast("Could not create your link. Please try again.", "error"); return; }
    const url = location.origin + "/listing.html?id=" + encodeURIComponent(link.dataset.link) + "&aff=" + encodeURIComponent(code);
    try { await navigator.clipboard.writeText(url); toast("Link copied! You earn " + money(link.dataset.c) + " if a buyer you send purchases this.", "success"); }
    catch (_) { prompt("Copy your affiliate link:", url); }
    return;
  }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  b.disabled = true;
  if (act === "flag") await call("flag_lead_as_affiliate", { p_lead: id }, "We asked the seller and the buyer.");
  else if (act === "escalate") { if (confirm("Send this sale to Campally for review?")) await call("escalate_lead", { p_lead: id }, "Sent to Campally. We will review it."); else b.disabled = false; }
  else if (act === "unpaid") { if (confirm("Report that you have not been paid? Campally will review the chat.")) await call("report_unpaid_lead", { p_lead: id }, "Reported. Campally will review it."); else b.disabled = false; }
  else if (act === "received") await call("confirm_commission_received", { p_lead: id }, "Great! Marked as paid.");
  else if (act === "s-yes") await call("answer_lead_as_seller", { p_lead: id, p_answer: "yes" }, "Thanks! Please pay the commission now.");
  else if (act === "s-no") await call("answer_lead_as_seller", { p_lead: id, p_answer: "no" }, "Noted.");
  else if (act === "paid") await call("mark_commission_paid", { p_lead: id }, "Marked as paid. The affiliate will confirm.");
});

$("ea-tabs").addEventListener("click", (e) => {
  const b = e.target.closest(".ea-tab");
  if (!b) return;
  tab = b.dataset.tab;
  draw();
});

function draw() {
  document.querySelectorAll(".ea-tab").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
  if (tab === "promote") renderPromote();
  else if (!dash) return;
  else if (tab === "mine") renderMine();
  else renderSales();
}

async function load() {
  const { data, error } = await supabase.rpc("get_affiliate_dashboard");
  if (error || !data) { toast("Could not load your earnings. Please try again.", "error"); return; }
  dash = data;
  $("st-pending").textContent = money(data.pending);
  $("st-owed").textContent = money(data.owed);
  $("st-earned").textContent = money(data.earned);
  // red counters for things that need an answer
  const needMine = (data.as_affiliate || []).filter((l) => ["confirmed", "paid"].includes(l.status)).length;
  const needSales = (data.as_seller || []).filter((l) => ["open", "confirmed"].includes(l.status)).length;
  const nm = $("n-mine"), ns = $("n-sales");
  nm.textContent = needMine; nm.style.display = needMine ? "flex" : "none";
  ns.textContent = needSales; ns.style.display = needSales ? "flex" : "none";
  draw();
}

(async function init() {
  if (window.UI) UI.skeletonList(body, 3);
  try {
    const s = await supabase.auth.getSession();
    me = s.data && s.data.session && s.data.session.user;
    if (!me) { const u = await supabase.auth.getUser(); me = u.data && u.data.user; }
  } catch (_) {}
  if (!me) { location.href = "login.html?redirect=" + encodeURIComponent("earn.html"); return; }
  await load();
})();
