/**
 * PKL.CLUB Dynamic Header Component
 * Renders a consistent header across ALL pages.
 * Handles auth state, nav highlighting, role-based nav visibility.
 *
 * Usage: Include this script in every page. It will replace
 * <div id="pkl-header"></div> with the full header markup.
 */

(function () {
  "use strict";

  // ── configuration ──────────────────────────────────────────────
  const NAV_ITEMS = [
    { label: "Players", href: "players.html" },
    { label: "How It Works", href: "how-it-works.html" },
    { label: "Pathway Series", href: "world-series.html" },
    { label: "Operators", href: "operators.html" },
    { label: "Partners", href: "sponsors.html" },
  ];

  // Extra nav items prepended for specific user roles when on dashboard pages
  const DASHBOARD_NAV = {
    admin: { label: "Dashboard", href: "admin-dashboard.html" },
    operator: {
      label: "Dashboard",
      href: "operator-dashboard.html",
    },
    player: { label: "Dashboard", href: "player-dashboard.html" },
  };

  // Page → nav label mapping for "current" highlighting
  const PAGE_TO_NAV = {
    "players.html": "Players",
    "how-it-works.html": "How It Works",
    "world-series.html": "Pathway Series",
    "operators.html": "Operators",
    "sponsors.html": "Partners",
    "admin-dashboard.html": "Dashboard",
    "operator-dashboard.html": "Dashboard",
    "player-dashboard.html": "Dashboard",
    "index.html": "",
  };

  // Roles that hide specific nav items
  const HIDDEN_NAV_BY_ROLE = {
    player: ["Players", "Operators", "Partners"],
    operator: ["Players", "Operators", "Partners"],
    sponsor: ["Players", "Operators", "Partners"],
    admin: ["Players", "Operators", "Partners"],
  };

  // ── helpers ────────────────────────────────────────────────────
  function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf("/") + 1) || "index.html";
  }

  function getUser() {
    try {
      const token = localStorage.getItem("pkl_token");
      const userStr = localStorage.getItem("pkl_user");
      if (token && userStr) return JSON.parse(userStr);
    } catch (_) {}
    return null;
  }

  // ── build navigation HTML ─────────────────────────────────────
  function buildNavItems(user) {
    const currentPage = getCurrentPage();
    const currentLabel = PAGE_TO_NAV[currentPage] || "";
    const hidden = user ? HIDDEN_NAV_BY_ROLE[user.userType] || [] : [];

    let items = [...NAV_ITEMS];

    // If user is logged in and has a dashboard, prepend dashboard link
    if (user && DASHBOARD_NAV[user.userType]) {
      items = [DASHBOARD_NAV[user.userType], ...items];
    }

    return items
      .filter((item) => !hidden.includes(item.label))
      .map((item) => {
        const isCurrent = item.label === currentLabel;
        const currentClass = isCurrent ? ' class="current"' : "";

        if (item.children) {
          const subItems = item.children
            .map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
            .join("\n                          ");
          return `<li class="dropdown${isCurrent ? " current" : ""}">
                        <a href="${item.href}">${item.label}</a>
                        <ul>
                          ${subItems}
                        </ul>
                      </li>`;
        }

        return `<li${currentClass}>
                        <a href="${item.href}">${item.label}</a>
                      </li>`;
      })
      .join("\n                      ");
  }

  // ── full header template ──────────────────────────────────────
  function renderHeader() {
    const user = getUser();
    const navHTML = buildNavItems(user);

    // CTA button – if logged in show name, else show JOIN
    let ctaBtn;
    if (user) {
      const firstName = user.firstName || user.username || "User";
      ctaBtn = `<a class="header-btn-main theme-btn user-logged-in" href="#"><span class="btn-text">${firstName}</span></a>`;
    } else {
      ctaBtn = `<a class="header-btn-main theme-btn" href="signup.html"><span class="btn-text">JOIN</span></a>`;
    }

    // Mobile CTA
    let mobileCta;
    if (user) {
      mobileCta = "";
    } else {
      mobileCta = `
            <div class="mobile-menu-btn" style="padding: 20px 30px">
              <a class="theme-btn btn-style-one" href="signup.html"
                style="display: block; text-align: center; width: 100%">
                <span class="btn-title">JOIN</span>
              </a>
            </div>`;
    }

    const html = `
      <!-- Main Header-->
      <header class="main-header header-style-one position-absolute">
        <div class="container">
          <div class="header-lower">
            <div class="inner-container">
              <div class="main-box">
                <div class="logo-box">
                  <div class="logo">
                    <a href="index.html"><img src="images/logo.png?v=2" alt="Logo" /></a>
                  </div>
                </div>

                <div class="nav-outer">
                  <nav class="nav main-menu">
                    <ul class="navigation">
                      ${navHTML}
                    </ul>
                  </nav>
                </div>

                <div class="action-box">
                  <div class="header-btn">
                    ${ctaBtn}
                  </div>
                  <div class="mobile-nav-toggler">
                    <div class="shape-line-img">
                      <i class="fas fa-bars"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div class="mobile-menu">
          <div class="menu-backdrop"></div>
          <nav class="menu-box">
            <div class="upper-box">
              <div class="nav-logo">
                <a href="index.html"><img src="images/logo.png?v=2" alt="" /></a>
              </div>
              <div class="close-btn"><i class="icon fa fa-times"></i></div>
            </div>
            <ul class="navigation clearfix"></ul>${mobileCta}
            <ul class="contact-list-one">
              <li>
                <i class="icon lnr-icon-envelope1"></i>
                <span class="title">Send Email</span>
                <div class="text">
                  <a href="mailto:hello@pkl.club">hello@pkl.club</a>
                </div>
              </li>
            </ul>
            <ul class="social-links">
              <li><a href="#"><i class="icon fab fa-twitter"></i></a></li>
              <li><a href="#"><i class="icon fab fa-facebook-f"></i></a></li>
              <li><a href="#"><i class="icon fab fa-instagram"></i></a></li>
              <li><a href="#"><i class="icon fab fa-youtube"></i></a></li>
            </ul>
          </nav>
        </div>
        <!-- End Mobile Menu -->

        <!-- Sticky Header -->
        <div class="sticky-header">
          <div class="auto-container">
            <div class="inner-container">
              <div class="logo">
                <a href="index.html"><img src="images/logo.png?v=2" alt="" /></a>
              </div>
              <div class="nav-outer">
                <nav class="main-menu">
                  <div class="navbar-collapse show collapse clearfix">
                    <ul class="navigation clearfix"></ul>
                  </div>
                </nav>
                <div class="mobile-nav-toggler">
                  <span class="icon lnr-icon-bars"></span>
                </div>
              </div>
              <div class="action-box">
                <div class="mobile-nav-toggler sticky-toggler">
                  <span class="icon fas fa-bars"></span>
                </div>
                <div class="header-btn">
                  ${ctaBtn}
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- End Sticky Menu -->
      </header>
      <!--End Main Header -->`;

    return html;
  }

  // ── inject into page ──────────────────────────────────────────
  function injectHeader() {
    const placeholder = document.getElementById("pkl-header");
    if (!placeholder) return;

    placeholder.outerHTML = renderHeader();

    // ── replicate what script.js does inside $(function(){…}) ──
    // script.js loads before this file and its jQuery-ready handler
    // has already fired by now, so the mobile-menu / sticky-header
    // navigation is empty.  We do the same work here.
    initMobileMenu();
  }

  /**
   * Copy desktop nav into mobile-menu & sticky-header,
   * then bind open / close / dropdown-toggle events.
   * Mirrors the logic found in js/script.js lines ~112-145.
   */
  function initMobileMenu() {
    // Append dropdown toggles to desktop nav items that have sub-menus
    document
      .querySelectorAll(".main-header .navigation li.dropdown")
      .forEach(function (li) {
        if (!li.querySelector(".dropdown-btn")) {
          var btn = document.createElement("div");
          btn.className = "dropdown-btn";
          btn.innerHTML = '<i class="fa fa-angle-down"></i>';
          li.appendChild(btn);
        }
      });

    // Copy desktop nav HTML into mobile-menu and sticky-header
    var desktopNav = document.querySelector(
      ".main-header .main-menu .navigation",
    );
    if (!desktopNav) return;

    var navHTML = desktopNav.innerHTML;

    var mobileNav = document.querySelector(".mobile-menu .navigation");
    if (mobileNav && !mobileNav.innerHTML.trim()) {
      mobileNav.innerHTML = navHTML;
    }

    var stickyNav = document.querySelector(".sticky-header .navigation");
    if (stickyNav && !stickyNav.innerHTML.trim()) {
      stickyNav.innerHTML = navHTML;
    }

    // ── event listeners (use event delegation so we only bind once) ──

    // Mobile nav toggler – open
    document.querySelectorAll(".mobile-nav-toggler").forEach(function (el) {
      el.addEventListener("click", function () {
        document.body.classList.add("mobile-menu-visible");
      });
    });

    // Close button & backdrop – close
    document
      .querySelectorAll(".mobile-menu .close-btn, .mobile-menu .menu-backdrop")
      .forEach(function (el) {
        el.addEventListener("click", function () {
          document.body.classList.remove("mobile-menu-visible");
        });
      });

    // Mobile dropdown toggles
    document
      .querySelectorAll(".mobile-menu li.dropdown .dropdown-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          var subMenu = this.previousElementSibling;
          if (subMenu && subMenu.tagName === "UL") {
            var isOpen = subMenu.style.display === "block";
            subMenu.style.display = isOpen ? "none" : "block";
          }
          this.classList.toggle("active");
        });
      });
  }

  // ── user dropdown (post-inject) ───────────────────────────────
  function setupUserDropdown() {
    const user = getUser();
    if (!user) return;

    document.querySelectorAll(".header-btn .user-logged-in").forEach((btn) => {
      if (btn.parentElement.querySelector(".user-dropdown")) return;

      const dropdown = document.createElement("div");
      dropdown.className = "user-dropdown";

      // Dashboard link
      let dashboardLink = "";
      const dashboards = {
        player: ["player-dashboard.html", "Dashboard"],
        operator: ["operator-dashboard.html", "Dashboard"],
        admin: ["admin-dashboard.html", "Admin Dashboard"],
        sponsor: ["sponsor-dashboard.html", "Dashboard"],
      };
      const db = dashboards[user.userType];
      if (db) {
        dashboardLink = `<a href="${db[0]}" class="dropdown-item"><i class="fa fa-tachometer-alt"></i> ${db[1]}</a>`;
      }

      // Role-specific links
      let roleLinks = "";
      if (user.userType === "player") {
        roleLinks = `<a href="players.html" class="dropdown-item"><i class="fa fa-users"></i> Players Hub</a>`;
      } else if (user.userType === "operator") {
        roleLinks = `<a href="operators.html" class="dropdown-item"><i class="fa fa-cogs"></i> Operators Hub</a>`;
      } else if (user.userType === "sponsor") {
        roleLinks = `<a href="sponsors.html" class="dropdown-item"><i class="fa fa-handshake"></i> Sponsors Hub</a>`;
      }

      dropdown.innerHTML =
        dashboardLink +
        `<a href="world-series.html" class="dropdown-item"><i class="fa fa-trophy"></i> Pathway Series</a>` +
        roleLinks +
        `<a href="#" class="dropdown-item logout-btn"><i class="fa fa-sign-out-alt"></i> Logout</a>`;

      btn.parentElement.style.position = "relative";
      btn.parentElement.appendChild(dropdown);

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll(".user-dropdown.show").forEach((dd) => {
          if (dd !== dropdown) dd.classList.remove("show");
        });
        dropdown.classList.toggle("show");
      });

      dropdown
        .querySelector(".logout-btn")
        .addEventListener("click", function (e) {
          e.preventDefault();
          localStorage.removeItem("pkl_token");
          localStorage.removeItem("pkl_user");
          window.location.href = "index.html";
        });
    });

    // Close on outside click
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".header-btn")) {
        document.querySelectorAll(".user-dropdown.show").forEach((dd) => {
          dd.classList.remove("show");
        });
      }
    });
  }

  // ── dropdown styles ───────────────────────────────────────────
  function addDropdownStyles() {
    if (document.getElementById("pkl-dropdown-styles")) return;
    const style = document.createElement("style");
    style.id = "pkl-dropdown-styles";
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
      .sticky-header .user-dropdown {
        z-index: 99999;
      }
      /* Fix sticky-header hamburger pushed to center on mobile */
      @media (max-width: 1023px) {
        .sticky-header .nav-outer {
          display: none;
        }
        .sticky-header .inner-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sticky-header .action-box {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .sticky-header .action-box .mobile-nav-toggler {
          display: block;
          font-size: 24px;
          color: #fff;
          cursor: pointer;
          order: -1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── page access enforcement ───────────────────────────────────
  function enforceAccess() {
    const user = getUser();
    if (!user || user.userType === "admin") return;

    const blocked = {
      player: ["operators.html", "sponsors.html"],
      operator: ["players.html", "sponsors.html"],
      sponsor: ["players.html", "operators.html"],
    };

    const page = getCurrentPage();
    if ((blocked[user.userType] || []).includes(page)) {
      alert("You don't have access to this page. Redirecting to Pathway Series.");
      window.location.href = "world-series.html";
    }
  }

  // ── initialise ────────────────────────────────────────────────
  function init() {
    addDropdownStyles();
    injectHeader();
    setupUserDropdown();
    enforceAccess();

    // Re-run after a delay to catch sticky header visibility
    setTimeout(() => {
      setupUserDropdown();
    }, 500);

    // Observe sticky header
    const sticky = document.querySelector(".sticky-header");
    if (sticky) {
      new MutationObserver(() => setupUserDropdown()).observe(sticky, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  // Run init() synchronously - the <div id="pkl-header"> is always in
  // the DOM already because this script is loaded at the bottom of the
  // body.  Running synchronously guarantees the header is injected
  // BEFORE jQuery's $(function(){…}) fires in script.js, which copies
  // navigation into the mobile-menu and sticky-header.
  init();
})();
