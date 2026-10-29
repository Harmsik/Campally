/**
 * Campally - Notification bell (home page header)
 * Shows a red number for alerts the student has not opened yet.
 * Visitors who are not logged in never see the bell.
 */
(async function () {
  const link = document.getElementById("bell-link");
  const badge = document.getElementById("bell-count");
  // Uses the Supabase client that home.js creates, so this file must load after home.js
  if (!link || !badge || typeof supabase === "undefined" || !supabase.auth) return;

  try {
    let user = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      user = (sessionData && sessionData.session && sessionData.session.user) || null;
    } catch (_) {}
    if (!user) {
      const { data: userData } = await supabase.auth.getUser();
      user = (userData && userData.user) || null;
    }
    if (!user) return;

    link.style.display = "inline-flex";

    const { data: me } = await supabase
      .from("profiles")
      .select("notifications_seen_at")
      .eq("id", user.id)
      .maybeSingle();
    const seen = (me && me.notifications_seen_at) || new Date(0).toISOString();

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .gt("created_at", seen);

    if (count && count > 0) {
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.style.display = "flex";
    }
  } catch (err) {
    console.error("Bell error:", err);
  }
})();
