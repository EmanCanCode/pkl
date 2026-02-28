/**
 * PKL.CLUB Header Auth Script
 * Handles user authentication state in the header/navbar
 * Controls navigation visibility based on userType
 */

(function () {
  "use strict";

  // Page access rules by userType
  const pageAccessRules = {
    player: {
      allowed: [
        "index.html",
        "world-series.html",
        "players.html",
        "pkl-club.html",
        "news.html",
        "shop-products.html",
        "shop-products-sidebar.html",
        "shop-product-details.html",
        "shop-cart.html",
        "shop-checkout.html",
        "profile.html",
        "page-contact.html",
        "page-faq.html",
        "page-about.html",
        "page-pricing.html",
        "login.html",
        "signup.html",
      ],
      blocked: ["operators.html", "sponsors.html"],
      hiddenNavItems: ["Operators", "Sponsors"],
    },
    operator: {
      allowed: [
        "index.html",
        "world-series.html",
        "operators.html",
        "pkl-club.html",
        "news.html",
        "shop-products.html",
        "shop-products-sidebar.html",
        "shop-product-details.html",
        "shop-cart.html",
        "shop-checkout.html",
        "profile.html",
        "page-contact.html",
        "page-faq.html",
        "page-about.html",
        "page-pricing.html",
        "login.html",
        "signup.html",
      ],
      blocked: ["players.html", "sponsors.html"],
      hiddenNavItems: ["Players", "Sponsors"],
    },
    sponsor: {
      allowed: [
        "index.html",
        "world-series.html",
        "sponsors.html",
        "pkl-club.html",
        "news.html",
        "shop-products.html",
        "shop-products-sidebar.html",
        "shop-product-details.html",
        "shop-cart.html",
        "shop-checkout.html",
        "profile.html",
        "page-contact.html",
        "page-faq.html",
        "page-about.html",
        "page-pricing.html",
        "login.html",
        "signup.html",
      ],
      blocked: ["players.html", "operators.html"],
      hiddenNavItems: ["Players", "Operators"],
    },
    admin: {
      allowed: [], // Admin can access everything
      blocked: [],
      hiddenNavItems: [],
    },
  };

  // Check if user is logged in
  function checkAuth() {
    const token = localStorage.getItem("pkl_token");
    const userStr = localStorage.getItem("pkl_user");

    console.log("[PKL Auth] Token:", token ? "exists" : "none");
    console.log("[PKL Auth] User string:", userStr);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log("[PKL Auth] Parsed user:", user);
        return user;
      } catch (e) {
        console.error("[PKL Auth] Error parsing user data:", e);
        return null;
      }
    }
    return null;
  }

  // Get current page name
  function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf("/") + 1) || "index.html";
    return page;
  }

  // Check if user can access current page
  function checkPageAccess(user) {
    if (!user || !user.userType) return true; // Not logged in, allow access

    const currentPage = getCurrentPage();
    const rules = pageAccessRules[user.userType];

    if (!rules) return true; // Unknown userType, allow access

    // Admin can access everything
    if (user.userType === "admin") return true;

    // Check if page is blocked
    if (rules.blocked.includes(currentPage)) {
      return false;
    }

    return true;
  }

  // Redirect if not allowed on page
  function enforcePageAccess() {
    const user = checkAuth();
    if (user && !checkPageAccess(user)) {
      // Redirect to appropriate page based on userType
      alert("You don't have access to this page. Redirecting to Pathway Series.");
      window.location.href = "world-series.html";
    }
  }

  // Hide nav items based on userType
  function filterNavItems(user) {
    if (!user || !user.userType) {
      console.log("[PKL Auth] No user or userType, showing all nav items");
      return; // Not logged in, show all
    }

    const rules = pageAccessRules[user.userType];
    if (!rules || rules.hiddenNavItems.length === 0) {
      console.log(
        "[PKL Auth] No rules or no hidden items for userType:",
        user.userType,
      );
      return;
    }

    console.log(
      "[PKL Auth] Hiding nav items for",
      user.userType,
      ":",
      rules.hiddenNavItems,
    );

    // Find all navigation links in both main and sticky headers
    const allNavLinks = document.querySelectorAll(
      ".navigation > li > a, .main-menu .navigation li > a",
    );
    console.log("[PKL Auth] Found nav links:", allNavLinks.length);

    allNavLinks.forEach((link) => {
      const linkText = link.textContent.trim();
      if (rules.hiddenNavItems.includes(linkText)) {
        // Hide the parent li element
        console.log("[PKL Auth] Hiding:", linkText);
        link.parentElement.style.display = "none";
      }
    });

    // Also handle mobile menu
    const mobileNavs = document.querySelectorAll(".mobile-menu .navigation");
    mobileNavs.forEach((nav) => {
      const navLinks = nav.querySelectorAll("li > a");
      navLinks.forEach((link) => {
        const linkText = link.textContent.trim();
        if (rules.hiddenNavItems.includes(linkText)) {
          link.parentElement.style.display = "none";
        }
      });
    });
  }

  // Update header buttons based on auth state
  function updateHeaderAuth() {
    const user = checkAuth();

    console.log("[PKL Auth] Updating header auth, user:", user);

    // Update ALL header buttons (main header, sticky header, mobile menu)
    const headerBtns = document.querySelectorAll(
      ".header-btn .header-btn-main, .header-btn a.theme-btn",
    );
    console.log("[PKL Auth] Found header buttons:", headerBtns.length);

    headerBtns.forEach((btn, index) => {
      console.log("[PKL Auth] Processing button", index, btn);
      const btnText = btn.querySelector(".btn-text");
      console.log("[PKL Auth] Button text element:", btnText);

      if (btnText) {
        if (user) {
          // User is logged in - show their name with dropdown
          const firstName = user.firstName || user.username || "User";
          console.log("[PKL Auth] Setting button text to:", firstName);
          btnText.textContent = firstName;
          btn.href = "#";
          btn.classList.add("user-logged-in");

          // Remove any inline onclick handlers (e.g., from dashboard pages)
          btn.removeAttribute("onclick");

          // Create dropdown menu if not exists
          if (!btn.parentElement.querySelector(".user-dropdown")) {
            const dropdown = document.createElement("div");
            dropdown.className = "user-dropdown";

            // Determine dashboard link based on userType
            let dashboardLink = "";
            if (user.userType === "player") {
              dashboardLink = `
                <a href="player-dashboard.html" class="dropdown-item">
                  <i class="fa fa-tachometer-alt"></i> Dashboard
                </a>
              `;
            } else if (user.userType === "operator") {
              dashboardLink = `
                <a href="operator-dashboard.html" class="dropdown-item">
                  <i class="fa fa-tachometer-alt"></i> Dashboard
                </a>
              `;
            } else if (user.userType === "admin") {
              dashboardLink = `
                <a href="admin-dashboard.html" class="dropdown-item">
                  <i class="fa fa-tachometer-alt"></i> Admin Dashboard
                </a>
              `;
            } else if (user.userType === "sponsor") {
              dashboardLink = `
                <a href="sponsor-dashboard.html" class="dropdown-item">
                  <i class="fa fa-tachometer-alt"></i> Dashboard
                </a>
              `;
            }

            // Build dropdown items based on userType
            let dropdownHTML =
              dashboardLink +
              `
              <a href="world-series.html" class="dropdown-item">
                <i class="fa fa-trophy"></i> Pathway Series
              </a>
            `;

            // Add userType specific links
            if (user.userType === "player") {
              dropdownHTML += `
                <a href="players.html" class="dropdown-item">
                  <i class="fa fa-users"></i> Players Hub
                </a>
              `;
            } else if (user.userType === "operator") {
              dropdownHTML += `
                <a href="operators.html" class="dropdown-item">
                  <i class="fa fa-cogs"></i> Operators Hub
                </a>
              `;
            } else if (user.userType === "sponsor") {
              dropdownHTML += `
                <a href="sponsors.html" class="dropdown-item">
                  <i class="fa fa-handshake"></i> Sponsors Hub
                </a>
              `;
            }

            dropdownHTML += `
              <a href="#" class="dropdown-item logout-btn">
                <i class="fa fa-sign-out-alt"></i> Logout
              </a>
            `;

            dropdown.innerHTML = dropdownHTML;
            btn.parentElement.style.position = "relative";
            btn.parentElement.appendChild(dropdown);

            // Toggle dropdown
            btn.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              // Close all other dropdowns first
              document.querySelectorAll(".user-dropdown.show").forEach((dd) => {
                if (dd !== dropdown) dd.classList.remove("show");
              });
              dropdown.classList.toggle("show");
            });

            // Logout handler
            dropdown
              .querySelector(".logout-btn")
              .addEventListener("click", function (e) {
                e.preventDefault();
                localStorage.removeItem("pkl_token");
                localStorage.removeItem("pkl_user");
                window.location.href = "index.html";
              });
          }
        } else {
          // User is not logged in - show Sign Up
          btnText.textContent = "Sign Up";
          btn.href = "signup.html";
          btn.classList.remove("user-logged-in");
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".header-btn")) {
        document.querySelectorAll(".user-dropdown.show").forEach((dd) => {
          dd.classList.remove("show");
        });
      }
    });

    // Filter nav items based on userType
    filterNavItems(user);
  }

  // Add styles for user dropdown
  function addDropdownStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .user-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        min-width: 200px;
        padding: 10px 0;
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px);
        transition: all 0.3s ease;
        z-index: 9999;
        margin-top: 10px;
      }

      .user-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .user-dropdown .dropdown-item {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        color: #333;
        text-decoration: none;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .user-dropdown .dropdown-item:hover {
        background: #f5f5f5;
        color: #6366f1;
      }

      .user-dropdown .dropdown-item i {
        width: 20px;
        margin-right: 10px;
        text-align: center;
      }

      .user-dropdown .logout-btn {
        border-top: 1px solid #eee;
        margin-top: 5px;
        padding-top: 15px;
        color: #ef4444;
      }

      .user-dropdown .logout-btn:hover {
        background: #fef2f2;
        color: #dc2626;
      }

      /* Ensure dropdown works in sticky header */
      .sticky-header .user-dropdown {
        z-index: 99999;
      }

      /* User type badge in dropdown */
      .user-type-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        border-radius: 4px;
        margin-left: 8px;
      }

      .user-type-badge.player {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .user-type-badge.operator {
        background: #dcfce7;
        color: #15803d;
      }

      .user-type-badge.sponsor {
        background: #fef3c7;
        color: #b45309;
      }

      .user-type-badge.admin {
        background: #fce7f3;
        color: #be185d;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  function init() {
    addDropdownStyles();
    updateHeaderAuth();
    enforcePageAccess();

    // Re-run after a slight delay to catch dynamically loaded content
    setTimeout(() => {
      updateHeaderAuth();
    }, 500);

    // Also run when sticky header becomes visible
    const observer = new MutationObserver(() => {
      updateHeaderAuth();
    });

    const stickyHeader = document.querySelector(".sticky-header");
    if (stickyHeader) {
      observer.observe(stickyHeader, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
