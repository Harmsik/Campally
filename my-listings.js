const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const container = document.getElementById("my-listings");

async function loadMyListings() {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return;
  }
  
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", userData.user.id);
  
  if (error) {
    container.innerHTML = "<p>Error loading your listings.</p>";
    return;
  }
  
  if (data.length === 0) {
    container.innerHTML = "<p id='loading-text'>You haven't posted anything yet.</p>";
    return;
  }
  
  container.innerHTML = "";
  
  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "listing-card";
    card.innerHTML = `
      <div class="listing-image">No image</div>
      <div class="listing-info">
        <div class="listing-title">${item.title}</div>
        <div class="listing-price">₦${item.price ?? "N/A"}</div>
        <button class="delete-btn" data-id="${item.id}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirmed = confirm("Delete this listing?");
      if (!confirmed) return;
      
      const { error } = await supabase.from("listings").delete().eq("id", id);
      
      if (error) {
        alert("Failed to delete: " + error.message);
      } else {
        loadMyListings();
      }
    });
  });
}

loadMyListings();
supabase.auth.getUser().then(({ data }) => {
  const link = document.getElementById("profile-nav-link");
  if (link && data.user) {
    link.href = "seller.html?id=" + data.user.id;
  }
});