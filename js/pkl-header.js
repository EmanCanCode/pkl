/**
 * PKL.CLUB Header Auth Script
 * Handles user authentication state in the header/navbar
 */

(function () {
  "use strict";

  // Check if user is logged in
  function checkAuth() {
    const token = localStorage.getItem("pkl_token");
    const userStr = localStorage.getItem("pkl_user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        return user;
      } catch (e) {
        console.error("Error parsing user data:", e);
        return null;
      }
    }
    return null;
  }

  // Update header buttons based on auth state
  function updateHeaderAuth() {
    const user = checkAuth();
    const headerBtns = document.querySelectorAll(
      ".header-btn .header-btn-main",
    );

    headerBtns.forEach((btn) => {
      const btnText = btn.querySelector(".btn-text");
      if (btnText) {
        if (user) {
          // User is logged in - show their name with dropdown
          const firstName = user.firstName || user.username || "User";
          btnText.textContent = firstName;
          btn.href = "#";
          btn.classList.add("user-logged-in");

          // Create dropdown menu if not exists
          if (!btn.parentElement.querySelector(".user-dropdown")) {
            const dropdown = document.createElement("div");
            dropdown.className = "user-dropdown";
            dropdown.innerHTML = `
              <a href="profile.html" class="dropdown-item">
                <i class="fa fa-user"></i> My Profile
              </a>
              <a href="world-series.html" class="dropdown-item">
                <i class="fa fa-trophy"></i> World Series
              </a>
              <a href="#" class="dropdown-item logout-btn">
                <i class="fa fa-sign-out-alt"></i> Logout
              </a>
            `;
            btn.parentElement.style.position = "relative";
            btn.parentElement.appendChild(dropdown);

            // Toggle dropdown
            btn.addEventListener("click", function (e) {
              e.preventDefault();
              dropdown.classList.toggle("show");
            });

            // Logout handler
            dropdown
              .querySelector(".logout-btn")
              .addEventListener("click", function (e) {
                e.preventDefault();
                localStorage.removeItem("pkl_token");
                localStorage.removeItem("pkl_user");
                window.location.reload();
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
        z-index: 1000;
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

      .header-btn-main.user-logged-in .btn-text::after {
        content: '\\f078';
        font-family: 'Font Awesome 5 Free';
        font-weight: 900;
        margin-left: 8px;
        font-size: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      addDropdownStyles();
      updateHeaderAuth();
    });
  } else {
    addDropdownStyles();
    updateHeaderAuth();
  }
})();
