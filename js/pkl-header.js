// PKL.CLUB Shared Header Component
// This script dynamically loads the header across all pages

document.addEventListener("DOMContentLoaded", function () {
  const headerContainer = document.getElementById("pkl-header");
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <!-- Main Header-->
    <header class="main-header header-style-one">
      <div class="container">
        <div class="header-lower">
          <div class="inner-container">
            <!-- Main box -->
            <div class="main-box">
              <div class="logo-box">
                <div class="logo">
                  <a href="index.html"><img src="images/logo.png" alt="PKL.CLUB Logo" /></a>
                </div>
              </div>

              <!--Nav Box-->
              <div class="nav-outer">
                <nav class="nav main-menu">
                  <ul class="navigation">
                    <li><a href="#">World Series</a></li>
                    <li><a href="#">Players</a></li>
                    <li><a href="#">Operators</a></li>
                    <li><a href="#">Sponsors</a></li>
                    <li class="dropdown">
                      <a href="#">Shop</a>
                      <ul>
                        <li><a href="#">Membership</a></li>
                        <li><a href="#">Profile Image</a></li>
                        <li><a href="#">Merchandise</a></li>
                        <li><a href="#">Equipment</a></li>
                      </ul>
                    </li>
                    <li><a href="#">PKL.CLUB</a></li>
                    <li><a href="#">News</a></li>
                  </ul>
                </nav>
              </div>

              <!-- Outer Box -->
              <div class="action-box">
                <div class="header-btn">
                  <a class="header-btn-main theme-btn" href="#"><span class="btn-text">Sign Up</span></a>
                </div>

                <!-- Mobile Nav toggler -->
                <div class="mobile-nav-toggler">
                  <div class="shape-line-img"><i class="fas fa-bars"></i></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Menu  -->
      <div class="mobile-menu">
        <div class="menu-backdrop"></div>
        <!--Here Menu Will Come Automatically Via Javascript / Same Menu as in Header-->
        <nav class="menu-box">
          <div class="upper-box">
            <div class="nav-logo">
              <a href="index.html"><img src="images/logo.png" alt="PKL.CLUB" /></a>
            </div>
            <div class="close-btn"><i class="icon fa fa-times"></i></div>
          </div>
          <ul class="navigation clearfix">
            <!--Keep This Empty / Menu will come through Javascript-->
          </ul>
          <ul class="contact-list-one">
            <li>
              <i class="icon lnr-icon-envelope1"></i>
              <span class="title">Send Email</span>
              <div class="text"><a href="mailto:hello@pkl.club">hello@pkl.club</a></div>
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

      <!-- Header Search -->
      <div class="search-popup">
        <span class="search-back-drop"></span>
        <button class="close-search"><span class="fa fa-times"></span></button>
        <div class="search-inner">
          <form method="post" action="#">
            <div class="form-group">
              <input type="search" name="search-field" value="" placeholder="Search..." required="" />
              <button type="submit"><i class="fa fa-search"></i></button>
            </div>
          </form>
        </div>
      </div>
      <!-- End Header Search -->

      <!-- Sticky Header  -->
      <div class="sticky-header">
        <div class="auto-container">
          <div class="inner-container">
            <!--Logo-->
            <div class="logo">
              <a href="index.html"><img src="images/logo.png" alt="PKL.CLUB" /></a>
            </div>

            <!--Right Col-->
            <div class="nav-outer">
              <!-- Main Menu -->
              <nav class="main-menu">
                <div class="navbar-collapse show collapse clearfix">
                  <ul class="navigation clearfix">
                    <!--Keep This Empty / Menu will come through Javascript-->
                  </ul>
                </div>
              </nav>
              <!-- Main Menu End-->

              <!--Mobile Navigation Toggler-->
              <div class="mobile-nav-toggler"><span class="icon lnr-icon-bars"></span></div>
            </div>
          </div>
        </div>
      </div>
      <!-- End Sticky Menu -->
    </header>
    <!--End Main Header -->
  `;

  // Re-initialize mobile menu after dynamic load
  if (typeof mobileMenu !== "undefined") {
    mobileMenu();
  }
});
