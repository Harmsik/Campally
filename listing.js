const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const listingId = params.get("id");

async function loadListing() {
  if (!listingId) return;
  
  const { data: item, error } = await supabase
    .from("listings")
    .select("*, profiles(id, full_name, avatar_url, whatsapp_number)")
    .eq("id", listingId)
    .single();
  
  if (error || !item) {
    document.getElementById("detail-title").textContent = "Listing not found";
    return;
  }
  
  if (item.image_url) {
  document.getElementById("detail-image").outerHTML =
    `<img id="detail-image" src="${item.image_url}" style="width:100%; height:220px; object-fit:cover; display:block;">`;
}
  document.getElementById("detail-price").textContent = "₦" + (item.price ?? "N/A");
  document.getElementById("detail-description").textContent = item.description || "No description provided.";
  
  const seller = item.profiles;
  if (seller) {
    document.getElementById("seller-mini-avatar").src = seller.avatar_url || "";
    document.getElementById("seller-mini-name").textContent = seller.full_name || "Unnamed Student";
    document.getElementById("seller-mini-link").href = "seller.html?id=" + seller.id;
    
    if (seller.whatsapp_number) {
      const phone = seller.whatsapp_number.replace(/\D/g, "");
      const message = encodeURIComponent("Hi, I'm interested in your listing: " + item.title);
      document.getElementById("contact-action").innerHTML =
        `<a href="https://wa.me/${phone}?text=${message}" target="_blank" class="whatsapp-btn" style="display:block; text-align:center;">Contact Seller on WhatsApp</a>`;
    }
  }
}

loadListing();

supabase.auth.getUser().then(({ data }) => {
  const link = document.getElementById("profile-nav-link");
  if (link && data.user) {
    link.href = "seller.html?id=" + data.user.id;
  }
});