function loadNav(activePage) {
  const pages = [
    { id: "home", href: "home.html", icon: "fa-house", label: "Home" },
    { id: "post", href: "post-listing.html", icon: "fa-square-plus", label: "Post" },
    { id: "listings", href: "my-listings.html", icon: "fa-bag-shopping", label: "Listings" },
    { id: "profile", href: "#", label: "Profile", icon: "fa-user", isProfile: true }
  ];
  
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  
  pages.forEach((page) => {
    const link = document.createElement("a");
    link.href = page.href;
    link.className = "nav-item" + (page.id === activePage ? " active" : "");
    if (page.isProfile) link.id = "profile-nav-link";
    link.innerHTML = `<i class="fa-solid ${page.icon}"></i><span>${page.label}</span>`;
    nav.appendChild(link);
  });
  
  document.body.appendChild(nav);
  
  if (window.supabase) {
    const supabase = window.supabase.createClient(
      "https://mhshjusbtrkkkktymiyg.supabase.co",
      "sb_publishable_0_s-ISa-wqGxAVm7tYeXBg_BgErqzS4"
    );
    supabase.auth.getUser().then(({ data }) => {
      const link = document.getElementById("profile-nav-link");
      if (link && data.user) {
        link.href = "seller.html?id=" + data.user.id;
      }
    });
  }
}
