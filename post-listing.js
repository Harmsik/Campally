const SUPABASE_URL = "https://mhshjusbtrkkkktymiyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categorySelect = document.getElementById("category");
const listingForm = document.getElementById("listing-form");
const imageInput = document.getElementById("listing-image-input");
const imagePreview = document.getElementById("listing-image-preview");

async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("*");
  if (error) return;
  
  data.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

loadCategories();

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    imagePreview.src = URL.createObjectURL(file);
  }
});

listingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    alert("You must be logged in to post a listing.");
    window.location.href = "login.html";
    return;
  }
  
  const title = document.getElementById("title").value;
  const categoryId = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const price = document.getElementById("price").value;
  
  let imageUrl = null;
  const file = imageInput.files[0];
  
  if (file) {
    const filePath = `${userData.user.id}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(filePath, file);
    
    if (uploadError) {
      alert("Image upload failed: " + uploadError.message);
      return;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(filePath);
    
    imageUrl = publicUrlData.publicUrl;
  }
  
  const { error } = await supabase.from("listings").insert({
    title: title,
    category_id: categoryId,
    description: description,
    price: price || null,
    seller_id: userData.user.id,
    image_url: imageUrl
  });
  
  if (error) {
    alert("Failed to post: " + error.message);
  } else {
    alert("Listing posted!");
    window.location.href = "home.html";
  }
});