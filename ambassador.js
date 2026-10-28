// Campus Ambassador Portal - runs on Supabase (no separate server needed)
(function () {
  const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const BUCKET = "ambassador-proofs";
  const MIN_PAYOUT = 1500;
  const $ = (id) => document.getElementById(id);
  const money = (n) => "₦" + Number(n || 0).toLocaleString();

  let session = null;
  let proofFile = null;
  let current = null;

  // Turns < > & and quotes into plain text so typed text can never run as code.
  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type || "info");
    else alert(msg);
  }

  // Shows exactly one of the ambassador cards.
  const STATES = ["amb-login-card", "amb-register-card", "amb-pending-card", "amb-rejected-card", "amb-active-dashboard"];
  function showState(id) {
    STATES.forEach((s) => { $(s).style.display = s === id ? "block" : "none"; });
  }

  // ---------- Proof viewing (private files, opened with a short-lived link) ----------
  async function openProof(path, title, note, bucket) {
    if (!path) { toast("No proof file found.", "warning"); return; }
    const { data, error } = await sb.storage.from(bucket || BUCKET).createSignedUrl(path, 600);
    if (error || !data || !data.signedUrl) { toast("Could not open the proof file.", "error"); return; }

    if (path.toLowerCase().endsWith(".pdf")) {
      const w = window.open(data.signedUrl, "_blank", "noopener");
      if (!w) window.location.href = data.signedUrl;
      return;
    }
    $("proof-zoom-img").src = data.signedUrl;
    $("proof-zoom-title").textContent = title || "Eligibility Proof";
    $("proof-zoom-note").textContent = note ? 'Note: "' + note + '"' : "";
    $("proof-zoom-modal").style.display = "flex";
  }

  // ---------- Loading my ambassador record ----------
  async function loadMine() {
    const { data, error } = await sb.rpc("get_my_ambassador");
    if (error) { toast("Could not load your ambassador info.", "error"); return; }
    current = data;

    if (!data) { showState("amb-register-card"); return; }
    if (data.status === "approved") renderActive(data);
    else if (data.status === "rejected") renderRejected(data);
    else renderPending(data);
  }

  function renderPending(a) {
    showState("amb-pending-card");
    $("pending-amb-name").textContent = a.name;
    $("pending-amb-campus").textContent = a.campus_name || "Campus";
    $("pending-amb-code").textContent = a.code;

    let quals = "<div style='font-weight:700; color:#1E1B4B; margin-bottom:6px;'>Your submitted qualifications:</div>";
    if (a.is_course_rep) quals += "<div>🎓 <strong>School position:</strong> " + esc(a.school_position_title || "Student leader") + "</div>";
    if (a.has_social_3k) quals += "<div>📱 <strong>Social media:</strong> " + esc(a.social_platform) + " " + esc(a.social_handle) + " (" + esc(a.social_followers_count || "3k+") + ")</div>";
    quals += "<div>⚡ <strong>Campus activity:</strong> <span style='color:#059669; font-weight:700;'>Pledge confirmed</span></div>";
    $("pending-quals").innerHTML = quals;

    $("pending-proof-btn").onclick = () => openProof(a.proof_path, "My Eligibility Proof", a.proof_note);
    $("pending-recheck-btn").onclick = async () => {
      const btn = $("pending-recheck-btn");
      btn.disabled = true;
      await loadMine();
      btn.disabled = false;
    };
  }

  function renderRejected(a) {
    showState("amb-rejected-card");
    $("rejected-reason-text").textContent = a.review_notes || "Please upload clearer proof of your position or 3k+ followers.";
    $("reapply-amb-btn").onclick = () => {
      showState("amb-register-card");
      $("reg-amb-name").value = a.name || "";
      $("reg-amb-email").value = a.email || "";
      $("reg-amb-phone").value = a.phone || "";
      $("reg-amb-dept").value = a.dept || "";
      if (a.campus_id) $("reg-amb-campus").value = a.campus_id;
    };
  }

  function renderActive(a) {
    showState("amb-active-dashboard");
    $("dash-amb-name").textContent = a.name;
    $("dash-amb-campus").textContent = "🏫 " + (a.campus_name || "Campus Ambassador");
    $("dash-amb-code").textContent = a.code;

    $("stat-referrals-count").textContent = a.referrals_count || 0;
    $("stat-total-earned").textContent = money(a.total_earned);
    $("stat-paid-out").textContent = money(a.paid_out);
    $("stat-available").textContent = money(a.available);

    // Referral link
    const refUrl = window.location.origin + "/signup.html?ref=" + encodeURIComponent(a.code);
    $("display-referral-link").textContent = refUrl;

    $("copy-ref-link-btn").onclick = () => {
      navigator.clipboard.writeText(refUrl)
        .then(() => toast("Referral link copied! 📋", "success"))
        .catch(() => window.prompt("Copy your referral link:", refUrl));
    };

    const waText =
      "Hey guys! 🎓 Check out *Campally* — our university student marketplace!\n\n" +
      "Buy & sell textbooks, past questions, electronics, chargers, lodge items, and services safely on campus.\n\n" +
      "Sign up in 30 seconds here:\n👉 " + refUrl;
    $("share-ref-whatsapp-btn").href = "https://wa.me/?text=" + encodeURIComponent(waText);

    $("amb-open-flyers-btn").href =
      "flyers.html?ref=" + encodeURIComponent(a.code) + "&campus=" + encodeURIComponent(a.campus_name || "");

    // Referral list
    const refs = a.referrals || [];
    $("referral-list").innerHTML = refs.length
      ? refs.map((r) =>
          '<div class="referral-item"><span>🎓 ' + esc(r.first_name) + '</span><span style="color:#64748B; font-size:12px;">' +
          new Date(r.joined).toLocaleDateString() + "</span></div>").join("")
      : '<p style="font-size:12px; color:#94A3B8; text-align:center; padding:10px 0;">No signups yet. Share your link to get started!</p>';

    // Payout section
    const available = a.available || 0;
    const payBtn = $("payout-btn");
    if (a.pending_payout > 0) {
      $("payout-note").textContent = money(a.pending_payout) + " is already requested and waiting for the Founder to pay.";
    } else {
      $("payout-note").textContent = "You can withdraw " + money(available) + ". Minimum payout is " + money(MIN_PAYOUT) + " (10 signups).";
    }
    payBtn.disabled = available < MIN_PAYOUT;
    payBtn.style.opacity = available < MIN_PAYOUT ? "0.5" : "1";

    const pays = a.payouts || [];
    $("payout-history").innerHTML = pays.length
      ? '<div style="font-size:12px; font-weight:700; color:#1E1B4B; margin-bottom:6px;">Payout history</div>' +
        pays.map((p) =>
          '<div class="referral-item"><span>' + money(p.amount) + '</span><span style="font-size:12px; font-weight:700; color:' +
          (p.status === "paid" ? "#059669" : "#D97706") + ';">' + (p.status === "paid" ? "Paid ✓" : "Waiting") + "</span></div>").join("")
      : "";
  }

  // ---------- Apply form ----------
  function initCampusSelect() {
    const select = $("reg-amb-campus");
    const campuses = window.NIGERIAN_CAMPUSES || [];
    select.innerHTML = '<option value="">Select your campus</option>';
    campuses.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = "🏫 " + c.name;
      select.appendChild(opt);
    });
  }

  function initFormListeners() {
    $("reg-cond-course-rep").addEventListener("change", (e) => {
      $("reg-course-rep-box").style.display = e.target.checked ? "block" : "none";
    });
    $("reg-cond-social").addEventListener("change", (e) => {
      $("reg-social-box").style.display = e.target.checked ? "flex" : "none";
    });

    $("reg-proof-file").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast("Proof file is too large (max 5MB).", "error");
        e.target.value = "";
        proofFile = null;
        return;
      }
      const okType = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!okType) {
        toast("Please upload an image or a PDF.", "error");
        e.target.value = "";
        proofFile = null;
        return;
      }
      proofFile = file;
      $("reg-proof-name").textContent = "✓ " + file.name;
      const img = $("reg-proof-preview-img");
      if (file.type.startsWith("image/")) {
        img.src = URL.createObjectURL(file);
        img.style.display = "inline-block";
      } else {
        img.style.display = "none";
      }
      $("reg-proof-preview-box").style.display = "block";
    });

    $("amb-register-form").addEventListener("submit", submitApplication);
    $("payout-form").addEventListener("submit", submitPayout);

    $("close-proof-zoom-btn").addEventListener("click", () => { $("proof-zoom-modal").style.display = "none"; });
    $("tab-ambassador-btn").addEventListener("click", () => switchTab("ambassador"));
    $("tab-founder-btn").addEventListener("click", () => switchTab("founder"));
    $("founder-view-section").addEventListener("click", onFounderClick);
  }

  async function submitApplication(e) {
    e.preventDefault();
    if (!session) { toast("Please sign in first.", "warning"); return; }

    const campusSelect = $("reg-amb-campus");
    const isCourseRep = $("reg-cond-course-rep").checked;
    const hasSocial = $("reg-cond-social").checked;

    if (!campusSelect.value) { toast("Please select your campus.", "error"); return; }
    if (!isCourseRep && !hasSocial) { toast("Please tick at least one condition.", "error"); return; }
    if (!proofFile) { toast("Please upload proof of qualification.", "error"); return; }

    const btn = $("submit-amb-register-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    const resetBtn = () => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application for Founder Approval';
    };

    // 1) Upload the proof file to private storage (inside this user's own folder)
    const ext = (proofFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = session.user.id + "/" + Date.now() + "-proof." + ext;
    const up = await sb.storage.from(BUCKET).upload(path, proofFile, { contentType: proofFile.type });
    if (up.error) {
      toast("Could not upload your proof: " + up.error.message, "error");
      resetBtn();
      return;
    }

    // 2) Save the application
    const campusName = campusSelect.options[campusSelect.selectedIndex].text.replace(/^🏫\s*/, "");
    const payload = {
      name: $("reg-amb-name").value.trim(),
      email: $("reg-amb-email").value.trim(),
      phone: $("reg-amb-phone").value.trim(),
      campus_id: campusSelect.value,
      campus_name: campusName,
      dept: $("reg-amb-dept").value.trim(),
      is_course_rep: isCourseRep,
      school_position_title: $("reg-school-pos").value.trim(),
      has_social_3k: hasSocial,
      social_platform: $("reg-social-platform").value,
      social_handle: $("reg-social-handle").value.trim(),
      social_followers_count: $("reg-social-followers").value.trim(),
      is_active_campus_pledge: $("reg-cond-active").checked,
      proof_path: path,
      proof_note: $("reg-proof-note").value.trim()
    };

    const { error } = await sb.rpc("apply_ambassador", { p: payload });
    if (error) {
      toast(error.message || "Could not submit application.", "error");
      resetBtn();
      return;
    }

    toast("Application submitted! The Founder will review your proof.", "success");
    resetBtn();
    proofFile = null;
    await loadMine();
  }

  async function submitPayout(e) {
    e.preventDefault();
    const btn = $("payout-btn");
    btn.disabled = true;
    const { error } = await sb.rpc("request_payout", {
      p_bank: $("payout-bank").value.trim(),
      p_number: $("payout-number").value.trim(),
      p_name: $("payout-name").value.trim()
    });
    if (error) {
      toast(error.message || "Could not request payout.", "error");
      btn.disabled = false;
      return;
    }
    toast("Payout requested! The Founder will transfer it soon. 💸", "success");
    $("payout-form").reset();
    await loadMine();
  }

  // ---------- Founder hub (the server checks you are really the founder) ----------
  function switchTab(which) {
    const isFounder = which === "founder";
    $("tab-founder-btn").classList.toggle("active", isFounder);
    $("tab-ambassador-btn").classList.toggle("active", !isFounder);
    $("ambassador-view-section").style.display = isFounder ? "none" : "block";
    $("founder-view-section").style.display = isFounder ? "block" : "none";
    if (isFounder) loadFounder();
  }

  async function loadFounder() {
    const { data, error } = await sb.rpc("admin_overview");
    if (error || !data) { toast("Could not load the founder hub.", "error"); return; }
    renderPendingApps(data.pending || []);
    renderPayouts(data.payouts || []);
    renderApproved(data.approved || []);
    loadVerifications();
  }

  async function loadVerifications() {
    const el = $("adm-verif-list");
    if (!el) return;
    const { data, error } = await sb.rpc("admin_list_verifications");
    if (error) { el.innerHTML = '<p style="text-align:center; color:#B91C1C; font-size:12px; padding:14px 0;">Could not load verifications.</p>'; return; }
    const list = data || [];
    if (!list.length) {
      el.innerHTML = '<p style="text-align:center; color:#94A3B8; font-size:12px; padding:14px 0;">No student IDs waiting. 🎉</p>';
      return;
    }
    el.innerHTML = list.map((v) =>
      '<div style="background:#FFFDF5; border:1px solid #FDE68A; border-radius:14px; padding:14px; margin-bottom:12px; font-size:12px; color:#334155; line-height:1.6;">' +
        '<div style="font-size:14px; font-weight:800; color:#1E1B4B;">' + esc(v.name || "Unnamed") + "</div>" +
        "<div>📚 " + esc(v.department || "No department") + "</div>" +
        "<div>🎫 Matric: <strong>" + esc(v.matric_number) + "</strong></div>" +
        (v.school_email ? "<div>📧 " + esc(v.school_email) + "</div>" : "") +
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
          '<button class="small-btn" style="background:#F8FAFC; border:1px solid #CBD5E1; color:#1E293B;" data-action="vproof" data-path="' + esc(v.id_card_path) + '" data-title="' + esc("ID: " + (v.name || "")) + '" data-note="' + esc("Matric: " + v.matric_number) + '">View ID</button>' +
          '<button class="small-btn" style="background:#059669; color:#fff;" data-action="vapprove" data-id="' + esc(v.user_id) + '">Approve</button>' +
          '<button class="small-btn" style="background:#FEE2E2; color:#991B1B;" data-action="vreject" data-id="' + esc(v.user_id) + '">Reject</button>' +
        "</div></div>"
    ).join("");
  }

  function renderPendingApps(list) {
    const el = $("adm-pending-list");
    if (!list.length) {
      el.innerHTML = '<p style="text-align:center; color:#94A3B8; font-size:12px; padding:14px 0;">No applications waiting. 🎉</p>';
      return;
    }
    el.innerHTML = list.map((a) => {
      let quals = "";
      if (a.is_course_rep) quals += "<div>🎓 " + esc(a.school_position_title || "Student leader") + "</div>";
      if (a.has_social_3k) quals += "<div>📱 " + esc(a.social_platform) + " " + esc(a.social_handle) + " (" + esc(a.social_followers_count) + ")</div>";
      return (
        '<div style="background:#FFFDF5; border:1px solid #FDE68A; border-radius:14px; padding:14px; margin-bottom:12px; font-size:12px; color:#334155; line-height:1.6;">' +
          '<div style="font-size:14px; font-weight:800; color:#1E1B4B;">' + esc(a.name) + "</div>" +
          "<div>🏫 " + esc(a.campus_name) + " • " + esc(a.dept || "") + "</div>" +
          "<div>📞 " + esc(a.phone) + " • 📧 " + esc(a.email) + "</div>" +
          quals +
          (a.proof_note ? '<div style="color:#64748B;">Note: ' + esc(a.proof_note) + "</div>" : "") +
          '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
            '<button class="small-btn" style="background:#F8FAFC; border:1px solid #CBD5E1; color:#1E293B;" data-action="proof" data-path="' + esc(a.proof_path) + '" data-title="' + esc("Proof: " + a.name) + '" data-note="' + esc(a.proof_note || "") + '">View Proof</button>' +
            '<button class="small-btn" style="background:#059669; color:#fff;" data-action="approve" data-id="' + esc(a.id) + '">Approve</button>' +
            '<button class="small-btn" style="background:#FEE2E2; color:#991B1B;" data-action="reject" data-id="' + esc(a.id) + '">Reject</button>' +
          "</div></div>"
      );
    }).join("");
  }

  function renderPayouts(list) {
    const el = $("adm-payouts-queue");
    if (!list.length) {
      el.innerHTML = '<p style="text-align:center; color:#94A3B8; font-size:12px; padding:14px 0;">No pending payout requests.</p>';
      return;
    }
    el.innerHTML = list.map((p) =>
      '<div style="background:#FFFDF5; border:1px solid #FDE68A; border-radius:14px; padding:14px; margin-bottom:12px; font-size:12px; color:#334155; line-height:1.6;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:14px; font-weight:800; color:#1E1B4B;">' + esc(p.ambassador_name) + ' <span style="font-size:11px; color:#64748B; font-weight:400;">(' + esc(p.campus_name) + ")</span></span>" +
          '<span style="font-size:16px; font-weight:800; color:#DC2626;">' + money(p.amount) + "</span></div>" +
        "<div><strong>Bank:</strong> " + esc(p.bank_name) + "</div>" +
        "<div><strong>Account number:</strong> <code style='font-weight:700;'>" + esc(p.account_number) + "</code></div>" +
        "<div><strong>Account name:</strong> " + esc(p.account_name) + "</div>" +
        "<div><strong>WhatsApp:</strong> " + esc(p.ambassador_phone || "N/A") + "</div>" +
        '<div style="text-align:right; margin-top:8px;"><button class="small-btn" style="background:#059669; color:#fff;" data-action="paid" data-id="' + esc(p.id) + '">Mark as Paid (Transfer Sent)</button></div>' +
      "</div>").join("");
  }

  function renderApproved(list) {
    const el = $("adm-ambassadors-list");
    if (!list.length) {
      el.innerHTML = '<p style="text-align:center; color:#94A3B8; font-size:12px; padding:14px 0;">No approved ambassadors yet.</p>';
      return;
    }
    el.innerHTML = list.map((a) =>
      '<div style="background:#FAF9F6; border:1px solid #EFECE6; border-radius:12px; padding:12px; margin-bottom:10px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:13px; font-weight:700; color:#1E1B4B;">' + esc(a.name) + "</span>" +
          '<span style="font-family:monospace; font-size:11px; background:#EEF2FF; color:#4F46E5; padding:2px 8px; border-radius:6px; font-weight:700;">' + esc(a.code) + "</span></div>" +
        '<div style="font-size:11px; color:#64748B; margin:4px 0 6px 0;">🏫 ' + esc(a.campus_name) + " • 📞 " + esc(a.phone) + "</div>" +
        '<div style="display:flex; gap:14px; flex-wrap:wrap; font-size:11px; font-weight:600; color:#334155; border-top:1px solid #EFECE6; padding-top:6px;">' +
          "<span>👥 Referrals: <strong>" + (a.referrals_count || 0) + "</strong></span>" +
          "<span>💰 Earned: <strong>" + money(a.total_earned) + "</strong></span>" +
          "<span>🏦 Paid: <strong>" + money(a.paid_out) + "</strong></span>" +
        "</div></div>").join("");
  }

  async function onFounderClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "proof") { openProof(btn.dataset.path, btn.dataset.title, btn.dataset.note); return; }
    if (action === "vproof") { openProof(btn.dataset.path, btn.dataset.title, btn.dataset.note, "student-ids"); return; }

    btn.disabled = true;
    let result;

    if (action === "approve") {
      if (!confirm("Approve this ambassador?")) { btn.disabled = false; return; }
      result = await sb.rpc("admin_review_ambassador", { p_id: id, p_approve: true, p_notes: null });
    } else if (action === "reject") {
      const reason = prompt("Reason for rejecting (the student will see this):", "Please upload clearer proof.");
      if (reason === null) { btn.disabled = false; return; }
      result = await sb.rpc("admin_review_ambassador", { p_id: id, p_approve: false, p_notes: reason });
    } else if (action === "vapprove") {
      if (!confirm("Approve this student as verified? Check that the name and matric number match the ID photo.")) { btn.disabled = false; return; }
      result = await sb.rpc("admin_review_verification", { p_user: id, p_approve: true, p_note: null });
    } else if (action === "vreject") {
      const why = prompt("Reason for rejecting (the student will see this):", "Please upload a clearer photo of your ID card.");
      if (why === null) { btn.disabled = false; return; }
      result = await sb.rpc("admin_review_verification", { p_user: id, p_approve: false, p_note: why });
    } else if (action === "paid") {
      if (!confirm("Confirm you have sent this transfer from your bank or OPay app?")) { btn.disabled = false; return; }
      const ref = prompt("Transfer reference (optional):", "") || null;
      result = await sb.rpc("admin_complete_payout", { p_id: id, p_ref: ref });
    }

    if (result && result.error) {
      toast(result.error.message || "That did not work.", "error");
      btn.disabled = false;
      return;
    }
    toast("Done ✓", "success");
    loadFounder();
  }

  // ---------- Start ----------
  async function init() {
    initCampusSelect();
    initFormListeners();

    const { data } = await sb.auth.getSession();
    session = data.session;

    $("loading-card").style.display = "none";
    $("ambassador-view-section").style.display = "block";

    if (!session) { showState("amb-login-card"); return; }

    $("reg-amb-email").value = session.user.email || "";

    const adm = await sb.rpc("is_admin");
    if (adm.data === true) $("founder-tabs").style.display = "flex";

    await loadMine();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
